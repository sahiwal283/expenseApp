# Changelog

All notable changes to the ExpenseApp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Auto-removal of events from expense entry dropdown after 1 month + 1 day past end date
  - Events older than cutoff date no longer appear in "Select an event" dropdown when creating expenses
  - Keeps dropdown clean long-term while preserving historical data in reports and approvals
  - Implemented via `filterActiveEvents()` utility function in `src/utils/eventUtils.ts`

## [1.0.16] - 2025-10-14

### Added
- Developer role now has full access to Settings page
- Developers can manage card options, entity options, categories, and users

## [1.0.15] - 2025-10-14

### Fixed
- Persistent sync status bar now only shows during actual activity
- Removed "All Synced" message that was displaying permanently
- Bar now auto-hides when sync activity completes

## [1.0.14] - 2025-10-14

### Fixed
- Auto-logout on JWT token expiration (401/403 errors)
- Added `crypto.randomUUID()` polyfill for older browsers (Safari < 15.4)
- Users no longer see empty data when token expires

### Added
- UUID generation utility with browser compatibility fallback

## [1.0.13] - 2025-10-14

### Added
- "Reject" button for pending user registrations
- Rejection confirmation modal with user details
- Admins and developers can now delete pending users before activation

## [1.0.12] - 2025-10-14

### Fixed
- Service Worker caching issues in sandbox environment
- Aggressive cache-busting headers in nginx configuration
- NPMplus proxy cache clearing process

### Changed
- Deployment process now includes NPMplus restart to clear proxy cache

## [1.0.10 - 1.0.11] - 2025-10-14

### Added
- **Offline-First Architecture** (comprehensive implementation):
  - IndexedDB persistent storage via Dexie.js
  - Sync queue for offline actions (create, update, delete, approve)
  - Network detection and auto-sync on connectivity restoration
  - Service Worker background sync integration
  - Data encryption (AES-GCM) for local storage
  - Notification banner system for sync status
  - Sync status bar showing real-time sync progress
  - Pending Actions page for viewing/managing unsynced items
  - Manual "Sync Now" functionality
  - Conflict resolution with last-write-wins strategy
  - Temporary UUID to backend ID reconciliation

### Added
- Comprehensive documentation for offline sync architecture

## [1.0.9] - 2025-10-14

### Changed
- Removed inline edit icon from expense rows
- Edit button now only appears in "View Details" modal

### Fixed
- Expense saving issues in edit workflow
- Form now correctly closes after successful save

## [1.0.8] - 2025-10-14

### Added
- "View Details" button (eye icon) to expense pages
- Detailed expense modal with full information display
- Receipt preview in expense details
- Full-screen receipt viewing option

## [1.0.7] - 2025-10-14

### Added
- "All Events" / "My Events" toggle for accountant, admin, and developer roles
- Hoverable participant count with popup showing all names
- Enhanced event filtering for role-based views

### Changed
- Event page header changed from "My Events" to "Events" for accountant/admin/developer

## [1.0.6] - 2025-10-14

### Fixed
- Promise.all() error handling in Dashboard, Approvals, and EventSetup components
- Individual try-catch blocks prevent all data from clearing on single API failure

### Changed
- Updated developer role permissions across multiple components

## [1.0.5] - 2025-10-14

### Added
- Session management documentation and release notes

### Changed
- Refined session warning modal UI/UX

## [1.0.4] - 2025-10-14

### Fixed
- Token refresh mechanism
- Session timer reset on user activity

## [1.0.3] - 2025-10-14

### Added
- **Session Management with Sliding Expiry**:
  - 15-minute inactivity timeout
  - 5-minute advance warning modal with countdown
  - Automatic activity detection (mouse, keyboard, scroll, touch, navigation)
  - Token refresh every 10 minutes during active use
  - JWT expiry aligned to 20 minutes (5-minute buffer)
  - "Stay Logged In" and "Dismiss" warning options

### Added
- `sessionManager.ts` utility for session handling
- `InactivityWarning.tsx` modal component
- `/api/auth/refresh` endpoint for token renewal

## [1.0.2] - 2025-10-14

### Fixed
- Mobile caching issues causing stale content
- Service worker now uses network-first strategy for API calls
- Cache-first strategy maintained for static assets only

### Added
- Build timestamp in index.html for cache verification

## [1.0.1] - 2025-10-14

### Fixed
- **Critical: Database migration system**:
  - Migration script now properly iterates through all `.sql` files in `migrations/` folder
  - Previously only ran `schema.sql` and ignored individual migrations
- Added 'pending' and 'developer' roles to user table CHECK constraint
- Added missing database columns: `registration_ip`, `registration_date`
- Fixed expense creation to properly assign `zoho_entity` field
- Fixed "Push to Zoho" button visibility (now appears when entity is assigned)

### Changed
- Updated base `schema.sql` to include all migration features
- Migration system now applies migrations in alphabetical order

## [1.0.0] - 2025-10-13

### Added
- **Initial Production Release**
- User registration with pending approval workflow
- Multi-entity Zoho Books integration (Haute Brands, Boomin Brands)
- OCR receipt processing with Tesseract.js and Sharp
- Role-based access control:
  - Admin: Full system access
  - Accountant: Financial oversight and approvals
  - Coordinator: Event management
  - Salesperson: Expense submission
  - Developer: Technical admin access
  - Pending: Awaiting activation
- Settings management:
  - Card options (configurable payment methods)
  - Entity options (Zoho Books entities)
  - Category options (expense categories)
- Event management with participant tracking
- Expense approval workflow
- Reimbursement tracking
- Comprehensive reporting and analytics
- PWA support with service workers
- Multi-container Proxmox deployment:
  - Container 201: Production Backend
  - Container 202: Production Frontend  
  - Container 203: Sandbox Environment
  - Container 104: NPMplus (Nginx Proxy Manager)

### Infrastructure
- Nginx reverse proxy with SSL/TLS (Let's Encrypt)
- PostgreSQL 16 database
- systemd service management
- DuckDNS dynamic DNS

### Documentation
- Architecture documentation
- Deployment guides
- Setup instructions
- Troubleshooting guide
- API documentation
- Session management guide
- Offline sync architecture

---

## Version History Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

## Links

- [GitHub Repository](https://github.com/sahiwal283/expenseApp)
- [Production](https://expapp.duckdns.org)
- [Sandbox](http://192.168.1.144)
- [AI Master Guide](AI_MASTER_GUIDE.md)

