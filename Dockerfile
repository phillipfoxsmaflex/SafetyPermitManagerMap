# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create a simple startup script
RUN echo '#!/bin/sh\n\
echo "Starting Biggs Permit Management System..."\n\
echo "Waiting for database connection..."\n\
while ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; do\n\
  echo "Database not ready, waiting..."\n\
  sleep 2\n\
done\n\
echo "Database is ready!"\n\
echo "Setting up database schema..."\n\
npm run db:push\n\
echo "Seeding database..."\n\
tsx server/seed.ts || echo "Seeding failed or already done"\n\
echo "Starting application server..."\n\
exec npm start' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Use the startup script
CMD ["/app/start.sh"]