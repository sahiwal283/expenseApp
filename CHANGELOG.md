# Changelog

All notable changes to the ExpenseApp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.9] - 2025-10-14

### 🚀 Major Feature: Offline-First Sync Architecture

This release introduces comprehensive offline-first capabilities, allowing users to work seamlessly at trade shows with poor or intermittent internet connectivity.

### Added

#### Frontend
- **IndexedDB Storage Layer** (`src/utils/offlineDb.ts`)
  - Dexie.js integration for persistent client-side storage
  - Sync queue management
  - Cached data storage (expenses, events, users)
  - Device ID and metadata management
  - ~400 lines of robust database operations

- **Network Detection** (`src/utils/networkDetection.ts`)
  - Real-time connectivity monitoring
  - Online/offline/degraded state detection
  - Backend health check pings
  - Connection quality estimation
  - Network Information API support
  - ~350 lines of monitoring logic

- **Sync Manager** (`src/utils/syncManager.ts`)
  - Queue-based sync processing
  - Exponential backoff retry logic (max 5 retries)
  - Batch operations (20 items per batch)
  - Temporary UUID to backend ID reconciliation
  - Last-write-wins conflict resolution
  - ~450 lines of core sync engine

- **Data Encryption** (`src/utils/encryption.ts`)
  - Web Crypto API integration (AES-GCM)
  - PBKDF2 key derivation (100,000 iterations)
  - Field-level encryption for sensitive data
  - Session-based key management
  - Secure deletion on logout
  - ~400 lines of encryption utilities

- **Notification System** (`src/components/common/NotificationBanner.tsx`)
  - Toast-style notifications
  - Multiple types (success, error, warning, info, offline, syncing)
  - Auto-dismiss and persistent modes
  - Action button support
  - useNotifications hook for easy integration
  - ~250 lines

- **Sync Status Bar** (`src/components/common/SyncStatusBar.tsx`)
  - Real-time network status display
  - Pending/failed item counts
  - Manual sync button
  - Progress indicators
  - Connection quality display
  - ~200 lines

- **Pending Actions Page** (`src/components/common/PendingActions.tsx`)
  - View all queued sync items
  - Separate tabs for pending/failed
  - Retry failed items (individual or batch)
  - Clear failed items
  - Detailed item information
  - ~300 lines

#### Backend
- **Batch Operations Endpoint** (`backend/src/routes/sync.ts`)
  - POST `/api/sync/expenses/batch` - batch create/update expenses
  - POST `/api/sync` - full sync with conflict detection
  - GET `/api/sync/status` - sync status information
  - GET `/api/sync/conflicts` - conflict resolution support
  - Idempotency key support to prevent duplicates
  - Max 50 items per batch
  - ~300 lines

- **Database Schema** (`backend/src/database/migrations/add_offline_sync_support.sql`)
  - `version` column on expenses, events, users for conflict resolution
  - `device_id` column to track which device modified records
  - `last_sync_at` column to track sync timestamps
  - `idempotency_keys` table to prevent duplicate submissions
  - Automatic expiration after 7 days
  - Cleanup function for expired keys

- **Enhanced Health Check**
  - Database connectivity test
  - Response time measurement
  - Environment information
  - Proper 503 status on failure

#### Service Worker
- **Background Sync Support** (`public/service-worker.js`)
  - Background Sync API integration (Chrome, Firefox, Edge)
  - Automatic retry when back online
  - Periodic sync support (experimental)
  - Message channel for client communication
  - Fallback for iOS Safari (no background sync)
  - Updated to v1.0.9

### Changed
- **Edit Permissions** (`backend/src/routes/expenses.ts`)
  - Admin, Accountant, and Developer can now edit ANY expense
  - Regular users (Coordinator, Salesperson) can only edit their own
  - Resolved authorization issues from v1.0.8

- **Health Check** (`backend/src/server.ts`)
  - Now includes database connectivity test
  - Returns version, environment, response time
  - Proper error responses with 503 status

### Fixed
- Expense edit authorization (404 errors for privileged roles)
- Mobile caching issues (network-first for API calls)
- Stale data on mobile devices

### Documentation
- **Architecture Document** (`docs/OFFLINE_SYNC_ARCHITECTURE.md`)
  - 250+ lines of comprehensive architecture documentation
  - Implementation phases and strategies
  - Database schema changes
  - API contract definitions
  - Testing scenarios
  - Security considerations
  - Browser compatibility matrix

- **Implementation Status** (`OFFLINE_SYNC_IMPLEMENTATION_STATUS.md`)
  - 420+ lines of detailed implementation tracking
  - Files created/modified
  - Integration requirements
  - Testing checklist
  - Deployment plan
  - Known limitations

### Dependencies
- Added `dexie@^4.0.11` - IndexedDB wrapper for persistent storage

### Technical Details
- **Total New Code**: ~3,000 lines
- **New Files**: 11
- **Modified Files**: 6
- **Completed Tasks**: 15 of 17 (88%)

### Breaking Changes
None. All changes are backward compatible.

