# Changelog

All notable changes to the Trade Show Expense Management App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.24.7] - 2025-10-08

### Fixed
- **Upcoming Events Dashboard**: Fixed multiple date calculation bugs
  - Events that have ended (past endDate) are now properly filtered out
  - Date calculations now normalize to midnight for accurate day counts
  - Badge text now correctly shows "Today", "1 day", "X days" (no more "1 days")
  - Events starting today now correctly show "Today" instead of "1 days"
  - Badge colors: Orange for "Today", Yellow for 1-7 days, Blue for 7+ days

### Technical
- Frontend version: 0.24.6 → 0.24.7

---

## [0.24.6] - 2025-10-08

### Changed
- **Admin Settings**: Removed redundant "Save Settings" button
  - All changes are already auto-saved when clicking "Add" or remove icon for each option
  - Cleaner, simpler UI without redundant save action
  - Settings still save immediately on each add/remove operation

### Technical
- Frontend version: 0.24.5 → 0.24.6

---

## [0.24.5] - 2025-10-08

### Fixed
- **Entity Running Totals Dashboard**: Now only shows currently active entities
  - Loads `entityOptions` from app settings
  - Filters entity totals to only include entities in the active entity list
  - Prevents display of obsolete/removed entities that still have historical expense data
  - Works in both server and localStorage modes

### Technical
- Frontend version: 0.24.4 → 0.24.5

---

## [0.24.4] - 2025-10-08

### Changed
- **Entity Running Totals Dashboard**: Layout now uses flexbox instead of grid
  - Changed from fixed grid columns to flexible wrapping layout
  - Entity cards now flow naturally left-to-right without blank space
  - Minimum card width of 200px ensures readability
  - More efficient use of horizontal space, especially with few entities
  - Cards wrap to next line as needed

### Technical
- Frontend version: 0.24.3 → 0.24.4

---

## [0.24.3] - 2025-10-08

### Fixed
- **Entity Running Totals Dashboard**: Now accurately reflects selected filters
  - Dashboard now calculates totals based on `filteredExpenses` instead of all expenses
  - When viewing a specific trade show, entity totals show only expenses from that show
  - When applying date/entity filters, totals update accordingly
  - Updated subtitle from "All-time expenses by Zoho entity" to "For selected filters"
  - Unassigned expenses warning also now shows filtered count/amount

### Technical
- Frontend version: 0.24.2 → 0.24.3

---

## [0.24.2] - 2025-10-08

### Changed
- **Entity Running Totals Dashboard**: Made more compact and space-efficient
  - Reduced padding and spacing throughout
  - Smaller header icon and text
  - More grid columns (now up to 6 on xl screens, was 4)
  - Smaller entity cards with reduced padding
  - Amounts shown without decimal places for cleaner look
  - Warning message more compact
  - Takes up less vertical space on Reports page

### Technical
- Frontend version: 0.24.1 → 0.24.2

---

## [0.24.1] - 2025-10-08

### Removed
- **Approved Card**: Removed "Approved" card from Reports summary stats
  - Grid now shows 2 cards instead of 3 (Total Expenses, Pending)
  - Cleaner, more focused layout showing only essential metrics
  - Approved amount information still available in detailed reports

### Technical
- Frontend version: 0.24.0 → 0.24.1

---

## [0.24.0] - 2025-10-08

### Added
- **Category Breakdown Chart in Detailed Reports**: Added expense-by-category visualization to detailed report view
  - Shows category breakdown for filtered/selected trade show
  - Appears above the detailed expense table
  - Same visual style as overview category chart (colored bars with percentages)
  - Helps identify spending patterns within specific events
  - Automatically calculates from filtered expenses

### Changed
- Detailed report layout now includes charts above the expense table for better data visualization

### Technical
- Frontend version: 0.23.1 → 0.24.0

---

## [0.23.1] - 2025-10-08

### Removed
- **Entities Card**: Removed "Active mappings" / "Entities" card from Reports summary stats
  - Unnecessary metric that doesn't provide actionable insight
  - Grid now shows 3 cards instead of 4 (Total Expenses, Approved, Pending)
  - Cleaner layout with more space for important metrics

