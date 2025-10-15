# Changelog

All notable changes to the ExpenseApp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.31] - 2025-10-15

### Added
- **Constants Consolidation (Phase 8)**:
  - `APP_VERSION` and `APP_NAME` now in appConstants.ts
  - `DEMO_CREDENTIALS` moved from types/constants.ts
  - `ROLE_LABELS` for display names (Administrator, Show Coordinator, etc.)
  - `ROLE_COLORS` for UI badges
  - Expanded `STORAGE_KEYS` with all localStorage keys

### Changed
- **Single Source of Truth**:
  - All constants now in `src/constants/appConstants.ts`
  - Deleted duplicate `src/types/constants.ts` file
  - Better organization with clear sections
  - Consistent naming conventions

### Removed
- Deleted `src/types/constants.ts` (duplicate file)

### Technical
- Backend: v1.0.12
- Frontend: v1.0.31
- Constants: Fully consolidated (no duplication)
- Zero breaking changes - all functionality preserved

## [1.0.30] - 2025-10-15

### Added
- **Type Safety Improvements (Phase 7)**:
  - New types in `types.ts`: `ReceiptData`, `CardOption`, `ApiResponse`, `PaginatedResponse`
  - Sync types: `SyncQueueItem` with status tracking
  - Statistics types: `DashboardStats`, `ReportStats`, `EntityTotal`
  - Form handler types: `FormSubmitHandler`, `FormChangeHandler`
  - Error types: `AppError` interface with code and status

### Changed
- **API Client Type Safety**:
  - Replaced `any` with `unknown` in generic types (safer)
  - Updated method signatures: `get<T>`, `post<T>`, `put<T>`, `patch<T>`
  - Error catches now use `unknown` with `instanceof` checks
  - Better type inference for responses

- **Component Type Improvements**:
  - ReceiptUpload: `receiptData: any` → `receiptData: ReceiptData`
  - ExpenseSubmission: `handleReceiptProcessed` now properly typed
  - Better type safety in receipt processing flow

### Technical
- Backend: v1.0.12
- Frontend: v1.0.30
- Type safety: Significantly improved (replaced ~15 `any` types)
- Zero breaking changes - all functionality preserved

## [1.0.29] - 2025-10-15

### Added
- **Frontend Refactor - Custom Hooks (Phase 5 continued)**:
  - Created `useReportsData` hook for Reports data fetching (~65 lines)
  - Created `useReportsFilters` hook for filter state management (~50 lines)
  - Created `useReportsStats` hook for statistics calculations (~105 lines)
  - Extracted reusable logic from Reports component

### Changed
- **Reports Component Refactoring**:
  - Now uses custom hooks for data, filters, and stats
  - Removed ~60 lines of code from main component
  - Better separation of concerns (UI vs business logic)
  - Consistent pattern across all major components
  - Period filtering (week/month/quarter) now in hook
  - Easier to maintain and test

### Technical
- Backend: v1.0.12
- Frontend: v1.0.29
- Backend refactor: 100% complete ✅
- Frontend refactor: Phase 5 ongoing (70% overall progress)
- Custom hooks pattern: 4 major components refactored (Approvals, Expenses, Dashboard, Reports)

## [1.0.28] - 2025-10-15

### Added
- **Frontend Refactor - Custom Hooks (Phase 5 continued)**:
  - Created `useDashboardData` hook for Dashboard data fetching (~80 lines)
  - Created `useDashboardStats` hook for statistics calculations (~65 lines)
  - Extracted reusable logic from Dashboard component

### Changed
- **Dashboard Component Refactoring**:
  - Now uses custom hooks for data and stats
  - Removed ~85 lines of code from main component
  - Better separation of concerns (UI vs business logic)
  - Consistent pattern across all major components
  - Easier to maintain and test

### Technical
- Backend: v1.0.12
- Frontend: v1.0.28
- Backend refactor: 100% complete ✅
- Frontend refactor: Phase 5 ongoing (60% overall progress)
- Custom hooks pattern: 3 major components refactored (Approvals, Expenses, Dashboard)

## [1.0.27] - 2025-10-15

### Added
- **Frontend Refactor - Custom Hooks (Phase 5 continued)**:
  - Created `useExpenses` hook for ExpenseSubmission data fetching (~50 lines)
  - Created `useExpenseFilters` hook for filter state management (~75 lines)
  - Created `usePendingSync` hook for offline queue monitoring (~30 lines)
  - Extracted reusable logic from ExpenseSubmission component

