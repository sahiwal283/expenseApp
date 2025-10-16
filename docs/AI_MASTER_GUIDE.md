# 🤖 AI MASTER GUIDE - ExpenseApp
**Version:** 1.1.11 (Frontend) / 1.1.5 (Backend)
**Last Updated:** October 16, 2025  
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

**RULE 1: Create a new version branch for each sandbox development cycle**

**How It Works:**
1. Check what version is currently in production (`main` branch)
2. Create a NEW branch with the next version number
3. ALL sandbox changes go on that version branch
4. When ready for production, merge that branch back to `main`

**Example Workflow:**

Let's say production (`main`) is at **v1.0.53**:

```bash
# 1. Create new version branch for sandbox work
git checkout main
git pull origin main
git checkout -b v1.0.54  # or v1.1.0 for new features

# 2. Make all your sandbox changes on this branch
git add -A
git commit -m "Add new feature"
git push origin v1.0.54

# 3. Continue working on v1.0.54 until ready for production
# ... more commits ...

# 4. When ready, merge to main for production deployment
git checkout main
git merge v1.0.54
git push origin main
```

**Version Branch Naming:**
- Bug fixes / small changes: Increment patch (v1.0.53 → v1.0.54)
- New features: Increment minor (v1.0.53 → v1.1.0)
- Breaking changes: Increment major (v1.0.53 → v2.0.0)

**Current Branch:**
- The current sandbox branch is `v1.0.10` (as of October 2025)
- Continue using this branch until it's merged to main
- After merge, create a new version branch for the next development cycle

**Important:**
- DO NOT work directly on `main` branch (production only)
- Each development cycle gets its own version branch
- Branch name should match the version being developed

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

**RULE 3: ALWAYS clear caches when deploying (sandbox AND production)**

**CRITICAL:** Caching issues affect both sandbox AND production environments!

Both environments have THREE layers of caching that must be cleared:

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
Forgetting to restart NPMplus proxy. This causes the old version to be cached at the proxy level even though files are updated.

**For Sandbox:** Restart LXC 104 (NPMplus proxy)  
**For Production:** Restart NPMplus proxy on production server

This issue has affected both sandbox AND production deployments!

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

**RULE 5: For major refactors, provide specific testing steps**

**Note:** This rule is primarily for large refactoring projects. For regular bug fixes and features, general testing guidance is sufficient.

**For Major Refactors Only:**

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

**For Regular Changes:**
- General testing guidance is fine
- User knows their app and what to test

### Documentation Standards

**RULE 6: Update this master guide, not individual files**

- Add new information to appropriate sections in THIS file
- Don't create separate markdown files for session summaries
- Don't create temporary documentation files
- Exception: CHANGELOG.md (keep separate per GitHub standards)

**RULE 6.1: Update README.md and ARCHITECTURE.md after significant changes**

When you make significant changes to the project, **ALWAYS update these core documentation files**:

**When to Update:**
- ✅ After adding new features (e.g., Role Management system)
- ✅ After changing architecture (e.g., new API endpoints, database tables)
- ✅ After fixing major bugs that affect documented behavior
- ✅ After changing deployment procedures
- ✅ After changing tech stack (new libraries, tools)
- ✅ At end of major development sessions

**What to Update:**

**1. README.md**
- Update version number in header
- Add new features to "Key Features" section
- Update tech stack if dependencies changed
- Update API endpoints if new routes added
- Update troubleshooting section with new known issues
- Add "Recent Updates" section with version highlights

**2. docs/ARCHITECTURE.md**
- Update version number and "Last Updated" date
- Update system architecture diagram if structure changed
- Add new database tables/columns to schema section
- Add new API endpoints to routes documentation
- Update role permissions matrix if roles changed
- Add new components to component architecture
- Update data flow diagrams if workflow changed
- Add new issues to "Known Issues & Solutions"

**3. docs/AI_MASTER_GUIDE.md** (This File)
- Add session summary to "Recent Sessions & Lessons Learned"
- Document lessons learned and struggle points
- Update CHANGELOG with version entries
- Add tasks completed and remaining
- Update key takeaways if you discovered something important

**Example Pattern:**
```bash
# After implementing new feature and testing:
git add README.md docs/ARCHITECTURE.md docs/AI_MASTER_GUIDE.md
git commit -m "docs: Update README and ARCHITECTURE for v1.0.X feature"
```

**Why This Matters:**
- Future AI assistants need accurate project documentation
- New developers need to understand current architecture
- Users need to know what features exist
- GitHub README is the project's public face

**❌ Bad Practice:**
- Implementing features without updating docs
- Leaving version numbers outdated
- Creating separate "session summary" files instead of updating master guide

**✅ Good Practice:**
- Update all 3 docs at end of session
- Keep version numbers in sync
- Document lessons learned while fresh
- Include code examples in lessons

### Response Format

**RULE 7: For major refactors, use progress checklists**

**Note:** This format is specifically for large refactoring projects, not regular development work.

**For Major Refactors Only:**

User requested detailed progress tracking with this format:

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

**For Regular Changes:**
- Standard response format is fine
- Include summary of changes and what to test

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

## 🔥 RECENT SESSIONS & LESSONS LEARNED

### Session: October 16, 2025 (v1.1.0 - v1.1.11 Post-Production Bug Fixes)

**Objective:** Fix critical bugs discovered in production, improve UX, enhance file upload support

**Duration:** ~6 hours

**Version Range:** Frontend v1.1.0 → v1.1.11, Backend v1.1.0 → v1.1.5

---

#### 🐛 BUGS DISCOVERED & FIXED

