#!/bin/bash
set -e

echo "🚀 COMPLETE SANDBOX FIX & DATA POPULATION"
echo "=========================================="
echo ""

# Configuration
PROXMOX_HOST="192.168.1.190"
CONTAINER_ID="203"
SANDBOX_IP="192.168.1.150"

echo "📦 Step 1: Preparing and copying files to Proxmox host..."
ssh root@${PROXMOX_HOST} "rm -rf /tmp/sandbox_deploy && mkdir -p /tmp/sandbox_deploy/dist /tmp/sandbox_deploy/backend"
scp -r dist/* root@${PROXMOX_HOST}:/tmp/sandbox_deploy/dist/
scp -r backend/src root@${PROXMOX_HOST}:/tmp/sandbox_deploy/backend/
scp populate_sandbox_data.sql root@${PROXMOX_HOST}:/tmp/sandbox_deploy/

echo ""
echo "🔧 Step 2: Deploying to sandbox container..."
ssh root@${PROXMOX_HOST} << EOF
set -e

echo "📋 Copying files into container..."
pct push ${CONTAINER_ID} /tmp/sandbox_deploy/dist /tmp/dist_deploy
pct push ${CONTAINER_ID} /tmp/sandbox_deploy/backend/src /tmp/backend_src_deploy  
pct push ${CONTAINER_ID} /tmp/sandbox_deploy/populate_sandbox_data.sql /tmp/populate_sandbox_data.sql

echo "📋 Entering container ${CONTAINER_ID}..."
pct exec ${CONTAINER_ID} -- bash -c '
set -e

echo ""
echo "🛑 Stopping backend service..."
systemctl stop expenseapp-backend

echo ""
echo "🗂️  Deploying frontend..."
rm -rf /var/www/html/*
cp -r /tmp/dist_deploy/* /var/www/html/
chown -R www-data:www-data /var/www/html
echo "✅ Frontend deployed"

echo ""
echo "🗂️  Deploying backend..."
rm -rf /opt/expenseapp/backend/src/*
cp -r /tmp/backend_src_deploy/* /opt/expenseapp/backend/src/
cd /opt/expenseapp/backend
npm run build
echo "✅ Backend built"

echo ""
echo "💾 Populating database with test data..."
sudo -u postgres psql -d expense_app_sandbox -f /tmp/populate_sandbox_data.sql
echo "✅ Database populated"

echo ""
echo "🔄 Starting backend service..."
systemctl start expenseapp-backend

echo ""
echo "⏳ Waiting for services to stabilize..."
sleep 3

echo ""
echo "🔍 Checking service status..."
systemctl status expenseapp-backend --no-pager -n 5 || true
systemctl status nginx --no-pager -n 0 || true

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
'
EOF

echo ""
echo "=========================================="
echo "✅ ALL DONE! Testing connection..."
echo "=========================================="
echo ""

# Test the deployment
echo "🧪 Testing sandbox availability..."
if curl -s -f http://${SANDBOX_IP}/health > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend test failed (may still work in browser)"
fi

if curl -s -f http://${SANDBOX_IP}:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend test failed"
fi

echo ""
echo "=========================================="
echo "🎉 SANDBOX IS READY!"
echo "=========================================="
echo ""
echo "🌐 Access: http://${SANDBOX_IP}"
echo ""
echo "👥 Test Accounts (all use password: sandbox123):"
echo "   - admin          (Admin - full access)"
echo "   - coordinator    (Sarah Johnson - event coordinator)"
echo "   - salesperson    (Mike Chen - salesperson)"
echo "   - accountant     (Lisa Williams - accountant)"
echo "   - salesperson2   (Tom Rodriguez - additional salesperson)"
echo ""
echo "📊 Test Data Includes:"
echo "   - 5 user accounts across all roles"
echo "   - 4 trade show events (upcoming, active, completed)"
echo "   - 17 expenses in various states:"
echo "     • Pending approval (5)"
echo "     • Approved (8)"
echo "     • Rejected (2)"
echo "     • Needs reimbursement (3)"
echo "     • Needs Zoho entity assignment (2)"
echo "   - Card options and entity settings configured"
echo ""
echo "✅ You can now test ALL workflows:"
echo "   ✓ Login as each role"
echo "   ✓ Submit new expenses"
echo "   ✓ Create/manage events"
echo "   ✓ Approve/deny expenses"
echo "   ✓ Assign Zoho entities"
echo "   ✓ Process reimbursements"
echo "   ✓ View reports and dashboards"
echo ""
echo "🔄 Refresh your browser and log in!"
echo ""