### Changed
- **ExpenseSubmission Component Refactoring**:
  - Now uses custom hooks for data, filters, and sync count
  - Removed ~90 lines of code from main component
  - Better separation of concerns (UI vs business logic)
  - Consistent pattern with Approvals component
  - Easier to maintain and test

### Technical
- Backend: v1.0.12
- Frontend: v1.0.27
- Backend refactor: 100% complete ✅
- Frontend refactor: Phase 5 ongoing (50% overall progress)
- Custom hooks pattern established for major components

## [1.0.26] - 2025-10-15

### Added
- **Frontend Refactor - Custom Hooks Pattern (Phase 5)**:
  - Created `useApprovals` hook for data fetching logic (~100 lines)
  - Created `useApprovalFilters` hook for filter management (~110 lines)
  - Extracted reusable logic from Approvals component

### Changed
- **Approvals Component Refactoring**:
  - Now uses custom hooks for data and filtering
  - Removed ~120 lines of code from main component
  - Cleaner separation of concerns (UI vs logic)
  - Easier to test and maintain

### Technical
- Backend: v1.0.12
- Frontend: v1.0.26
- Backend refactor: 100% complete ✅
- Frontend refactor: Phase 5 started (40% overall progress)

## [1.0.25] - 2025-10-15

### Added
- **Backend Service Layer & Repository Pattern (Complete)**:
  - All expense routes now use service layer
  - `POST /api/expenses` - Create expense
  - `PUT /api/expenses/:id` - Update expense
  - `PATCH /api/expenses/:id/review` - Approve/reject
  - `PATCH /api/expenses/:id/entity` - Assign Zoho entity
  - `PATCH /api/expenses/:id/reimbursement` - Update reimbursement status
  - `DELETE /api/expenses/:id` - Delete expense
  - All routes use `asyncHandler` for clean error handling
  - Authorization logic centralized in service layer

### Changed
- **Routes Simplified (All Increments)**:
  - POST: 80 → 52 lines (35% reduction)
  - PUT: 136 → 56 lines (59% reduction)
  - PATCH review: 27 → 17 lines (37% reduction)
  - DELETE: 35 → 25 lines (29% reduction)
  - PATCH entity: 26 → 11 lines (58% reduction)
  - PATCH reimbursement: 35 → 16 lines (54% reduction)
  - **Total: 339 lines → 177 lines (48% reduction)**

- **Query Optimization (N+1 Problem Eliminated)**:
  - GET endpoints now use SQL JOINs
  - `GET /api/expenses`: 1 query (was 1 + N*2 queries)
  - `GET /api/expenses/:id`: 1 query (was 3 queries)
  - Example: Fetching 100 expenses = 1 query (previously 201 queries!)
  - Massive performance improvement for large datasets

- **Error Handling**:
  - No more try/catch in routes (handled by `asyncHandler`)
  - Consistent error responses via custom `AppError` classes

### Technical
- Backend: v1.0.12
- Frontend: v1.0.25
- **Backend refactor: 100% complete** ✅
- All CRUD operations use service → repository → database layers
- Optimized database queries with JOINs
- Zero breaking changes - all functionality preserved

## [1.0.24] - 2025-10-14

### Removed
- **Meaningless Dashboard Decorations**:
  - Removed fake "+12.5%" trend from Total Expenses card (was hardcoded, provided no value)
  - Removed useless "Normal" status from Pending Approvals card (showed "Normal" even when 0)
  - Removed redundant "1 total" text from Active Events card
  - Dashboard cards now show only important information (number and title)
  - Cleaner, less cluttered UI

### Changed
- **Consistent Button Text for Zoho Push**:
  - Button always says "Push to Zoho" (not "Go to Reports")
  - Makes sense since we navigate directly to event with most unsynced items
  - User lands exactly where push button is - button text should reflect that

### Technical
- Backend: v1.0.11
- Frontend: v1.0.24
- Removed trend/trendUp props from StatsCard usage in Dashboard

## [1.0.23] - 2025-10-14

### Fixed
- **Smart Navigation to Zoho Push from Dashboard**:
  - Fixed "Push to Zoho" link in Dashboard pending tasks widget
  - Previously took users to general Reports page (requiring click on trade show to push)
  - Now navigates DIRECTLY to the event's detailed report with push button visible
  - Backend now provides event intelligence (which events have unsynced expenses)
  - If single event with unsynced items: goes directly to that event (button: "Push to Zoho")
  - If multiple events: goes to event with most unsynced items (button: "Go to Reports")
  - No extra clicks required - user lands exactly where they need to be!

