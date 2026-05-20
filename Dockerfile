# =========================================================================
# LSE GESTIONALE V2 - COMBINED DOCKERFILE (FRONTEND + BACKEND)
# Single container running both Next.js (port 3000) and Express (port 5000)
# =========================================================================

# ----- Stage 1: Build the Next.js frontend -----
FROM node:20-alpine AS frontend-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app/frontend

# Copy only package manifests for caching
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.mjs ./
COPY components.json ./
COPY next-env.d.ts ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ----- Stage 2: Build the Express backend -----
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .

# Compile TypeScript
RUN npm run build

# ----- Stage 3: Production runner (both services) -----
FROM node:20-alpine AS runner
WORKDIR /app

# Security: create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# --- Frontend artifacts ---
WORKDIR /app/frontend

COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/frontend/package.json ./package.json

# --- Backend artifacts ---
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/models ./dist/models
COPY --from=backend-builder /app/backend/scripts ./dist/scripts
COPY --from=backend-builder /app/backend/routes ./dist/routes
COPY --from=backend-builder /app/backend/lib/cache.js ./dist/lib/
COPY --from=backend-builder /app/backend/lib/discordMemberSync.js ./dist/lib/
COPY --from=backend-builder /app/backend/lib/parseMembers.js ./dist/lib/
COPY --from=backend-builder /app/backend/lib/swagger.js ./dist/lib/

# --- Entrypoint script ---
WORKDIR /app

# Create a simple entrypoint that runs both processes
# If either process dies, the container stops (fail-fast)
RUN printf '#!/bin/sh\n\
set -e\n\
\n\
echo "==> Starting LSE Gestionale V2 (combined)"\n\
echo "    Frontend: http://0.0.0.0:3000"\n\
echo "    Backend:  http://0.0.0.0:5000"\n\
echo ""\n\
\n\
# Start backend in background\n\
cd /app/backend\n\
PORT=5000 node dist/server.js &\n\
BACKEND_PID=$!\n\
\n\
# Start frontend in foreground-ish\n\
cd /app/frontend\n\
PORT=3000 HOSTNAME=0.0.0.0 npm run start &\n\
FRONTEND_PID=$!\n\
\n\
# Wait for either process to exit — then kill the other\n\
wait -n $BACKEND_PID $FRONTEND_PID 2>/dev/null || true\n\
echo "==> One process exited, shutting down..."\n\
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true\n\
wait\n\
exit 1\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Ownership
RUN chown -R appuser:nodejs /app

USER appuser

# Expose both ports
EXPOSE 3000 5000

CMD ["/app/entrypoint.sh"]
