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
NC='\033[0m' # No Color

echo -e "${BLUE}Starting frontend-only testing mode...${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
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
