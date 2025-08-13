# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies (dev + prod for building)
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile

# Copy source code and build files
COPY src ./src
COPY build.mjs tsconfig.json ./

# Build the application
RUN pnpm build

# Production dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune

# Final production stage - optimized minimal image
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nodejs nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Create directories for volumes with proper permissions
RUN mkdir -p downloads/roms data && \
    chown -R nodejs:nodejs /app

# Define volumes for persistent data
VOLUME ["/app/downloads", "/app/data"]

# Switch to non-root user
USER nodejs

# Expose health check port (optional)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Start the bot with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]