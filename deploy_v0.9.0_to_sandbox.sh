#!/bin/bash
set -e

PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.144"

echo "🚀 DEPLOYING v0.9.0 TO SANDBOX"
echo "========================================"
echo ""
echo "Changes in this release:"
echo "  ✅ Backend validation middleware"
echo "  ✅ Request/response logging"
echo "  ✅ Centralized error handling"
echo "  ✅ Comprehensive test data"
echo "  ✅ Version: frontend 0.9.0, backend 1.3.0"
echo ""

# Frontend
echo "📦 Deploying frontend v0.9.0..."
tar -czf frontend-v0.9.0.tar.gz -C dist .
scp frontend-v0.9.0.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/frontend-v0.9.0.tar.gz /tmp/frontend-v0.9.0.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /var/www/html && rm -rf * && tar -xzf /tmp/frontend-v0.9.0.tar.gz && chown -R www-data:www-data /var/www/html && rm /tmp/frontend-v0.9.0.tar.gz'"
rm -f frontend-v0.9.0.tar.gz
echo "✅ Frontend v0.9.0 deployed"

# Backend
echo ""
echo "📦 Deploying backend v1.3.0..."
tar -czf backend-v1.3.0.tar.gz -C backend/dist .
scp backend-v1.3.0.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/backend-v1.3.0.tar.gz /tmp/backend-v1.3.0.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /opt/expenseapp/backend && rm -rf dist && mkdir -p dist && cd dist && tar -xzf /tmp/backend-v1.3.0.tar.gz && rm /tmp/backend-v1.3.0.tar.gz'"
rm -f backend-v1.3.0.tar.gz
echo "✅ Backend v1.3.0 deployed"

# Populate test data
echo ""
echo "📊 Populating test data..."
scp sandbox_test_data.sql root@${PROXMOX_HOST}:/tmp/sandbox_test_data.sql
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/sandbox_test_data.sql /tmp/sandbox_test_data.sql"
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- bash -c 'PGPASSWORD=L60yimE5ao5YYMYNHAhoPgfb psql -h 127.0.0.1 -U expense_sandbox -d expense_app_sandbox -f /tmp/sandbox_test_data.sql'"
echo "✅ Test data populated"

# Restart services
echo ""
echo "🔄 Restarting backend service..."
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl restart expenseapp-backend"
sleep 5
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl status expenseapp-backend --no-pager -n 0"
echo "✅ Backend service restarted"

# Verify
echo ""
echo "🌐 Verifying deployment..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SANDBOX_IP}/)
echo "Frontend HTTP Status: ${FRONTEND_STATUS}"

if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo "✅ Frontend accessible"
else
  echo "❌ Frontend not accessible"
  exit 1
fi

LOGIN_RESPONSE=$(curl -s -X POST http://${SANDBOX_IP}/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"sandbox123"}')
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
fi

# Check health endpoint
HEALTH=$(curl -s http://${SANDBOX_IP}/api/health | jq -r '.version')
echo "Backend version: ${HEALTH}"

echo ""
echo "========================================"
echo "✅ SANDBOX v0.9.0 DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Sandbox URL: http://${SANDBOX_IP}"
echo "📝 Version: v0.9.0 (Frontend), v1.3.0 (Backend)"
echo ""
echo "🎯 New Features:"
echo "  - Enhanced backend with validation and logging"
echo "  - Centralized error handling"
echo "  - Comprehensive test data (5 users, 5 events, 13 expenses)"
echo ""
echo "🔐 Test Accounts (password: sandbox123):"
echo "  - admin - Full access"
echo "  - coordinator - Event management"
echo "  - salesperson - Expense submission"
echo "  - accountant - Approval workflows"
echo "  - salesperson2 - Additional sales rep"
echo ""
echo "📊 Test Data Available:"
echo "  - 3 Events (upcoming, active, completed)"
echo "  - 4 Pending expenses (approval testing)"
echo "  - 4 Approved expenses (entity assignment)"
echo "  - 3 Completed expenses with entities (reports)"
echo "  - 1 Rejected expense (workflow testing)"
echo ""

