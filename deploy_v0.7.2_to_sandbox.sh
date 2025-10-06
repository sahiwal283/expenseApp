#!/bin/bash
set -e

# Configuration
PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.144"

echo "🚀 DEPLOYING v0.7.2 APPROVALS & FIXES TO SANDBOX"
echo "================================================"
echo ""
echo "Changes in this release:"
echo "  ✅ Created dedicated Approvals page for admin & accountant"
echo "  ✅ Fixed entity assignment with proper data reload"
echo "  ✅ Fixed expense approval workflow"
echo "  ✅ Fixed reimbursement approval workflow"
echo "  ✅ Added comprehensive filtering and stats"
echo "  ✅ Updated version: frontend 0.7.2, backend 1.1.2"
echo ""

# --- Frontend Deployment ---
echo "📦 Deploying frontend v0.7.2..."
tar -czf frontend-v0.7.2.tar.gz -C dist .
scp frontend-v0.7.2.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/frontend-v0.7.2.tar.gz /tmp/frontend-v0.7.2.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /var/www/html && rm -rf * && tar -xzf /tmp/frontend-v0.7.2.tar.gz && chown -R www-data:www-data /var/www/html'"
rm -f frontend-v0.7.2.tar.gz
echo "✅ Frontend v0.7.2 deployed"

# --- Backend Deployment ---
echo ""
echo "📦 Deploying backend v1.1.2..."
tar -czf backend-v1.1.2.tar.gz -C backend/dist .
scp backend-v1.1.2.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/backend-v1.1.2.tar.gz /tmp/backend-v1.1.2.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /opt/expenseapp/backend && rm -rf dist && mkdir -p dist && cd dist && tar -xzf /tmp/backend-v1.1.2.tar.gz'"
rm -f backend-v1.1.2.tar.gz
echo "✅ Backend v1.1.2 deployed"

# --- Restart Backend Service ---
echo ""
echo "🔄 Restarting backend service..."
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl restart expenseapp-backend"
sleep 5
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl status expenseapp-backend --no-pager -n 0"
echo "✅ Backend service restarted"

# --- Verification ---
echo ""
echo "🌐 Verifying deployment..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SANDBOX_IP}/)
echo "Frontend HTTP Status: ${FRONTEND_STATUS}"

if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo "✅ Frontend accessible"
else
  echo "❌ Frontend not accessible (Status: ${FRONTEND_STATUS})"
  exit 1
fi

# Test login
LOGIN_RESPONSE=$(curl -s -X POST http://${SANDBOX_IP}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sandbox123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "================================================"
echo "✅ SANDBOX v0.7.2 DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "🎯 Test the new Approvals page:"
echo ""
echo "1. Admin Access:"
echo "   - Login as admin/sandbox123"
echo "   - Click 'Approvals' in sidebar"
echo "   - Test expense approval/rejection"
echo "   - Test reimbursement approval"
echo "   - Test entity assignment"
echo ""
echo "2. Accountant Access:"
echo "   - Login as accountant/sandbox123"
echo "   - Click 'Approvals' in sidebar"
echo "   - Verify same functionality as admin"
echo ""
echo "3. Verify Fixes:"
echo "   - Entity assignment saves immediately"
echo "   - Expense approval updates correctly"
echo "   - Reimbursement approval works"
echo "   - All filters function properly"
echo ""
echo "🌐 Sandbox URL: http://${SANDBOX_IP}"
echo "📝 Test Accounts: admin, accountant (password: sandbox123)"
echo ""

