# Changelog

All notable changes to the ExpenseApp will be documented in this file.

## [1.2.0] - 2025-10-16

### Developer Dashboard Improvements
**Branch: v1.2.0-dev-dashboard-fixes (Sandbox Only)**

#### Fixed
- **Version Information**: Now correctly reads frontend and backend versions from their respective `package.json` files instead of hardcoding values
- **CPU & Memory Metrics**: Implemented real system metrics using Node.js `os` module
  - Live CPU load average (1, 5, 15 minute)
  - Real memory usage percentage and actual GB values
  - System information (platform, architecture, hostname, cores)
- **Database Metrics**: Enhanced database statistics
  - Accurate database size with both bytes and human-readable format
  - Real active connection count
  - Top 10 tables by size with detailed breakdown
- **Audit Logs**: Complete audit logging system
  - Created `audit_log` table with migration script
  - Implemented audit logger utility with middleware support
  - Backward-compatible fallback for environments without audit table
  - Fixed empty state handling with proper UI feedback
- **Session Dates**: Fixed epoch date bug (12/31/1969)
  - Properly handles null/undefined last_activity dates
  - Shows "No recent activity" instead of invalid dates
  - Added visual status indicators (Active/Idle/Inactive)

#### Added
- `backend/src/database/migrations/004_create_audit_log.sql` - Audit log table schema
- `backend/src/utils/auditLogger.ts` - Comprehensive audit logging utilities
- Empty state handling for all dashboard tabs
- Real-time system health metrics
- Historical metrics placeholder structure

#### Changed
- Backend version: 1.1.5 → 1.2.0
- Frontend version: 1.1.14 → 1.2.0
- Enhanced DevDashboard UI with better empty states
- Improved session display with activity status badges
- Better date formatting throughout dashboard

#### Security
- All dashboard endpoints require admin or developer role
- Audit logging tracks user actions with IP and user agent
- No sensitive data exposed in error messages

---

## [1.1.14] - 2025-10-16

### Fixed
- Session timeout now properly displays warning modal before logout
- Token refresh mechanism uses correct API base URL in production
- API client coordinates with session manager for proper logout flow

---

## [1.1.13] - 2025-10-16

### Fixed
- Spam "Working Offline" notifications no longer duplicate or persist incorrectly
- Network detection is less aggressive and reduces false positives
- Notification lifecycle properly managed with ID tracking and explicit dismissal

---

## [1.1.12] - 2025-10-16

### Fixed
- Timezone bug in expense dates - expenses now save with correct local date
- Date inputs use local timezone instead of UTC conversion
- CSV export filename uses correct local date

---

## [1.1.11] - 2025-10-15

### Fixed
- Various bug fixes and improvements
- Service worker cache management

---

## [1.1.0] - 2025-10-15

### Added
- Role-based access control system
- Developer dashboard initial implementation
- Enhanced event management

---

## [1.0.x] - 2025-10-15

### Initial Release
- Expense tracking and management
- Event coordination
- Receipt OCR processing
- Zoho Books integration
- Offline sync capabilities
- Progressive Web App (PWA) support
