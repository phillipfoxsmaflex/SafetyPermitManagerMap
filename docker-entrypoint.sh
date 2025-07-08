#!/bin/bash
set -e

echo "Starting Biggs Permit Management System..."

# Set Docker environment flag
export DOCKER_ENV=true

# Wait for database to be ready with retry mechanism
echo "Waiting for database connection..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; then
    echo "Database is ready!"
    break
  fi
  echo "Database not ready, waiting... (attempt $((attempt+1))/$max_attempts)"
  sleep 2
  ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
  echo "Error: Database connection failed after $max_attempts attempts"
  exit 1
fi

# Push database schema with retry
echo "Setting up database schema..."
attempt=0
while [ $attempt -lt 5 ]; do
  if npm run db:push; then
    echo "Database schema setup successful!"
    break
  fi
  echo "Schema setup failed, retrying... (attempt $((attempt+1))/5)"
  sleep 3
  ((attempt++))
done

if [ $attempt -eq 5 ]; then
  echo "Error: Database schema setup failed after 5 attempts"
  exit 1
fi

# Verify tables exist and seed if needed
echo "Checking database tables..."
if ! psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
  echo "Users table not found, seeding database..."
  tsx server/seed.ts
  
  # Verify seeding was successful
  if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
    echo "Database seeding successful!"
  else
    echo "Error: Database seeding failed"
    exit 1
  fi
else
  echo "Database already seeded"
fi

# Verify admin user exists
echo "Verifying admin user..."
admin_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null | xargs)
if [ "$admin_count" -eq "0" ]; then
  echo "Admin user not found, creating..."
  psql "$DATABASE_URL" -c "INSERT INTO users (username, password, full_name, department, role) VALUES ('admin', 'password123', 'System Administrator', 'IT', 'admin') ON CONFLICT (username) DO UPDATE SET password = 'password123', role = 'admin';"
fi

echo "System initialization complete!"

# Start the application
echo "Starting application server..."
exec tsx server/index.ts