-- Update user role to ADMIN for sildavysn@gmail.com
UPDATE users 
SET role = 'ADMIN'
WHERE email = 'sildavysn@gmail.com';

-- Verify the update
SELECT id, email, name, role 
FROM users 
WHERE email = 'sildavysn@gmail.com';
