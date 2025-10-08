# Changelog

All notable changes to the Trade Show Expense Management App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.19.1] - 2025-10-08

### Fixed
- **Expense Update Validation**: Added required field validation to UPDATE endpoint
  - Event, card used, and receipt fields now save correctly when updating expenses
  - Validation error returned if required fields (event_id, card_used) are missing
  - Fixed issue where empty values were being accepted and saved as null
- **Receipt Update Processing**: New receipts uploaded during expense updates now process OCR
  - Updates receipt_url, ocr_text, and extracted_data fields
  - Preserves existing receipt if no new one is uploaded
- **Backend Logging**: Added debug logging for expense updates to help diagnose issues

### Technical
- Backend version: 2.2.0 → 2.2.1
- Frontend version: 0.19.0 → 0.19.1

---

## [0.19.0] - 2025-10-08

### Added
- **Inline Column Filtering**: All columns in Expense Management table now support independent filtering
  - Date filter: Date picker for precise date selection
  - Event filter: Dropdown to filter by specific events
  - Category filter: Dropdown to filter by expense categories
  - Merchant filter: Text search for merchant names
  - Amount filter: Min/max range inputs for amount filtering
  - Card filter: Dropdown to filter by payment card
  - Status filter: Dropdown for pending/approved/rejected
  - Reimbursement filter: Filter by required/not required
- Clear Filters button: Quickly reset all active column filters
- Active filter indicator: Visual feedback when filters are applied

### Changed
- **Column Reordering**: Improved Expense Management table layout
  - New order: Date, Event, Category, Merchant, Amount, Card Used, Receipt, Status, Reimbursement
  - More logical flow with date and event first for better context
  - Financial details (amount, card) grouped together
  - Status and reimbursement at the end for review workflow
- Enhanced table UX with dual-row header (labels + filters)
- Improved table responsiveness and column widths
- Better visual hierarchy with dedicated filter row

### Removed
- Removed top-level search and filter bars (replaced by inline column filters)

### Technical
- Version bump to 0.19.0
- Added individual state management for each column filter
- Optimized filtering logic for better performance
- Maintained backward compatibility with existing expense data structure

---

## [0.6.0-alpha] - 2025-10-01

### Changed
- **MAJOR:** Complete project reorganization with clean folder structure
- Moved all source code to `src/` directory
- Organized components into feature folders (auth, dashboard, events, expenses, admin, accountant, reports, layout)
- Moved all documentation to `docs/` folder (19 files)
- Moved all scripts to `scripts/` folder (5 files)
- Updated all import paths automatically
- Updated Tailwind and Vite configuration
- Version bumped to 0.6.0-alpha (minor version for structural changes)

### Added
- `PROJECT_STRUCTURE.md` - Complete folder structure documentation
- `src/types/` folder with centralized types and constants
- Clean root directory with only essential files

### Fixed
- BudgetOverview crash when budget is undefined
- Import paths updated for new structure
- Configuration files point to correct locations

---

## [0.5.1-alpha] - 2025-09-30

### Added
- Smart notification badge that only shows red dot when notifications exist
- Apple Pay advisory note under Card Used field
- Admin password reset capability in User Management
- Shared `types.ts` for centralized type definitions
- Shared `constants.ts` for application-wide constants
- Comprehensive `ARCHITECTURE.md` with system diagrams
- `BLANK_PAGE_FIX.md` troubleshooting guide
- `SESSION_SUMMARY.md` development history

### Changed
- Improved OCR accuracy with better amount ranges per category
- Enhanced date formatting to MM/DD/YYYY format
- Notification panel shows actual pending expenses
- OCR amounts now match realistic business expense ranges:
  - Car rentals: $180-280
  - Flights: $250-500
  - Hotels: $150-300
  - Meals: $30-80
  - Transportation: $15-45

### Fixed
- Post-login blank page issue (useAuth.ts import path)
- Team members count now shows accurate number (was hardcoded 24)
- Notification bell now interactive with dropdown
- Budget field properly restricted to Admin and Accountant roles only
- All import paths corrected (16+ files)

---

## [0.5.0-alpha] - 2025-09-30

### Added
- Complete frontend React application with TypeScript
- Four role-based dashboards (Admin, Coordinator, Salesperson, Accountant)
- Event management with participant tracking
- Expense submission with receipt upload
- Simulated OCR receipt scanning
- Approval workflows for expenses and reimbursements
- User management system (Admin only)
- Application settings configuration
- Comprehensive reporting and analytics
- Interactive notification system
- Version badge display in header
- Easy startup scripts (`start-frontend.sh`, `start-frontend.bat`)
- Homebrew PATH fix helper (`setup-homebrew.sh`)
- Extensive documentation suite (15+ guides)

### Features
- Role-based access control enforced in UI
- Auto-flag reimbursement for personal card selection
- Receipt upload as first field in expense form
- Budget field access restricted by role
- Salesperson privacy (only see own expenses)
- localStorage data persistence
- Responsive design with Tailwind CSS
- Professional UI with blue/emerald gradient theme
- No emojis (professional design)

### Documentation
- README.md with quick start guide
- FRONTEND_TESTING.md with comprehensive testing checklist
- UX_IMPROVEMENTS.md documenting all fixes
- TROUBLESHOOTING.md for common issues
- HOMEBREW_PATH_FIX.md for macOS setup
- ERROR_HANDLING_DEMO.md with error examples
- Multiple setup and configuration guides

### Infrastructure
- Node.js version checking (requires v18+)
- Homebrew detection and installation guidance
- Automated environment setup scripts
- Cross-platform startup scripts (macOS, Windows, Linux)

---

## [Unreleased - v1.0.0]

### Planned
- Full backend API with Node.js and Express
- PostgreSQL database integration
- Real JWT authentication
- Actual Tesseract.js OCR processing
- Server-side file uploads
- Email notification system
- Zoho Books API integration
- Real-time features
- Advanced reporting with PDF export
- Multi-currency support
- Enhanced security features
- Production deployment configuration

---

## Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 0.5.1-alpha | 2025-09-30 | Patch | Bug fixes, OCR improvements, refactoring |
| 0.5.0-alpha | 2025-09-30 | Minor | Initial pre-release, frontend only |
| 1.0.0 | TBD | Major | Full stack with backend integration |

---

## Semantic Versioning Guide

Given a version number MAJOR.MINOR.PATCH (e.g., 1.0.0):

- **MAJOR**: Incompatible API changes or major feature overhauls
- **MINOR**: New functionality in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes
- **Pre-release**: -alpha, -beta, -rc suffixes

### Our Versioning Strategy:

- **0.5.x-alpha**: Frontend-only pre-release versions
- **0.6.x-alpha**: Backend integration pre-release
- **0.9.x-beta**: Feature-complete beta testing
- **1.0.0**: Production-ready first release
- **1.x.x**: Production updates and enhancements

---

Last Updated: October 8, 2025
Current Version: 0.19.1
