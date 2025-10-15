# 🤖 AI MASTER GUIDE - ExpenseApp
**Version:** 1.0.16  
**Last Updated:** October 14, 2025  
**Status:** Production & Sandbox Active

---

## 📋 Document Purpose

This is the **SINGLE AUTHORITATIVE SOURCE** for all AI assistants working on the ExpenseApp project. It consolidates:
- Architecture and technical specifications
- Setup, deployment, and configuration guides
- Credentials and access information
- Known issues, fixes, and lessons learned
- Development workflows and best practices
- Session summaries and historical context

**⚠️ IMPORTANT**: Future AI sessions should UPDATE this file rather than creating new documentation files.

---

## 🤖 CRITICAL AI INSTRUCTIONS

**READ THIS FIRST!** These are non-negotiable rules for ALL AI assistants working on this project.

### Branch Management Strategy

**RULE 1: Always use the `v1.0.10` branch for sandbox development**

- **DO NOT** create new branches for features, refactors, or bug fixes unless explicitly instructed
- ALL sandbox development happens on `v1.0.10` branch
- Only create a new branch if:
  1. User explicitly requests it, OR
  2. Making a pull request to `main` for production deployment
- If you accidentally create a new branch:
  1. Immediately merge it back into `v1.0.10`
  2. Delete the temporary branch
  3. Continue work on `v1.0.10`

**Example (CORRECT):**
```bash
git checkout v1.0.10
# Make changes
git add -A
git commit -m "your message"
git push origin v1.0.10
```