**1. Dashboard "Push to Zoho" Button Navigation (v1.0.59)**
- **Issue:** Button navigated to `/reports` instead of `/approvals`
- **Impact:** User confusion - Push to Zoho was moved from Reports to Approvals
- **Root Cause:** Hardcoded link in QuickActions component not updated after feature move
- **Fix:** Updated `backend/src/routes/quickActions.ts` and `src/components/dashboard/QuickActions.tsx`
  ```typescript
  // BEFORE
  link: '/reports'
  
  // AFTER  
  link: '/approvals'
  ```
- **Lesson:** When moving features between pages, search for ALL references (navigation, links, buttons)

**2. Reports Table Redundant "Push to Zoho" Column (v1.0.60)**
- **Issue:** Push to Zoho column still visible in Reports table after moving functionality to Approvals
- **Impact:** Confusing UX - users saw button in two places with different behavior
- **Fix:** Removed column, replaced with "View Details" eye icon that opens modal
  ```typescript
  // Removed: Push to Zoho button column
  // Added: Details column with eye icon → modal for expense details/receipts
  ```
- **Lesson:** When deprecating features, remove ALL UI elements, not just disable them

**3. Developer Role Missing Pending User Tasks (v1.0.61)**
- **Issue:** Test user pending approval didn't show in developer's Dashboard "Pending Tasks"
- **Root Cause:** `quickActions.ts` backend only checked `admin` role for pending users task
- **Fix:** Added `developer` to authorization check
  ```typescript
  if (req.user?.role === 'admin' || req.user?.role === 'developer') {
    // Show pending users task
  }
  ```
- **Lesson:** Developer role should have same capabilities as admin + dev dashboard

**4. "Go to User Management" Navigation Failure (v1.0.61, v1.0.62, v1.1.4)**
- **Issue:** Dashboard button navigated to Settings but didn't open User Management tab
- **Attempt 1 (v1.0.61):** Set `window.location.hash` after `setTimeout`
  - **Result:** ❌ Race condition - hash set before page loaded
- **Attempt 2 (v1.0.62):** Set hash BEFORE navigation
  - **Result:** ❌ Still failed - timing issue
- **Attempt 3 (v1.1.4):** Switch to `sessionStorage`
  ```typescript
  // QuickActions.tsx
  sessionStorage.setItem('openSettingsTab', 'users');
  onNavigate('settings');
  
  // AdminSettings.tsx
  useEffect(() => {
    const targetTab = sessionStorage.getItem('openSettingsTab');
    if (targetTab === 'users') {
      setActiveTab('users');
      sessionStorage.removeItem('openSettingsTab');
    }
  }, []);
  ```
- **Result:** ✅ **FIXED** - Reliable cross-component communication
- **Lesson:** `sessionStorage` is more reliable than URL hash for programmatic navigation

**5. Push to Zoho Force Logout Issue (v1.1.0)**
- **Issue:** Clicking "Push to Zoho" forcefully logged out developer role
- **Root Cause 1:** Backend route not authorized for `developer` role
- **Root Cause 2:** Frontend `apiClient` logged out on ALL 401/403 errors
- **Fix:** 
  ```typescript
  // Backend: Added developer to authorize middleware
  router.post('/:id/push-to-zoho', authorize('admin', 'accountant', 'developer'), ...);
  
  // Frontend: Only logout on 401, NOT on 403
  if (error.statusCode === 401) {
    // 401 = Authentication failed (logout)
  }
  // 403 = Permission denied (show error, don't logout)
  ```
- **Lesson:** Distinguish between authentication (401) and authorization (403) errors

**6. Push to Zoho Error Messages Using Wrong Entity (v1.0.63)**
- **Issue:** Error showed "haute" instead of actual entity name like "nirvana kulture"
- **Root Cause:** Hardcoded entity name in error message
- **Fix:** Use dynamic `expense.zohoEntity` in all error messages
- **Improvement:** Changed harsh red error to friendly blue "coming soon" toast for unconfigured entities
  ```typescript
  addToast(
    `🕐 Zoho Books integration for "${expense.zohoEntity}" is coming soon...`,
    'info'  // Blue toast instead of red error
  );
  ```
- **Lesson:** User-friendly errors improve UX for features under development

**7. Entity Change Not Re-enabling Push Button (v1.1.1, v1.1.2)**
- **Issue:** Changing entity on pushed expense didn't allow re-push
- **Root Cause:** Backend didn't clear `zoho_expense_id` when entity changed
- **Fix:** 
  ```typescript
  // Backend: Clear zoho_expense_id when entity changes
  if (currentExpense.zoho_entity !== entityValue && currentExpense.zoho_expense_id) {
    updates.zoho_expense_id = undefined;  // Allow re-push
  }
  
  // Frontend: Show warning dialog, remove from pushedExpenses Set
  if (wasPushed && isChangingEntity) {
    const confirmed = window.confirm("⚠️ This expense has already been pushed...");
    if (confirmed) {
      setPushedExpenses(prev => {
        const newSet = new Set(prev);
        newSet.delete(expense.id);
        return newSet;
      });
    }
  }
  ```
- **UX Improvement:** Moved entity editing to modal (disabled in table) for deliberate workflow

**8. Event Card Showing Negative Days (v1.1.3)**
- **Issue:** Event that started yesterday showed "-1 days" on dashboard card
- **Expected:** Should show "Today" for entire event duration (start to end date)
- **Fix:**
  ```typescript
  const isInProgress = today >= startDate && today <= endDate;
  const daysUntil = isInProgress ? 0 : getDaysUntil(event.startDate);
  // daysUntil === 0 displays as "Today"
  ```
- **Lesson:** Date logic should account for date RANGES, not just single dates

