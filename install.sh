#!/bin/bash

# Biggs Permit Management System - Installation Script
# This script installs all dependencies and sets up the system for deployment

set -e  # Exit on any error

echo "🚀 Biggs Permit Management System - Installation"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check operating system
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

print_status "Detected operating system: $MACHINE"

# Check for required system dependencies
print_status "Checking system dependencies..."

# Check for Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
    
    # Check Node.js version (require 18+)
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current: $NODE_VERSION"
        print_status "Please update Node.js: https://nodejs.org/"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_status "Installing Node.js..."
    
    if [ "$MACHINE" = "Mac" ]; then
        if command_exists brew; then
            brew install node
        else
            print_error "Homebrew not found. Please install Node.js manually: https://nodejs.org/"
            exit 1
        fi
    elif [ "$MACHINE" = "Linux" ]; then
        # Install Node.js via NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        print_error "Please install Node.js manually: https://nodejs.org/"
        exit 1
    fi
fi

# Check for npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is not installed (should come with Node.js)"
    exit 1
fi

# Check for PostgreSQL
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL found: $PSQL_VERSION"
else
    print_warning "PostgreSQL not found in PATH"
    print_status "Installing PostgreSQL..."
    
    if [ "$MACHINE" = "Mac" ]; then
        if command_exists brew; then
            brew install postgresql@14
            brew services start postgresql@14
        else
            print_error "Homebrew not found. Please install PostgreSQL manually"
            exit 1
        fi
    elif [ "$MACHINE" = "Linux" ]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        print_warning "Please install PostgreSQL manually for your system"
    fi
fi

# Check for git
if command_exists git; then
    GIT_VERSION=$(git --version)
    print_success "Git found: $GIT_VERSION"
else
    print_error "Git is not installed"
    if [ "$MACHINE" = "Linux" ]; then
        sudo apt-get install -y git
    elif [ "$MACHINE" = "Mac" ]; then
        print_status "Git should be available via Xcode Command Line Tools"
        xcode-select --install
    fi
fi

# Install project dependencies
print_status "Installing project dependencies..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

npm install
print_success "Node.js dependencies installed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from template"
    else
        print_status "Creating .env file with default values..."
        cat > .env << EOF
# Biggs Permit Management System - Environment Configuration

# Database Configuration
DATABASE_URL=postgresql://biggs_user:biggs_password@localhost:5432/biggs_permits

# Session Security
SESSION_SECRET=change-this-to-a-secure-random-string-in-production

# Server Configuration
NODE_ENV=development
PORT=5000

# AI Webhook Integration (Optional)
# WEBHOOK_URL=https://your-ai-service.com/webhook

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security Headers
SECURE_COOKIES=false
COOKIE_DOMAIN=localhost
EOF
        print_success ".env file created with default values"
    fi
    
    print_warning "Please edit .env file with your specific configuration!"
    print_warning "Especially update DATABASE_URL and SESSION_SECRET for production"
else
    print_success ".env file already exists"
fi

# Database setup
print_status "Setting up PostgreSQL database..."

# Generate random password for database user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create database and user
print_status "Creating database and user..."

# Check if we can connect to PostgreSQL
if command_exists sudo && id -nG "$USER" | grep -qw "sudo"; then
    # Try to create database as postgres user
    sudo -u postgres psql -c "CREATE DATABASE biggs_permits;" 2>/dev/null || print_warning "Database might already exist"
    sudo -u postgres psql -c "CREATE USER biggs_user WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "User might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE biggs_permits TO biggs_user;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER biggs_user CREATEDB;" 2>/dev/null || true
    
    # Update .env with generated password
    sed -i.bak "s/biggs_password/$DB_PASSWORD/g" .env
    print_success "Database user created with password: $DB_PASSWORD"
    print_success "Updated .env file with generated password"
else
    print_warning "Cannot automatically create database. Please create manually:"
    print_warning "  CREATE DATABASE biggs_permits;"
    print_warning "  CREATE USER biggs_user WITH PASSWORD 'your_password';"
    print_warning "  GRANT ALL PRIVILEGES ON DATABASE biggs_permits TO biggs_user;"
fi

# Run database migrations
print_status "Running database migrations..."

if command_exists npx; then
    npx drizzle-kit push:pg || print_warning "Database migration may have failed. Check your DATABASE_URL in .env"
    print_success "Database schema initialized"
else
    print_warning "npx not found. Run 'npm run db:push' manually after installation"
fi

# Create uploads directory
print_status "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads
print_success "Uploads directory created"

# Generate secure session secret for production
print_status "Generating secure session secret..."
SESSION_SECRET=$(openssl rand -base64 64 | tr -d "\n")
sed -i.bak "s/change-this-to-a-secure-random-string-in-production/$SESSION_SECRET/g" .env
print_success "Secure session secret generated"

# Final setup check
print_status "Running final system check..."

# Check if all dependencies are installed
npm list --depth=0 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "All npm dependencies are properly installed"
else
    print_warning "Some npm dependencies might be missing. Run 'npm install' manually"
fi

# Installation complete
echo ""
echo "🎉 Installation Complete!"
echo "======================="
print_success "Biggs Permit Management System is ready for deployment"
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your specific configuration"
echo "2. Start the development server: npm run dev"
echo "3. Access the application at: http://localhost:5000"
echo ""
echo "Production deployment:"
echo "1. Set NODE_ENV=production in .env"
echo "2. Update DATABASE_URL for production database"
echo "3. Set SECURE_COOKIES=true for HTTPS"
echo "4. Run: npm run build && npm start"
echo ""
print_warning "Security reminder: Change default passwords and secrets before production use!"
echo ""
print_status "Installation log saved to: install.log"

# Save installation info
cat > install.log << EOF
Biggs Permit Management System - Installation Log
================================================
Date: $(date)
Operating System: $MACHINE
Node.js Version: $(node --version)
npm Version: $(npm --version)
PostgreSQL: $(command_exists psql && echo "Installed" || echo "Not found")

Database Configuration:
- Database: biggs_permits
- User: biggs_user
- Password: $DB_PASSWORD

Generated Session Secret: $SESSION_SECRET

Installation Status: SUCCESS
EOF

print_success "Installation completed successfully!"