**Example (WRONG - Don't do this):**
```bash
git checkout -b feature/new-feature  # ❌ WRONG! Don't create new branches
```

### Version Number Management

**RULE 2: ALWAYS increment version numbers for EVERY deployment**

Version numbers are critical for cache busting and deployment verification. Increment even for small changes.

**Files to Update (every time):**
1. `package.json` → `"version": "1.0.X"`
2. `backend/package.json` → `"version": "1.0.X"`
3. `public/service-worker.js` → Update ALL version references:
   - Header comment: `// Version: 1.0.X`
   - `CACHE_NAME = 'expenseapp-v1.0.X'`
   - `STATIC_CACHE = 'expenseapp-static-v1.0.X'`
   - `console.log('[ServiceWorker] Installing v1.0.X...')` 
   - `console.log('[ServiceWorker] Activating v1.0.X...')`
   - `console.log('[ServiceWorker] v1.0.X activated and ready!')`

**Version Incrementing Pattern:**
- Bug fixes / small changes: Increment patch (1.0.24 → 1.0.25)
- New features: Increment minor (1.0.25 → 1.1.0)
- Breaking changes: Increment major (1.1.0 → 2.0.0)

**Why This Matters:**
- Browser caching will show old version if not incremented
- NPMplus proxy caching requires version changes
- User will see wrong version number (confusing)
- Service worker won't update properly

### Cache Busting Procedure

**RULE 3: ALWAYS clear caches when deploying to sandbox**

The sandbox environment has THREE layers of caching that must be cleared:

1. **Browser Cache** (handled by version increment)
2. **Service Worker Cache** (handled by version increment)
3. **NPMplus Proxy Cache** (MUST manually restart)

**Deployment Commands (REQUIRED):**
```bash
# 1. Build frontend
rm -rf dist/
npm run build

# 2. Add unique build ID
BUILD_ID=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: ${BUILD_ID} -->" >> dist/index.html

# 3. Deploy to sandbox
tar -czf frontend-v1.0.X-${BUILD_ID}.tar.gz -C dist .
scp frontend-v1.0.X-${BUILD_ID}.tar.gz root@192.168.1.190:/tmp/sandbox-deploy.tar.gz
ssh root@192.168.1.190 "
  pct push 203 /tmp/sandbox-deploy.tar.gz /tmp/sandbox-deploy.tar.gz && 
  pct exec 203 -- bash -c 'cd /var/www/expenseapp && rm -rf * && tar -xzf /tmp/sandbox-deploy.tar.gz && systemctl restart nginx' &&
  pct stop 104 &&  # ← THIS IS CRITICAL! Clears NPMplus cache
  sleep 3 &&
  pct start 104 &&  # ← Restart NPMplus
  sleep 2
"
```

**❌ Common Mistake:**
Forgetting to restart NPMplus (LXC 104). This causes the old version to be cached at the proxy level even though files are updated.

### Backend Log Checking

**RULE 4: ALWAYS check backend logs after deployment (unless impossible)**

After ANY backend deployment, verify it's running correctly:

```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'systemctl status expenseapp-backend --no-pager | head -20 && echo && journalctl -u expenseapp-backend -n 30 --no-pager | tail -15'"
```

**Look for:**
- ✅ `Active: active (running)` 
- ✅ `Server running on port 3000`
- ✅ No error messages in logs
- ❌ Any stack traces
- ❌ `Error:` or `ECONNREFUSED`

### Testing Requirements

**RULE 5: Tell the user SPECIFICALLY what to test after changes**

Don't say "test the app" - be specific:

**Good Example:**
```
Please test:
1. Go to Expenses page
2. Click "Add Expense" button
3. Fill out form with test data
4. Click Submit
5. Verify expense appears in table
6. Check browser console for errors
```

**Bad Example:**
```
Please test the changes ❌ (too vague)
```

### Documentation Standards

**RULE 6: Update this master guide, not individual files**

- Add new information to appropriate sections in THIS file
- Don't create separate markdown files for session summaries
- Don't create temporary documentation files
- Exception: CHANGELOG.md (keep separate per GitHub standards)

### Response Format

**RULE 7: Each response should include a progress checklist**

User specifically requested this format:

```
## 📋 REFACTOR/TASK PROGRESS

### ✅ COMPLETED
- [x] Item 1
- [x] Item 2

### 🔄 IN PROGRESS
- [ ] Item 3 (current step)

### 📅 UPCOMING
- [ ] Item 4
- [ ] Item 5

### 🔧 THIS INCREMENT
[What changed]

### 🧪 TESTING REQUIRED
[Specific test steps]
```

---

## 🏗️ PROJECT OVERVIEW

### Application Summary

**ExpenseApp** is a full-stack web application for managing trade show expenses with multi-entity support, OCR receipt processing, role-based access control, and Zoho Books integration.

**Primary Use Case**: Sales teams attending trade shows need to:
- Submit expenses with receipt photos
- Auto-extract data via OCR
- Track reimbursements
- Get accountant approval
- Push to Zoho Books for multiple entities

### Current Status (v1.0.16)

✅ **Production**: https://expapp.duckdns.org (Container 201: Backend, 202: Frontend)  
✅ **Sandbox**: http://192.168.1.144 (Container 203)  
✅ **Features**:
- User management with pending registration workflow
- Event creation and participant management
- Expense submission with OCR (Tesseract.js)
- Multi-entity Zoho integration
- Accountant approval workflows
- Session management with sliding expiry
- Offline-first architecture with IndexedDB sync
- Developer role and Dev Dashboard

---

## 🌐 SYSTEM ARCHITECTURE

### Technology Stack

**Frontend** (React 18.3.1 + TypeScript 5.5.3):
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React 0.344.0
- **HTTP Client**: Axios 1.6.5
- **State**: React Hooks (useState, useEffect, useMemo)
- **Offline Storage**: IndexedDB via Dexie.js
- **PWA**: Service Worker with Background Sync API
- **Security**: JWT tokens, AES-GCM encryption for local data

**Backend** (Node.js 20.x + Express 4.18.2 + TypeScript 5.9.3):
- **Database**: PostgreSQL 16+
- **Authentication**: JWT (jsonwebtoken 9.0.2), bcrypt 5.1.1
- **File Upload**: Multer 1.4.5-lts.1
- **OCR**: Tesseract.js 5.1.1 + Sharp 0.34.4 (image preprocessing)
- **Authorization**: Custom middleware (role-based)

**Infrastructure** (Proxmox VE + Debian 12 LXC Containers):
- **Container 104**: NPMplus (Nginx Proxy Manager)
- **Container 201**: Production Backend (Node.js + PostgreSQL)
- **Container 202**: Production Frontend (Nginx static files)
- **Container 203**: Sandbox (Combined backend + frontend)
- **SSL/TLS**: Let's Encrypt via DuckDNS
- **Services**: systemd (expenseapp-backend.service, nginx)

### User Roles & Permissions

| Feature | Admin | Accountant | Coordinator | Salesperson | Developer | Pending |
|---------|-------|------------|-------------|-------------|-----------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| View All Expenses | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Submit Expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Expenses | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Create Events | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ |
| User Management | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Settings | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Dev Dashboard | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Pending Approval | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Data Models

```typescript
// User
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'coordinator' | 'salesperson' | 'developer' | 'pending';
  registration_ip?: string;
  registration_date?: string;
  created_at: string;
}

// Event
interface Event {
  id: string;
  name: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  budget?: number; // Admin/Accountant only
  status: 'upcoming' | 'active' | 'completed';
  participants: User[];
  coordinatorId: string;
}

// Expense
interface Expense {
  id: string;
  userId: string;
  eventId: string;
  category: string;
  merchant: string;
  amount: number;
  date: string;
  description: string;
  cardUsed: string;
  reimbursementRequired: boolean;
  reimbursementStatus?: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
  ocrText?: string;
  status: 'pending' | 'approved' | 'rejected';
  zohoEntity?: string;
  zohoExpenseId?: string;
  location?: string;
}
```

### API Endpoints

**Base URL**: `/api`

**Authentication**:
- `POST /api/auth/login` - Login (username/password) → JWT + user
- `POST /api/auth/register` - Register new user (pending role)
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/health` - Health check (version, DB status)

**Users**:
- `GET /api/users` - Get all users (admin, developer)
- `POST /api/users` - Create user (admin, developer)
- `PUT /api/users/:id` - Update user (admin, developer)
- `DELETE /api/users/:id` - Delete user (admin, developer)
- `PUT /api/users/:id/activate` - Activate pending user (admin, developer)

**Events**:
- `GET /api/events` - Get all events
- `POST /api/events` - Create event (admin, coordinator, developer)
- `PUT /api/events/:id` - Update event (admin, coordinator, developer)
- `DELETE /api/events/:id` - Delete event (admin, coordinator, developer)

**Expenses**:
- `GET /api/expenses` - Get expenses (filtered by role)
- `POST /api/expenses` - Create expense + upload receipt
- `PUT /api/expenses/:id` - Update expense (admin, accountant, developer can edit any; others own only)
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/ocr` - Process receipt OCR
- `PATCH /api/expenses/:id/review` - Approve/reject (admin, accountant, developer)
- `PATCH /api/expenses/:id/reimbursement` - Approve reimbursement (admin, accountant, developer)
- `POST /api/expenses/:id/push-to-zoho` - Push to Zoho Books

**Settings**:
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings (admin, developer)

---

## 🔐 CREDENTIALS & ACCESS

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

**Reset Sandbox Passwords**:
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && node reset-sandbox-passwords.js'"
```

### Proxmox Access

**Host**: 192.168.1.190  
**User**: root  
**Access**: SSH key authentication

**Common Commands**:
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

## 🚀 DEPLOYMENT GUIDE

### Local Development Setup

**Prerequisites**:
- Node.js v18+
- npm v8+
- PostgreSQL 16+

**Quick Start**:
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

**Pre-Deployment Checklist**:
- [ ] All changes on `v1.0.10` branch (NOT main)
- [ ] Version updated in `package.json`
- [ ] Service worker cache names updated (`CACHE_NAME`, `STATIC_CACHE`)
- [ ] Service worker console logs updated with version
- [ ] Changes committed and pushed to GitHub

**Build Process**:
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

**Deploy to Sandbox**:
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

**Verify Deployment**:
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c '
  echo \"=== Service Worker ===\"
  head -3 /var/www/expenseapp/service-worker.js
  echo
  echo \"=== Build ID ===\"
  grep \"Build:\" /var/www/expenseapp/index.html
'"
```

**Browser Testing**:
1. Close all browser tabs with sandbox
2. Clear browsing data (cached files, cookies, all time)
3. Restart browser completely
4. Open incognito window
5. Open DevTools → Network tab → Check "Disable cache"
6. Load http://192.168.1.144
7. Verify version in footer matches deployment

### Production Deployment

⚠️ **Production deployment requires explicit user approval - never deploy automatically**

See `DEPLOY_TO_PRODUCTION.sh` for automated script (use with caution).

---

## 🐛 KNOWN ISSUES & SOLUTIONS

### Critical Issue: Database Migration System (RESOLVED)

**Problem**: The `migrate.ts` script was only running `schema.sql` and ignoring all migration files in `migrations/` folder.

**Impact**: Missing database columns (`registration_ip`, `registration_date`), missing role constraints (`'pending'`), missing indexes.

**Fix**: Rewrote `migrate.ts` to:
1. Apply `schema.sql` first
2. Iterate through all `.sql` files in `migrations/` folder
3. Apply migrations in alphabetical order
4. Handle already-applied migrations gracefully

**Status**: ✅ Fixed in v1.0.1

### Critical Issue: Expenses Not Assigning Entity (RESOLVED)

**Problem**: New expenses were created without `zoho_entity` set, causing "Push to Zoho" button to never appear.

**Impact**: Users had to manually assign entities before pushing to Zoho.

**Fix**: Modified expense creation endpoint to accept `zoho_entity` in request body, defaulting to `null` (unassigned) rather than omitting the field.

**Status**: ✅ Fixed in v1.0.1

### Critical Issue: Caching Problems (RESOLVED)

**Problem**: Multiple caching layers caused stale content to be served:
1. Browser cache (service worker)
2. Nginx cache (in containers)
3. NPMplus proxy cache (container 104)

**Symptoms**:
- Version number not updating in UI
- Old JavaScript files being loaded
- Changes not reflecting after deployment

**Solutions**:
1. **Service Worker**: Update `CACHE_NAME` and `STATIC_CACHE` with every deployment
2. **Nginx**: Add aggressive no-cache headers for `index.html`, `*.js`, `*.css`, `service-worker.js`
3. **NPMplus**: Restart container 104 after every sandbox deployment
4. **Browser**: Clear cache, use incognito with "Disable cache" during testing

**Status**: ✅ Fixed - documented in `SANDBOX_DEPLOYMENT_CHECKLIST.md`

### Critical Issue: `crypto.randomUUID` Not Supported (RESOLVED)

**Problem**: Older browsers (especially Safari < 15.4) don't support `crypto.randomUUID()` causing app to fail to load.

**Fix**: Created `src/utils/uuid.ts` with polyfill:
```typescript
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**Status**: ✅ Fixed in v1.0.13

### Critical Issue: Auto-Logout Not Working (RESOLVED)

**Problem**: When JWT token expired, users weren't automatically logged out and saw empty data instead.

**Fix**: Added `onUnauthorized` callback to `apiClient.ts`:
```typescript
apiClient.setUnauthorizedCallback(() => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
  showNotification('Session expired. Please log in again.', 'error');
  window.location.href = '/';
});
```

**Status**: ✅ Fixed in v1.0.14

### Issue: Promise.all() Clearing All Data on Single Failure (RESOLVED)

**Problem**: Using `Promise.all()` to fetch multiple data sources (events, expenses, users) would clear ALL data if any single API call failed.

**Fix**: Changed to individual `try-catch` blocks for each API call:
```typescript
// Before (BAD)
const [events, expenses, users] = await Promise.all([
  fetchEvents(),
  fetchExpenses(),
  fetchUsers()
]);

