# =========================================================================
# LSE GESTIONALE V2 - BACKEND DOCKERFILE (EXPRESS & TYPESCRIPT)
# Optimized multi-stage build for production deployment
# =========================================================================

# Stage 1: Build the TypeScript backend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Clean install of all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy the rest of the backend files
COPY . .

# Compile TypeScript into JavaScript (output will go to dist/)
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Ensure correct permissions & security (run as non-root)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled files and helper scripts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/models ./dist/models
COPY --from=builder /app/scripts ./dist/scripts
COPY --from=builder /app/routes ./dist/routes
COPY --from=builder /app/lib/cache.js ./dist/lib
COPY --from=builder /app/lib/discordMemberSync.js ./dist/lib
COPY --from=builder /app/lib/parseMembers.js ./dist/lib
COPY --from=builder /app/lib/swagger.js ./dist/lib

# Apply correct ownership
RUN chown -R nodeapp:nodejs /app

# Switch to non-root user
USER nodeapp

# Expose port
EXPOSE 5000

# Start Express server
CMD ["node", "dist/server.js"]
