# Trade Show Expense Management App

A professional web application for managing trade show events and expenses with **dynamic role management**, **offline-first PWA architecture**, OCR receipt scanning, expense approval workflows, and **automatic Zoho Books integration**.

**Current Version: 1.4.13 (Frontend) / 1.5.1 (Backend) - October 16, 2025**  
**Production Status:** ✅ Stable and Active

📝 See [CHANGELOG.md](CHANGELOG.md) for complete version history  
🏗️ See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system architecture  
📚 See [docs/AI_MASTER_GUIDE.md](docs/AI_MASTER_GUIDE.md) for development guide

---

## 🚀 Quick Start

### Sandbox Environment (Development/Testing)
**URL:** http://192.168.1.144  
**Credentials:**
- Admin: `admin` / `sandbox123`
- Coordinator: `coordinator` / `sandbox123`
- Salesperson: `salesperson` / `sandbox123`
- Accountant: `accountant` / `sandbox123`
- Developer: `developer` / `sandbox123`
- Temporary: `temporary` / `changeme123`

### Production Environment
**URL:** http://192.168.1.138  
See [docs/BOOMIN_CREDENTIALS.md](docs/BOOMIN_CREDENTIALS.md) for production credentials

---

## 🆕 Recent Updates (v1.1.0 - v1.5.1)

**October 16, 2025 - Major Feature Release & Production Deployment**

### 🎯 Major Features (v1.3.0 - v1.4.13)

#### ✨ Unified Expense & Approval Workflows (v1.3.0)
- **Merged Approvals page into Expenses page** - Single unified interface for all expense management
- **Role-based views**: Regular users see only their expenses, accountants/admins see approval workflows
- **Approval cards** showing pending counts, reimbursements, and unassigned entities
- **Inline entity assignment** and Zoho push directly from expense table
- **Editable detail modal** - Status, reimbursement, and entity can be modified in-place
- **Mark as Paid button** - Quick reimbursement payment tracking
- **Zoho push status indicator** in detail modal

#### 🤖 Automated Approval Workflow (v1.4.0)
- **Removed manual approval buttons** - Approvals now happen automatically
- **Auto-approve on entity assignment** - Assigning an entity automatically approves the expense
- **Auto-approve on reimbursement decision** - Approved/rejected reimbursement auto-approves expense
- **Regression detection** - Automatically sets "needs further review" status when fields are reverted
- **Simplified 3-rule logic** - Clear, reliable status transitions

### 🐛 Critical Bug Fixes

#### Timezone Bug (v1.1.12)
- **Issue**: Expenses submitted at 9:35 PM showed next day's date
- **Fix**: Created `getTodayLocalDateString()` to use local time instead of UTC
- **Impact**: All date inputs now use correct local dates

#### Offline Notification Spam (v1.1.13)
- **Issue**: Multiple "Working Offline" notifications stacking up, not dismissing
- **Fix**: Implemented notification ID tracking, less aggressive network detection
- **Impact**: Clean, single offline notification that properly dismisses

#### Session Timeout Warning (v1.1.14)
- **Issue**: Users logged out without seeing 5-minute warning modal
- **Fix**: Corrected token refresh URL, improved session/API coordination
- **Impact**: Users now see warning before timeout

#### Auto-Status Logic Reliability (v1.5.0)
- **Issue**: Expenses stuck in "needs further review" despite corrective actions
- **Fix**: Completely rewrote logic with 3 clear rules (regression → approval → no-op)
- **Impact**: Bulletproof status transitions, impossible to miss edge cases

#### Pending Tasks Navigation (v1.4.13/v1.5.1)
- **Issue**: "Push to Zoho" button in dashboard led to 404 (old approvals page)
- **Fix**: Updated all task links to point to unified expenses page
- **Impact**: All dashboard quick actions work correctly