// After (GOOD)
try { const events = await fetchEvents(); } catch { /* handle */ }
try { const expenses = await fetchExpenses(); } catch { /* handle */ }
try { const users = await fetchUsers(); } catch { /* handle */ }
```

**Status**: ✅ Fixed in Dashboard, Approvals, EventSetup components

### Issue: Sync Bar Persisting (RESOLVED)

**Problem**: Sync status bar showed "All Synced - Up to date" permanently, even when nothing was syncing.

**Fix**: Simplified logic to only show bar when there's actual activity (offline, syncing, pending items, failed items). Removed "All Synced" message entirely.

**Status**: ✅ Fixed in v1.0.15

---

## 🔧 DEVELOPMENT WORKFLOWS

### Version Control

**Branch Strategy** (as of v1.0.10):
- **main**: Production-ready code
- **v1.0.10**: Active development branch
- **Rule**: ALL changes go on `v1.0.10` branch
- **Rule**: Merge to `main` ONLY with explicit user approval

**Version Numbering**:
- Format: `MAJOR.MINOR.PATCH` (semantic versioning)
- Increment `PATCH` for bug fixes and small features
- Increment `MINOR` for new features
- Increment `MAJOR` for breaking changes
- **CRITICAL**: Update version in BOTH `package.json` files (frontend & backend) with EVERY change

**Files to Update on Version Change**:
1. `package.json` (frontend) - version field
2. `backend/package.json` - version field
3. `public/service-worker.js` - CACHE_NAME, STATIC_CACHE, console logs
4. Git commit message: Include version number

### Commit Message Format

```
<type>: <short summary>

