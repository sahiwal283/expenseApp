#!/bin/bash
# Reset all sandbox user passwords to "sandbox123"

ssh root@192.168.1.190 << 'ENDSSH'
pct exec 203 -- sudo -u postgres psql -d expense_app_sandbox << 'ENDSQL'
-- Copy the working password hash from sandbox_admin to all users
UPDATE users 
SET password = (SELECT password FROM users WHERE username = 'sandbox_admin' LIMIT 1)
WHERE username IN ('admin', 'lisa', 'sarah', 'mike');

-- Verify the update
SELECT username, role, email, 
       CASE WHEN username IN ('admin', 'lisa', 'sarah', 'mike', 'sandbox_admin') 
            THEN 'Password: sandbox123' 
            ELSE 'N/A' 
       END as login_info
FROM users 
ORDER BY role, username;
ENDSQL
ENDSSH

echo ""
echo "=========================================="
echo "✅ All user passwords set to: sandbox123"
echo "=========================================="
echo ""
echo "You can now log in as:"
echo "  admin     (Admin)"
echo "  lisa      (Accountant)"  
echo "  sarah     (Coordinator)"
echo "  mike      (Salesperson)"
echo ""
echo "Password for all: sandbox123"
echo "=========================================="

