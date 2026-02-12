# Backend Dockerfile for gentionale-lse
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript (allow errors)
RUN npm run build || true

# Ensure logs directory exists
RUN mkdir -p ./logs && chown -R node:node ./logs || true

# Expose server port
EXPOSE 5000

# Use non-root user for better security
USER node

# Start the server with ts-node
CMD ["npx", "ts-node", "--transpile-only", "server.ts"]