<detailed description>

<breaking changes if any>

Version: vX.X.X (branch name)
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Example**:
```
feat: Add developer role access to Settings page

- Developer role now has full access to Settings page
- Updated AdminSettings access control to include 'developer' role
- Developers can manage card options, entity options, categories, and users

Version: v1.0.16 (v1.0.10 branch)
```

### Testing Checklist

Before any deployment:

**Functionality Tests**:
- [ ] Login/logout works for all roles
- [ ] User registration creates pending user
- [ ] Admin can activate pending users
- [ ] Events can be created and edited
- [ ] Expenses can be submitted with receipts
- [ ] OCR processes receipts correctly
- [ ] Approvals save properly
- [ ] Zoho push button appears and works
- [ ] Settings changes persist

**Cross-Role Tests**:
- [ ] Admin sees all data
- [ ] Accountant sees all expenses
- [ ] Coordinator sees their events
- [ ] Salesperson sees only their expenses
- [ ] Developer has admin-level access
- [ ] Pending users see registration message

**Browser Tests**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Cache Tests**:
- [ ] Hard refresh updates version
- [ ] Incognito shows latest version
- [ ] Service worker version matches deployment

---

## 📝 SESSION SUMMARIES

### Session v1.0.16 (Oct 14, 2025)

**Goal**: Grant developer role access to Settings page

**Changes**:
- Updated `AdminSettings.tsx` access control to include `'developer'` role
- Developers can now manage card options, entity options, categories, and users
- Updated access denied message

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.15 (Oct 14, 2025)

**Goal**: Fix persistent sync status bar

**Problem**: Sync bar showed "All Synced - Up to date" permanently

**Solution**:
- Simplified `SyncStatusBar.tsx` logic
- Bar only shows during actual activity (offline, syncing, pending, failed)
- Removed "All Synced" message entirely
- Removed auto-hide timer

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.14 (Oct 14, 2025)

**Goal**: Fix auto-logout and UUID issues

**Problems**:
1. Users not being logged out on token expiration, seeing empty data
2. `crypto.randomUUID is not a function` error

**Solutions**:
1. Added `onUnauthorized` callback to `apiClient.ts` to force logout on 401/403 errors
2. Created `src/utils/uuid.ts` polyfill for `crypto.randomUUID()`

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.13 (Oct 14, 2025)

**Goal**: Implement user rejection feature

**Changes**:
- Added "Reject" button for pending users in UserManagement
- Implemented rejection confirmation modal
- Pending users can now be deleted without activation

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.10-v1.0.12 (Oct 14, 2025)

**Goal**: Implement offline-first sync architecture

