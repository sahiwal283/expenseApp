#!/bin/bash

#############################################################
# ExpenseApp - Local Deployment Script
# Version: 1.27.15
# Purpose: Set up and run ExpenseApp locally for testing
# Usage: ./scripts/local-deploy.sh
#############################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
CHECKMARK="✅"
CROSS="❌"
WARNING="⚠️"
ROCKET="🚀"
WRENCH="🔧"
DATABASE="🗄️"
PACKAGE="📦"
SERVER="🖥️"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ExpenseApp - Local Deployment Setup${NC}"
echo -e "${CYAN}  Version: 1.27.15 | Branch: v1.27.15${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

#############################################################
# Step 1: Check Node.js
#############################################################
echo -e "${BLUE}${WRENCH} Checking prerequisites...${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}${CROSS} Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/ or run:"
    echo "  brew install node"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}${CROSS} Node.js version $NODE_VERSION is too old (need 18+)${NC}"
    exit 1
fi

echo -e "${GREEN}${CHECKMARK} Node.js: $(node -v)${NC}"
echo -e "${GREEN}${CHECKMARK} npm: $(npm -v)${NC}"
echo ""

#############################################################
# Step 2: Check PostgreSQL
#############################################################
echo -e "${BLUE}${DATABASE} Checking PostgreSQL...${NC}"
echo ""

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}${WARNING} PostgreSQL not found in PATH${NC}"
    echo ""
    echo "Please install PostgreSQL 14+:"
    echo "  macOS: brew install postgresql@14"
    echo "  Or download Postgres.app from https://postgresapp.com/"
    echo ""
    echo "After installation, add to PATH:"
    echo '  echo '"'"'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"'"'"' >> ~/.zshrc'
    echo "  source ~/.zshrc"
    echo ""
    exit 1
fi

echo -e "${GREEN}${CHECKMARK} PostgreSQL: $(psql --version | head -1)${NC}"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}${WARNING} PostgreSQL is not running${NC}"
    echo ""
    echo "Attempting to start PostgreSQL..."
    
    # Try to start with brew
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 &> /dev/null || brew services start postgresql &> /dev/null
        sleep 3
    fi
    
    if ! pg_isready &> /dev/null; then
        echo -e "${RED}${CROSS} Could not start PostgreSQL automatically${NC}"
        echo ""
        echo "Please start PostgreSQL manually:"
        echo "  macOS (Homebrew): brew services start postgresql@14"
        echo "  macOS (Postgres.app): Launch Postgres.app"
        echo "  Linux: sudo systemctl start postgresql"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
fi

echo -e "${GREEN}${CHECKMARK} PostgreSQL is running${NC}"
echo ""

#############################################################
# Step 3: Check/Create Database
#############################################################
echo -e "${BLUE}${DATABASE} Setting up database...${NC}"
echo ""

# Check if database exists
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw expense_app; then
    echo -e "${GREEN}${CHECKMARK} Database 'expense_app' exists${NC}"
else
    echo -e "${YELLOW}${WARNING} Database 'expense_app' not found, creating...${NC}"
    
    if createdb expense_app 2>/dev/null; then
        echo -e "${GREEN}${CHECKMARK} Database 'expense_app' created${NC}"
    else
        echo -e "${RED}${CROSS} Failed to create database${NC}"
        echo ""
        echo "Try creating manually:"
        echo "  psql postgres"
        echo "  CREATE DATABASE expense_app;"
        echo "  \q"
        exit 1
    fi
fi

# Grant permissions (for PostgreSQL 15+)
psql expense_app -c "GRANT ALL ON SCHEMA public TO $(whoami);" 2>/dev/null || true

echo ""

