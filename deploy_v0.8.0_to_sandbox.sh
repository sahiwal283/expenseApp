#!/bin/bash
set -e

PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.144"

echo "🚀 DEPLOYING v0.8.0 REFACTOR TO SANDBOX"
echo "========================================"
echo ""
echo "Changes in this release:"
echo "  ✅ Centralized constants (appConstants.ts)"
echo "  ✅ Created custom data fetching hooks"
echo "  ✅ Implemented comprehensive error handling"
echo "  ✅ Fixed code smells and duplications"
echo "  ✅ Version: frontend 0.8.0, backend 1.2.0"
echo ""

# Frontend
echo "📦 Deploying frontend v0.8.0..."
tar -czf frontend-v0.8.0.tar.gz -C dist .
scp frontend-v0.8.0.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/frontend-v0.8.0.tar.gz /tmp/frontend-v0.8.0.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /var/www/html && rm -rf * && tar -xzf /tmp/frontend-v0.8.0.tar.gz && chown -R www-data:www-data /var/www/html'"
rm -f frontend-v0.8.0.tar.gz
echo "✅ Frontend v0.8.0 deployed"

# Backend
echo ""
echo "📦 Deploying backend v1.2.0..."
tar -czf backend-v1.2.0.tar.gz -C backend/dist .
scp backend-v1.2.0.tar.gz root@${PROXMOX_HOST}:/tmp/
ssh root@${PROXMOX_HOST} "pct push ${CONTAINER_ID} /tmp/backend-v1.2.0.tar.gz /tmp/backend-v1.2.0.tar.gz && pct exec ${CONTAINER_ID} -- bash -c 'cd /opt/expenseapp/backend && rm -rf dist && mkdir -p dist && cd dist && tar -xzf /tmp/backend-v1.2.0.tar.gz'"
rm -f backend-v1.2.0.tar.gz
echo "✅ Backend v1.2.0 deployed"

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

echo ""
echo "========================================"
echo "✅ SANDBOX v0.8.0 DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Sandbox URL: http://${SANDBOX_IP}"
echo "📝 Version: v0.8.0 (Frontend), v1.2.0 (Backend)"
echo ""
echo "🎯 New Features:"
echo "  - Centralized constants for better maintainability"
echo "  - Custom hooks for cleaner data fetching"
echo "  - Improved error handling throughout app"
echo "  - Foundation for future optimizations"
echo ""