**Major Features**:
- IndexedDB persistent storage via Dexie.js
- Sync queue for offline actions
- Network detection and auto-sync
- Service Worker background sync
- Data encryption (AES-GCM) for local storage
- Notification banner system
- Sync status bar
- Pending Actions page
- Manual "Sync Now" functionality
- UUID polyfill for browser compatibility

**Files Created**:
- `src/utils/offlineDb.ts` - IndexedDB schema
- `src/utils/networkDetection.ts` - Network monitoring
- `src/utils/syncManager.ts` - Sync queue processor
- `src/utils/encryption.ts` - Data encryption utilities
- `src/utils/uuid.ts` - UUID generation polyfill
- `src/components/common/NotificationBanner.tsx` - User notifications
- `src/components/common/SyncStatusBar.tsx` - Sync status indicator
- `src/components/common/PendingActions.tsx` - Unsynced items view

**Documentation**:
- `docs/OFFLINE_SYNC_ARCHITECTURE.md`
- `OFFLINE_SYNC_IMPLEMENTATION_STATUS.md`

**Deployment**: Sandbox only
**Status**: ✅ Complete (with ongoing refinements)

### Session v1.0.6-v1.0.9 (Oct 14, 2025)

**Goal**: Enhance user experience and fix data loading issues

**Changes**:
1. Modified accountant/admin/developer Events page:
   - Changed header from "My Events" to "Events"
   - Added "All Events" / "My Events" toggle
   - Made participant count hoverable with popup
2. Added "View Details" button to Expense pages
3. Removed inline edit icon from expense rows
4. Fixed Promise.all() issues in Dashboard, Approvals, EventSetup
5. Updated permissions for developer role across components

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.3-v1.0.5 (Oct 14, 2025)

**Goal**: Implement session management with sliding expiry timer

**Features**:
- 15-minute inactivity timeout
- 5-minute advance warning modal
- Automatic activity detection (mouse, keyboard, scroll, touch)
- Token refresh every 10 minutes during activity
- JWT expiry aligned to 20 minutes (5-minute buffer)

**Files Created**:
- `src/utils/sessionManager.ts` - Session management class
- `src/components/common/InactivityWarning.tsx` - Warning modal
- `docs/SESSION_MANAGEMENT.md` - Documentation
- `SESSION_MANAGEMENT_RELEASE_NOTES.md`

**Changes**:
- Modified `backend/src/routes/auth.ts` - JWT expiry to 20m, added `/refresh` endpoint
- Modified `src/App.tsx` - Integrated SessionManager

**Deployment**: Sandbox only
**Status**: ✅ Complete

### Session v1.0.1-v1.0.2 (Oct 14, 2025)

**Goal**: Fix critical production issues

**Problems Identified**:
1. ❌ Database migration system only running `schema.sql`
2. ❌ Missing 'pending' role in schema CHECK constraint
3. ❌ Missing `registration_ip` and `registration_date` columns
4. ❌ New expenses not getting `zoho_entity` assigned
5. ❌ "Push to Zoho" button not appearing

**Solutions Implemented**:
1. Rewrote `backend/src/database/migrate.ts` to apply all migrations
2. Updated `backend/src/database/schema.sql` to include 'pending' role
3. Added missing columns to schema
4. Modified expense creation to accept and default `zoho_entity`
5. Fixed frontend conditional rendering for Zoho button

**Files Created**:
- `CRITICAL_DIAGNOSTIC_REPORT.md` - Detailed issue analysis
- `FIXES_READY_TO_APPLY.md` - Step-by-step remediation
- `CHANGES_SUMMARY.md` - Before/after comparison
- `FINAL_REPORT.md` - Comprehensive summary

**Deployment**: Production & Sandbox
**Status**: ✅ Complete

### Session v1.0.0 (Oct 13, 2025)

**Goal**: Production release

**Achievements**:
- First production deployment to https://expapp.duckdns.org
- User registration with pending approval workflow
- Multi-entity Zoho Books integration
- OCR receipt processing with Tesseract.js
- Role-based access control (admin, accountant, coordinator, salesperson)
- Settings management (card options, entity options, category options)

**Issues Encountered**:
- Frontend not updating (browser cache)
- 502 errors (NPMplus configuration)
- Database migration issues (fixed in v1.0.1)

**Lessons Learned**:
- Always update service worker cache names
- Clear NPMplus cache after deployments
- Test in incognito with cache disabled
- Document deployment checklist

**Status**: ✅ Deployed

---

## 🛠️ TROUBLESHOOTING

### "npm: command not found"

**Solution**: Install Node.js v18+
```bash
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Download from https://nodejs.org/
```

### Port Already in Use

**Frontend (5173)**:
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

**Backend (5000)**: Edit `backend/.env` and change `PORT=5000` to another port

### Database Connection Failed

1. Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

2. Check credentials in `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_NAME=expense_app
DB_PASSWORD=your_password
```

3. Create database if it doesn't exist:
```bash
psql postgres
CREATE DATABASE expense_app;
\q
```

### Sandbox Not Updating After Deployment

