-- Add developer role to users table
-- This migration adds 'developer' to the role CHECK constraint

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with developer role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer', 'pending'));

