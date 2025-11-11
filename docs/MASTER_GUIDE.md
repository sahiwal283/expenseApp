# 🤖 MASTER GUIDE - ExpenseApp

**Last Updated:** November 10, 2025 (17:00 PST)  
**Status:** ✅ Production Active | 🔬 Sandbox Trade Show Checklist Feature (v1.28.0)

---

## 📋 Table of Contents

1. [Quick Reference](#-quick-reference)
2. [Application Overview](#-application-overview)
3. [Architecture](#-architecture)
4. [Critical Information](#-critical-information)
5. [Credentials & Access](#-credentials--access)
6. [Deployment](#-deployment)
7. [Development Workflows](#-development-workflows)
8. [Known Issues & Solutions](#-known-issues--solutions)
9. [API Reference](#-api-reference)
10. [Recent Sessions](#-recent-sessions)
11. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Reference

### Current Versions

**Production (Container 201 & 202)**
- **Frontend:** v1.4.13 (Container 202)
- **Backend:** v1.5.1 (Container 201)
- **Branch:** `main`
- **Status:** ✅ Stable, Live Users

**Sandbox (Container 203)**
- **Frontend:** v1.20.0 (Container 203)
- **Backend:** v1.18.0 (Container 203)
- **Branch:** `v1.6.0`
- **Status:** 🔬 Trade Show Checklist Feature Added

### Container Mapping (MEMORIZE THIS!)
- **Container 201** = **PRODUCTION** (Live users, real financial data)
- **Container 203** = **SANDBOX** (Testing environment)
- **Container 202** = **PRODUCTION Frontend**
- **Container 104** = **NPMplus Proxy**

### Quick Access
- **Production URL:** https://expapp.duckdns.org
- **Sandbox URL:** http://192.168.1.144
- **Proxmox Host:** 192.168.1.190
- **Repository:** https://github.com/sahiwal283/expenseApp

---

## 📱 Application Overview

### What is ExpenseApp?

**ExpenseApp** is a professional trade show expense management system for **Haute Brands** and its sub-brands (Alpha, Beta, Gamma, Delta). It manages the complete expense lifecycle from receipt capture to Zoho Books accounting integration.

### Core Modules

| Module | Features | Key Users |
|--------|----------|-----------|
| **Event Management** | Create events, manage participants, track budgets | Admin, Coordinator |
| **Expense Submission** | Upload receipts, OCR extraction, offline support | All users |
| **Approval Workflows** | Automated approval, entity assignment, reimbursement | Admin, Accountant |
| **Zoho Integration** | 5-entity sync, duplicate prevention, OAuth 2.0 | Admin, Accountant |
| **Reports** | Detailed & summary reports, filtering, exports | Admin, Accountant |
| **User Management** | CRUD operations, role assignments | Admin, Developer |
| **Role Management** | Custom roles, dynamic permissions | Admin, Developer |
| **Dashboard** | Widgets, quick actions, pending tasks | All users |
| **Developer Tools** | Diagnostics, health checks, cache management | Developer only |
| **PWA/Offline** | Service Worker, IndexedDB, background sync | All users |
| **Event Checklist** | Trade show logistics (flights, hotels, car rentals, booth) | Coordinator, Admin |

### Unique Capabilities

1. **Dynamic Role System** - Create custom roles with colors and permissions
2. **Automated Approval Workflows** - No manual approval buttons, status changes automatically
3. **5-Entity Zoho Support** - Multi-brand accounting with separate Zoho organizations
4. **Offline-First Architecture** - Submit expenses without internet, sync automatically
5. **OCR + LLM Enhancement** (Sandbox) - AI-powered receipt extraction with continuous learning
6. **Reimbursement Tracking** - Complete workflow from request to payment
7. **Developer Dashboard** - Exclusive debugging tools for developer role
8. **Entity Re-assignment** - Change Zoho entity and re-push expenses
9. **Trade Show Checklist** - Complete event logistics management

### Technology Stack

**Frontend:** React 18 + TypeScript + Tailwind CSS + Vite  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Architecture:** Repository Pattern (Backend) + Component Modularization (Frontend)  
**Infrastructure:** Proxmox LXC (Debian 12) + Nginx + PM2  
**Integrations:** Zoho Books API (OAuth 2.0)  
**OCR:** Tesseract (production) | External microservice with Ollama LLM (sandbox)  
**PWA:** Service Worker + IndexedDB + Background Sync

---

## 🏗️ Architecture

### Backend Architecture (v1.28.0+)

**Pattern: Routes → Services → Repositories → Database**

```
┌─────────────────┐
│  Routes/       │  ← HTTP request handling, validation
│  Controllers   │  ← Input sanitization, response formatting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Services       │  ← Business logic, orchestration
│                 │  ← Authorization checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repositories   │  ← Data access layer
│                 │  ← Query building, type safety
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← Database
└─────────────────┘
```

**Available Repositories:**
- `BaseRepository` - Common CRUD operations
- `ExpenseRepository` - Expense data access
- `UserRepository` - User data access
- `EventRepository` - Event data access
- `AuditLogRepository` - Audit log data access
- `ChecklistRepository` - Checklist data access
- `ApiRequestRepository` - API analytics data access

**Available Services:**
- `ExpenseService` - Expense business logic
- `DevDashboardService` - Developer dashboard logic
- `ZohoMultiAccountService` - Multi-entity Zoho integration
- `ZohoBooksService` - Zoho Books API integration
- `OCRService` - OCR processing orchestration
- `UserCorrectionService` - OCR correction tracking
- `DuplicateDetectionService` - Expense duplicate detection
- `ExpenseAuditService` - Audit trail management

### Frontend Architecture (v1.28.0+)

**Pattern: Feature-Based Organization with Component Modularization**

```
src/components/
├── common/                ← Shared components
│   ├── Badge.tsx
│   ├── StatusBadge.tsx
│   └── ...
├── expenses/              ← Expense feature
│   ├── ExpenseSubmission.tsx
│   ├── ExpenseSubmission/  ← Sub-components
│   │   ├── hooks/          ← Feature hooks
│   │   └── *.tsx
│   └── ReceiptUpload/
├── admin/                 ← Admin features
│   ├── AdminSettings.tsx
│   └── AdminSettings/
└── checklist/             ← Checklist feature
    └── sections/
```

**Benefits:**
- Feature isolation
- Reusable hooks
- Component composition
- Easier testing
- Better maintainability

### File Structure

**Backend:**
```
backend/src/
├── config/                    ← Configuration files
├── database/
│   ├── schema.sql             ← Base schema
│   ├── migrations/            ← Database migrations
│   └── repositories/          ← Repository pattern
├── middleware/                ← Express middleware
├── routes/                    ← HTTP route handlers
├── services/                  ← Business logic layer
└── utils/                     ← Utility functions
```

**Frontend:**
```
src/
├── components/
│   ├── common/                ← Shared components
│   ├── expenses/              ← Expense feature
│   ├── admin/                 ← Admin features
│   └── checklist/             ← Checklist feature
├── hooks/                      ← Shared custom hooks
├── utils/                      ← Utility functions
└── constants/                  ← App constants
```

### OCR System Architecture

**Sandbox (v1.11.0+):**
- **External OCR Service** (192.168.1.195:8000) with LLM enhancement
- **Ollama LLM** (192.168.1.173:11434) - dolphin-llama3
- **Model Training** (192.168.1.197:5001) - v1.2.0 prompts
- **Data Pool Integration** (192.168.1.196:5000) with UTF-8 encoding

**Production:**
- **Tesseract OCR** - Embedded processing
- **No LLM enhancement** - Rule-based inference only

---

## 🚨 Critical Information

### ⚠️ PRODUCTION DEPLOYMENT PROTECTION

**🛑 NEVER DEPLOY TO PRODUCTION WITHOUT EXPLICIT USER CONFIRMATION!**

### Database Schema Updates

**ALWAYS update database schema constraints when deploying code that uses new values!**

**Common Pitfall:** Deploying code that uses new enum values (like new status types) WITHOUT updating the database CHECK constraints will cause runtime errors.

**Required Steps:**
1. Update `schema.sql` - Add new values to CHECK constraints
2. Create migration file for existing constraint updates
3. Test in sandbox FIRST
4. Run migration in production BEFORE deploying code
5. Verify constraint - Check that new values are allowed

**Example:**
```sql
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;
ALTER TABLE table_name ADD CONSTRAINT constraint_name 
  CHECK (column_name IN ('value1', 'value2', 'NEW_VALUE'));
```

### Schema Validation Before Deployment (CRITICAL)

**⚠️ MUST RUN BEFORE EVERY PRODUCTION DEPLOYMENT**

**Why Schema Validation is Critical:**
- Prevents `column does not exist` errors at runtime
- Catches missing tables before code tries to query them
- Verifies foreign key constraints are properly defined
- Ensures CHECK constraints match code expectations
- Identifies missing migrations before deployment

**How to Run Validation:**

**Method 1: Automated Script (If Available)**
```bash
cd backend
npm run validate-schema
```

**Method 2: Manual SQL Validation**
```bash
# Connect to production database
ssh root@192.168.1.190
pct exec 201 -- su - postgres -c 'psql -d expense_app_production'

# 1. Verify all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

# 2. Verify table column counts
SELECT 
  table_name,
  COUNT(column_name) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('event_checklists', 'checklist_flights', 'expenses', 'events', 'users')
GROUP BY table_name
ORDER BY table_name;

# 3. Verify critical columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'event_checklists' AND column_name IN ('event_id', 'booth_ordered', 'electricity_ordered'))
    OR (table_name = 'expenses' AND column_name IN ('id', 'user_id', 'event_id', 'status', 'zoho_entity'))
  )
ORDER BY table_name, column_name;

# 4. Verify foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

**Pre-Deployment Checklist:**
- [ ] All required tables exist
- [ ] Column counts match expected values
- [ ] Critical columns exist (foreign keys, status fields)
- [ ] Foreign key constraints are properly defined
- [ ] CHECK constraints exist for enum-like fields
- [ ] Indexes exist on foreign key columns

**If Validation Fails:**
1. **STOP deployment immediately**
2. Document the failure
3. Review migration files
4. Apply missing migrations
5. Re-run validation
6. **Only proceed after validation passes**

### Sandbox vs Production Credentials

**CRITICAL UNDERSTANDING**: Sandbox and production use **SEPARATE** Zoho Books OAuth credentials intentionally!

**Why Separate Credentials?**
- ✅ **Data Isolation**: Sandbox writes to "Meals" account, production to "Trade Shows"
- ✅ **Security**: Sandbox breach doesn't compromise production data
- ✅ **Testing Freedom**: Can delete all sandbox test data safely
- ✅ **Audit Trail**: Easy to identify what's test vs real

**DO NOT "Fix" This!**
- **Sandbox**: Uses OAuth app ending in `...EGPHAA` → writes to "Meals" expense account
- **Production**: Uses OAuth app ending in `...SQNQVI` → writes to "Trade Shows" expense account
- **Both**: Connect to same Zoho Books organization (856048585 - Haute Brands)

**Credential Locations:**
- **Sandbox Credentials**: `credentials/SANDBOX_CREDENTIALS.md`
- **Production Credentials**: `credentials/HAUTE_CREDENTIALS.md`
- **DO NOT** mix or "unify" these credentials!

### AI Training Pipeline Database Setup

**⚠️ TRAINING PIPELINE REQUIRES SPECIFIC DATABASE TABLES!**

As of **v1.11.0+**, the AI training pipeline requires `ocr_corrections` table to exist.

**Required Database Migrations:**
- `006_create_ocr_corrections_table.sql` - Creates main corrections table
- `007_enhance_ocr_corrections_for_cross_environment.sql` - Adds training features

**How to Verify:**
```bash
ssh root@192.168.1.190
pct exec 203 -- su - postgres -c 'psql -d expense_app -c "\dt"'
# Should see: ocr_corrections
```

### Frontend Deployment Directory

**CRITICAL**: Frontend MUST be deployed to `/var/www/expenseapp` (NOT `/var/www/html`)

**Why:**
- Nginx is configured to serve from `/var/www/expenseapp`
- `/var/www/html` is used by other services
- Wrong directory = 404 errors

**Verify:**
```bash
ssh root@192.168.1.190 "pct exec 203 -- ls -la /var/www/expenseapp"
```

### Backend Deployment Path Case Sensitivity

**CRITICAL**: Backend MUST be deployed to `/opt/expenseApp/backend` (capital 'A' in expenseApp)

**Why:**
- Service file references exact path
- Case-sensitive filesystem
- Wrong case = service won't start

---

## 🔐 Credentials & Access

### Production Environment

**URL**: https://expapp.duckdns.org  
**Containers**: 201 (Backend), 202 (Frontend)  
**Proxmox Host**: 192.168.1.190

⚠️ **Production credentials are private and not documented here for security**

### Sandbox Environment

**URL**: http://192.168.1.144  
**Container**: 203  
**Database**: `expense_app_sandbox`

**ALL sandbox users share password**: `sandbox123`

| Username | Email | Role |
|----------|-------|------|
| admin | admin@example.com | admin |
| accountant | accountant@example.com | accountant |
| coordinator | coordinator@example.com | coordinator |
| salesperson | salesperson@example.com | salesperson |
| developer | developer@example.com | developer |

**Reset Sandbox Passwords:**
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && node reset-sandbox-passwords.js'"
```

### Proxmox Access

**Host**: 192.168.1.190  
**User**: root  
**Access**: SSH key authentication

**Common Commands:**
```bash
# List containers
pct list

# Enter container
pct exec 203 -- bash

# Copy file to container
pct push 203 /local/file /remote/path

# Check container status
pct status 203
```

---

## 🚀 Deployment

### Local Development Setup

**Prerequisites:**
- Node.js v18+
- npm v8+
- PostgreSQL 16+

**Quick Start:**
```bash
# Clone repo
git clone https://github.com/sahiwal283/expenseApp.git
cd expenseApp

# Frontend
npm install
npm run dev
# → http://localhost:5173

# Backend (new terminal)
cd backend
npm install
cp env.example .env
# Edit .env with your database credentials
npm run migrate
npm run seed
npm run dev
# → http://localhost:5000/api
```

### Sandbox Deployment (Container 203)

**CRITICAL**: Follow this process EXACTLY to avoid caching issues

**Pre-Deployment Checklist:**
- [ ] All changes on correct branch
- [ ] Version updated in `package.json`
- [ ] Service worker cache names updated
- [ ] Changes committed and pushed to GitHub

**Build Process:**
```bash
# 1. Clean
rm -rf dist/

# 2. Build
npm run build

# 3. Add build ID
BUILD_ID=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: ${BUILD_ID} -->" >> dist/index.html

# 4. Create tarball
tar -czf frontend-v1.0.X-$(date +%H%M%S).tar.gz -C dist .
```

**Deploy to Sandbox:**
```bash
# 1. Copy to Proxmox
TARFILE=$(ls -t frontend-v1.0.*-*.tar.gz | head -1)
scp "$TARFILE" root@192.168.1.190:/tmp/sandbox-deploy.tar.gz

# 2. Deploy to /var/www/expenseapp (NOT /var/www/html!)
ssh root@192.168.1.190 "
  pct push 203 /tmp/sandbox-deploy.tar.gz /tmp/sandbox-deploy.tar.gz &&
  pct exec 203 -- bash -c '
    cd /var/www/expenseapp &&
    rm -rf * &&
    tar -xzf /tmp/sandbox-deploy.tar.gz &&
    chown -R 501:staff /var/www/expenseapp &&
    systemctl restart nginx &&
    echo \"✓ Deployed\"
  '
"

# 3. Restart NPMplus to clear proxy cache
ssh root@192.168.1.190 "pct stop 104 && sleep 3 && pct start 104 && echo '✓ NPMplus restarted'"
```

**Verify Deployment:**
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c '
  echo \"=== Service Worker ===\"
  head -3 /var/www/expenseapp/service-worker.js
  echo
  echo \"=== Build ID ===\"
  grep \"Build:\" /var/www/expenseapp/index.html
'"
```

**Browser Testing:**
1. Close all browser tabs with sandbox
2. Clear browsing data (cached files, cookies, all time)
3. Restart browser completely
4. Open incognito window
5. Open DevTools → Network tab → Check "Disable cache"
6. Load http://192.168.1.144
7. Verify version in footer matches deployment

### Production Deployment

⚠️ **Production deployment requires explicit user approval - never deploy automatically**

**Pre-Deployment:**
1. Run schema validation (see Critical Information section)
2. Test in sandbox first
3. Get explicit user approval
4. Backup production database

**Deployment Steps:**
1. Deploy backend to Container 201
2. Run database migrations
3. Restart backend service
4. Deploy frontend to Container 202
5. Restart NPMplus proxy (Container 104)
6. Verify deployment

**Post-Deployment:**
1. Test critical functionality
2. Monitor logs for errors
3. Verify version numbers
4. Check service status

---

## 🔧 Development Workflows

### Version Control

**Branch Strategy:**
- `main` - Production code (protected)
- `v1.X.X` - Feature branches
- `hotfix/*` - Emergency fixes

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

### Testing Checklist

**Before Committing:**
- [ ] Code compiles without errors
- [ ] Linter passes
- [ ] TypeScript types are correct
- [ ] No `any` types used
- [ ] Tests pass (if applicable)

**Before Deployment:**
- [ ] Tested in sandbox
- [ ] Schema validation passed
- [ ] Version numbers updated
- [ ] Service worker cache updated
- [ ] Database migrations tested

### Code Quality Standards

**TypeScript:**
- No `any` types
- Proper interfaces for all data structures
- Type safety throughout

**React:**
- Use custom hooks for shared logic
- Component composition over inheritance
- Feature-based organization

**Backend:**
- Repository pattern for data access
- Service layer for business logic
- Thin controllers (routes)

---

## 🐛 Known Issues & Solutions

### Critical Issues (RESOLVED)

**1. Database Migration System (RESOLVED)**
- **Issue**: Migrations not running automatically
- **Solution**: Manual migration process established
- **Status**: ✅ Resolved

**2. Expenses Not Assigning Entity (RESOLVED)**
- **Issue**: Expenses not getting Zoho entity assigned
- **Solution**: Fixed entity assignment logic
- **Status**: ✅ Resolved

**3. Caching Problems (RESOLVED)**
- **Issue**: Service worker caching old versions
- **Solution**: Cache busting procedure established
- **Status**: ✅ Resolved

**4. Auto-Logout Not Working (RESOLVED)**
- **Issue**: Users not logged out after inactivity
- **Solution**: Fixed session timeout logic
- **Status**: ✅ Resolved

### Common Issues

**1. "npm: command not found"**
- **Solution**: Install Node.js v18+ and npm

**2. Port Already in Use**
- **Solution**: Kill process using port or change port in config

**3. Database Connection Failed**
- **Solution**: Check database credentials and connection string

**4. Sandbox Not Updating After Deployment**
- **Solution**: Clear browser cache, restart NPMplus, use incognito mode

**5. OCR Not Working / Low Accuracy**
- **Solution**: Check OCR service status, verify image quality, check logs

---

## 📡 API Reference

### Core Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

**Expenses:**
- `GET /api/expenses` - Get expenses (with filters)
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

**Events:**
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event

**Checklist:**
- `GET /api/checklist/:eventId` - Get checklist for event
- `POST /api/checklist` - Create checklist
- `PUT /api/checklist/:id` - Update checklist
- `POST /api/checklist/:id/flights` - Add flight
- `POST /api/checklist/:id/hotels` - Add hotel
- `POST /api/checklist/:id/car-rentals` - Add car rental

**OCR:**
- `POST /api/ocr/v2/process` - Process receipt with OCR
- `POST /api/ocr/v2/corrections` - Submit user corrections

**Zoho:**
- `POST /api/zoho/push/:expenseId` - Push expense to Zoho
- `GET /api/zoho/accounts` - Get Zoho accounts

### API Authentication

All endpoints (except login/register) require authentication via JWT token in `Authorization` header:
```
Authorization: Bearer <token>
```

---

## 📝 Recent Sessions

### Session: November 10, 2025 - Full Codebase Refactor (v1.28.0)

**Status:** ✅ Refactor Complete - Architecture Modernized

**Objectives:**
1. Split files >500 lines into smaller, focused modules
2. Separate concerns (controllers, services, repositories)
3. Extract reusable patterns (hooks, utilities, shared components)
4. Remove legacy artifacts
5. Improve code reusability

**Files Refactored:**

**Backend:**
- `devDashboard.ts`: 1,058 lines → Split into service layer
- `expenses.ts`: 980 lines → Split into ExpenseService + ExpenseRepository
- `checklist.ts`: 596 lines → Maintained with Zod validation
- `ocrV2.ts`: 437 lines → Maintained with OCR service architecture

**Frontend:**
- `EventSetup.tsx`: 1,062 lines → Split into hooks + sub-components
- `ExpenseSubmission.tsx`: 915 lines → Split into ExpenseSubmission/ + hooks/
- `AdminSettings.tsx`: 745 lines → Split into AdminSettings/ sub-components
- `ReceiptUpload.tsx`: 719 lines → Split into ReceiptUpload/ sub-components
- `BoothSection.tsx`: 699 lines → Split into BoothSection/ sub-components
- `UserManagement.tsx`: 641 lines → Split into UserManagement/ sub-components

**Architecture Changes:**
- ✅ Repository pattern implemented (Backend)
- ✅ Service layer created (Backend)
- ✅ Component modularization (Frontend)
- ✅ Custom hooks extracted (Frontend)
- ✅ Type safety improved (Full codebase)

**Complexity Reduction Strategy:**

**What Worked:**
- ✅ **Helper Function Extraction** - Extracted 13 helper functions from DevDashboardService (368 lines → cleaner service)
- ✅ **Utility File Organization** - Frontend utilities organized by domain (date, event, filter, OCR)
- ✅ **Single Responsibility** - Each helper has one clear purpose
- ✅ **Reusability** - Helpers can be used across multiple services/components
- ✅ **Testability** - Pure functions easier to test independently

**Helper Functions Created:**

**Backend (`DevDashboardService.helpers.ts`):**
- 6 alert functions: `checkErrorRateAlert`, `checkSlowResponseAlert`, `checkStaleSessionsAlert`, `checkEndpointFailureAlert`, `checkTrafficSpikeAlert`, `checkAuthFailuresAlert`
- 7 utility functions: `parseTimeRange`, `getSystemMemoryMetrics`, `getSystemCPUMetrics`, `formatSessionDuration`, `mapEndpointToPage`, `checkOCRServiceHealth`, `calculateOCRCosts`

**Frontend (`src/utils/`):**
- `dateUtils.ts` - Date parsing/formatting (prevents timezone bugs)
- `eventUtils.ts` - Event filtering (removes old events from dropdowns)
- `filterUtils.ts` - Generic filtering logic
- `ocrUtils.ts` - OCR correction tracking
- Plus: `apiClient.ts`, `sessionManager.ts`, `expenseUtils.ts`, `reportUtils.ts`, `checklistUtils.ts`

**Lessons Learned:**
- **Extract when:** Function used in multiple places, >20 lines, complex logic, pure function
- **Don't extract when:** Used once, tightly coupled, <5 lines, needs component state
- **File naming:** Use `.helpers.ts` suffix for backend, domain-based names for frontend
- **Documentation:** Always add JSDoc comments with `@param` and `@returns`

**Reference:** See `docs/HELPER_FUNCTIONS.md` for complete helper function reference

**For Future Development:**
- Backend: Create repository → service → route → helpers (if needed)
- Frontend: Create feature directory → extract hooks → use shared components → use utilities
- Always: Check for existing helpers before creating new ones, use TypeScript interfaces, add JSDoc comments

### Session: November 10, 2025 - Production Login Failure Incident

**Status:** ✅ RESOLVED - Production Login Restored

**Issue:** All users unable to log in to production - "Invalid username or password" error

**Root Causes:**
1. **Database Schema Mismatch** - Code referenced `audit_log` but database had `audit_logs`
2. **Missing Database Columns** - `audit_logs` table missing 7 required columns
3. **Network-Level Routing Override** - iptables DNAT rule redirecting traffic to sandbox
4. **Stale Backend Process** - Backend service running old code

**Resolution:**
1. Fixed table name mismatch (`audit_log` → `audit_logs`)
2. Added missing columns to `audit_logs` table
3. Removed malicious NAT rule
4. Restarted backend service

**Lessons Learned:**
- Network-level rules override application config
- Schema validation scripts created
- Always restart services after deployments
- Multiple symptoms can have single root cause

---

## 🔍 Troubleshooting

### Common Problems

**1. "npm: command not found"**
```bash
# Install Node.js v18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**2. Port Already in Use**
```bash
# Find process using port
lsof -i :5000
# Kill process
kill -9 <PID>
```

**3. Database Connection Failed**
- Check database credentials in `.env`
- Verify PostgreSQL is running
- Check connection string format

**4. Sandbox Not Updating After Deployment**
- Clear browser cache completely
- Restart NPMplus: `pct stop 104 && pct start 104`
- Test in incognito mode
- Check service worker version

**5. OCR Not Working**
- Check OCR service status
- Verify image quality
- Check backend logs: `journalctl -u expenseapp-backend -f`
- Verify OCR service endpoint is accessible

**6. Service Worker Issues**
- Clear browser cache
- Unregister service worker in DevTools
- Hard refresh (Ctrl+Shift+R)
- Check service worker version matches deployment

### Debugging Commands

**Check Backend Logs:**
```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend -f"
```

**Check Frontend Files:**
```bash
ssh root@192.168.1.190 "pct exec 202 -- ls -la /var/www/expenseapp"
```

**Check Database:**
```bash
ssh root@192.168.1.190 "pct exec 201 -- su - postgres -c 'psql -d expense_app_production'"
```

**Check Service Status:**
```bash
ssh root@192.168.1.190 "pct exec 201 -- systemctl status expenseapp-backend"
```

---

## 📚 Additional Resources

### External Documentation
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Express**: https://expressjs.com/
- **Zoho Books API**: https://www.zoho.com/books/api/v3/

### Project-Specific Documentation
- Database schema: `backend/src/database/schema.sql`
- Deployment scripts: `deployment/` folder
- Nginx config: `deployment/nginx/expenseapp.conf`
- Repository pattern: `backend/src/database/repositories/README.md`
- OCR system: `backend/src/services/ocr/README.md`
- Helper functions: `docs/HELPER_FUNCTIONS.md` - Complete reference for all helper functions
- Frontend utilities: `src/utils/README.md` - Frontend utility functions guide

---

## 🤝 AI Assistant Guidelines

**When working on this project:**

1. **Read this file first** - It contains all context you need
2. **Update this file** with new issues, solutions, and session summaries
3. **Follow the deployment checklist** religiously
4. **Always update version numbers** with every change
5. **Test in sandbox first** - never deploy directly to production
6. **Commit atomically** - one feature/fix per commit
7. **Document breaking changes** clearly
8. **Ask for approval** before:
   - Merging to main
   - Deploying to production
   - Making database schema changes
   - Changing authentication/security logic
9. **Be cautious** with:
   - Sandbox credentials (never change them)
   - Production access (require explicit permission)
   - Database migrations (test locally first)
10. **Communicate clearly** - explain what you're doing and why

**Code Quality Rules:**
- ❌ Never use `any` types in TypeScript
- ✅ Always define proper interfaces
- ✅ Follow repository pattern (backend)
- ✅ Use component modularization (frontend)
- ✅ Extract reusable hooks
- ✅ Add JSDoc comments for public methods

---

**END OF MASTER GUIDE**

For updates to this document, add new sections under appropriate headings and update the "Last Updated" date at the top.
