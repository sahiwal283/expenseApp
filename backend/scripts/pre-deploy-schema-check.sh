#!/bin/bash

###############################################################################
# PRE-DEPLOYMENT SCHEMA VALIDATION SCRIPT
# 
# Purpose: Run database schema integration tests before deployment
# Usage: ./scripts/pre-deploy-schema-check.sh [environment]
# Environment: sandbox | production (default: sandbox)
#
# Exit Codes:
#   0 - All schema tests passed
#   1 - Schema tests failed or schema drift detected
#   2 - Database connection failed
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-sandbox}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PRE-DEPLOYMENT SCHEMA VALIDATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Backend Dir: ${BACKEND_DIR}"
echo ""

# Load environment variables
if [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE="${BACKEND_DIR}/.env.production"
else
    ENV_FILE="${BACKEND_DIR}/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: Environment file not found: ${ENV_FILE}${NC}"
    exit 2
fi

echo -e "${BLUE}📂 Loading environment from: ${ENV_FILE}${NC}"
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# Test database connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ FAILED: Cannot connect to database${NC}"
    echo -e "${RED}   Host: $DB_HOST:$DB_PORT${NC}"
    echo -e "${RED}   Database: $DB_NAME${NC}"
    echo -e "${RED}   User: $DB_USER${NC}"
    exit 2
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Run schema integration tests
echo -e "${BLUE}🧪 Running database schema integration tests...${NC}"
echo ""

cd "$BACKEND_DIR"

# Run tests with Vitest
npm run test:integration:schema 2>&1 | tee /tmp/schema-test-output.txt

TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: All schema tests passed!${NC}"
    echo -e "${GREEN}   Database schema matches code expectations.${NC}"
    echo -e "${GREEN}   Safe to proceed with deployment.${NC}"
    echo ""
    
    # Check for warnings in output
    if grep -q "SCHEMA DRIFT DETECTED" /tmp/schema-test-output.txt; then
        echo -e "${YELLOW}⚠️  WARNING: Schema drift detected (see above)${NC}"
        echo -e "${YELLOW}   Review unexpected columns before deploying.${NC}"
        echo ""
    fi
    
    exit 0
else
    echo -e "${RED}❌ FAILED: Schema tests failed!${NC}"
    echo -e "${RED}   Database schema does not match code expectations.${NC}"
    echo -e "${RED}   DO NOT DEPLOY until schema issues are resolved.${NC}"
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo -e "  1. Missing database migrations"
    echo -e "  2. Schema drift (manual changes to database)"
    echo -e "  3. Code expects columns/tables that don't exist"
    echo -e "  4. Mismatched data types or constraints"
    echo ""
    echo -e "${YELLOW}Suggested actions:${NC}"
    echo -e "  1. Review test output above"
    echo -e "  2. Run pending migrations: npm run migrate"
    echo -e "  3. Check for manual database changes"
    echo -e "  4. Update code to match actual schema"
    echo ""
    
    exit 1
fi

