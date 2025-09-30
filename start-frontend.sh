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
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   Node.js Not Found${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Node.js is required to run this application.${NC}"
    echo ""
    echo -e "${BLUE}📥 Quick Installation (macOS):${NC}"
    echo ""
    echo -e "${GREEN}# Using Homebrew (recommended):${NC}"
    echo "  brew install node"
    echo ""
    echo -e "${GREEN}# Or download installer:${NC}"
    echo "  Visit: https://nodejs.org/"
    echo "  Download the LTS version"
    echo ""
    echo -e "${YELLOW}After installation:${NC}"
    echo "  1. Close and reopen your terminal"
    echo "  2. Run this script again: ./start-frontend.sh"
    echo ""
    echo -e "${BLUE}Need Homebrew? Install it first:${NC}"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   npm Not Found${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}npm should come with Node.js.${NC}"
    echo ""
    echo -e "${BLUE}Please reinstall Node.js:${NC}"
    echo "  https://nodejs.org/"
    echo ""
    exit 1
fi

# Get Node.js version
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

# Extract major version number (remove 'v' and get first number)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)

# Check if Node.js version is at least v18
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   Node.js Version Too Old${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Current version: ${NODE_VERSION}${NC}"
    echo -e "${YELLOW}Required version: v18 or higher${NC}"
    echo ""
    echo -e "${BLUE}📥 Upgrade Node.js (macOS):${NC}"
    echo ""
    echo -e "${GREEN}# Using Homebrew:${NC}"
    echo "  brew upgrade node"
    echo ""
    echo -e "${GREEN}# Or download latest:${NC}"
    echo "  Visit: https://nodejs.org/"
    echo "  Download the LTS version (v18+)"
    echo ""
    echo -e "${YELLOW}After upgrading:${NC}"
    echo "  1. Close and reopen your terminal"
    echo "  2. Verify: node -v"
    echo "  3. Run this script again: ./start-frontend.sh"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

# Display Node.js and npm versions with checkmarks
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} detected${NC} ${BLUE}(v18+ required)${NC}"
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
