#!/bin/bash

# Manual seeding script for Docker container
echo "Manually seeding database with admin user..."

# Wait for database to be ready
while ! pg_isready -h database -p 5432 -U postgres; do
  echo "Waiting for database..."
  sleep 2
done

# Create admin user directly via SQL
psql "postgresql://postgres:postgres@database:5432/biggs_permit" <<EOF
-- Create admin user if not exists
INSERT INTO users (username, password, full_name, department, role, created_at, updated_at) 
VALUES ('admin', 'password123', 'System Administrator', 'IT', 'admin', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = 'password123',
  full_name = 'System Administrator',
  role = 'admin',
  updated_at = NOW();

-- Verify admin user
SELECT 'Admin user created/updated:' as message, username, password, role FROM users WHERE username = 'admin';
EOF

echo "Manual seeding completed!"