**9. Session Timeout Causing Blank Dashboard (v1.1.5)**
- **Issue:** After inactivity, dashboard went blank (no data, no logout)
- **Root Cause:** Backend returned `403 Forbidden` for expired tokens (should be `401 Unauthorized`)
- **Impact:** Frontend didn't recognize expired session, tried to load data with invalid token
- **Fix:**
  ```typescript
  // Backend: auth.ts middleware
  // BEFORE
  return res.status(403).json({ error: 'Invalid or expired token' });
  
  // AFTER
  return res.status(401).json({ error: 'Invalid or expired token' });
  
  // Frontend: apiClient.ts
  if (error.statusCode === 401) {
    TokenManager.removeToken();
    this.onUnauthorized();  // Trigger logout
  }
  
  // Frontend: useDashboardData.ts
  if (error?.statusCode === 401 || error?.statusCode === 403) {
    console.error('Authentication failed, stopping data load');
    if (mounted) setLoading(false);
    return;  // Don't continue loading
  }
  ```
- **Lesson:** HTTP status codes matter! 401 = auth failed, 403 = permission denied

**10. Zoho Event Format Incorrect (v1.1.3 Backend)**
- **Issue:** Zoho showed "Event: Event Name: date - date" (redundant "Event:")
- **Expected:** "Event Name (date - date)"
- **Fix:**
  ```typescript
  // backend/src/services/zohoMultiAccountService.ts
  // BEFORE
  eventInfo = `Event: ${eventName}: ${startDate} - ${endDate}`;
  
  // AFTER
  eventInfo = `${eventName} (${MM/DD/YY} - ${MM/DD/YY})`;
  ```

**11. Admin User Deletion Not Protected (v1.1.8)**
- **Issue:** User "sahil" was permanent, but only "admin" should be
- **Root Cause:** No username check in delete logic
- **Fix:**
  ```typescript
  // Frontend: UserManagement.tsx
  const userToDelete = users.find(u => u.id === userId);
  if (userToDelete && userToDelete.username === 'admin') {
    alert("Cannot delete the system admin user!");
    return;
  }
  
  // Backend: users.ts
  const userCheck = await query('SELECT username FROM users WHERE id = $1', [id]);
  if (userCheck.rows[0].username === 'admin') {
    return res.status(403).json({ error: 'Cannot delete the system admin user' });
  }
  ```
- **Lesson:** Protect system accounts at BOTH frontend (UX) and backend (security) layers

**12. CRITICAL: Missing useEffect Import (v1.1.9)**
- **Issue:** Approvals page completely broken - blank screen
- **Root Cause:** Added `useEffect` hook in v1.1.7 but forgot to import it from React
- **Impact:** PRODUCTION-BREAKING - entire Approvals page unusable
- **Error:** `ReferenceError: useEffect is not defined`
- **Fix:**
  ```typescript
  // BEFORE
  import React, { useState, useMemo } from 'react';
  
  // AFTER
  import React, { useState, useMemo, useEffect } from 'react';
  ```
- **Lesson:** Build succeeds even with missing imports - TypeScript doesn't always catch it!
- **Prevention:** Always verify imports when adding new React hooks

**13. Phone Camera Images Rejected (v1.1.5 Backend)**
- **Issue:** User's phone camera receipt upload failed with "Only images... allowed" error
- **Root Cause:** Backend validation too strict - only accepted exact MIME types (jpeg, jpg, png, pdf)
- **Problem:** Phone cameras send unusual MIME types:
  - iPhone HEIC: `image/heic`, `image/heif`
  - Android variations: `image/x-png`, `image/pjpeg`
- **Fix:**
  ```typescript
  // BEFORE
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const mimetype = allowedTypes.test(file.mimetype);  // Too strict!
  
  // AFTER
  const allowedExtensions = /jpeg|jpg|png|pdf|heic|heif|webp/i;
  const mimetypeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  // Accept ANY image/* MIME type
  ```
- **Additional Changes:**
  - Increased file size limit: 5MB → 10MB (modern phone photos)
  - Added logging for accepted/rejected files
- **Lesson:** Real-world files from phones have unpredictable formats - be permissive with validation

---

#### 🔄 ONGOING ISSUES (Not Yet Resolved)

**1. Entity Change Warning Dialog Not Appearing (v1.1.10, v1.1.11)**
- **Issue:** When changing entity in modal, no warning dialog appears
- **Expected:** User should see warning before changing entity on pushed expense
- **Current Status:** 
  - Button state works correctly ✅
  - pushedExpenses Set updates correctly ✅
  - `handleAssignEntity` function has correct logic ✅
  - onChange event may not be firing ❌
- **Debug Attempts:**
  - v1.1.10: Added logging to `pushedExpenses` useEffect
  - v1.1.11: Added logging directly in onChange handler
- **Next Steps:**
  - Check if onChange fires at all
  - Consider alternative approaches (onBlur, manual save button)
- **Note:** Tabled for future session

**2. Zoho Push Duplicate Prevention Issue**
- **Issue:** Backend's in-memory `submittedExpenses` Set persists across restarts
- **Impact:** Expenses pushed to Zoho, then deleted from Zoho, can't be re-pushed
- **Current Behavior:** Returns "Already submitted (duplicate prevented)" with `zohoExpenseId: undefined`
- **Workaround:** Restart backend to clear Set
- **Proper Fix Needed:** Check database `zoho_expense_id`, not just in-memory Set

---

#### 📚 LESSONS LEARNED

**1. HTTP Status Codes Matter**
- 401 Unauthorized = Authentication failed (token expired/invalid) → Logout required
- 403 Forbidden = Authenticated but lacks permission → Show error, don't logout
- Using wrong code causes incorrect behavior (blank screens, unwanted logouts)

**2. State Management Requires Syncing**
- In-memory state (like `pushedExpenses` Set) must sync with actual data
- Use `useEffect` to update state when source data changes
- Race conditions happen when relying on URL hash for navigation

