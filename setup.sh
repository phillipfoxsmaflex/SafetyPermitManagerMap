#!/bin/bash

# Biggs Quick Setup Script
# Simple setup for development environment

set -e

echo "🚀 Biggs Quick Setup"
echo "=================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Generate secure session secret
    if command -v openssl >/dev/null 2>&1; then
        SESSION_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        sed -i.bak "s/change-this-to-a-secure-random-string-in-production/$SESSION_SECRET/g" .env
        echo "✓ Secure session secret generated"
    else
        echo "⚠ Please update SESSION_SECRET in .env manually"
    fi
    
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Setup database
echo "Setting up database..."
npm run db:push
echo "✓ Database schema created"

# Create uploads directory
mkdir -p uploads
echo "✓ Uploads directory created"

# Seed database with sample data
echo "Seeding database..."
npx tsx server/seed.ts
echo "✓ Database seeded with sample data"

echo ""
echo "🎉 Setup complete!"
echo "==================="
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5000"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: password"
echo ""
echo "⚠ Remember to:"
echo "1. Update database credentials in .env"
echo "2. Change default passwords in production"
echo "3. Configure AI webhook URL if needed"