### Technical
- Frontend version: 0.23.0 → 0.23.1

---

## [0.23.0] - 2025-10-08

### Added
- **Interactive Trade Show Reports**: Trade show cards are now clickable for detailed analysis
  - Clicking a trade show card automatically filters and switches to detailed report view
  - Shows all expenses for that specific trade show
  - Smooth scroll to detailed section
  - Visual feedback on hover (gradient background, shadow, border highlight)
  - "Click to view details" hint in header

### Changed
- **Trade Show Section Repositioned**: Moved "Expenses by Trade Show" to the top of Reports page
  - Now the first chart users see (most important information)
  - Sorted by highest spending trade shows first
  - Better visibility and prominence for event-based analysis

### Technical
- Frontend version: 0.22.1 → 0.23.0

---

## [0.22.1] - 2025-10-08

### Fixed
- **Misleading UI Icons**: Removed non-functional chart icons from Reports page
  - Removed PieChart icon from "Expenses by Category" header
  - Removed TrendingUp icon from "Monthly Spending Trend" header
  - Removed BarChart3 icon from "Expenses by Trade Show" header
  - These icons appeared clickable but had no functionality, causing user confusion
  - Cleaner UI without false affordances

### Technical
- Frontend version: 0.22.0 → 0.22.1

---

## [0.22.0] - 2025-10-08

### Added
- **Entity Running Totals Dashboard**: New dashboard on Reports page showing all-time totals for each Zoho entity
  - Displays entity name and total amount spent
  - Sorted by amount (highest to lowest)
  - Responsive grid layout (1-4 columns based on screen size)
  - Hover effects for better UX
  - Warning indicator for expenses without entity assignment
  - Shows count and total of unassigned expenses

### Changed
- Reports page layout: Entity totals dashboard now appears between filters and summary stats

### Technical
- Frontend version: 0.21.0 → 0.22.0

---

## [0.21.0] - 2025-10-08

### Added
- **Edit Expense Modal**: Accountants can now edit expenses after approval/rejection
  - Edit button added to Actions column for all expenses
  - Modal allows changing approval status, reimbursement status, and entity assignment
  - Prevents accidental status changes with confirmation workflow
  - Allows correction if wrong status was selected or new info becomes available

### Fixed
- **Unassigned Entities Count**: Fixed calculation to show all unassigned entities regardless of approval status
  - Previously only counted approved expenses without entities
  - Now correctly counts all expenses missing entity assignment
- **Entity Dropdown Logic**: Reversed the enable/disable logic
  - Entity dropdown now editable when entity is unassigned
  - Entity dropdown now locked (greyed out) once entity is assigned
  - Prevents accidental changes to already-assigned entities

### Changed
- Entity dropdown styling: Visually distinct disabled state (grey background) when locked

### Technical
- Backend version: 2.3.0 → 2.3.1 (no backend changes, version sync)
- Frontend version: 0.20.0 → 0.21.0

---

## [0.20.0] - 2025-10-08

### Added
- **Two-Column Card Management**: Enhanced card options with separate name and last 4 digits
  - Admin settings now include two input fields for card name and last 4 digits
  - Card options display in "Card Name | 1234" format throughout the app
  - Better differentiation between multiple cards with the same name
  - Validation ensures last 4 digits are exactly 4 characters
  - Duplicate detection based on both name and last 4 digits

### Changed
- **Card Options Data Structure**: Migrated from simple strings to structured objects
  - Old format: `"Haute Inc USD Amex"` (string)
  - New format: `{ name: "Haute Inc USD Amex", lastFour: "1234" }` (object)
  - Backward compatibility: Old string format automatically converts to new format with "0000" placeholder
- **Expense Form Card Display**: Cards now show in "Name | Last4" format in dropdown
- **Default Card Options**: Updated to match actual company cards (Haute Intl/Inc/LLC variations)

### Technical
- Backend version: 2.2.1 → 2.3.0
- Frontend version: 0.19.1 → 0.20.0
- Updated seed data to use new card structure
- Backward-compatible card loading in frontend components

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
