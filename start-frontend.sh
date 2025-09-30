#!/bin/bash

# Trade Show Expense App - Frontend Only Startup
# Quick start for frontend testing without backend

echo "========================================="
echo "Trade Show Expense App - Frontend Only"
echo "Version: 0.5.0-alpha (Pre-release)"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js v18 or higher from:"
    echo "  https://nodejs.org/"
    echo ""
    echo "Or install via Homebrew (macOS):"
    echo "  brew install node"
    echo ""
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed${NC}"
    echo ""
    echo "npm should come with Node.js. Please reinstall Node.js from:"
    echo "  https://nodejs.org/"
    echo ""
    exit 1
fi

# Display Node.js and npm versions
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} detected${NC}"
echo -e "${GREEN}✓ npm ${NPM_VERSION} detected${NC}"
echo ""

echo -e "${BLUE}Starting frontend-only testing mode...${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
    echo ""
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Frontend Ready for Testing!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${BLUE}Note: This is frontend-only mode${NC}"
echo -e "${YELLOW}Data is stored in browser localStorage${NC}"
echo ""
echo -e "${GREEN}Opening at:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}Demo Login Credentials:${NC}"
echo "  Admin:       admin / admin"
echo "  Coordinator: sarah / password"
echo "  Salesperson: mike / password"
echo "  Accountant:  lisa / password"
echo ""
echo -e "${BLUE}Starting development server...${NC}"
echo "Press Ctrl+C to stop"
echo ""

# Start frontend
npm run dev
