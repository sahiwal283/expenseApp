# Changelog

All notable changes to the Trade Show Expense Management App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Backend 2.4.2] - 2025-10-08

### Fixed
- **CRITICAL: Database Schema Constraint for Reimbursement Status**:
  - Fixed database CHECK constraint that was blocking reimbursement status updates
  - Constraint was only allowing old values: `'pending'`, `'approved'`, `'rejected'`
  - Updated to allow new values: `'pending review'`, `'approved'`, `'rejected'`, `'paid'`
  - Migrated all existing `'pending'` values to `'pending review'` in database
  - Updated `schema.sql` to prevent this issue in future deployments
  - Resolves "Failed to update expense" error when accountants try to change reimbursement status

### Technical
- Backend version: 2.4.1 → 2.4.2
- Database migration: Dropped old constraint, added new constraint with all four valid statuses
- Schema file updated to match production database configuration
- Added extensive logging to reimbursement endpoint for future diagnostics

---

## [0.33.1] - 2025-10-08

### Changed
- **Personalized Dashboard for Each User**:
  - Dashboard now shows personalized data based on user role
  - Salespeople/Coordinators see only their own expenses (not all expenses)
  - Non-admin users see only events they're assigned to
  - Admin/Accountant continue to see all data for oversight
  - Stats card titles adapt: "Total Expenses" vs "My Expenses"
  - "Pending Approvals" becomes "My Pending Approvals" for non-admins
  - "Active Events" becomes "My Active Events" for non-admins/coordinators
  - Recent Expenses widget shows only user's own expenses (for non-admins)
  - Upcoming Events widget shows only assigned events (for non-admins)

### Technical
- Frontend version: 0.33.0 → 0.33.1
- Updated Dashboard stats calculation with role-based filtering
- Added userExpenses and userEvents to filtered data
- Dynamic stat card titles based on user role
- Filtered data passed to RecentExpenses, UpcomingEvents, and BudgetOverview components

---

## [0.33.0] - 2025-10-08

### Added
- **Dynamic Events Page with Role-Based Filtering**:
  - Users now see only events they're assigned to as participants
  - Admins and coordinators continue to see all events
  - Events tab now accessible to all roles (salespeople, accountants, coordinators, admins)
  - Page title changes based on role: "Event Management" vs "My Events"
  - Description updates based on permissions

### Changed
- **Event Management Permissions**:
  - Removed hard "Access Denied" block for non-coordinators
  - Create Event button only visible to admins and coordinators
  - Edit/Delete buttons only visible to admins and coordinators
  - All users can view events they're assigned to
  - Filtering logic: admin/coordinator see all; others see only their assigned events

### Technical
- Frontend version: 0.32.3 → 0.33.0
- Updated EventSetup component with role-based filtering
- Added `canManageEvents` permission check
- Updated Sidebar navigation to show Events for all roles
- Conditional rendering of management UI based on user role

---

## [0.32.3] - 2025-10-08

### Fixed
- **Reimbursement Status Update Error**: Fixed backend validation to accept all reimbursement statuses
  - Backend was only accepting 'approved' and 'rejected'
  - Now accepts all four statuses: 'pending review', 'approved', 'rejected', 'paid'
  - Users can now successfully update reimbursement status to any valid state
  - Updated frontend API type definitions to match new statuses

### Technical
- Frontend version: 0.32.2 → 0.32.3
- Backend version: 2.3.1 → 2.4.0
- Updated backend validation in expenses route (line 607)
- Updated frontend API type definition in api.ts

---

## [0.32.2] - 2025-10-08

### Fixed
- **Reimbursement Status Display**: Reimbursement column now shows the full status
  - Fixed: Previously only showed "Required" without the status
  - Now shows: "Required (pending review)", "Required (approved)", "Required (rejected)", "Required (paid)"
  - Provides clear visibility of reimbursement workflow stage
- **Edit Modal Date Bug**: Fixed date display off by one day in Approvals edit modal
  - Used timezone-safe `formatLocalDate` instead of `new Date().toLocaleDateString()`
  - Ensures date shown in modal matches the date in the table
  - Prevents UTC timezone conversion issues

### Technical
- Frontend version: 0.32.1 → 0.32.2
- Updated reimbursement column display logic in Approvals component
- Applied formatLocalDate to edit modal date display

---

