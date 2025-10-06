#!/bin/bash
set -e

echo "🚀 DEPLOYING TO SANDBOX"
echo "======================="
echo ""

SANDBOX="root@192.168.1.190"

# Deploy frontend
echo "📦 Deploying frontend..."
ssh $SANDBOX 'pct exec 203 -- rm -rf /var/www/html/*'
cd dist && tar czf - . | ssh $SANDBOX 'pct exec 203 -- tar xzf - -C /var/www/html' && cd ..
ssh $SANDBOX 'pct exec 203 -- chown -R www-data:www-data /var/www/html'
echo "✅ Frontend deployed"
echo ""

# Deploy backend
echo "📦 Deploying backend..."
ssh $SANDBOX 'pct exec 203 -- systemctl stop expenseapp-backend'
cd backend/src && tar czf - . | ssh $SANDBOX 'pct exec 203 -- tar xzf - -C /opt/expenseapp/backend/src' && cd ../..
ssh $SANDBOX 'pct exec 203 -- bash -c "cd /opt/expenseapp/backend && npm run build"'
echo "✅ Backend deployed and built"
echo ""

# Deploy and run SQL
echo "💾 Populating database..."
cat populate_sandbox_data.sql | ssh $SANDBOX 'pct exec 203 -- sudo -u postgres psql -d expense_app_sandbox'
echo "✅ Database populated"
echo ""

# Start backend
echo "🔄 Starting backend..."
ssh $SANDBOX 'pct exec 203 -- systemctl start expenseapp-backend'
sleep 2
echo "✅ Backend started"
echo ""

# Test
echo "🧪 Testing..."
curl -s http://192.168.1.150:5000/health && echo "✅ Backend responding" || echo "⚠️  Backend check failed"
echo ""

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access: http://192.168.1.150"
echo ""
echo "👥 Login with (password: sandbox123):"
echo "   • admin          (Administrator)"
echo "   • coordinator    (Event Coordinator)"
echo "   • salesperson    (Salesperson)"
echo "   • accountant     (Accountant)"
echo "   • salesperson2   (Additional Salesperson)"
echo ""
echo "✅ Refresh your browser and test!"
echo ""