**3. Validation Should Be Permissive for User Content**
- Phone cameras produce unpredictable file formats
- Use broad patterns (`image/*`) instead of strict regex
- Log rejected files for debugging real-world issues

**4. Import Errors Can Be Silent**
- TypeScript doesn't always catch missing React imports
- Build succeeds, runtime fails with `ReferenceError`
- Always double-check imports when adding new hooks

**5. Frontend UX vs Backend Security**
- Disable/hide UI for invalid actions (UX)
- ALSO enforce rules at API level (security)
- Example: Admin user deletion prevented at both layers

**6. Cross-Component Communication Patterns**
- URL hash: ❌ Unreliable for programmatic navigation
- sessionStorage: ✅ Reliable for passing data between components
- Pattern: Set before navigate, read in useEffect, clean up after

**7. Debug Versions Are Essential**
- Add logging at multiple levels (component, function, API)
- Log BEFORE and AFTER key operations
- Helps identify where logic fails

**8. Cache Busting Is Multi-Layered**
- Browser cache (version increment)
- Service worker cache (cache names)
- Proxy cache (NPMplus restart)
- ALL THREE must be cleared for users to see changes

**9. User-Friendly Error Messages**
- Red errors feel harsh for features under development
- Use blue "info" toasts for "coming soon" features
- Include emoji/icons for visual clarity (🕐 ⚠️ ✅)
- Dynamic messages (use actual entity names, not hardcoded)

**10. Semantic Versioning Guides Development**
- Patch (1.1.0 → 1.1.1): Bug fixes
- Minor (1.0.X → 1.1.0): New features, improvements
- Major (1.X.X → 2.0.0): Breaking changes
- Don't increment by 0.0.1 every time - make it meaningful

---

#### ✅ WHAT WORKED WELL

1. **Incremental Deployments**
   - Fixed issues one at a time
   - Each fix was tested before moving to next
   - Easy to roll back if needed

2. **Debug Logging Strategy**
   - Added logging at multiple points
   - Helped identify exact failure location
   - Console logs provided clear evidence

3. **sessionStorage for Navigation**
   - More reliable than URL hash
   - Clean pattern: set → navigate → read → remove
   - Fixed multi-attempt bug instantly

4. **HTTP Status Code Correction**
   - Changed 403 → 401 for expired tokens
   - Immediately fixed blank dashboard issue
   - Proper logout behavior restored

5. **Permissive File Validation**
   - Accept `image/*` instead of specific types
   - Handles all phone camera formats
   - Increased file size limit for modern photos

6. **Dual-Layer Protection**
   - Frontend: Disable UI for invalid actions
   - Backend: Enforce rules at API level
   - Prevents both accidental and malicious actions

---

#### ❌ WHAT DIDN'T WORK

1. **URL Hash Navigation**
   - Race conditions with page load
   - Timing issues with state updates
   - Unreliable for programmatic navigation

2. **setTimeout Workarounds**
   - Attempted to fix hash timing with delays
   - Still unreliable
   - Proper solution: use sessionStorage

3. **Strict MIME Type Validation**
   - Rejected real-world phone camera images
   - Users couldn't upload legitimate receipts
   - Too narrow for diverse file sources

4. **In-Memory Duplicate Prevention**
   - `submittedExpenses` Set persists
   - Doesn't survive backend restarts
   - Should check database instead

5. **onChange for Entity Dropdown**
   - Warning dialog not appearing
   - Event may not be firing
   - May need alternative approach (onBlur, save button)

---

#### 🎯 BEST PRACTICES ESTABLISHED

**1. Navigation Between Components**
```typescript
// ✅ GOOD: Use sessionStorage
sessionStorage.setItem('openSettingsTab', 'users');
onNavigate('settings');

// In target component:
useEffect(() => {
  const tab = sessionStorage.getItem('openSettingsTab');
  if (tab) {
    setActiveTab(tab);
    sessionStorage.removeItem('openSettingsTab');
  }
}, []);

// ❌ BAD: Use URL hash with timing hacks
window.location.hash = '#users';
setTimeout(() => onNavigate('settings'), 100);  // Unreliable!
```

**2. Error Handling in API Client**
```typescript
// ✅ GOOD: Distinguish auth failures from permission errors
if (error.statusCode === 401) {
  // Token expired - logout
  TokenManager.removeToken();
  onUnauthorized();
} else if (error.statusCode === 403) {
  // Permission denied - show error, don't logout
  throw error;
}

// ❌ BAD: Logout on any 401 or 403
if (error.statusCode === 401 || error.statusCode === 403) {
  logout();  // Too aggressive!
}
```

**3. File Upload Validation**
```typescript
// ✅ GOOD: Permissive validation
const mimetypeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
const extOk = /jpeg|jpg|png|heic|heif|webp|pdf/i.test(ext);

// ❌ BAD: Strict validation
const allowed = /jpeg|jpg|png|pdf/;
if (allowed.test(ext) && allowed.test(mimetype)) {
  // Rejects phone camera images!
}
```

**4. State Syncing**
```typescript
// ✅ GOOD: Sync in-memory state with data source
useEffect(() => {
  const pushed = new Set(expenses.filter(e => e.zohoExpenseId).map(e => e.id));
  setPushedExpenses(pushed);
}, [expenses]);  // Re-sync when expenses change

// ❌ BAD: Initialize once and never update
const [pushedExpenses] = useState(new Set(expenses.filter(...)));
// State gets stale!
```

**5. React Hooks Imports**
```typescript
// ✅ GOOD: Import all hooks you use
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ❌ BAD: Add hooks without importing
import React, { useState } from 'react';
// Then use useEffect() → ReferenceError!
```

