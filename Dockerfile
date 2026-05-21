# =========================================================================
# LSE GESTIONALE V2 - FRONTEND DOCKERFILE (NEXT.JS)
# Multi-stage build con output "standalone" → immagine finale ~150 MB.
# =========================================================================

# ---- Stage 1: deps ------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Stage 2: builder ---------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* è INLINE al build-time: stringa vuota → URL relativa → Traefik instrada /api/*.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_RSI_API_URL=""

RUN npm run build

# ---- Stage 3: runner ----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone bundle: include solo i node_modules effettivamente usati.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js è generato da Next.js nel bundle standalone.
CMD ["node", "server.js"]