### 💡 UI/UX Improvements
- **Settings cleanup** - Removed redundant summary, counts moved to card headers
- **Responsive expense table** - Readable with nav pane open or closed
- **Collapsible inline filters** - Hidden by default, toggle button in Actions column
- **Category colors restored** - Charts match expense table colors
- **Delete confirmations** - All delete operations now ask for confirmation
- **Reimbursement status clarity** - "Approved" now reads "Approved (pending payment)"

### 📝 Lessons Learned
- **Database schema constraints** must be updated BEFORE deploying code that uses new values
- **Frontend deployment directory** is `/var/www/expenseapp/current/` not root
- **Backend service path** is `/opt/expenseApp/backend/` (capital A in expenseApp)
- **Always create version tags** after production deployment
- **One branch per development session**, not per individual change
- **Separate Zoho credentials** for sandbox/production is intentional (data isolation)

### ⚠️ Breaking Changes (v1.3.0+)
- **Approvals page removed** - All approval workflows moved to Expenses page
- **Manual approval buttons removed** - Status changes are now automated
- **Navigation structure changed** - Dashboard tasks now navigate to /expenses

---

## ✨ Key Features

### 🎭 Dynamic Role Management System (NEW in v1.0.54-56)
- **Create custom roles** dynamically from the UI
- **System roles** (admin, accountant, coordinator, salesperson, developer, temporary, pending) are protected
- **Custom roles** can be added, edited, and deleted
- **Role properties**: Label, description, color badge (10 color options)
- **Database-driven**: All role data stored in `roles` table
- **Developer permissions**: Developers have full admin capabilities PLUS exclusive Dev Dashboard access

### 🔐 Role-Based Access Control
- **Admin**: Full system access + user/role management
- **Developer**: All admin capabilities + Dev Dashboard (debugging tools, diagnostics)
- **Accountant**: Approve expenses, manage reimbursements, Zoho Books integration, reports
- **Event Coordinator**: Create/manage events, assign participants, view event expenses
- **Salesperson**: Submit expenses for assigned events, upload receipts
- **Temporary Attendee**: Limited event participation for custom attendees

### 📱 Progressive Web App (PWA)
- **Offline-first architecture** with IndexedDB
- **Sync queue** for offline expense submissions
- **Service Worker** with cache versioning
- **Network-first strategy** for API calls (fixes stale data)
- **Background sync** when connection restored

### 🔗 Zoho Books Integration
- **Automatic expense sync** with receipt attachments
- **Push to Zoho** button on Approvals page (post-entity-assignment)
- **Multi-entity support** (Haute Brands, Alpha, Beta, Gamma, Delta)
- **Duplicate prevention** via `zohoExpenseId` tracking
- **OAuth 2.0 security** with automatic token refresh
- **Smart navigation** (takes user to report with most unsynced items)

### 📋 Expense Management
- **Unified expense interface** - Single page for submitting, reviewing, and managing expenses
- **Submit expenses** with receipt upload (JPEG, PNG, PDF, HEIC, HEIF, WebP) - phone camera images supported!
- **OCR text extraction** from receipts (Tesseract.js + Sharp image preprocessing)
- **Automated approval workflows** - Status changes automatically based on entity/reimbursement actions
  - Assigning entity → auto-approve
  - Reimbursement decision → auto-approve
  - Reverting fields → "needs further review"
- **Inline entity assignment** - Assign Zoho entities directly from expense table
- **Entity re-assignment** with Zoho ID clearing for already-pushed expenses
- **Reimbursement tracking** (pending review → approved → paid)
  - Inline approve/reject buttons
  - Mark as Paid button ($ icon) for approved reimbursements
  - Confirmation dialogs for all status changes
- **Approval cards** (for accountants/admins) - Summary metrics at top of page
- **Editable detail modal** - Modify status, reimbursement, entity, and view Zoho push status
- **Collapsible inline filters** - Filter by date, merchant, category, status, entity
- **Receipt viewing** (full-size default with hide option)
- **Delete confirmations** - All deletions require explicit confirmation
- **Duplicate prevention** (form submit disabled during save)
- **File size limit**: 10MB (supports modern phone photos)

