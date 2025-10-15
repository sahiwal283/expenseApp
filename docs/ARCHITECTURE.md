# Trade Show Expense App - Architecture Documentation

**Version:** 1.0.58 (Frontend) / 1.0.23 (Backend)  
**Last Updated:** October 15, 2025  
**Status:** Production Active

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRADE SHOW EXPENSE APP                          │
│         Frontend v1.0.58 / Backend v1.0.23                          │
│                    PRODUCTION + SANDBOX                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                               │
└──────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Web Browser    │
                    │  192.168.1.144   │ (Sandbox)
                    │  192.168.1.138   │ (Production)
                    └────────┬─────────┘
                             │ HTTPS
                             │
                    ┌────────▼─────────┐
                    │  NPMplus Proxy   │
                    │   (LXC 104)      │
                    │  Port 80/443     │
                    └────────┬─────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
   ┌──────▼──────────┐              ┌──────────▼──────────┐
   │  Sandbox (203)  │              │  Production (???)   │
   │ 192.168.1.144   │              │  192.168.1.138      │
   └─────────────────┘              └─────────────────────┘

Each Environment Contains:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌───────────────┐         ┌─────────────────┐                    │
│  │   Frontend    │◄───────►│   Backend API   │                    │
│  │  React + TS   │   JWT   │  Node/Express   │                    │
│  │  Nginx :80    │  Auth   │  PM2 :3000      │                    │
│  └───────────────┘         └────────┬────────┘                    │
│          │                           │                             │
│          │                  ┌────────┴────────┐                    │
│          │                  │                 │                    │
│  ┌───────▼───────┐   ┌──────▼──────┐  ┌──────▼──────┐            │
│  │ Service Worker│   │ PostgreSQL  │  │  Tesseract  │            │
│  │ + IndexedDB   │   │   Port 5432 │  │  OCR Engine │            │
│  │ (Offline PWA) │   └─────────────┘  └─────────────┘            │
│  └───────────────┘                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      FRONTEND ARCHITECTURE                        │
└───────────────────────────────────────────────────────────────────┘

App.tsx (Root)
├── useAuth() - Authentication & Session Management
├── PWA Registration - Service Worker + Offline Support
└── Router
    ├── LoginForm.tsx (Public)
    └── Authenticated Layout
        ├── Sidebar.tsx (Role-based Navigation)
        ├── Header.tsx (Search, Notifications, User Menu)
        └── Content Area
            ├── Dashboard.tsx (All Roles)
            ├── Events/
            │   ├── EventSetup.tsx
            │   ├── EventList.tsx
            │   └── hooks/
            │       ├── useEventForm.ts
            │       └── useEventParticipants.ts
            ├── Expenses/
            │   ├── ExpenseSubmission.tsx
            │   ├── ExpenseForm.tsx
            │   └── ExpenseList.tsx
            ├── Admin/
            │   ├── Approvals.tsx (Admin, Accountant, Developer)
            │   │   └── "Push to Zoho" button
            │   ├── AdminSettings.tsx
            │   ├── UserManagement.tsx
            │   │   ├── Dynamic role loading
            │   │   └── CRUD operations
            │   └── RoleManagement.tsx (NEW)
            │       ├── Create custom roles
            │       ├── Edit roles (label, color, description)
            │       └── Delete custom roles
            ├── Reports/
            │   ├── Reports.tsx
            │   ├── DetailedReport.tsx
            │   └── EventFilters.tsx
            └── Developer/
                └── DevDashboard.tsx (Developer Only)
                    ├── System diagnostics
                    ├── Cache management
                    └── API health checks
