#!/bin/bash
# Sandbox Deployment Script - Prevents common deployment errors
# Usage: ./deploy-sandbox.sh

set -e  # Exit on error

echo "=== ExpenseApp Sandbox Deployment ==="
echo ""

# CRITICAL: Container paths (case-sensitive!)
SANDBOX_BACKEND_PATH="/opt/expenseApp/backend"  # ← CAPITAL A!
SANDBOX_FRONTEND_PATH="/var/www/expenseapp"
PROXMOX_IP="192.168.1.190"
SANDBOX_CONTAINER="203"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  CRITICAL REMINDER:${NC}"
echo -e "   Backend path: ${GREEN}$SANDBOX_BACKEND_PATH${NC} (CAPITAL A in expenseApp)"
echo -e "   Frontend path: $SANDBOX_FRONTEND_PATH (lowercase)"
echo ""

# Verify we're on v1.6.0 branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "v1.6.0" ]; then
    echo -e "${RED}ERROR: Must be on v1.6.0 branch (currently on $CURRENT_BRANCH)${NC}"
    exit 1
fi

# Check what to deploy
DEPLOY_BACKEND=false
DEPLOY_FRONTEND=false

if [ "$1" == "backend" ] || [ "$1" == "both" ] || [ -z "$1" ]; then
    DEPLOY_BACKEND=true
fi

if [ "$1" == "frontend" ] || [ "$1" == "both" ]; then
    DEPLOY_FRONTEND=true
fi

# Deploy Backend
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "📦 Building backend..."
    cd backend
    npm run build
    
    # Get version from package.json
    VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    echo "Version: $VERSION"
    
    # Package (include Python scripts from src/ - needed for PaddleOCR)
    PACKAGE_NAME="backend-v${VERSION}-$(date +%Y%m%d_%H%M%S).tar.gz"
    echo "Packaging: dist/, package files, and Python OCR scripts..."
    tar -czf "$PACKAGE_NAME" \
        --exclude='*.ts' \
        --exclude='*.js.map' \
        dist/ \
        package.json \
        package-lock.json \
        requirements.txt \
        src/services/ocr/
    echo "✓ Packaged: $PACKAGE_NAME"
    
    # Upload
    echo "📤 Uploading to Proxmox..."
    scp "$PACKAGE_NAME" root@$PROXMOX_IP:/tmp/backend-deploy.tar.gz
    
    # Deploy
    echo "🚀 Deploying to Container $SANDBOX_CONTAINER..."
    echo -e "${YELLOW}   Deploying to: $SANDBOX_BACKEND_PATH${NC}"
    ssh root@$PROXMOX_IP "
        pct push $SANDBOX_CONTAINER /tmp/backend-deploy.tar.gz /tmp/backend-deploy.tar.gz
        pct exec $SANDBOX_CONTAINER -- bash -c '
            cd $SANDBOX_BACKEND_PATH || exit 1
            echo \"Current directory: \$(pwd)\"
            tar -xzf /tmp/backend-deploy.tar.gz
            systemctl restart expenseapp-backend
            sleep 3
            systemctl is-active expenseapp-backend
        '
    "
    
    # Verify deployment
    echo ""
    echo "🔍 Verifying deployment..."
    DEPLOYED_VERSION=$(ssh root@$PROXMOX_IP "pct exec $SANDBOX_CONTAINER -- curl -s http://localhost:3000/api/health | grep -o '\"version\":\"[^\"]*\"' | cut -d'\"' -f4")
    
    if [ "$DEPLOYED_VERSION" == "$VERSION" ]; then
        echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
        echo "   Version: $DEPLOYED_VERSION"
    else
        echo -e "${RED}⚠️  Version mismatch!${NC}"
        echo "   Expected: $VERSION"
        echo "   Deployed: $DEPLOYED_VERSION"
    fi
    
    cd ..
fi

# Deploy Frontend
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo ""
    echo "📦 Building frontend..."
    npm run build
    
    echo "🚀 Frontend deployment not implemented yet"
    echo "   Would deploy to: $SANDBOX_FRONTEND_PATH"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Test endpoints:"
echo "  curl http://192.168.1.144/api/health"
echo "  curl http://192.168.1.144/api/ocr/v2/process -X POST"