---

#### 📝 THINGS TO REMEMBER FOR FUTURE

1. **Always Test Phone Uploads**
   - Real phones send different file formats than desktop
   - Test with iPhone (HEIC), Android (various JPEG variants)
   - Don't rely on desktop testing alone

2. **Cache Busting Is 3-Layered**
   - Browser: Version increment
   - Service Worker: Cache name change
   - Proxy: Manual restart required
   - Forgetting any layer = users see old version

3. **Navigation Requires sessionStorage**
   - URL hash is unreliable for programmatic navigation
   - sessionStorage pattern is proven to work
   - Always remove item after reading

4. **Backend Auth Middleware Order Matters**
   - `authenticateToken` first (checks if logged in)
   - `authorize(roles...)` second (checks permissions)
   - Return 401 for auth failures, 403 for permission denials

5. **Developer Role = Admin + Dev Dashboard**
   - Include developer in all admin authorization checks
   - Don't special-case developer separately
   - Makes code simpler and more maintainable

6. **Entity Change Warning Still Needs Work**
   - Current approach (onChange) may not work
   - Consider onBlur or explicit save button
   - Investigate why event isn't firing

7. **In-Memory State Isn't Persistent**
   - `submittedExpenses` Set clears on restart
   - Should check database, not memory
   - Or use Redis for persistent in-memory cache

8. **Import Checks Are Manual**
   - TypeScript doesn't always catch missing React imports
   - Build succeeds, runtime fails
   - Always verify when adding hooks

---

#### 🔧 TECHNICAL IMPROVEMENTS MADE

**Frontend (v1.1.0 → v1.1.11)**
- Navigation improvements (sessionStorage pattern)
- Better error handling (distinguish 401 vs 403)
- State management (pushedExpenses Set syncing)
- UX improvements (entity editing in modal, friendly errors)
- Debug logging (multiple levels for troubleshooting)

**Backend (v1.1.0 → v1.1.5)**
- File upload validation (permissive MIME types)
- Authorization fixes (developer role access)
- HTTP status codes (401 for expired tokens)
- Entity management (clear zoho_expense_id on change)
- Admin protection (username checks)

---

#### 📊 DEPLOYMENT STATISTICS

**Total Deployments:** 12 (Frontend) + 5 (Backend) = 17 deployments
**Time per deployment:** ~3-5 minutes (build + deploy + verify)
**Hot fixes:** 1 critical (v1.1.9 - missing useEffect import)
**Debug versions:** 3 (v1.1.10, v1.1.11 - ongoing investigation)

**Version Progression:**
- Frontend: 1.0.58 → 1.1.11 (13 versions)
- Backend: 1.0.23 → 1.1.5 (6 versions)

**Semantic Versioning Used:**
- Minor bumps: 1.0.X → 1.1.0 (new features, improvements)
- Patch bumps: 1.1.X → 1.1.Y (bug fixes, hotfixes)

---

### Session: October 15, 2025 (v1.0.58 Production Deployment)

**Objective:** Deploy v1.0.58 to production, troubleshoot and resolve critical access issues

**Duration:** ~2 hours

---

#### 🚀 PRODUCTION DEPLOYMENT COMPLETED

**Versions Deployed:**
- Frontend: v1.0.58 (from v1.0.9) - **49 version jump!**
- Backend: v1.0.23 (from v1.0.1)
- Database: Migrated to `expense_app_production` with `roles` table

**Features Deployed:**
- ✅ Dynamic Role Management System
- ✅ Developer permissions (full admin + Dev Dashboard)
- ✅ Improved UX (collapsible sections, better fonts)
- ✅ Role display fixes
- ✅ All bug fixes from v1.0.9 to v1.0.58

---

#### 🚨 CRITICAL ISSUES ENCOUNTERED

**ISSUE 1: Blank White Page in Production**

**Symptoms:**
- Site loaded but showed blank page
- Console error: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'`
- JavaScript files returning HTML instead of JavaScript
- Manifest icons failing to load
- DNS SERVFAIL for `expapp.duckdns.org`

**Root Causes (Multiple):**

**1. DuckDNS Not Resolving (Red Herring)**
- Initially thought DNS was broken
- `nslookup expapp.duckdns.org` returned `SERVFAIL`
- **Actual Cause:** User's public IP may have changed OR DNS propagation delay
- **Resolution:** Not the main issue - infrastructure was healthy

**2. NPMplus Proxy Scheme Misconfiguration (ACTUAL CAUSE)**
- **The Problem:** NPMplus proxy configured to forward with scheme `https`
- **Why It Broke:** User changed scheme from `http` to `https` thinking it would fix MIME errors
- **What Happened:**
  ```
  Internet → HTTPS (443) → NPMplus → **HTTPS** → Frontend Container Port 80
                                        ↑ WRONG!
  ```
- Frontend container only accepts HTTP on port 80
- NPMplus tried to send HTTPS → Connection failed → 502 Bad Gateway
- NPMplus fallback served error HTML page
- Browser requested JavaScript, got HTML → **MIME type mismatch**

**The Correct Flow:**
```
Internet → HTTPS (443) → NPMplus [SSL Termination] → HTTP → Frontend Container Port 80
```

**3. Environment File Confusion**
- Found `backend/env.production.READY` pointing to Container 203 (sandbox!)
- Database name was `expense_app_sandbox` (wrong!)
- Container mismatch would have caused issues

---

#### 🔧 FIXES APPLIED

**Fix 1: Database Configuration**
```bash
# Renamed database for clarity
ALTER DATABASE expense_app RENAME TO expense_app_production;

# Created sahil/sahil database user
CREATE USER sahil WITH PASSWORD 'sahil' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE expense_app_production TO sahil;
```

