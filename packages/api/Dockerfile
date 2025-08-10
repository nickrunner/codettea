# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for workspace dependencies
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy packages directory structure
COPY packages/ ./packages/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build the API package
RUN npm run build:api

# Generate Swagger documentation
WORKDIR /app/packages/api
RUN npm run swagger

# Production stage
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/tsoa.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application
CMD ["node", "dist/server.js"]