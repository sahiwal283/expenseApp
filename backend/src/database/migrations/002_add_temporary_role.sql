-- Migration: Add 'temporary' role to users table
-- Date: 2025-10-15
-- Description: Adds 'temporary' role for custom event participants

-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'temporary' role included
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer', 'pending', 'temporary'));

