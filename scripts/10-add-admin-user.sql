-- Add sildavysn@gmail.com as admin user
-- This script will either insert a new admin user or update existing user to admin role

INSERT INTO users (email, name, role, phone) 
VALUES ('sildavysn@gmail.com', 'Sildavysn', 'ADMIN', NULL)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'ADMIN',
  updated_at = NOW();

-- Verify the admin user was created/updated
SELECT id, email, name, role, created_at, updated_at 
FROM users 
WHERE email = 'sildavysn@gmail.com';
