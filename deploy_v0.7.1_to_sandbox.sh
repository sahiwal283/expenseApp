#!/bin/bash
set -e

# Configuration
PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.144"

echo "🚀 DEPLOYING v0.7.1 UX IMPROVEMENTS TO SANDBOX"
echo "=============================================="
echo ""
echo "Changes in this release:"
echo "  ✅ Updated login page with sandbox credentials"
echo "  ✅ Removed location field from expense form"
echo "  ✅ Fixed receipt saving bug"
echo "  ✅ Fixed notification bell red dot persistence"
echo "  ✅ Added summary cards to accountant dashboard"
echo "  ✅ Fixed entity assignment bug"
echo ""

# --- Frontend Deployment ---
echo "📦 Deploying frontend v0.7.1..."
tar -czf - -C dist . | ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} - /var/www/html/"
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- chown -R www-data:www-data /var/www/html"
echo "✅ Frontend v0.7.1 deployed"

# --- Backend Deployment ---
echo ""
echo "📦 Deploying backend v1.1.1..."
tar -czf - -C backend/dist . | ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} - /opt/expenseapp/backend/dist/"
echo "✅ Backend v1.1.1 deployed"

# --- Restart Backend Service ---
echo ""
echo "🔄 Restarting backend service..."
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl restart expenseapp-backend"
sleep 5 # Give service time to restart
ssh root@${PROXMOX_HOST} "pct exec ${CONTAINER_ID} -- systemctl status expenseapp-backend --no-pager -n 3"
echo "✅ Backend service restarted"

# --- Verify Deployment ---
echo ""
echo "🌐 Verifying sandbox accessibility and version..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SANDBOX_IP}/)
echo "Frontend HTTP Status: ${FRONTEND_STATUS}"

if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo "✅ Frontend accessible"
else
  echo "❌ Frontend not accessible (Status: ${FRONTEND_STATUS})"
  exit 1
fi

# Test login with admin user
echo ""
echo "🔐 Testing login functionality..."
LOGIN_RESPONSE=$(curl -s -X POST http://${SANDBOX_IP}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sandbox123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo "✅ Login successful: Admin User (admin/sandbox123)"
else
  echo "❌ Login failed for admin. Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test backend health
echo ""
echo "🏥 Testing backend health..."
BACKEND_HEALTH=$(curl -s http://${SANDBOX_IP}/api/auth/login -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}')

if [ "$BACKEND_HEALTH" -eq 401 ] || [ "$BACKEND_HEALTH" -eq 200 ]; then
  echo "✅ Backend responding correctly (Status: ${BACKEND_HEALTH})"
else
  echo "⚠️  Backend status: ${BACKEND_HEALTH}"
fi

echo ""
echo "=========================================="
echo "✅ SANDBOX v0.7.1 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🎯 Test the following improvements:"
echo ""
echo "1. Login Page:"
echo "   - Check for updated sandbox credentials display"
echo "   - Verify all 5 accounts shown: admin, coordinator, salesperson, accountant, salesperson2"
echo ""
echo "2. Expense Submission:"
echo "   - Verify Location field is removed"
echo "   - Upload a receipt and verify it saves"
echo "   - Check receipt is visible in expense list"
echo ""
echo "3. Notification Bell:"
echo "   - Check red dot appears with new notifications"
echo "   - Verify red dot disappears after viewing"
echo "   - Test red dot reappears with new notifications"
echo ""
echo "4. Accountant Dashboard:"
echo "   - Verify 4 summary cards match admin format"
echo "   - Test entity assignment dropdown"
echo "   - Verify entity saves and UI updates"
echo ""
echo "🌐 Sandbox URL: http://${SANDBOX_IP}"
echo "📝 Test Accounts: admin, coordinator, salesperson, accountant, salesperson2"
echo "🔑 Password (all accounts): sandbox123"
echo ""
echo "📄 Documentation: SANDBOX_UX_IMPROVEMENTS_v0.7.1.md"
echo ""

