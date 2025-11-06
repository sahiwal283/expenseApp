#!/bin/bash

#############################################################
# ExpenseApp - Local Environment Configuration Helper
# Version: 1.27.15
# Purpose: Interactive configuration for backend .env file
# Usage: ./scripts/configure-local-env.sh
#############################################################

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ExpenseApp - Local Environment Configuration${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

ENV_FILE="backend/.env"

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file already exists${NC}"
    echo ""
    read -p "Do you want to reconfigure it? (y/N): " RECONFIGURE
    
    if [[ ! $RECONFIGURE =~ ^[Yy]$ ]]; then
        echo "Keeping existing configuration."
        exit 0
    fi
    
    # Backup existing .env
    BACKUP_FILE="backend/.env.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backed up existing .env to: $BACKUP_FILE${NC}"
    echo ""
fi

echo -e "${BLUE}🔧 Configuring local development environment...${NC}"
echo ""

#############################################################
# Get Database Configuration
#############################################################
echo -e "${CYAN}━━━ Database Configuration ━━━${NC}"
echo ""

# Get current user as default DB user
DEFAULT_DB_USER=$(whoami)

read -p "Database Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database Name [expense_app]: " DB_NAME
DB_NAME=${DB_NAME:-expense_app}

read -p "Database User [$DEFAULT_DB_USER]: " DB_USER
DB_USER=${DB_USER:-$DEFAULT_DB_USER}

echo -n "Database Password (leave empty for passwordless local connection): "
read -s DB_PASSWORD
echo ""

#############################################################
# Server Configuration
#############################################################
echo ""
echo -e "${CYAN}━━━ Server Configuration ━━━${NC}"
echo ""

read -p "Backend Port [5000]: " PORT
PORT=${PORT:-5000}

read -p "Node Environment [development]: " NODE_ENV
NODE_ENV=${NODE_ENV:-development}

#############################################################
# JWT Secret
#############################################################
echo ""
echo -e "${CYAN}━━━ Security Configuration ━━━${NC}"
echo ""

# Generate random JWT secret
DEFAULT_JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_this_in_production_$(date +%s)")

read -p "JWT Secret (press Enter to auto-generate): " JWT_SECRET
JWT_SECRET=${JWT_SECRET:-$DEFAULT_JWT_SECRET}

#############################################################
# File Upload Configuration
#############################################################
echo ""
echo -e "${CYAN}━━━ File Upload Configuration ━━━${NC}"
echo ""

read -p "Upload Directory [uploads]: " UPLOAD_DIR
UPLOAD_DIR=${UPLOAD_DIR:-uploads}

read -p "Max File Size in bytes [20971520 = 20MB]: " MAX_FILE_SIZE
MAX_FILE_SIZE=${MAX_FILE_SIZE:-20971520}

#############################################################
# Zoho Books Integration (Optional)
#############################################################
echo ""
echo -e "${CYAN}━━━ Zoho Books Integration (Optional) ━━━${NC}"
echo ""
echo "Leave blank to disable Zoho Books integration"
echo ""

read -p "Zoho Client ID (optional): " ZOHO_CLIENT_ID
read -p "Zoho Client Secret (optional): " ZOHO_CLIENT_SECRET
read -p "Zoho Refresh Token (optional): " ZOHO_REFRESH_TOKEN
read -p "Zoho Organization ID (optional): " ZOHO_ORGANIZATION_ID

#############################################################
# Write Configuration File
#############################################################
echo ""
echo -e "${BLUE}📝 Writing configuration...${NC}"

cat > "$ENV_FILE" << EOF
# ExpenseApp Backend Configuration
# Generated: $(date)
# Environment: Local Development

# Server Configuration
PORT=$PORT
NODE_ENV=$NODE_ENV

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Secret
JWT_SECRET=$JWT_SECRET

# File Upload
UPLOAD_DIR=$UPLOAD_DIR
MAX_FILE_SIZE=$MAX_FILE_SIZE

# ========== ZOHO BOOKS INTEGRATION (OPTIONAL) ==========
# Leave blank to disable Zoho Books integration
# See docs/ZOHO_BOOKS_SETUP.md for detailed setup instructions

# OAuth Credentials (from Zoho API Console)
ZOHO_CLIENT_ID=$ZOHO_CLIENT_ID
ZOHO_CLIENT_SECRET=$ZOHO_CLIENT_SECRET
ZOHO_REFRESH_TOKEN=$ZOHO_REFRESH_TOKEN

# Organization ID (from Zoho Books)
ZOHO_ORGANIZATION_ID=$ZOHO_ORGANIZATION_ID

# Chart of Accounts Configuration
# Use exact account names from your Zoho Books Chart of Accounts
ZOHO_EXPENSE_ACCOUNT_NAME=Travel Expenses
ZOHO_PAID_THROUGH_ACCOUNT=Petty Cash

# API Endpoints (optional - defaults shown)
# ZOHO_API_BASE_URL=https://www.zohoapis.com/books/v3
# ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com/oauth/v2
EOF

echo -e "${GREEN}✅ Configuration written to: $ENV_FILE${NC}"
echo ""

#############################################################
# Summary
#############################################################
echo -e "${CYAN}━━━ Configuration Summary ━━━${NC}"
echo ""
echo "Database:"
echo "  Host:     $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Password: ${DB_PASSWORD:+****** (set)}${DB_PASSWORD:-<empty>}"
echo ""
echo "Server:"
echo "  Port:        $PORT"
echo "  Environment: $NODE_ENV"
echo ""
echo "Security:"
echo "  JWT Secret:  ${JWT_SECRET:0:10}... (generated)"
echo ""
echo "File Upload:"
echo "  Directory:     $UPLOAD_DIR"
echo "  Max File Size: $MAX_FILE_SIZE bytes"
echo ""

if [ -n "$ZOHO_CLIENT_ID" ]; then
    echo "Zoho Integration: ✅ Enabled"
else
    echo "Zoho Integration: ⚠️  Disabled (optional)"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Ensure PostgreSQL is running: pg_isready"
echo "  2. Create database: createdb $DB_NAME"
echo "  3. Run migrations: cd backend && npm run migrate"
echo "  4. Seed data: cd backend && npm run seed"
echo "  5. Start servers: npm run start:all"
echo ""
echo "Or simply run: ./scripts/local-deploy.sh"
echo ""