**Checklist**:
1. Did you update service worker cache names?
2. Did you restart NPMplus (container 104)?
3. Did you restart nginx in sandbox container?
4. Did you clear browser cache?
5. Did you test in incognito with "Disable cache"?
6. Did you deploy to `/var/www/expenseapp` (NOT `/var/www/html`)?

**Quick Fix**:
```bash
# Restart everything
ssh root@192.168.1.190 "
  pct exec 203 -- systemctl restart nginx &&
  pct stop 104 && sleep 3 && pct start 104 &&
  echo '✓ Services restarted'
"
```

### Users Can't Log In to Sandbox

**Reset all passwords to `sandbox123`**:
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && node reset-sandbox-passwords.js'"
```

### OCR Not Working / Low Accuracy

**Check**:
1. Is Sharp installed? `npm list sharp`
2. Is Tesseract.js installed? `npm list tesseract.js`
3. Is receipt image quality good? (clear, well-lit, flat)
4. Check backend logs for OCR errors: `journalctl -u expenseapp-backend -n 100`

**Improve Accuracy**:
- Use high-resolution images (300+ DPI)
- Ensure good lighting
- Flatten receipts before photographing
- Use preprocessing (grayscale, sharpen, contrast)

### Service Worker Issues

**Unregister service worker**:
1. Open DevTools (F12)
2. Application tab → Service Workers
3. Find expenseApp worker
4. Click "Unregister"
5. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

**Check service worker status**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => console.log(reg));
});
```

### Database Query Errors

**Check logs**:
```bash
# Backend logs
ssh root@192.168.1.190 "pct exec 203 -- journalctl -u expenseapp-backend -n 50"

# PostgreSQL logs
ssh root@192.168.1.190 "pct exec 203 -- tail -50 /var/log/postgresql/postgresql-16-main.log"
```

**Common fixes**:
1. Missing column: Run migrations
2. Constraint violation: Check data types and constraints in schema
3. Connection pool exhausted: Restart backend service

---

## 📚 KEY LEARNINGS & BEST PRACTICES

### Deployment Best Practices

1. **Always update version numbers** in `package.json` (frontend & backend) with EVERY change
2. **Always update service worker cache names** (`CACHE_NAME`, `STATIC_CACHE`) with version
3. **Always restart NPMplus** (container 104) after sandbox deployments
4. **Always test in incognito** with "Disable cache" enabled
5. **Always commit changes** before deployment
6. **Always deploy to sandbox first**, never directly to production
7. **Never merge to main** without explicit user approval
8. **Never skip the deployment checklist** (`SANDBOX_DEPLOYMENT_CHECKLIST.md`)

### Database Best Practices

1. **Always run migrations** via `npm run migrate`, not manually
2. **Always include new columns in base `schema.sql`**, not just migrations
3. **Always add indexes** for frequently queried columns (especially foreign keys)
4. **Always use transactions** for multi-step operations
5. **Never expose sensitive data** in API responses (passwords, tokens)
6. **Always validate input** on both frontend and backend

### Code Quality Best Practices

1. **Avoid `Promise.all()`** for independent data fetches - use separate try-catch blocks
2. **Always handle errors gracefully** - show user-friendly messages
3. **Always log errors** for debugging (console.error, backend logs)
4. **Use TypeScript strictly** - no `any` types
5. **Keep components small** - single responsibility principle
6. **Extract reusable logic** into hooks or utility functions

### Security Best Practices

1. **Always hash passwords** with bcrypt (never store plain text)
2. **Always use JWT** with expiration (20 minutes or less)
3. **Always validate JWT** on every protected route
4. **Always check user role** before allowing actions
5. **Always sanitize inputs** to prevent SQL injection
6. **Always use HTTPS** in production
7. **Encrypt sensitive data** in local storage (IndexedDB)
8. **Clear local data** on logout

### UX Best Practices

1. **Always show loading states** (spinners, skeletons)
2. **Always show error messages** (not just console logs)
3. **Always confirm destructive actions** (delete, reject)
4. **Always provide feedback** (success toasts, error banners)
5. **Always make CTAs obvious** (clear button labels, colors)
6. **Test on mobile devices** (not just desktop)

---

## 🔄 COMMON TASKS REFERENCE

### Add a New User Role

1. Update `backend/src/database/schema.sql`:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer', 'pending', 'YOUR_NEW_ROLE')),
```

2. Create migration file `backend/src/database/migrations/add_YOUR_NEW_ROLE.sql`:
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer', 'pending', 'YOUR_NEW_ROLE'));
```

3. Update TypeScript types `src/types/index.ts`:
```typescript
export type UserRole = 'admin' | 'accountant' | 'coordinator' | 'salesperson' | 'developer' | 'pending' | 'YOUR_NEW_ROLE';
```

4. Update role-based UI in components (Sidebar, permissions checks)

5. Run migration: `npm run migrate`

### Add a New Expense Category

**Two Options**:

**Option A: Via Settings UI** (Preferred):
1. Login as admin/accountant/developer
2. Go to Settings → Expense Categories
3. Type new category name
4. Click "+ Add Category"

**Option B: Seed Data**:
1. Edit `backend/src/database/seed.ts`
2. Add category to `categoryOptions` array
3. Run: `npm run seed`

### Add a New API Endpoint

1. Create route in `backend/src/routes/YOUR_ROUTE.ts`:
```typescript
import express from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'developer'), async (req, res) => {
  // Your logic here
  res.json({ success: true });
});

export default router;
```

2. Register in `backend/src/server.ts`:
```typescript
import yourRoute from './routes/yourRoute';
app.use('/api/your-route', yourRoute);
```

3. Add frontend API call in `src/utils/api.ts`:
```typescript
export const getYourData = async () => {
  const response = await apiClient.get('/api/your-route');
  return response.data;
};
```

### Debug Production Issues

1. **Check backend logs**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend -n 100 --no-pager"
```

2. **Check PostgreSQL**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- sudo -u postgres psql -d expense_app -c 'SELECT COUNT(*) FROM expenses;'"
```

3. **Check nginx**:
```bash
ssh root@192.168.1.190 "pct exec 202 -- tail -50 /var/log/nginx/error.log"
```

4. **Check service status**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- systemctl status expenseapp-backend --no-pager"
```

### Rollback Deployment

**Sandbox**:
1. Keep previous tarball as backup
2. Deploy old tarball:
```bash
ssh root@192.168.1.190 "
  pct push 203 /tmp/backup-v1.0.X.tar.gz /tmp/rollback.tar.gz &&
  pct exec 203 -- bash -c '
    cd /var/www/expenseapp &&
    rm -rf * &&
    tar -xzf /tmp/rollback.tar.gz &&
    systemctl restart nginx
  '
"
```

**Production**: Use Git tags
```bash
git checkout v1.0.X
npm run build
# Deploy as usual
```

---

## 🔗 ZOHO BOOKS INTEGRATION

### Current Setup

**Active Entities** (Production):
- ✅ **Haute Brands** (Org ID: 856048585)
- ✅ **Boomin Brands** (Org ID: 842978819)

### OAuth Setup Process

To add a new Zoho Books entity:

**Step 1: Get Authorization Code**

Generate OAuth URL:
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.expenses.CREATE,ZohoBooks.expenses.READ,ZohoBooks.settings.READ,ZohoBooks.accountants.READ&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://expapp.duckdns.org/auth/zoho/callback&access_type=offline&prompt=consent
```

1. Replace `YOUR_CLIENT_ID` with your Zoho app's Client ID
2. Open the URL in a browser
3. Log in to Zoho and authorize the app
4. Copy the entire callback URL (contains the `code` parameter)

**Step 2: Exchange Code for Refresh Token**

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_CODE_HERE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://expapp.duckdns.org/auth/zoho/callback"
```

The response contains your `refresh_token` - save it securely!

**Step 3: Get Account IDs from Zoho Books**

1. **Expense Account ID**:
   - Go to Chart of Accounts: `https://books.zoho.com/app/YOUR_ORG_ID#/accountant/chartofaccounts`
   - Find your expense account (e.g., "Trade Shows", "Meals & Entertainment")
   - Click on it - the ID is in the URL

2. **Paid Through Account ID**:
   - Same page - find your payment account (e.g., "Business Checking")
   - Click on it - grab the ID from URL

**Step 4: Add to Configuration**

Edit `backend/src/config/zohoAccounts.ts`:

```typescript
const newEntityConfig = {
  entityName: process.env.ZOHO_NEWENTITY_ENTITY_NAME || 'New Entity Name',
  enabled: true,
  mock: process.env.ZOHO_NEWENTITY_MOCK === 'true',
  clientId: process.env.ZOHO_NEWENTITY_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_NEWENTITY_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_NEWENTITY_REFRESH_TOKEN || '',
  organizationId: process.env.ZOHO_NEWENTITY_ORGANIZATION_ID || '',
  expenseAccountId: process.env.ZOHO_NEWENTITY_EXPENSE_ACCOUNT_ID || '',
  paidThroughAccountId: process.env.ZOHO_NEWENTITY_PAID_THROUGH_ACCOUNT_ID || '',
  // Display names
  orgName: process.env.ZOHO_NEWENTITY_ORG_NAME || 'New Entity Org',
  expenseAccount: process.env.ZOHO_NEWENTITY_EXPENSE_ACCOUNT || 'Trade Shows',
  paidThrough: process.env.ZOHO_NEWENTITY_PAID_THROUGH || 'Business Checking'
};
accounts.set(newEntityConfig.entityName.toLowerCase(), newEntityConfig);
```

**Step 5: Add Environment Variables**

Add to `backend/.env` (production):