**Fix 2: Environment Files**
```bash
# Renamed misnamed file
mv env.production.READY env.sandbox.READY

# Created correct production environment file
backend/env.production:
  - Container: 201 (backend)
  - Database: expense_app_production
  - Credentials: sahil/sahil
  - URLs: https://expapp.duckdns.org
```

**Fix 3: NPMplus Proxy Configuration**
```sql
-- Changed forward scheme back to HTTP
UPDATE proxy_host 
SET forward_scheme = 'http' 
WHERE id = 3;
```

**Fix 4: NPMplus Process Restart**
```bash
# Killed and restarted NPMplus to regenerate nginx configs
pct exec 104 -- kill -HUP 1092
# OR restart entire container
pct stop 104 && sleep 3 && pct start 104
```

**Fix 5: Applied Database Migration**
```bash
# Applied roles table migration to production
psql -U sahil -d expense_app_production -f 003_create_roles_table.sql
```

---

#### 🎓 CRITICAL LESSONS LEARNED

**LESSON 1: SSL Termination vs. End-to-End Encryption**

**The Confusion:**
- User saw `http` in NPMplus config and thought it was insecure
- Changed to `https` thinking it would make site more secure

**The Reality:**
```
PUBLIC INTERNET (HTTPS) → NPMplus [SSL TERMINATION] → INTERNAL NETWORK (HTTP)
                           ↑ Encryption happens HERE
```

**Key Concept:** 
- NPMplus handles SSL/TLS encryption (Certificate: expapp.duckdns.org)
- Backend containers communicate via HTTP on private network
- **This is standard reverse proxy architecture!**

**Rule:** Never forward `https` from reverse proxy to backend unless backend explicitly supports HTTPS on that port.

---

**LESSON 2: MIME Type Errors = Proxy/Routing Problem**

**Diagnostic Pattern:**
```
Console Error: "Expected JavaScript but got text/html"
               ↓
Question: Why is HTML being served instead of JS?
               ↓
Answer: Upstream service (proxy/nginx) returning error page
               ↓
Root Cause: Connection failure between proxy and backend
```

**Quick Diagnosis:**
1. Test asset directly from backend container IP
2. If works → proxy configuration issue
3. If fails → backend nginx config issue

---

**LESSON 3: Infrastructure is a Stack - Diagnose Bottom-Up**