## [0.32.1] - 2025-10-08

### Changed
- **Smart Expense Sorting**: Expenses now automatically sort with pending items at the top
  - Pending expenses always appear first in the list
  - Approved/rejected expenses move to the bottom
  - Within each status group, expenses sorted by date (newest first)
  - Applied to both Approvals page and Expense Submission page
  - Makes it easier to focus on items requiring attention

### Technical
- Frontend version: 0.32.0 → 0.32.1
- Updated filteredExpenses sorting logic in Approvals component
- Updated filteredExpenses sorting logic in ExpenseSubmission component

---

## [0.32.0] - 2025-10-08

### Added
- **Enhanced Reimbursement Status Workflow**:
  - Added "Pending Review" status (replaces "Pending")
  - Added "Paid" status for completed reimbursements
  - Automatic "Pending Review" status when expense flagged for reimbursement
  - Complete reimbursement lifecycle: Pending Review → Approved/Rejected → Paid

### Changed
- **Reimbursement Status Flow**:
  - Changed default status from "pending" to "pending review"
  - Updated dropdown options in Approvals modal: Pending Review, Approved, Rejected, Paid
  - Accountants/admins can approve/reject, then mark as paid once user is paid out
  - Updated stats cards to show "pending review" reimbursements
  - Updated all type definitions and constants

### Technical
- Frontend version: 0.31.6 → 0.32.0
- Updated REIMBURSEMENT_STATUS constants
- Updated type definitions in App.tsx and types.ts
- Modified ExpenseForm, Approvals, and DetailedReport components
- Updated reimbursement status checks across all components

---

## [0.31.6] - 2025-10-08

### Changed
- **Accountant Settings Access**: Restored Settings page access for accountant role
  - Settings tab now visible to both administrators and accountants
  - Accountants need access to manage card options and entity mappings
  - Updated access control in AdminSettings component

### Technical
- Frontend version: 0.31.5 → 0.31.6
- Updated Sidebar navigation roles for Settings (added 'accountant')
- Modified role check in AdminSettings component

---

## [0.31.5] - 2025-10-08

### Changed
- **Reimbursement Field Removed**: Completely removed reimbursement checkbox from expense form
  - Reimbursement requirement is now silently auto-determined by card selection
  - Personal cards automatically flag for reimbursement (no UI notification)
  - Cleaner, more streamlined expense submission form
  - Reduced visual clutter and form complexity

### Technical
- Frontend version: 0.31.4 → 0.31.5
- Removed reimbursement checkbox UI entirely
- Background auto-flagging logic still active via useEffect

---

## [0.31.4] - 2025-10-08

### Changed
- **Salesperson Access Control**: Restricted salespeople from accessing Reports page
  - Reports tab now only visible to administrators and accountants
  - Removed Reports access from salesperson role
  - Access denied message displayed if salesperson attempts to access Reports
  - Salespeople can now only access: Dashboard and Expenses

### Technical
- Frontend version: 0.31.3 → 0.31.4
- Updated Sidebar navigation roles for Reports (removed 'salesperson')
- Added role check in Reports component for salesperson

---

## [0.31.3] - 2025-10-08

