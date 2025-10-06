#!/bin/bash
set -e

echo "🚀 DEPLOYING v0.7.0 TO SANDBOX"
echo "=============================="
echo ""

SANDBOX="root@192.168.1.190"

# Deploy frontend v0.7.0
echo "📦 Deploying frontend v0.7.0..."
ssh $SANDBOX 'pct exec 203 -- rm -rf /var/www/html/*'
cd dist && tar czf - . | ssh $SANDBOX 'pct exec 203 -- tar xzf - -C /var/www/html' && cd ..
ssh $SANDBOX 'pct exec 203 -- chown -R www-data:www-data /var/www/html'
echo "✅ Frontend v0.7.0 deployed"
echo ""

# Deploy backend v1.1.0 (with v0.7.0 frontend compatibility)
echo "📦 Deploying backend v1.1.0..."
ssh $SANDBOX 'pct exec 203 -- systemctl stop expenseapp-backend'
cd backend/src && tar czf - . | ssh $SANDBOX 'pct exec 203 -- tar xzf - -C /opt/expenseapp/backend/src' && cd ../..

# Update backend dependencies
echo "📦 Installing backend dependencies..."
ssh $SANDBOX 'pct exec 203 -- bash -c "cd /opt/expenseapp/backend && npm install"'

# Build backend
echo "🔨 Building backend..."
ssh $SANDBOX 'pct exec 203 -- bash -c "cd /opt/expenseapp/backend && npm run build"'
echo "✅ Backend v1.1.0 deployed and built"
echo ""

# Start backend
echo "🔄 Starting backend..."
ssh $SANDBOX 'pct exec 203 -- systemctl start expenseapp-backend'
sleep 3
echo "✅ Backend started"
echo ""

# Test
echo "🧪 Testing deployment..."
BACKEND_STATUS=$(curl -s http://192.168.1.150:5000/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$BACKEND_STATUS" = "ok" ]; then
    echo "✅ Backend health check: PASSED"
else
    echo "⚠️  Backend health check: FAILED"
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.1.150/)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend accessibility: PASSED (HTTP $FRONTEND_STATUS)"
else
    echo "⚠️  Frontend accessibility: WARNING (HTTP $FRONTEND_STATUS)"
fi
echo ""

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Sandbox URL: http://192.168.1.150"
echo ""
echo "📋 Version Information:"
echo "   Frontend: v0.7.0"
echo "   Backend:  v1.1.0 (Enhanced OCR + improvements)"
echo ""
echo "✨ New Features in v0.7.0:"
echo "   • Mobile responsive design"
echo "   • Collapsible sidebar for mobile"
echo "   • Inline receipt modal viewer"
echo "   • Enhanced mobile navigation"
echo "   • Improved touch interactions"
echo ""
echo "✨ Backend Enhancements (v1.1.0):"
echo "   • Enhanced OCR with image preprocessing"
echo "   • Password update endpoint fixes"
echo "   • Better error handling"
echo ""
echo "👥 Test Accounts (password: sandbox123):"
echo "   • admin, coordinator, salesperson, accountant, salesperson2"
echo ""
echo "🔄 Refresh your browser to see v0.7.0!"
echo ""