**Correct Diagnostic Order:**
1. ✅ Backend container healthy? (curl http://container-ip:port/api/health)
2. ✅ Frontend container serving files? (curl http://container-ip/index.html)
3. ✅ NPMplus proxy routing correctly? (curl -H "Host: domain" http://proxy-ip/)
4. ✅ DNS resolving? (nslookup domain)
5. ✅ SSL certificate valid? (curl -I https://domain)

**Don't Jump to DNS First!** - Most issues are configuration, not DNS.

---

**LESSON 4: Environment File Naming Matters**

**What Went Wrong:**
- File named `env.production.READY` was actually sandbox configuration
- AI from previous session created file but misconfigured it

**Prevention:**
- Use explicit naming: `env.production`, `env.sandbox`
- Never use `.READY` suffix (confusing!)
- Validate contents match filename before deployment

---

**LESSON 5: Production Database Schema Drift**

**The Gap:**
- Production was at v1.0.1 (database schema very old)
- Sandbox was at v1.0.58 (with `roles` table)
- **49 version gap!**

**What Could Go Wrong:**
- Missing tables → API errors
- Missing columns → Database exceptions
- Different constraints → Insert failures

**Solution Applied:**
- Applied all migrations in order
- Tested migration on production before code deployment
- Verified backward compatibility

---

**LESSON 6: NPMplus Process Must Reload After DB Changes**

**The Surprise:**
- Changed `forward_scheme` in SQLite database
- Configuration didn't update!

**Why:**
- NPMplus caches nginx config in memory
- Must reload Node.js process to regenerate configs

**Commands That Work:**
```bash
# Option 1: Signal the process
pct exec 104 -- kill -HUP <PID>

# Option 2: Restart container (safer)
pct stop 104 && sleep 3 && pct start 104
```

---

**LESSON 7: 502 Bad Gateway = Backend Unreachable**

**When You See 502:**
1. Backend is down
2. Backend is up but wrong port/protocol
3. Firewall blocking
4. **Wrong scheme (https vs http)** ← This was our issue

**Quick Test:**
```bash
# From proxy container, can you reach backend?
curl -I http://backend-ip:backend-port/
```

---

#### 🔍 DIAGNOSTIC APPROACHES TAKEN

**Approach 1: Check Infrastructure Health First**
```bash
# Container status
pct list | grep -E '201|202|104'

# Service status
pct exec 201 -- systemctl status expenseapp-backend
pct exec 202 -- systemctl status nginx
pct exec 104 -- ps aux | grep nginx

# Health checks
curl http://192.168.1.201:3000/api/health
curl http://192.168.1.139/index.html
```

**Approach 2: Test Direct Access (Bypass Proxy)**
```bash
# Can frontend serve files?
curl http://192.168.1.139/assets/index-V6x2iYJg.js

# Can NPMplus reach frontend? (with Host header)
curl -H "Host: expapp.duckdns.org" http://192.168.1.160/
```

**Approach 3: Check Proxy Configuration**
```bash
# Read NPMplus database
pct exec 104 -- sqlite3 /opt/npmplus/npmplus/database.sqlite \
  "SELECT forward_scheme, forward_host, forward_port FROM proxy_host WHERE id = 3;"
```

**Approach 4: Verify DNS**
```bash
# Check DNS resolution
nslookup expapp.duckdns.org
dig expapp.duckdns.org

# Get public IP
curl ifconfig.me
```

**Approach 5: Check Logs**
```bash
# Backend logs
pct exec 201 -- journalctl -u expenseapp-backend -n 50

# Look for connection errors
grep -i "error\|fail\|refused" logs.txt
```

---

#### ✅ DEPLOYMENT CHECKLIST (WHAT WORKED)

**Pre-Deployment:**
- [x] Database backup created (`/tmp/expense_app_production_backup_*.sql`)
- [x] Verified production database exists
- [x] Created `sahil/sahil` database user
- [x] Renamed database to `_production` suffix

**Environment Configuration:**
- [x] Fixed `env.production` file (correct container, database, credentials)
- [x] Renamed misnamed `env.production.READY` to `env.sandbox.READY`
- [x] Deployed environment file to `/etc/expenseapp/backend.env`
- [x] Set permissions: `chmod 600`

**Code Deployment:**
- [x] Merged v1.0.10 branch to main (49 versions!)
- [x] Built backend v1.0.23
- [x] Deployed backend to container 201
- [x] Applied `roles` table migration
- [x] Restarted backend service
- [x] Verified health check (version 1.0.23, database connected)

**Frontend Deployment:**
- [x] Created `.env.production` with `VITE_API_URL=https://expapp.duckdns.org/api`
- [x] Built frontend v1.0.58 for production
- [x] Deployed to container 202 (`/var/www/expenseapp/current`)
- [x] Verified static assets present (icons, JS bundles)

**Proxy Configuration:**
- [x] Fixed NPMplus forward scheme (https → http)
- [x] Restarted NPMplus (container 104)
- [x] Verified proxy routing works
- [x] Confirmed SSL certificate valid

**Verification:**
- [x] Backend health check returns 200
- [x] Frontend HTML loads
- [x] JavaScript bundle loads (no MIME errors)
- [x] Icons accessible
- [x] No 502 errors
- [x] Zero errors in logs

---

#### ❌ WHAT DIDN'T WORK (Dead Ends)

**Dead End 1: Trying to Fix DNS First**
- Spent time investigating DuckDNS
- User couldn't access DuckDNS account
- **Reality:** DNS wasn't the problem, proxy was!

**Dead End 2: Changing Proxy Scheme to HTTPS**
- User thought `http` scheme was insecure
- Changed to `https` in UI → Made problem worse!
- **Lesson:** Understand architecture before making changes

**Dead End 3: Searching for DuckDNS Auto-Updater**
- Looked for cron jobs, services, containers
- None found (no auto-updater configured)
- **Reality:** Not relevant to the MIME error issue

---

#### 🎯 KEY TAKEAWAYS FOR FUTURE DEPLOYMENTS

**1. Reverse Proxy Architecture:**
```
Internet (HTTPS) → Proxy [SSL Termination] → Backend (HTTP on private network)
```
This is correct! Don't change it!

**2. MIME Type Error Diagnosis:**
```
"Expected JavaScript but got HTML" = Proxy returning error page = Connection failure
```

**3. NPMplus Configuration:**
- `forward_scheme: http` for containers serving HTTP
- `forward_scheme: https` ONLY if backend has SSL cert
- Database changes require process reload

**4. 502 Bad Gateway = Check scheme mismatch first**

**5. Always Test Bottom-Up:**
Backend → Frontend → Proxy → DNS → SSL

**6. Production Database:**
- Always suffix with `_production`
- Create separate admin user (not postgres)
- Backup before ANY changes

**7. Environment Files:**
- Clear naming: `env.production`, `env.sandbox`
- Validate contents match deployment target
- Never trust filenames alone

**8. NPMplus Must Restart After Config Changes:**
```bash
pct stop 104 && sleep 3 && pct start 104
```

---

### Session: October 15, 2025 (v1.0.54 - v1.0.58)

**Objective:** Implement dynamic role management system, improve UX, fix role display issues

**Duration:** Full day session

---

#### 📦 FEATURES IMPLEMENTED

**1. Dynamic Role Management System (v1.0.54)**

**What Was Built:**
- New `roles` database table with complete CRUD operations
- Role Management UI component in Settings → User Management
- Create, edit, delete custom roles from the admin interface
- 10 color options for role badges
- System role protection
- Real-time role validation

**Technical Implementation:**
- **Database Migration:** `003_create_roles_table.sql`
- **Backend API:** `/api/roles` endpoints (GET/POST/PUT/DELETE)
- **Frontend Component:** `RoleManagement.tsx` with grid display, modal forms, color picker

**2. Developer Permissions (v1.0.56)**
- Updated backend authorization: `users.ts` and `roles.ts` now check for both 'admin' and 'developer'
- Developer role = Admin capabilities + Dev Dashboard

**3. Dynamic Role Loading (v1.0.56)**
- Role dropdowns in User Management now load from database
- Replaced 3 hardcoded `<option>` lists with dynamic mapping
- Filters out 'pending' role

**4. UX Improvements (v1.0.55 & v1.0.57)**
- Collapsible Role Management (collapsed by default)
- Improved readability with larger fonts
- More compact layout

**5. Role Display Fix (v1.0.58)**
- Fixed `getRoleLabel()` and `getRoleColor()` to use dynamic data
- Developer/temporary roles no longer show as "Pending Approval"

---

#### 💡 LESSONS LEARNED

**1. Hardcoded Data = Maintenance Nightmare**

**Problem:** Role labels/colors hardcoded in multiple places → new roles didn't show correctly

**Lesson:** Always load dynamic data from database. Single source of truth.

**Fix Pattern:**
```typescript
// BAD: Hardcoded
const labels = { 'admin': 'Administrator' };
return labels[role] || 'Pending Approval';

// GOOD: Dynamic
const role = roles.find(r => r.name === roleName);
return role ? role.label : fallback;
```

**2. Cache is a Three-Headed Beast**

**The Three Layers:**
1. Browser Cache → Hard refresh
2. Service Worker Cache → Version increment
3. NPMplus Proxy Cache → **Manual restart (LXC 104)**

**Lesson:** ALL THREE must be cleared. #3 keeps getting forgotten!

```bash
# Critical deployment step:
pct stop 104 && sleep 3 && pct start 104
```

**3. Developer vs. Admin: Capability Overlap**

**User Expectation:** Developer = Admin + Dev Dashboard

**Solution:** Updated `authorize()` checks to include 'developer' wherever 'admin' was checked

**Lesson:** Role names imply hierarchy. Users expect "developer" to have admin-level access.

**4. Database Migrations in Production Are Scary**

**Challenges:**
- Wrong credentials (tried `postgres`, should be `expense_sandbox`)
- Multiple failed attempts

**What Worked:**
```bash
PGPASSWORD=sandbox123 psql -h localhost -U expense_sandbox -d expense_app_sandbox -f migration.sql
```

**Lesson:** Always verify connection parameters BEFORE running migrations. Test with `SELECT version();` first.

**5. Collapsible Sections = Cleaner UI**

**Problem:** Role Management taking too much space

**Solution:** Collapsible (collapsed by default)

**Lesson:** For admin-only infrequent features, collapsible sections improve UX without removing functionality.

**6. Font Size Matters**

**The Trap:** Made things "compact" in v1.0.55, went too aggressive (text-[10px])

**Lesson:** Compact ≠ Unreadable. Minimum font sizes:
- Body text: `text-sm` (14px)
- Metadata: `text-xs` (12px)
- **Never** go below `text-xs` for user-facing content

---

#### 🚧 STRUGGLE POINTS

**1. Database Migration Confusion (30 min lost)**
- Tried wrong credentials multiple times
- **Solution:** Always check `backend/.env` first!

**2. Role Display Bug (20 min to diagnose)**
- Data correct in DB, correct in API, wrong in UI
- Found: `getRoleLabel()` hardcoded
- **Lesson:** Look for transformation functions when data is correct upstream but wrong downstream

**3. NPMplus Proxy Cache (Again!)**
- Deployed v1.0.55, user saw v1.0.54
- Forgot to restart LXC 104
- **Lesson:** Add to automated deployment script or document more prominently

---

#### ✅ TASKS COMPLETED

- [x] Implement dynamic role management system
- [x] Create database migration for roles table
- [x] Build Role Management UI component
- [x] Add backend API routes for roles CRUD
- [x] Update User Management to load roles dynamically
- [x] Give developer role admin permissions
- [x] Fix role display in User Management table
- [x] Improve Role Management readability
- [x] Make Role Management collapsible
- [x] Move "Push to Zoho" button to Approvals page
- [x] Clean up old project files (61 tar.gz files, old backup folders)
- [x] Update temporary user credentials
- [x] Update README.md (comprehensive rewrite)
- [x] Update ARCHITECTURE.md (comprehensive rewrite)
- [x] Update AI_MASTER_GUIDE.md (this section!)

---

#### 📝 TASKS REMAINING

**High Priority:**
- [ ] Fix temporary user creation (custom participants not being saved)
  - Issue: When adding temporary users via "Add Participant" field on event page, user is not created
  - Status: Deferred - not blocking other features

**Medium Priority:**
- [ ] Add comprehensive testing (unit tests, E2E tests)
- [ ] Add role permission matrix to UI

**Low Priority:**
- [ ] Consider moving temporary user creation to dedicated flow
- [ ] Add audit log for role changes

---

#### 🎯 KEY TAKEAWAYS FOR FUTURE AI SESSIONS

1. **Always check `backend/.env` before database operations** → Saves 30+ minutes

2. **Cache clearing = 3 steps:** Version increment + Deploy + **Restart NPMplus proxy**

3. **When "it's not working":**
   - ✓ Database correct?
   - ✓ API correct?
   - ✓ Transform functions (getters/formatters) hardcoded?
   - ✓ User hard refreshed?

4. **Dynamic data > hardcoded data** → Always. No exceptions.

5. **Developer role should equal admin + extras** → User expectation

6. **Collapsible sections for infrequent features** → Better UX

7. **Readability > compactness** → Don't sacrifice usability

8. **Test on actual screens** → Dev mode can hide issues

---

## 📝 CHANGELOG

### v1.0.58 (Oct 15, 2025)
- **Fixed:** Role labels/colors now load dynamically from database
- **Fixed:** Developer/temporary roles no longer show as "Pending Approval"
- Updated `getRoleLabel()` and `getRoleColor()` to use roles array

### v1.0.57 (Oct 15, 2025)
- **Improved:** Larger, more readable font sizes in Role Management
- All text increased (text-xs → text-sm)
- Better padding and spacing

### v1.0.56 (Oct 15, 2025) + Backend v1.0.23
- **Added:** Developer role now has full admin capabilities
- **Fixed:** Role dropdowns in User Management load all roles dynamically
- **Backend:** authorize() checks updated for developer role in users.ts and roles.ts

### v1.0.55 (Oct 15, 2025)
- **Changed:** Moved Role Management below User Management
- **Changed:** Made Role Management collapsible (collapsed by default)
- **Changed:** More compact cards (4 columns on large screens)

### v1.0.54 (Oct 15, 2025)
- **MAJOR FEATURE:** Dynamic Role Management System
- Create, edit, delete custom roles from UI
- Database migration: `roles` table with CRUD operations
- Backend API: `/api/roles` endpoints
- System roles protected from deletion
- 10 color options for role badges

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