### Changed
- **Reimbursement Checkbox UX**: Improved reimbursement required field behavior
  - Checkbox now hidden when personal card is selected (since it's auto-flagged)
  - Replaced disabled checkbox with informational alert for personal card expenses
  - Cleaner UI: only shows manual checkbox for non-personal cards
  - Clear notification displays when reimbursement is automatically required

### Technical
- Frontend version: 0.31.2 → 0.31.3
- Conditional rendering based on card selection
- Uses AlertCircle icon for better visual communication

---

## [0.31.2] - 2025-10-08

### Changed
- **Settings Page Access Control**: Restricted Settings page to admin-only access
  - Settings tab now only visible to administrators
  - Removed Settings access from coordinators, salespeople, and accountants
  - Card options and entity options are sensitive admin configurations
  - Access denied message displayed if non-admin attempts to access Settings

### Technical
- Frontend version: 0.31.1 → 0.31.2
- Updated Sidebar navigation roles for Settings (now only 'admin')
- Added role check in AdminSettings component

---

## [0.31.1] - 2025-10-08

### Changed
- **Coordinator Access Control**: Restricted coordinators from accessing Reports page
  - Coordinators can now only access: Dashboard, Events, and Expenses
  - Reports tab removed from coordinator navigation
  - Access denied message displayed if coordinator attempts to access Reports
  - Aligns with coordinator role scope: create events and assign users

### Technical
- Frontend version: 0.31.0 → 0.31.1
- Added role check in Reports component
- Updated Sidebar navigation roles for Reports (removed 'coordinator', added 'salesperson')

---

## [0.31.0] - 2025-10-08

### Added
- **Trade Show Breakdown for Entities**: New card showing trade show breakdown when viewing a specific entity
  - Displays which trade shows the selected entity has expenses in
  - Shows amount per trade show
  - Clickable cards to drill down into specific trade show for that entity
  - Blue gradient styling to distinguish from entity cards
  - Same responsive flexbox layout as entity totals

### Fixed
- **Entity Totals Visibility**: Entity running totals now correctly display when viewing a specific trade show
  - Previously hidden when any filter was applied
  - Now shows entity breakdown for the selected trade show
  - Allows drilling down from trade show → entities → specific entity's expenses
  - Complete bidirectional navigation: trade shows ↔ entities

### Changed
- **Reports Navigation Flow**: Improved drill-down experience
  - Overview → Trade Show: See entities for that show
  - Overview → Entity: See trade shows for that entity
  - Trade Show view + Entity view: See specific entity's expenses in specific show
  - Consistent clickable cards throughout

### Technical
- Frontend version: 0.30.0 → 0.31.0
- Added `tradeShowBreakdown` useMemo calculation
- Updated entity totals visibility logic to show when `selectedEntity === 'all'`
- Added new trade show breakdown card with blue theme

---

## [0.30.0] - 2025-10-08

### Changed
- **Complete Date Utilities Migration**: Migrated all components to use centralized date utilities
  - **EventSetup.tsx**: Replaced manual date parsing with `parseLocalDate`, `formatForDateInput`, `formatDateRange`
  - **Dashboard.tsx**: Updated active events calculation to use `parseLocalDate`
  - **Reports.tsx**: Updated period filtering to use `parseLocalDate`
  - **ExpenseSubmission.tsx**: Updated date display to use `formatLocalDate`
  - **Approvals.tsx**: Updated date displays (2 instances) to use `formatLocalDate`
  - **DetailedReport.tsx**: Updated date display to use `formatLocalDate`
  - **AccountantDashboard.tsx**: Updated date display to use `formatLocalDate`
  - **RecentExpenses.tsx**: Updated date display to use `formatLocalDate`
  - **ExpenseForm.tsx**: Updated date input formatting to use `formatForDateInput`
  - **ExpenseChart.tsx**: Updated month display to use `formatLocalDate`

### Fixed
- **Timezone Consistency**: All date operations now consistent across the entire application
  - No more timezone conversion bugs
  - Dates display correctly regardless of user's timezone
  - Event filtering works consistently
  - Date comparisons are accurate
  - Form inputs populate correctly

### Technical
- Frontend version: 0.29.0 → 0.30.0
- Eliminated all direct `new Date(dateString)` calls with date-only strings
- All 10+ components now use centralized utilities
- Single source of truth for date handling achieved
- Complete codebase migration completed

### Impact
- **100% coverage**: All date handling operations now use timezone-safe utilities
- **Maintainability**: Future developers will use utilities by example
- **Reliability**: No more one-day-off bugs across any component
- **Consistency**: Same date displays correctly everywhere in the app

---

## [0.29.0] - 2025-10-08

### Added
- **Date Utilities Module**: Created centralized date handling utilities to prevent future timezone bugs
  - New `src/utils/dateUtils.ts` with comprehensive date functions
  - `parseLocalDate()` - Parse YYYY-MM-DD strings as local dates
  - `formatLocalDate()` - Format dates for display without timezone issues
  - `formatDateRange()` - Format date ranges consistently
  - `getDaysUntil()` - Calculate days between dates
  - `getDaysUntilLabel()` - Get human-readable labels
  - `isToday()`, `isPast()`, `isFuture()` - Date comparison utilities
  - `formatForDateInput()` - Format for HTML date inputs
  - Comprehensive JSDoc documentation explaining timezone pitfalls
  - Created `src/utils/README.md` with usage guide and migration checklist

### Changed
- **UpcomingEvents Component**: Refactored to use new date utilities
  - Demonstrates best practices for date handling
  - Cleaner, more maintainable code
  - Same functionality with better architecture

### Technical
- Frontend version: 0.28.1 → 0.29.0
- All date operations now centralized in one location
- Future date bugs prevented through single source of truth
- Migration path documented for other components

### Developer Experience
- Clear documentation on why timezone bugs occur
- Examples of correct vs incorrect date handling
- Migration checklist for refactoring existing code
- Testing recommendations across timezones

---

## [0.28.1] - 2025-10-08

### Fixed
- **Upcoming Events Date Display**: Fixed timezone conversion bug causing incorrect date display
  - Event dates now display correctly without timezone shift
  - Days until calculation fixed to use local dates
  - Date range display (start - end) now shows correct dates
  - Event filtering by end date now works correctly
  - Resolves issue where dates were off by one day due to UTC conversion

### Technical
- Frontend version: 0.28.0 → 0.28.1
- Applied same local date parsing fix as EventSetup component
- All date operations now parse YYYY-MM-DD strings as local dates, not UTC

---

## [0.28.0] - 2025-10-08

### Added
- **Clickable Entity Cards**: Entity running totals cards are now clickable and expandable
  - Click any entity card to view detailed report for that entity
  - Shows purple gradient header banner with entity name and total
  - Back button returns to overview and clears entity filter
  - Same detailed layout as trade show reports (graphs on top, expenses below)
  - Added "Click to view details" hint to entity totals header
  - Enhanced hover effects (scale, shadow, border color change)
  - Full keyboard accessibility with Enter key support

### Changed
- **Entity Totals Visibility**: Entity running totals card now only displays in overview mode
  - Hidden when viewing specific trade show or entity details
  - Prevents redundant display when already filtered

### Technical
- Frontend version: 0.27.4 → 0.28.0
- Added `handleEntityClick` function to filter by entity and show detailed view
- Entity header banner uses purple gradient to distinguish from trade show banner (blue/emerald)

---

## [0.27.4] - 2025-10-08

### Changed
- **Reports Page Total**: Moved total expenses from card to page header
  - Removed large Total Expenses card
  - Total amount now displayed in page subtitle (e.g., "• Total: $5,457.90")
  - More space-efficient layout while keeping total visible
  - Always accessible without scrolling

### Technical
- Frontend version: 0.27.3 → 0.27.4

---

## [0.27.3] - 2025-10-08

### Removed
- **Pending Card from Reports**: Removed the Pending expenses card from Reports page
  - Pending information is already available in the Approvals tab
  - Eliminates redundancy and simplifies the Reports page layout
  - Only Total Expenses summary card now shown for cleaner interface

### Technical
- Frontend version: 0.27.2 → 0.27.3

---

## [0.27.2] - 2025-10-08

### Fixed
- **Event Date Display Bug**: Fixed timezone conversion issue causing one-day offset in event dates
  - Event overview now displays correct dates without timezone shift
  - Edit modal now populates with correct dates matching the overview
  - Dates stored as YYYY-MM-DD are now parsed as local dates, not UTC
  - Resolves issue where overview showed "2/7/2026" but edit form showed "02/08/2026"

### Technical
- Frontend version: 0.27.1 → 0.27.2
- Improved date parsing to avoid UTC conversion for date-only strings
- Added local date formatting helper to prevent timezone-related date shifts

---

## [0.27.1] - 2025-10-08

### Added
- **Trade Show Detail Header**: Added prominent header banner when viewing specific trade show details
  - Displays selected trade show name clearly at the top
  - Shows total expenses for the selected trade show
  - Includes easy-to-access back button with arrow icon
  - Beautiful gradient design matching app theme
  - Improves navigation by eliminating need to use filters modal to return to overview

### Changed
- **Navigation**: Simplified navigation when drilling into trade show details
  - One-click back button returns to overview and clears trade show filter
  - No longer need to open filters modal to navigate back
  - Better user experience for report exploration

### Technical
- Frontend version: 0.27.0 → 0.27.1

---

## [0.27.0] - 2025-10-08

### Changed
- **Reports Page Filters**: Redesigned filter interface to be cleaner and less intrusive
  - Removed large filter section from top of page
  - Added compact "Filters" button next to Export CSV
  - Clicking button opens modal popup with all filter options
  - Expense count now shows inline in page subtitle
  - Much cleaner, more spacious layout
  - Filters still fully functional with real-time application
  - Added "Clear All" button to reset filters

### Technical
- Frontend version: 0.26.2 → 0.27.0

---

## [0.26.2] - 2025-10-08

### Changed
- **Expense Management Filters**: Made inline filters more subtle and less intrusive
  - Reduced background from `bg-gray-100` to `bg-gray-50` for lighter appearance
  - Changed border from `border-gray-200` to `border-gray-100` for softer edges
  - Reduced padding from `py-2` to `py-1.5` for more compact layout
  - Changed filter inputs to white background with lighter borders (`border-gray-200`)
  - Reduced focus ring from `ring-2` to `ring-1` for subtler interaction
  - Lighter text color (`text-gray-600`) for less visual weight
  
### Removed
- **Amount Filter**: Removed Min/Max amount filter inputs
  - Amount field no longer has filter controls
  - Removed `amountMinFilter` and `amountMaxFilter` state variables
  - Removed amount filtering logic from expense filter function
  - Cleaner, simpler filtering interface

### Technical
- Frontend version: 0.26.1 → 0.26.2

---

## [0.26.1] - 2025-10-08

### Fixed
- **Dashboard Stats**: Active Events card now shows accurate count
  - Changed calculation to use actual end date instead of status field
  - Now matches the same logic used in Event Management page
  - Only counts events where end date is today or in the future
  - Past events no longer incorrectly counted as "active"

### Technical
- Frontend version: 0.26.0 → 0.26.1

---

## [0.26.0] - 2025-10-08

### Added
- **Event Management**: Active/Past Events toggle functionality
  - Added toggle buttons to switch between "Active Events" and "Past Events"
  - Events automatically categorized based on end date
  - Active Events: Shows events where end date is today or in the future
  - Past Events: Shows events where end date has passed
  - Event counts displayed on each toggle button
  - Cleaner organization and easier event navigation

### Technical
- Frontend version: 0.25.2 → 0.26.0

---

## [0.25.2] - 2025-10-08

### Changed
- **Login Screen**: Cleaned up test accounts display
  - Removed `salesperson2` test account from sandbox login screen
  - Removed redundant password hint text at bottom of login form
  - Password is already visible in each account button, making hint unnecessary

### Technical
- Frontend version: 0.25.1 → 0.25.2

---

## [0.25.1] - 2025-10-08

### Removed
- **Approvals Page**: Removed "Total Expenses / Matching filters" stats card
  - Streamlined stats from 4 cards to 3 cards
  - Adjusted grid layout to `xl:grid-cols-3` for better spacing
  - Remaining cards: Pending Approval, Reimbursements, Unassigned Entities
  - Filtered expense count still visible in table header

### Technical
- Frontend version: 0.25.0 → 0.25.1

---

## [0.25.0] - 2025-10-08

### Changed
- **Approvals Page Filter UI**: Redesigned filter interface to be less intrusive
  - Removed always-visible filter bar that took up significant space
  - Added compact "Filters" button in table header
  - Clicking button opens modal popup with all filter options
  - Modal includes: Search, Status, Category, Event, User, Reimbursement, Entity
  - Added "Clear All" button to reset all filters at once
  - Filters apply in real-time while modal is open
  - Cleaner, more spacious layout for expense table

### Technical
- Frontend version: 0.24.9 → 0.25.0

---

## [0.24.9] - 2025-10-08

### Fixed
- **Reports Tab Access**: Accountants can now access the Reports tab
  - Removed redirect that was forcing accountants to AccountantDashboard
  - Accountants now see the full Reports page like admins and coordinators
  - Permissions already allowed `canViewReports: true` for accountants
  - Sidebar navigation already included Reports for accountants
  - Aligns functionality with intended permission model

### Technical
- Frontend version: 0.24.8 → 0.24.9

---

## [0.24.8] - 2025-10-08

### Removed
- **Main Dashboard**: Removed "Team Members" stats card
  - Streamlined dashboard to show only essential metrics
  - Reduced stats grid from 4 cards to 3 cards
  - Adjusted grid layout to `xl:grid-cols-3` for better spacing
  - Remaining cards: Total Expenses, Pending Approvals, Active Events

### Technical
- Frontend version: 0.24.7 → 0.24.8

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