```

---

## Database Schema

```
┌───────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA (PostgreSQL)                 │
└───────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐
│    users    │◄────────┤    roles    │  (NEW in v1.0.54)
├─────────────┤         ├─────────────┤
│ id          │         │ id          │
│ username    │         │ name        │  (unique, lowercase)
│ password    │         │ label       │  (display name)
│ name        │         │ description │
│ email       │         │ color       │  (Tailwind classes)
│ role ────────►        │ is_system   │  (protected flag)
│ created_at  │         │ is_active   │  (soft delete)
└─────────────┘         │ created_at  │
       │                │ updated_at  │
       │                └─────────────┘
       │
       │  ┌──────────────────┐
       └──┤ event_participants│
          ├──────────────────┤
          │ id               │
          │ event_id ────────┐
          │ user_id          │
          │ role             │
          └──────────────────┘
                             │
┌─────────────┐             │
│   events    │◄────────────┘
├─────────────┤
│ id          │
│ name        │
│ location    │
│ start_date  │
│ end_date    │
│ budget      │
│ created_by  │
│ created_at  │
└─────────────┘
       │
       │  ┌─────────────┐
       └──┤  expenses   │
          ├─────────────┤
          │ id          │
          │ user_id     │
          │ event_id    │
          │ category    │
          │ amount      │
          │ description │
          │ receipt_path│
          │ ocr_text    │
          │ status      │  (pending/approved/rejected)
          │ zoho_entity │  (haute/alpha/beta/gamma/delta)
          │ zoho_expense_id │  (tracking)
          │ reimbursement_required │
          │ reimbursement_status │
          │ card_type   │
          │ created_at  │
          │ updated_at  │
          └─────────────┘

┌─────────────┐
│  settings   │
├─────────────┤
│ id          │
│ key         │
│ value       │
│ created_at  │
│ updated_at  │
└─────────────┘
```

---

## Data Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                  EXPENSE SUBMISSION FLOW                          │
└───────────────────────────────────────────────────────────────────┘

1. User submits expense with receipt
   │
   ├──► Frontend validates form
   │    └──► If offline: Save to IndexedDB queue
   │         └──► Background sync when online
   │
   └──► If online:
        │
        ├──► POST /api/expenses
        │    ├── Multer handles file upload
        │    ├── Sharp preprocesses image (grayscale, sharpen)
        │    ├── Tesseract extracts text (OCR)
        │    └── Save to database
        │         ├── expenses table
        │         └── receipt stored in uploads/
        │
        └──► Response to frontend
             └──► Show success notification

┌───────────────────────────────────────────────────────────────────┐
│                  EXPENSE APPROVAL FLOW                            │
└───────────────────────────────────────────────────────────────────┘

1. Admin/Accountant opens Approvals page
   │
   ├──► GET /api/expenses (with filters)
   │
   └──► Review expense
        │
        ├──► PATCH /api/expenses/:id/review
        │    └── Update status (approved/rejected)
        │
        └──► PATCH /api/expenses/:id/entity
             └── Assign Zoho entity (haute/alpha/etc)

┌───────────────────────────────────────────────────────────────────┐
│                  ZOHO BOOKS SYNC FLOW                             │
└───────────────────────────────────────────────────────────────────┘

1. Accountant clicks "Push to Zoho" button
   │
   ├──► Validates: expense has entity assigned
   │
   └──► POST /api/expenses/:id/zoho
        │
        ├──► Backend checks zohoExpenseId (prevent duplicates)
        │
        ├──► POST to Zoho Books API
        │    ├── Create expense in Zoho
        │    ├── Attach receipt file
        │    └── Get zohoExpenseId back
        │
        └──► Update database
             ├── Set zohoExpenseId
             └── Return success to frontend
```

---

## Role-Based Permissions Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                  ROLE PERMISSIONS MATRIX                        │
└─────────────────────────────────────────────────────────────────┘

