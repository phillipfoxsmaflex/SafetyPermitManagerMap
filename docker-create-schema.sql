-- Create the database schema manually
-- This script creates the essential tables for the Biggs Permit Management System

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permits table
CREATE TABLE IF NOT EXISTS permits (
    id SERIAL PRIMARY KEY,
    permit_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    requestor_name VARCHAR(255),
    department VARCHAR(255),
    contact_number VARCHAR(50),
    emergency_contact VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    risk_level VARCHAR(50),
    safety_officer VARCHAR(255),
    identified_hazards TEXT,
    additional_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    application_title VARCHAR(255) DEFAULT 'Arbeitserlaubnis',
    header_icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work_locations table
CREATE TABLE IF NOT EXISTS work_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin user
INSERT INTO users (username, password, full_name, department, role, created_at, updated_at) 
VALUES ('admin', 'password123', 'System Administrator', 'IT', 'admin', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET 
    password = 'password123',
    role = 'admin',
    updated_at = NOW();

-- Create default system settings
INSERT INTO system_settings (application_title, header_icon, created_at, updated_at) 
VALUES ('Arbeitserlaubnis', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify admin user creation
SELECT 'Admin user created successfully:' as message, username, full_name, role FROM users WHERE username = 'admin';