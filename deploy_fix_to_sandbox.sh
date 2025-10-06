#!/bin/bash
set -e

echo "🔧 Deploying backend fix to sandbox..."

# Copy fixed file to server
echo "📦 Copying fixed expenses.ts..."
scp backend/src/routes/expenses.ts root@192.168.1.190:/tmp/expenses_fixed.ts

# Deploy to container and restart
echo "🚀 Deploying to container..."
ssh root@192.168.1.190 << 'ENDSSH'
pct exec 203 -- bash << 'ENDCONTAINER'
# Copy fixed file
cp /tmp/expenses_fixed.ts /opt/expenseapp/backend/src/routes/expenses.ts

# Rebuild backend
cd /opt/expenseapp/backend
echo "🔨 Building backend..."
npm run build

# Restart service
echo "♻️  Restarting backend service..."
systemctl restart expenseapp-backend

# Wait and check status
sleep 2
systemctl status expenseapp-backend --no-pager -n 0

echo ""
echo "✅ Backend fix deployed successfully!"
echo ""
echo "Now refresh your browser at http://192.168.1.150"
ENDCONTAINER
ENDSSH

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Refresh your browser (Ctrl+Shift+R)"
echo "2. Try logging in again with admin/sandbox123"
echo ""

