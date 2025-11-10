#!/bin/bash

#############################################################
# ExpenseApp - Health Check Script
# Version: 1.27.15
# Purpose: Verify local deployment is working correctly
# Usage: ./scripts/health-check.sh
#############################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  ExpenseApp - Health Check${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

ERRORS=0

#############################################################
# 1. PostgreSQL Check
#############################################################
echo -e "${BLUE}🗄️  Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
    if pg_isready &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is not running${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ PostgreSQL not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

#############################################################
# 2. Database Check
#############################################################
echo -e "${BLUE}🗄️  Checking database...${NC}"

if command -v psql &> /dev/null; then
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw expense_app; then
        echo -e "${GREEN}✅ Database 'expense_app' exists${NC}"
    else
        echo -e "${RED}❌ Database 'expense_app' not found${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

#############################################################
# 3. Backend Dependencies Check
#############################################################
echo -e "${BLUE}📦 Checking backend dependencies...${NC}"

if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend dependencies missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

#############################################################
# 4. Frontend Dependencies Check
#############################################################
echo -e "${BLUE}📦 Checking frontend dependencies...${NC}"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Frontend dependencies missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

#############################################################
# 5. Backend Environment Check
#############################################################
echo -e "${BLUE}🔧 Checking backend environment...${NC}"

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Backend .env exists${NC}"
else
    echo -e "${RED}❌ Backend .env missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

#############################################################
# 6. Backend API Check
#############################################################
echo -e "${BLUE}🖥️  Checking backend API...${NC}"

if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Backend API is healthy${NC}"
        echo "   Response: $HEALTH_RESPONSE"
    else
        echo -e "${YELLOW}⚠️  Backend API responded but not healthy${NC}"
        echo "   Response: $HEALTH_RESPONSE"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Backend API not running (start with: npm run start:backend)${NC}"
fi

#############################################################
# 7. Frontend Check
#############################################################
echo -e "${BLUE}🌐 Checking frontend...${NC}"

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not running (start with: npm run dev)${NC}"
fi

#############################################################
# 8. Port Availability Check
#############################################################
echo -e "${BLUE}🔌 Checking port availability...${NC}"

if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Port 5000 (backend) is in use${NC}"
else
    echo -e "${YELLOW}⚠️  Port 5000 (backend) is available (backend not running)${NC}"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Port 5173 (frontend) is in use${NC}"
else
    echo -e "${YELLOW}⚠️  Port 5173 (frontend) is available (frontend not running)${NC}"
fi

#############################################################
# Summary
#############################################################
echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Health Check PASSED${NC}"
    echo ""
    echo -e "System Status: ${GREEN}ALL SYSTEMS GO${NC}"
    echo ""
    echo "📊 Quick Stats:"
    echo "  Frontend:  http://localhost:5173"
    echo "  Backend:   http://localhost:5000"
    echo "  Health:    http://localhost:5000/health"
    echo ""
else
    echo -e "${RED}❌ Health Check FAILED (${ERRORS} error(s))${NC}"
    echo ""
    echo "🔧 Recommended Actions:"
    
    if ! pg_isready &> /dev/null; then
        echo "  1. Start PostgreSQL: brew services start postgresql@14"
    fi
    
    if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw expense_app; then
        echo "  2. Create database: createdb expense_app"
        echo "  3. Run migrations: cd backend && npm run migrate"
        echo "  4. Seed database: cd backend && npm run seed"
    fi
    
    if [ ! -d "backend/node_modules" ] || [ ! -d "node_modules" ]; then
        echo "  5. Install dependencies: npm install && cd backend && npm install"
    fi
    
    echo ""
    echo "Run ./scripts/local-deploy.sh for automated setup"
    echo ""
fi

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

exit $ERRORS