### 📊 Reporting & Analytics
- **Detailed reports** by event with real-time filters
- **Push to Zoho** button for syncing expenses
- **Entity-based filtering** (view expenses by Zoho entity)
- **Export capabilities** (coming soon)
- **Dashboard widgets** with dynamic data

### 🎪 Event Management
- **Create and manage trade show events**
- **Participant tracking** with role assignments
- **Budget management** (admin-only)
- **Event timeline** (start/end dates)
- **Location tracking**
- **Custom temporary participants** (creates user with 'temporary' role)

### 🛠️ Developer Dashboard (Developer Role Only)
- **System diagnostics** and debugging tools
- **Environment information**
- **Cache management**
- **API health checks**
- **Version tracking**

---

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Lucide React** for icons
- **Service Worker** for PWA functionality
- **IndexedDB** for offline storage

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **TypeScript**
- **JWT** for authentication
- **Tesseract.js** for OCR
- **Sharp** for image preprocessing
- **Multer** for file uploads
- **bcrypt** for password hashing

### Infrastructure
- **Proxmox LXC Containers** (Debian 12)
- **Nginx** reverse proxy
- **NPMplus** proxy manager
- **PM2** process manager
- **PostgreSQL 15**

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/sahiwal283/expenseApp.git
cd expenseApp
```

### 2. Database Setup

**Create Database:**
```bash
psql postgres
CREATE DATABASE expense_app_sandbox;
CREATE USER expense_sandbox WITH PASSWORD 'sandbox123';
GRANT ALL PRIVILEGES ON DATABASE expense_app_sandbox TO expense_sandbox;
\q
```

**Run Migrations:**
   ```bash
cd backend
   npm install
npm run migrate
npm run seed
   ```

### 3. Backend Setup

**Environment Configuration:**
```bash
cd backend
cp env.example .env
```

**Edit `.env`:**
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_app_sandbox
DB_USER=expense_sandbox
DB_PASSWORD=sandbox123

# JWT
JWT_SECRET=your_random_secret_min_32_chars

# Uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Zoho Books (optional)
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_org_id
```

**Start Backend:**
```bash
npm run dev
# Backend runs on http://localhost:3000
```

### 4. Frontend Setup

```bash
cd ..  # Return to project root
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with roles
- **roles** - Role definitions (labels, colors, permissions) *NEW*
- **events** - Trade show events
- **event_participants** - User-event relationships
- **expenses** - Expense records with OCR data
- **settings** - Application configuration

### Key Relationships
- Users → Roles (many-to-one)
- Events → Participants (many-to-many through event_participants)
- Expenses → Users (many-to-one)
- Expenses → Events (many-to-one)

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin/developer)
- `PUT /api/users/:id` - Update user (admin/developer)
- `DELETE /api/users/:id` - Delete user (admin/developer)

### Roles *(NEW)*
- `GET /api/roles` - Get all active roles
- `POST /api/roles` - Create role (admin/developer)
- `PUT /api/roles/:id` - Update role (admin/developer)
- `DELETE /api/roles/:id` - Soft delete role (admin/developer)

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create expense with receipt upload
- `PUT /api/expenses/:id` - Update expense
- `PATCH /api/expenses/:id/status` - Update expense status (auto-approval workflow)
- `PATCH /api/expenses/:id/entity` - Assign Zoho entity (triggers auto-approval)
- `PATCH /api/expenses/:id/reimbursement` - Set reimbursement status (triggers auto-approval)
- `POST /api/expenses/:id/zoho` - Push expense to Zoho Books
- `DELETE /api/expenses/:id` - Delete expense

### Quick Actions
- `GET /api/quick-actions` - Get pending tasks for dashboard widget

### Settings
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update settings (admin)

---

## 🚀 Deployment

### Sandbox Deployment (v1.0.10 branch)

**Frontend:**
```bash
# Build
npm run build

