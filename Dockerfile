# Multi-stage Dockerfile for the entire monorepo
# This builds all packages and creates a production-ready image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root configuration files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./
COPY jest.*.js ./

# Copy all packages
COPY packages/ ./packages/

# Install all dependencies
RUN npm ci

# Build all packages
RUN npm run build

# Generate API documentation
WORKDIR /app/packages/api
RUN npm run swagger

# Production stage for API service
FROM node:18-alpine AS api-production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built API files
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/tsoa.json ./

# Copy core package (API dependency)
COPY --from=builder /app/packages/core/package*.json ../core/
COPY --from=builder /app/packages/core/dist ../core/dist/

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]