### Migration Required
```bash
# Run database migration
npm run migrate

# Or manually apply:
psql -U expense_user -d expense_app -f backend/src/database/migrations/add_offline_sync_support.sql
```

### Testing Checklist
- [ ] Create expense offline → sync when back online
- [ ] Edit expense offline → sync correctly
- [ ] Conflict resolution (multiple devices)
- [ ] Batch sync (multiple items)
- [ ] Network detection accuracy
- [ ] Notification system
- [ ] Pending actions page
- [ ] Data encryption
- [ ] Logout data clear
- [ ] Service Worker background sync
- [ ] iOS Safari fallback
- [ ] Performance (queue size, sync time)

### Known Limitations
- Background sync not supported on iOS Safari (fallback implemented)
- Queue size limit not enforced yet (should be 100 items)
- Periodic sync requires Chrome 80+ or Edge 80+

### Deployment Notes
⚠️ **IMPORTANT**: This release requires:
1. Database migration (adds columns and tables)
2. Service Worker update (will auto-update on next visit)
3. Frontend requires integration into App.tsx (see integration guide)

### Rollback Plan
If issues occur:
1. Revert to v1.0.8
2. Run rollback migration (removes new columns/tables)
3. Clear service worker cache
4. Monitor for data loss

---

## [1.0.8] - 2025-10-14

### Fixed
- **Edit Permissions**: Admin, Accountant, and Developer can now edit any expense
- Regular users can only edit their own expenses
- Resolved 404 "Expense not found or unauthorized" errors

### Changed
- Updated expense update endpoint to check user role for authorization
- Added role-based query logic (with/without user_id filter)

---

## [1.0.7] - 2025-10-14

### Fixed
- **Expense Save Issues**: Added error handling for expense save operations
- Form now closes correctly after successful save
- Alert shown on save failure
- Debug logging for troubleshooting

### Changed
- Removed redundant inline Edit button from expense list
- Edit is now accessible via "View Details" modal
- Improved user experience with single edit entry point

---

## [1.0.6] - 2025-10-14

### Added
- **Developer Role**: New role with admin-level permissions
- Dev Dashboard exclusive to developer role
- Developer sandbox login (username: `developer`, password: `sandbox123`)

### Changed
- Removed Dev Dashboard from admin interface
- Updated permissions across all components
- Added developer to navigation and role checks

---

## [1.0.5] - 2025-10-14

### Added
- **Expense Details Modal**: View full expense information with receipt preview
- Hoverable participant popup on event cards
- Admin transparency for events (view all events + filter)

### Changed
- Removed always-visible participant badges
- Updated event filtering for accountant/admin/developer roles
- Improved receipt display in approvals page

### Fixed
- Receipt images not loading (URL transformation)
- Events page data flashing and disappearing
- Dashboard empty due to Promise.all() failure

---

## [1.0.4] - 2025-10-14

### Added
- **Dynamic Category Management**: Add/delete expense categories via settings
- Category options now stored in backend
- UI for category management in admin settings

### Changed
- ExpenseForm now fetches categories from API
- Settings page merges API data with defaults

### Fixed
- Settings page not loading
- Expense save failures (permission denied for uploads)
- Auto-assignment of expenses to 'haute' entity

---

## [1.0.3] - 2025-10-14

### Added
- **Session Management**: 15-minute inactivity timeout
- Sliding expiry (resets on user activity)
- Warning modal (5 minutes before logout)
- Token refresh during activity
- Backend JWT expiry aligned (20 minutes)

### Security
- Automatic logout on inactivity
- Token and session clearing
- Activity detection (mouse, keyboard, navigation, API)

---

## [1.0.2] - 2025-10-14

### Added
- Accountant transparency for events (view all events)
- "My Events" filter for accountants
- Multiple event view modes

---

## [1.0.1] - 2025-10-14

### Fixed
- **Mobile Caching Issues**: Network-first strategy for API calls
- Cache-first only for static assets
- Proper cache versioning
- Excludes API responses from cache

### Changed
- Service Worker updated to v1.0.1
- Improved offline experience

---

## [1.0.0] - 2025-10-14

### Added
- Initial production release
- Multi-entity expense tracking
- Zoho Books integration
- Receipt OCR (Tesseract.js)
- User role management
- Event participant tracking
- Approval workflow
- Reporting and analytics

### Infrastructure
- Proxmox containerized deployment
- Nginx Proxy Manager (SSL/reverse proxy)
- PostgreSQL database
- Node.js/Express backend
- React/Vite frontend

---

## Legend

- 🚀 Major Feature
- ✨ Enhancement
- 🐛 Bug Fix
- 🔒 Security
- 📚 Documentation
- ⚠️ Breaking Change
- 🗑️ Deprecated

---

**For detailed implementation notes, see:**
- `OFFLINE_SYNC_IMPLEMENTATION_STATUS.md`
- `docs/OFFLINE_SYNC_ARCHITECTURE.md`
- Individual commit messages

**Support**: For issues or questions, please create an issue in the GitHub repository.