```bash
ZOHO_NEWENTITY_ENABLED=true
ZOHO_NEWENTITY_MOCK=false
ZOHO_NEWENTITY_ENTITY_NAME=New Entity Name
ZOHO_NEWENTITY_CLIENT_ID=your_client_id
ZOHO_NEWENTITY_CLIENT_SECRET=your_client_secret
ZOHO_NEWENTITY_REFRESH_TOKEN=your_refresh_token
ZOHO_NEWENTITY_ORGANIZATION_ID=your_org_id
ZOHO_NEWENTITY_EXPENSE_ACCOUNT_ID=your_expense_account_id
ZOHO_NEWENTITY_PAID_THROUGH_ACCOUNT_ID=your_paid_through_account_id
ZOHO_NEWENTITY_ORG_NAME=Your Org Display Name
ZOHO_NEWENTITY_EXPENSE_ACCOUNT=Account Name
ZOHO_NEWENTITY_PAID_THROUGH=Payment Account Name
```

**Step 6: Deploy and Test**

1. Deploy backend to production
2. Add entity name to Settings → Entity Options
3. Create test expense with new entity
4. Verify expense appears in Zoho Books

### Boomin Brands Setup (Reference)

**Status**: ✅ Deployed to Production (v0.35.26)

**Configuration**:
- Entity Name: Boomin Brands
- Organization ID: 842978819
- Expense Account: Trade Shows (4849689000000626507)
- Paid Through: Business Checking Plus (4849689000000430009)

**Features**:
- ✅ Expense creation
- ✅ Receipt upload to Zoho
- ✅ Independent operation from Haute Brands
- ✅ Dual registration ("boomin brands" and "boomin")

**Testing**:
1. Create expense in app, assign to "Boomin Brands"
2. Submit with receipt (optional)
3. Verify in Zoho Books: `https://one.zoho.com/zohoone/boominbrands/home/cxapp/books/app/842978819#/expenses`
4. Confirm receipt attached (if provided)

For detailed Zoho Books setup, see `BOOMIN_CREDENTIALS.md` (sensitive credentials).

---

## 📖 ADDITIONAL RESOURCES

### Repository

**GitHub**: https://github.com/sahiwal283/expenseApp  
**Branch**: `v1.0.10` (development), `main` (production)

### External Documentation

- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Express**: https://expressjs.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Tesseract.js**: https://tesseract.projectnaptha.com/
- **Dexie.js**: https://dexie.org/
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### Project-Specific Documentation

For more detailed information on specific topics, see:
- Database schema: `backend/src/database/schema.sql`
- Deployment scripts: `deployment/` folder
- Nginx config: `deployment/nginx/expenseapp.conf`

---

## 🤝 AI ASSISTANT GUIDELINES

When working on this project:

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

---

## 📝 CHANGELOG

### v1.0.16 (Oct 14, 2025)
- Added developer role access to Settings page
- Developers can now manage card options, entity options, categories, and users

### v1.0.15 (Oct 14, 2025)
- Fixed persistent sync status bar - now only shows during activity
- Removed "All Synced" message

### v1.0.14 (Oct 14, 2025)
- Fixed auto-logout on token expiration
- Added UUID polyfill for older browsers

### v1.0.13 (Oct 14, 2025)
- Added "Reject" button for pending users
- Implemented user rejection confirmation modal

### v1.0.10-v1.0.12 (Oct 14, 2025)
- Implemented offline-first sync architecture
- Added IndexedDB persistent storage
- Added sync queue and network detection
- Added Service Worker background sync
- Added data encryption for local storage
- Added notification banner and sync status bar
- Added Pending Actions page

### v1.0.9 (Oct 14, 2025)
- Removed inline edit icon from expense page
- View Details modal now includes edit button
- Fixed expense saving issues

### v1.0.8 (Oct 14, 2025)
- Added "View Details" button to expense pages
- Expense details modal with receipt preview
- Full-screen receipt viewing

### v1.0.7 (Oct 14, 2025)
- Added "All Events" / "My Events" toggle for accountant/admin/developer
- Made participant count hoverable with popup
- Updated event filtering logic

### v1.0.6 (Oct 14, 2025)
- Changed event header from "My Events" to "Events" for accountant/admin/developer
- Fixed Promise.all() issues in multiple components
- Updated developer role permissions

### v1.0.3-v1.0.5 (Oct 14, 2025)
- Implemented session management with 15-minute sliding expiry
- Added inactivity warning modal (5 minutes before logout)
- Added token refresh every 10 minutes
- JWT expiry aligned to 20 minutes

### v1.0.2 (Oct 14, 2025)
- Fixed mobile caching issues
- Implemented version check and cache clearing
- Added network-first strategy for API calls in service worker

### v1.0.1 (Oct 14, 2025)
- Fixed critical database migration system
- Added 'pending' role to schema
- Fixed missing database columns (registration_ip, registration_date)
- Fixed expense entity assignment
- Fixed "Push to Zoho" button visibility

### v1.0.0 (Oct 13, 2025)
- Initial production release
- User registration with pending approval
- Multi-entity Zoho Books integration
- OCR receipt processing
- Role-based access control
- Settings management

---

**END OF MASTER GUIDE**

For updates to this document, add new sections under appropriate headings and update the "Last Updated" date at the top.

