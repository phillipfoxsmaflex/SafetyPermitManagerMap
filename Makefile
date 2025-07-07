# Biggs Permit Management System - Docker Operations

.PHONY: help build up down logs clean restart status

# Default target
help:
	@echo "Biggs Permit Management System - Docker Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  build    - Build Docker images"
	@echo "  up       - Start the application in detached mode"
	@echo "  down     - Stop the application"
	@echo "  logs     - Show application logs"
	@echo "  restart  - Restart the application"
	@echo "  status   - Show container status"
	@echo "  clean    - Remove containers and volumes (⚠️  destroys data)"
	@echo "  dev      - Start in development mode"
	@echo ""

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	@docker-compose build

# Start the application
up:
	@echo "🚀 Starting Biggs Permit Management System..."
	@docker-compose up -d
	@echo "✅ Application started!"
	@echo "🌐 Web interface: http://localhost:3000"
	@echo "🔧 Health check: http://localhost:3000/api/health"

# Stop the application
down:
	@echo "🛑 Stopping application..."
	@docker-compose down

# Show logs
logs:
	@echo "📋 Showing application logs..."
	@docker-compose logs -f app

# Restart the application
restart: down up

# Show container status
status:
	@echo "📊 Container status:"
	@docker-compose ps

# Clean everything (⚠️ destroys data)
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f

# Development mode
dev:
	@echo "🔧 Starting in development mode..."
	@docker-compose -f docker-compose.yml -f docker-compose.override.yml up