-- Ensure admin user exists with correct credentials
INSERT INTO users (username, password, full_name, department, role, created_at, updated_at) 
VALUES ('admin', 'password123', 'System Administrator', 'IT', 'admin', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = 'password123',
  full_name = 'System Administrator',
  role = 'admin';

-- Verify the admin user
SELECT username, password, full_name, role FROM users WHERE username = 'admin';