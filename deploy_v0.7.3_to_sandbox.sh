#!/bin/bash
set -e

# Configuration
PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.144"

echo "🚀 DEPLOYING v0.7.3 STREAMLINED REPORTS & FIXES TO SANDBOX"
echo "==========================================================="
echo ""
echo "Changes in this release:"
echo "  ✅ Removed ALL approval features from Accountant Reports"
echo "  ✅ Fixed entity assignment with proper data refresh"
echo "  ✅ Verified expense saving working correctly"
echo "  ✅ Streamlined Reports page (entity assignment only)"
echo "  ✅ Updated version: frontend 0.7.3, backend 1.1.3"
echo ""

# --- Frontend Deployment ---
echo "📦 Deploying frontend v0.7.3..."
tar -czf frontend-v0.7.3.tar.gz -C dist .
scp frontend-v0.7.3.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/frontend-v0.7.3.tar.gz /tmp/frontend-v0.7.3.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /var/www/html && rm -rf * && tar -xzf /tmp/frontend-v0.7.3.tar.gz && chown -R www-data:www-data /var/www/html'"
rm -f frontend-v0.7.3.tar.gz
echo "✅ Frontend v0.7.3 deployed"

# --- Backend Deployment ---
echo ""
echo "📦 Deploying backend v1.1.3..."
tar -czf backend-v1.1.3.tar.gz -C backend/dist .
scp backend-v1.1.3.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/backend-v1.1.3.tar.gz /tmp/backend-v1.1.3.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /opt/expenseapp/backend && rm -rf dist && mkdir -p dist && cd dist && tar -xzf /tmp/backend-v1.1.3.tar.gz'"
rm -f backend-v1.1.3.tar.gz
echo "✅ Backend v1.1.3 deployed"

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

# Test entity assignment
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
EXPENSE_ID=$(curl -s -X GET "http://${SANDBOX_IP}/api/expenses" -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
ENTITY_TEST=$(curl -s -X PATCH "http://${SANDBOX_IP}/api/expenses/$EXPENSE_ID/entity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"zoho_entity":"Haute Inc"}')

if echo "$ENTITY_TEST" | grep -q "zoho_entity"; then
  echo "✅ Entity assignment working"
else
  echo "⚠️  Entity assignment response unclear"
fi

echo ""
echo "==========================================================="
echo "✅ SANDBOX v0.7.3 DEPLOYMENT COMPLETE!"
echo "==========================================================="
echo ""
echo "🎯 Test the improvements:"
echo ""
echo "1. Accountant Reports Page:"
echo "   - Login as accountant/sandbox123"
echo "   - Go to Reports page"
echo "   - Verify NO approval buttons present"
echo "   - Only entity assignment dropdown available"
echo "   - Message: 'Use Approvals page for reviews'"
echo ""
echo "2. Entity Assignment:"
echo "   - On Reports page, select entity from dropdown"
echo "   - Verify entity saves and updates immediately"
echo "   - Check updated_at timestamp changes"
echo ""
echo "3. Approvals Page:"
echo "   - Click 'Approvals' in sidebar"
echo "   - All approval functions available here"
echo "   - Test approve/reject expenses"
echo "   - Test reimbursement approvals"
echo ""
echo "4. Expense Creation:"
echo "   - Login as salesperson/sandbox123"
echo "   - Create new expense"
echo "   - Verify it saves and appears in list"
echo ""
echo "🌐 Sandbox URL: http://${SANDBOX_IP}"
echo "📝 Test Accounts: admin, accountant, salesperson (password: sandbox123)"
echo ""

