#!/bin/bash
set -e

echo "Starting Biggs Permit Management System..."

# Wait for database to be ready
echo "Waiting for database connection..."
while ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready!"

# Push database schema
echo "Setting up database schema..."
npm run db:push

# Check if database is already seeded
echo "Checking if database needs seeding..."
if ! psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
  echo "Seeding database with initial data..."
  tsx server/seed.ts
else
  echo "Database already seeded"
fi

# Start the application
echo "Starting application server..."
exec npm start