# Add build ID
BUILD_ID=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: ${BUILD_ID} -->" >> dist/index.html

# Deploy
tar -czf frontend-v1.0.X-${BUILD_ID}.tar.gz -C dist .
scp frontend-v1.0.X-*.tar.gz root@192.168.1.190:/tmp/frontend-v1.0.X.tar.gz

# Extract and restart
ssh root@192.168.1.190 "
  pct push 203 /tmp/frontend-v1.0.X.tar.gz /tmp/frontend-v1.0.X.tar.gz &&
  pct exec 203 -- bash -c 'cd /var/www/expenseapp && rm -rf * && tar -xzf /tmp/frontend-v1.0.X.tar.gz && systemctl restart nginx' &&
  pct stop 104 && sleep 3 && pct start 104 && sleep 2
"
```

**Backend:**
```bash
cd backend
npm run build
tar -czf backend-v1.0.X.tar.gz -C dist .
scp backend-v1.0.X.tar.gz root@192.168.1.190:/tmp/backend-v1.0.X.tar.gz

ssh root@192.168.1.190 "
  pct push 203 /tmp/backend-v1.0.X.tar.gz /tmp/backend-v1.0.X.tar.gz &&
  pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && rm -rf dist && tar -xzf /tmp/backend-v1.0.X.tar.gz -C dist && systemctl restart expenseapp-backend'
"
```

**⚠️ CRITICAL**: Always restart NPMplus proxy (LXC 104) after frontend deployment to clear cache!

---

## 🐛 Troubleshooting

### Version Not Updating After Deployment
**Cause:** Caching at browser, service worker, or NPMplus proxy level

**Solution:**
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
2. Verify service worker cache cleared (check console logs)
3. Restart NPMplus proxy: `pct stop 104 && sleep 3 && pct start 104`

### Roles Not Showing in Dropdown
**Cause:** `roles` table migration not applied

**Solution:**
```bash
ssh root@192.168.1.190
pct exec 203
PGPASSWORD=sandbox123 psql -h localhost -U expense_sandbox -d expense_app_sandbox -f /path/to/003_create_roles_table.sql
```

### Developer Cannot Delete Users
**Cause:** Backend authorization checks missing 'developer' role

**Solution:** Already fixed in backend v1.0.23

### Backend Logs
```bash
ssh root@192.168.1.190 "pct exec 203 -- journalctl -u expenseapp-backend -n 50 --no-pager"
```

---

## 📚 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and diagrams
- **[docs/AI_MASTER_GUIDE.md](docs/AI_MASTER_GUIDE.md)** - Development guide for AI assistants
- **[docs/BOOMIN_CREDENTIALS.md](docs/BOOMIN_CREDENTIALS.md)** - Production credentials
- **[docs/ZOHO_BOOKS_SETUP.md](docs/ZOHO_BOOKS_SETUP.md)** - Zoho Books integration guide

---

## 📝 License

Proprietary software. © 2025 Haute Brands. All rights reserved.

---

## 🔧 Recent Updates (v1.0.54 - v1.0.58)

### v1.0.58 (October 15, 2025)
- **Fixed**: Role labels now load dynamically from database
- **Fixed**: Developer and temporary roles no longer show as "Pending Approval"

### v1.0.57
- **Improved**: Larger, more readable font sizes in Role Management

### v1.0.56
- **Added**: Developer role now has full admin capabilities
- **Fixed**: Role dropdowns now load all roles dynamically from database

### v1.0.55
- **Changed**: Role Management moved below User Management
- **Changed**: Made Role Management collapsible (collapsed by default)

### v1.0.54
- **Added**: Dynamic Role Management System
- **Added**: Create, edit, delete custom roles from UI
- **Added**: Database migration for `roles` table

See [CHANGELOG.md](CHANGELOG.md) for complete history.
