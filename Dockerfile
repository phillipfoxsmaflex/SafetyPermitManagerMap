# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies first (including dev dependencies for tsx)
RUN npm ci

# Build the application for production
RUN npm run build

# Keep tsx available for seeding and development
RUN npm install --save tsx

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Make sure the entrypoint script is executable and in the right place
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Use bash to run the entrypoint script
CMD ["bash", "/app/docker-entrypoint.sh"]