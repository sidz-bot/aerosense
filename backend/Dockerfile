# AeroSense Backend - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# STAGE 1: Builder
# =============================================================================
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client FIRST (needed for TypeScript types)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# =============================================================================
# STAGE 2: Production Runtime
# =============================================================================
FROM node:20-slim AS runtime

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 aerosense && \
    useradd -u 1001 -g aerosense -s /bin/bash aerosense

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Change ownership to non-root user
RUN chown -R aerosense:aerosense /app

# Switch to non-root user
USER aerosense

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application (run migrations first)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
