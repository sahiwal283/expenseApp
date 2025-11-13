-- Add 'pending' role for new user registrations
-- This replaces the NULL role + registration_pending flag approach

-- 1. Drop the existing role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add new constraint that includes 'pending'
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'pending'));

-- 3. Update existing users with NULL roles or registration_pending = true to 'pending'
UPDATE users 
SET role = 'pending' 
WHERE role IS NULL OR registration_pending = TRUE;

-- 4. Make role column NOT NULL (since we now always have a role)
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- 5. Drop registration_pending column (no longer needed)
ALTER TABLE users DROP COLUMN IF EXISTS registration_pending;

-- 6. Drop the index on NULL roles (no longer needed)
DROP INDEX IF EXISTS idx_users_pending_role;

-- 7. Create index on pending role for quick lookups
CREATE INDEX idx_users_pending ON users(role) WHERE role = 'pending';

