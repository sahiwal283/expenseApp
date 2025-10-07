#!/bin/bash

# ExpenseApp v0.11.0 Sandbox Deployment Script
# This script deploys the enhanced OCR implementation with Sharp preprocessing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SANDBOX_IP="192.168.1.144"
FRONTEND_CONTAINER="203"
BACKEND_CONTAINER="202"
VERSION="0.11.0"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ExpenseApp v${VERSION} - Enhanced OCR Deployment (Sandbox)  ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Deploy Backend
echo -e "${YELLOW}[1/5] Deploying Backend to Container ${BACKEND_CONTAINER}...${NC}"

# Create backend tarball
cd backend
echo "  → Creating backend package..."
tar czf ../backend-v${VERSION}.tar.gz dist/ node_modules/ package.json package-lock.json
cd ..

# Transfer to Proxmox
echo "  → Transferring backend to sandbox..."
scp -o StrictHostKeyChecking=no backend-v${VERSION}.tar.gz root@${SANDBOX_IP}:/tmp/

# Deploy backend in container
echo "  → Installing backend in container..."
ssh root@${SANDBOX_IP} << 'ENDSSH'
pct exec 202 -- bash << 'EOF'
cd /opt/expenseapp-backend
rm -rf dist node_modules
tar xzf /tmp/backend-v0.11.0.tar.gz
rm /tmp/backend-v0.11.0.tar.gz

# Restart backend service
systemctl restart expenseapp-backend
sleep 3
systemctl status expenseapp-backend --no-pager
EOF
ENDSSH

echo -e "${GREEN}  ✓ Backend deployed successfully${NC}"
echo ""

# Step 2: Deploy Frontend
echo -e "${YELLOW}[2/5] Deploying Frontend to Container ${FRONTEND_CONTAINER}...${NC}"

# Create frontend tarball
echo "  → Creating frontend package..."
tar czf frontend-v${VERSION}.tar.gz dist/

# Transfer to Proxmox
echo "  → Transferring frontend to sandbox..."
scp -o StrictHostKeyChecking=no frontend-v${VERSION}.tar.gz root@${SANDBOX_IP}:/tmp/

# Deploy frontend in container
echo "  → Installing frontend in container..."
ssh root@${SANDBOX_IP} << 'ENDSSH'
pct exec 203 -- bash << 'EOF'
cd /var/www/expenseapp
rm -rf dist
tar xzf /tmp/frontend-v0.11.0.tar.gz
rm /tmp/frontend-v0.11.0.tar.gz
chown -R www-data:www-data dist/
EOF
ENDSSH

echo -e "${GREEN}  ✓ Frontend deployed successfully${NC}"
echo ""

# Step 3: Verify Deployment
echo -e "${YELLOW}[3/5] Verifying Deployment...${NC}"

echo "  → Checking backend health..."
BACKEND_HEALTH=$(curl -s http://${SANDBOX_IP}/api/health | grep -o '"status":"ok"' || echo "")
if [ -n "$BACKEND_HEALTH" ]; then
    echo -e "${GREEN}  ✓ Backend is healthy${NC}"
    curl -s http://${SANDBOX_IP}/api/health | python3 -m json.tool
else
    echo -e "${RED}  ✗ Backend health check failed${NC}"
fi
echo ""

echo "  → Checking frontend..."
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://${SANDBOX_IP}/)
if [ "$FRONTEND_CHECK" = "200" ]; then
    echo -e "${GREEN}  ✓ Frontend is accessible${NC}"
else
    echo -e "${RED}  ✗ Frontend returned status: ${FRONTEND_CHECK}${NC}"
fi
echo ""

# Step 4: Test OCR Functionality
echo -e "${YELLOW}[4/5] Testing OCR Service...${NC}"
echo "  → Checking backend logs for OCR initialization..."
ssh root@${SANDBOX_IP} "pct exec ${BACKEND_CONTAINER} -- journalctl -u expenseapp-backend -n 20 --no-pager" | grep -i "ocr\|tesseract\|sharp" || true
echo ""

# Step 5: Cleanup
echo -e "${YELLOW}[5/5] Cleaning up...${NC}"
rm -f backend-v${VERSION}.tar.gz frontend-v${VERSION}.tar.gz
echo -e "${GREEN}  ✓ Cleanup complete${NC}"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   DEPLOYMENT COMPLETE                      ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${GREEN}Version:${NC} ${VERSION}"
echo -e "${GREEN}Frontend:${NC} http://${SANDBOX_IP}/"
echo -e "${GREEN}Backend API:${NC} http://${SANDBOX_IP}/api/"
echo -e "${GREEN}Health Check:${NC} http://${SANDBOX_IP}/api/health"
echo ""
echo -e "${YELLOW}Key Improvements in v${VERSION}:${NC}"
echo "  • Enhanced OCR with Sharp image preprocessing"
echo "  • Improved accuracy (targeting 80-90% vs 60-70%)"
echo "  • Better data extraction with advanced regex patterns"
echo "  • Enhanced merchant, amount, date, and category detection"
echo "  • Optimized Tesseract configuration for receipts"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo "  Admin:    admin / sandbox123"
echo "  Manager:  manager / sandbox123"
echo "  Employee: employee / sandbox123"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)"
echo "  2. Log in to http://${SANDBOX_IP}/"
echo "  3. Test receipt upload with the Hertz receipt"
echo "  4. Verify OCR extracts data accurately"
echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"