Feature                    │ Admin │ Dev │ Acct │ Coord │ Sales │ Temp
──────────────────────────┼───────┼─────┼──────┼───────┼───────┼─────
Dashboard                  │   ✓   │  ✓  │  ✓   │   ✓   │   ✓   │  ✓
View Events                │   ✓   │  ✓  │  ✓   │   ✓   │   ✓   │  ✓
Create Events              │   ✓   │  ✓  │  ✓   │   ✓   │   ✗   │  ✗
Submit Expenses            │   ✓   │  ✓  │  ✗   │   ✓   │   ✓   │  ✗
View All Expenses          │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
Approve Expenses           │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
Assign Entities            │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
Push to Zoho               │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
Reports                    │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
User Management            │   ✓   │  ✓  │  ✗   │   ✗   │   ✗   │  ✗
Role Management            │   ✓   │  ✓  │  ✗   │   ✗   │   ✗   │  ✗
Settings                   │   ✓   │  ✓  │  ✓   │   ✗   │   ✗   │  ✗
Dev Dashboard              │   ✗   │  ✓  │  ✗   │   ✗   │   ✗   │  ✗

Notes:
- Developer role has ALL admin capabilities PLUS Dev Dashboard
- Admins do NOT see Dev Dashboard (developer-only)
- Custom roles can be created with any permission combination
- "Pending" role is for new registrations only
```

---

## API Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND API ROUTES                           │
└───────────────────────────────────────────────────────────────────┘

/api
├── /auth
│   ├── POST /login                    (public)
│   └── POST /register                 (public)
│
├── /users                              (authenticated)
│   ├── GET /                          (all roles)
│   ├── GET /:id                       (all roles)
│   ├── POST /                         (admin, developer)
│   ├── PUT /:id                       (admin, developer)
│   └── DELETE /:id                    (admin, developer)
│
├── /roles                              (NEW in v1.0.54)
│   ├── GET /                          (all roles)
│   ├── POST /                         (admin, developer)
│   ├── PUT /:id                       (admin, developer)
│   └── DELETE /:id                    (admin, developer)
│
├── /events                             (authenticated)
│   ├── GET /                          (all roles)
│   ├── GET /:id                       (all roles)
│   ├── POST /                         (admin, coordinator, developer)
│   ├── PUT /:id                       (admin, coordinator, developer)
│   └── DELETE /:id                    (admin, coordinator, developer)
│
├── /expenses                           (authenticated)
│   ├── GET /                          (role-filtered)
│   ├── GET /:id                       (role-filtered)
│   ├── POST /                         (submit expense)
│   │   └── Multer middleware (file upload)
│   ├── PUT /:id                       (update expense)
│   ├── PATCH /:id/review              (admin, accountant, developer)
│   ├── PATCH /:id/entity              (admin, accountant, developer)
│   ├── PATCH /:id/reimbursement       (admin, accountant, developer)
│   ├── POST /:id/zoho                 (admin, accountant, developer)
│   └── DELETE /:id                    (admin, developer)
│
└── /settings                           (authenticated)
    ├── GET /                          (all roles)
    └── PUT /                          (admin, developer)

Middleware:
├── authenticateToken()   - JWT validation
├── authorize(...roles)   - Role-based access control
├── multer()              - File upload handling
└── errorHandler()        - Global error handling
```

---

## PWA & Offline Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                  PROGRESSIVE WEB APP (PWA)                        │
└───────────────────────────────────────────────────────────────────┘

Service Worker (public/service-worker.js)
├── Cache Management
│   ├── CACHE_NAME: expenseapp-v1.0.58
│   ├── STATIC_CACHE: expenseapp-static-v1.0.58
│   └── Version-based cache invalidation
│
├── Caching Strategy
│   ├── Static Assets: Cache-first
│   ├── API Calls: Network-first (fixes stale data)
│   └── Images: Cache with fallback
│
└── Lifecycle Events
    ├── install - Cache static files
    ├── activate - Delete old caches
    └── fetch - Intercept requests

IndexedDB (Offline Storage)
├── expenses_queue - Unsynced expenses
├── events_cache - Event data
└── user_profile - User info