### Changed
- Reports page now supports deep linking via URL hash (#event=123)
- Automatically selects and displays detailed report for specified event
- Backend quick-actions endpoint enhanced to include:
  - Array of event IDs with unsynced expenses
  - Primary event ID (event with most unsynced items)
  - Dynamic button text based on context

### Technical
- Backend: v1.0.10
- Frontend: v1.0.23
- Uses hash-based deep linking for event selection
- Event auto-selection persists across page refreshes

## [1.0.22] - 2025-10-14

### Fixed
- **Direct Navigation to User Management Tab**:
  - Fixed "Go to User Management" link in Dashboard pending tasks widget
  - Previously took users to general Settings page (requiring scroll + click to reach User Management)
  - Now navigates DIRECTLY to User Management tab via URL hash (#users)
  - Settings page detects `#users` hash and automatically opens User Management tab
  - Saves time and improves UX - no more scrolling or clicking required
  - Hash automatically syncs with manual tab switching for consistency

### Changed
- Settings tabs now update URL hash when manually switching
- System tab: clears hash
- User Management tab: sets #users hash
- Enables deep linking and browser back/forward navigation

## [1.0.21] - 2025-10-14

### Changed
- **Removed Receipt Column from Expenses Table**:
  - Eliminated redundant "Receipt" column (with "View Receipt" link)
  - Users now use "View Details" button (eye icon) to view receipts
  - Cleaner, less cluttered table layout
  - Removed unused `receiptModalUrl` state and standalone receipt modal
  - Receipt viewing now only happens through Expense Details modal

### Added
- **HAUTE_CREDENTIALS.md**: Created credential file for Haute Brands
  - Matches format and security pattern of BOOMIN_CREDENTIALS.md
  - Contains Zoho Books OAuth credentials, account IDs, environment variables
  - Security best practice: keeps sensitive credentials in separate, clearly-labeled files
  - Makes it easy to exclude from certain access controls and audit who views them

### Documentation
- Both Haute and Boomin credential files now follow consistent pattern
- Sensitive data properly separated from general documentation

## [1.0.20] - 2025-10-14

### Fixed
- **Receipt Display in Expense Details Modal**:
  - Receipt now displays at FULL SIZE by default (previously showed cropped preview)
  - "Hide" button collapses receipt completely (removes image entirely when hidden)
  - "View Full Size" button expands receipt when hidden
  - Much better UX - users can actually read receipt details
  - No more useless cropped preview that provided no information

### Removed
- Deleted `docs/SESSION_MANAGEMENT.md` (technical details can be referenced from code)

### Documentation
- Kept `BOOMIN_CREDENTIALS.md` separate (security best practice for sensitive credentials)
- Contains passwords, API keys, tokens that should NOT be in consolidated docs

## [1.0.19] - 2025-10-14

### Changed
- **Pending Sync UX Improvements**:
  - Removed "Pending Sync" from sidebar navigation (was cluttering the menu)
  - Added contextual "Pending Sync" button to Expenses page header
  - Button shows count badge (e.g., "Pending Sync 3") when items need syncing
  - Opens as modal overlay instead of separate page
  - Only appears when there are actually pending items
  - Cleaner, more intuitive user experience

### Removed
- Deleted redundant documentation files:
  - `docs/TEST_CHECKLIST.md` (no longer used)
  - `docs/ZOHO_BOOKS_SETUP.md` (fully covered in AI_MASTER_GUIDE.md)

## [1.0.18] - 2025-10-14

### Changed
- Improved navigation order following UI best practices
  - Moved "Pending Sync" from middle of nav to bottom (near Settings)
  - New order: Dashboard → Events → Expenses → Approvals → Reports → Settings → Pending Sync → Dev Dashboard

### Added
- Recovered comprehensive changelog history from git (351 lines)
- Merged historical version notes from v1.0.0 to v1.0.18

## [1.0.17] - 2025-10-14

### Added
- Auto-removal of events from expense entry dropdown after 1 month + 1 day past end date
  - Events older than cutoff date no longer appear in "Select an event" dropdown when creating expenses
  - Keeps dropdown clean long-term while preserving historical data in reports and approvals
  - Implemented via `filterActiveEvents()` utility function in `src/utils/eventUtils.ts`
- Restored `CHANGELOG.md` for GitHub best practices
- Consolidated Zoho Books setup into AI_MASTER_GUIDE.md

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

