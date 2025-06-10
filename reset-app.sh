#!/bin/bash

# Biggs Application Reset Script
# Clears all session data, caches, and temporary files

echo "🔄 Resetting Biggs Application..."

# Clear database sessions
echo "Clearing database sessions..."
psql $DATABASE_URL -c "TRUNCATE TABLE sessions RESTART IDENTITY CASCADE;" 2>/dev/null || echo "Database connection failed - sessions may not be cleared"

# Clear temporary files (safely)
echo "Clearing temporary files..."
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name "*.temp" -type f -delete 2>/dev/null || true
find uploads -name "*.log" -type f -delete 2>/dev/null || true

# Clear Vite cache
echo "Clearing build cache..."
rm -rf dist .vite 2>/dev/null || true

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Restart development server
echo "Application reset complete!"
echo "Sessions cleared, temporary files removed, caches cleared."
echo ""
echo "To start fresh:"
echo "1. Stop the current server (Ctrl+C)"
echo "2. Run: npm run dev"
echo "3. All users will need to log in again"