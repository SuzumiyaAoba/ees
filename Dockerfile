# Dockerfile
# Multi-stage build for production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and pandoc for document conversion
RUN apk add --no-cache dumb-init pandoc

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/

# Install production dependencies only (skip prepare scripts like husky)
RUN npm ci --production --ignore-scripts && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./packages/api/dist

# Copy database schema (migrations are handled programmatically)
COPY --chown=nodejs:nodejs packages/core/src/shared/database/schema.ts ./packages/core/src/shared/database/

# Create data directory
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/api/dist/index.mjs"]