#############################################################
# Step 4: Check Backend Environment
#############################################################
echo -e "${BLUE}${WRENCH} Checking backend configuration...${NC}"
echo ""

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}${WARNING} Backend .env not found, creating from template...${NC}"
    cp backend/env.example backend/.env
    
    # Update .env with local defaults
    if command -v sed &> /dev/null; then
        sed -i '' 's/DB_USER=postgres/DB_USER='$(whoami)'/g' backend/.env 2>/dev/null || true
        sed -i '' 's/DB_PASSWORD=your_password_here/DB_PASSWORD=/g' backend/.env 2>/dev/null || true
    fi
    
    echo -e "${GREEN}${CHECKMARK} Created backend/.env with local defaults${NC}"
else
    echo -e "${GREEN}${CHECKMARK} Backend .env exists${NC}"
fi

echo ""

#############################################################
# Step 5: Install Dependencies
#############################################################
echo -e "${BLUE}${PACKAGE} Installing dependencies...${NC}"
echo ""

# Frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --silent
    echo -e "${GREEN}${CHECKMARK} Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}${CHECKMARK} Frontend dependencies already installed${NC}"
fi

# Backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install --silent
    cd ..
    echo -e "${GREEN}${CHECKMARK} Backend dependencies installed${NC}"
else
    echo -e "${GREEN}${CHECKMARK} Backend dependencies already installed${NC}"
fi

echo ""

#############################################################
# Step 6: Run Migrations
#############################################################
echo -e "${BLUE}${DATABASE} Running database migrations...${NC}"
echo ""

cd backend
if npm run migrate 2>&1 | grep -q "error"; then
    echo -e "${YELLOW}${WARNING} Some migrations may have already run${NC}"
else
    echo -e "${GREEN}${CHECKMARK} Migrations completed${NC}"
fi
cd ..

echo ""

#############################################################
# Step 7: Seed Database
#############################################################
echo -e "${BLUE}${DATABASE} Seeding database with demo data...${NC}"
echo ""

cd backend
if npm run seed 2>&1 | grep -q "error"; then
    echo -e "${YELLOW}${WARNING} Seed data may already exist${NC}"
else
    echo -e "${GREEN}${CHECKMARK} Database seeded${NC}"
fi
cd ..

echo ""

#############################################################
# Step 8: Health Checks
#############################################################
echo -e "${BLUE}${WRENCH} Running health checks...${NC}"
echo ""

# Check if ports are available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}${WARNING} Port 5000 (backend) is already in use${NC}"
    echo "Kill the process: kill -9 \$(lsof -ti:5000)"
    echo "Or the backend will use a different port"
    echo ""
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}${WARNING} Port 5173 (frontend) is already in use${NC}"
    echo "Kill the process: kill -9 \$(lsof -ti:5173)"
    echo "Or Vite will auto-suggest an alternative port"
    echo ""
fi

echo -e "${GREEN}${CHECKMARK} Health checks completed${NC}"
echo ""

#############################################################
# Summary
#############################################################
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${ROCKET} Setup Complete! Ready to start${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}${SERVER} URLs:${NC}"
echo "  Frontend:  ${GREEN}http://localhost:5173${NC}"
echo "  Backend:   ${GREEN}http://localhost:5000${NC}"
echo "  Health:    ${GREEN}http://localhost:5000/health${NC}"
echo ""
echo -e "${CYAN}👤 Demo Login Credentials:${NC}"
echo "  Admin:       ${MAGENTA}admin${NC} / password123"
echo "  Coordinator: ${MAGENTA}sarah${NC} / password123"
echo "  Salesperson: ${MAGENTA}mike${NC} / password123"
echo "  Accountant:  ${MAGENTA}lisa${NC} / password123"
echo "  Developer:   ${MAGENTA}developer${NC} / password123"
echo ""
echo -e "${CYAN}🎮 Controls:${NC}"
echo "  Press ${RED}Ctrl+C${NC} to stop both servers"
echo ""
echo -e "${BLUE}Starting servers in 3 seconds...${NC}"
echo ""

sleep 3

#############################################################
# Start Application
#############################################################
npm run start:all

