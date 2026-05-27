# =========================================================================
# LSE GESTIONALE V2 - BACKEND DOCKERFILE (EXPRESS + TYPESCRIPT)
# Multi-stage: builder compila TS → runner avvia solo dist/ + prod deps.
# =========================================================================

# ---- Stage 1: builder ---------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ---- Stage 2: runner ----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeapp

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder /app/models ./dist/models
COPY --from=builder /app/scripts ./dist/scripts
COPY --from=builder /app/routes ./dist/routes
COPY --from=builder /app/lib/cache.js ./dist/lib
COPY --from=builder /app/lib/discordMemberSync.js ./dist/lib
COPY --from=builder /app/lib/parseMembers.js ./dist/lib
COPY --from=builder /app/lib/swagger.js ./dist/lib

RUN mkdir -p /app/uploads && chown -R nodeapp:nodejs /app/uploads

USER nodeapp

EXPOSE 5000

CMD ["node", "dist/server.js"]