Background Sync
├── Register sync tag: 'sync-expenses'
├── Queue offline submissions
└── Auto-sync when connection restored
```

---

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT INFRASTRUCTURE                        │
└───────────────────────────────────────────────────────────────────┘

Proxmox Host (192.168.1.190)
├── LXC 104: NPMplus Proxy Manager
│   ├── Handles all HTTP/HTTPS traffic
│   ├── SSL/TLS termination
│   └── Caching layer (must restart on deploy!)
│
├── LXC 203: Sandbox Environment (192.168.1.144)
│   ├── Debian 12
│   ├── Node.js 18
│   ├── PostgreSQL 15 (expense_app_sandbox database)
│   ├── Nginx (frontend on :80)
│   ├── PM2 (backend on :3000)
│   └── /opt/expenseApp/ (application root)
│
└── LXC ???: Production Environment (192.168.1.138)
    ├── Same stack as sandbox
    └── PostgreSQL (expense_app_production database)

Deployment Process:
1. Build frontend: npm run build
2. Add build ID to dist/index.html
3. Create tarball: tar -czf frontend-v1.0.X.tar.gz -C dist .
4. SCP to Proxmox host
5. Push to LXC container
6. Extract to /var/www/expenseapp
7. Restart nginx
8. ⚠️ CRITICAL: Restart NPMplus proxy (LXC 104) to clear cache!

Backend Deployment:
1. Build: npm run build (TypeScript → JavaScript)
2. Create tarball: tar -czf backend-v1.0.X.tar.gz -C dist .
3. SCP to Proxmox host
4. Push to LXC container
5. Extract to /opt/expenseApp/backend/dist
6. Restart via systemd: systemctl restart expenseapp-backend
```

---

## Security Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                  SECURITY MEASURES                                │
└───────────────────────────────────────────────────────────────────┘

Authentication
├── JWT tokens (24h expiry)
├── Sliding session (15min inactivity logout)
├── bcrypt password hashing
└── Secure HttpOnly cookies

Authorization
├── Role-based access control (RBAC)
├── Route-level middleware (authorize())
├── Database row-level filtering
└── Frontend route guards

Data Protection
├── PostgreSQL user separation
├── Environment variables for secrets
├── No credentials in code
└── .gitignore for sensitive files

API Security
├── CORS configuration
├── Rate limiting (coming soon)
├── Input validation
└── SQL injection prevention (parameterized queries)

File Upload Security
├── File type validation (JPEG, PNG, PDF only)
├── File size limits (5MB)
├── Sanitized file names
└── Separate upload directory
```

---

## Version History

- **v1.0.58** (Oct 15, 2025) - Fixed role display to use dynamic data
- **v1.0.57** - Improved Role Management readability
- **v1.0.56** - Developer permissions + dynamic role loading
- **v1.0.55** - Collapsible Role Management
- **v1.0.54** - Dynamic Role Management System
- **v1.0.23** (Backend) - Developer authorization in users/roles routes

See [CHANGELOG.md](../CHANGELOG.md) for complete history.

---

## Known Issues & Solutions

### Caching Issues
**Problem:** Version not updating after deployment  
**Solution:** Always restart NPMplus proxy (LXC 104) after frontend deploy

### Role Display
**Problem:** Roles showing as "Pending Approval"  
**Solution:** Fixed in v1.0.58 - now loads dynamically from database

### Session Timeout
**Problem:** Users logged out unexpectedly  
**Solution:** Activity listeners reset token on user interaction

### Offline Sync
**Problem:** Expenses not syncing after connection restored  
**Solution:** Background sync with retry mechanism

---

## Future Enhancements

### Planned Features
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Bulk expense import
- [ ] Receipt scanning improvements (ML-based)
- [ ] Multi-currency support
- [ ] Custom report builder
- [ ] Email notifications (partially implemented)

### Technical Debt
- [ ] Add comprehensive unit tests
- [ ] Add E2E tests (Playwright/Cypress)
- [ ] Implement rate limiting
- [ ] Add Redis caching layer
- [ ] Database connection pooling optimization
- [ ] Migrate to microservices (if needed)

---

**Document Maintained By:** AI Assistant  
**For Updates:** See `docs/AI_MASTER_GUIDE.md` → Recent Sessions section
