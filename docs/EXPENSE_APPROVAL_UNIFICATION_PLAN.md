# Expense & Approvals Unification Plan - v1.3.0

**Branch:** `v1.3.0`  
**Target:** Sandbox Only  
**Date:** October 16, 2025

---

## Executive Summary

Merge the separate "Expenses" and "Approvals" pages into a single, unified "Expenses" page that dynamically shows different views based on user permissions.

---

## Current State

### ExpenseSubmission.tsx (Expenses Page)
- Shows user's own expenses
- Add/Edit/Delete functionality
- Filters for date, event, category, merchant, card, status, reimbursement
- Receipt viewing modal
- Inline filters in table header

### Approvals.tsx (Approval Page - Admin/Accountant Only)
- Summary cards: Pending Approvals, Reimbursements, Unassigned Entities
- Full expense table with ALL user expenses
- Approval actions: Approve/Reject
- Reimbursement approval: Approve/Reject
- Entity assignment dropdowns
- Push to Zoho buttons
- Filter modal with search

### Navigation (Sidebar.tsx)
- Line 30: `expenses` (all roles except pending)
- Line 31: `approvals` (admin, accountant, developer only)

---

## Unified Design

### For Regular Users (Salesperson, Coordinator, Temporary)
**Current Experience - NO CHANGE:**
- See only their own expenses
- Add/Edit/Delete expenses
- View receipts
- Apply filters
- Status badges (pending, approved, rejected)
- Reimbursement status badges

### For Approval Users (Admin, Accountant, Developer)
**Enhanced Experience - ADDITIVE:**
- **Section 1: Approval Workflow Cards** (NEW - at top)
  - Card 1: Pending Approvals (count + total amount)
  - Card 2: Reimbursements (count pending approval)
  - Card 3: Unassigned Entities (count needing assignment)
- **Section 2: Expense Table**
  - Shows ALL user expenses (not just their own)
  - Includes their own expenses + all others for approval
  - **Additional Columns Visible Only to Approvers:**
    - User column (who submitted)
    - Entity assignment dropdown
    - Zoho push button
  - **Additional Actions Visible Only to Approvers:**
    - Approve/Reject buttons (for pending expenses)
    - Reimbursement approval buttons
  - Regular columns remain the same
- **Filtering & Search:**
  - Use filter modal (from Approvals)
  - Include user filter (to see specific user's expenses)
  - Include entity filter

---

## Implementation Strategy

### Phase 1: Create Approval Workflow Cards Component
**File:** `src/components/expenses/ApprovalCards.tsx`
- Reusable component with 3 summary cards
- Takes expenses array as input
- Calculates stats from expenses
- Only visible to admin/accountant/developer roles

### Phase 2: Enhance ExpenseSubmission Component
**File:** `src/components/expenses/ExpenseSubmission.tsx`
- Check if user has approval permissions: `hasApprovalPermission = ['admin', 'accountant', 'developer'].includes(user.role)`
- Conditionally render ApprovalCards at top
- Enhance table with additional columns (conditionally rendered)
- Add approval action buttons (conditionally rendered)
- Integrate entity assignment logic
- Integrate Zoho push logic
- Maintain current functionality for regular users

### Phase 3: Backend Data Fetching
**Current behavior:**
- `useExpenses` hook filters to show only user's own expenses
- Need to fetch ALL expenses if user has approval permission

**Changes needed:**
- Update `useExpenses` hook or create new `useAllExpenses` hook
- Backend already returns all expenses; frontend filtering needs adjustment
- Keep filtering for regular users, remove for approval users

### Phase 4: Remove Approvals Tab
**Files:**
- `src/components/layout/Sidebar.tsx`: Remove approvals nav item (line 31)
- `src/App.tsx`: Remove Approvals route (line 324)
- Keep `Approvals.tsx` file for reference but mark as deprecated

### Phase 5: Testing & Validation
- Test regular user view (should be unchanged)
- Test admin/accountant view (should see approval cards + all expenses)
- Test approval actions (approve, reject, entity assign, Zoho push)
- Test filters work for both views
- Test mobile responsiveness

---

## File Changes Summary

### New Files
- `src/components/expenses/ApprovalCards.tsx` - Approval workflow summary cards
- `docs/EXPENSE_APPROVAL_UNIFICATION_PLAN.md` - This file

### Modified Files
- `src/components/expenses/ExpenseSubmission.tsx` - Enhanced with approval features
- `src/components/expenses/ExpenseSubmission/hooks/useExpenses.ts` - Fetch all expenses for approvers
- `src/components/layout/Sidebar.tsx` - Remove approvals nav item
- `src/App.tsx` - Remove Approvals route
- `package.json` - Version bump to 1.3.0
- `backend/package.json` - Version bump to 1.3.0
- `CHANGELOG.md` - Document changes

### Deprecated Files
- `src/components/admin/Approvals.tsx` - Keep for reference, no longer in use
- `src/components/admin/Approvals.backup.tsx` - Can be deleted

---

## User Permission Matrix

| Feature | Salesperson | Coordinator | Temporary | Accountant | Admin | Developer |
|---------|-------------|-------------|-----------|------------|-------|-----------|
| View own expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add/Edit own expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Approval Workflow Cards** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **View ALL user expenses** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Approve/Reject expenses** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Approve reimbursements** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Assign entities** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Push to Zoho** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## Security Considerations

### Frontend
- Role-based conditional rendering (defensively coded)
- No approval actions rendered for non-authorized users
- Approval workflow cards only visible to authorized roles

### Backend
- All approval endpoints already have role checks
- Existing middleware: `authenticateToken` + role verification
- No changes needed to backend security

---

## Migration Notes

### For Users
- **Regular users:** No change - same experience
- **Approvers:** Navigate to "Expenses" tab for all approval workflows
- **Approvals tab:** Will be removed from navigation

### For Developers
- Approvals.tsx is deprecated but kept for reference
- All approval logic now in ExpenseSubmission.tsx
- Use `hasApprovalPermission` check for role-based features

---

## Testing Checklist

### Regular User Testing
- [ ] Can see only own expenses
- [ ] Can add new expense
- [ ] Can edit own expense
- [ ] Can delete own expense
- [ ] Can view receipt
- [ ] Filters work correctly
- [ ] No approval cards visible
- [ ] No approval actions visible
- [ ] No entity/Zoho columns visible

### Approver Testing (Admin/Accountant)
- [ ] Approval cards display at top
- [ ] Cards show correct counts
- [ ] Can see ALL user expenses
- [ ] Can see user column (who submitted)
- [ ] Can approve pending expenses
- [ ] Can reject pending expenses
- [ ] Can approve reimbursements
- [ ] Can assign entities
- [ ] Can push to Zoho
- [ ] Entity dropdown works
- [ ] Zoho button shows "Pushed" when complete
- [ ] Filters work with all expenses
- [ ] User filter works
- [ ] Can still add/edit/delete own expenses

### Mobile Testing
- [ ] Approval cards responsive on mobile
- [ ] Table scrolls horizontally
- [ ] All actions accessible
- [ ] Touch targets min 44px

---

## Version History

**v1.3.0** - October 16, 2025
- Initial unification of Expenses and Approvals pages
- Added conditional approval workflow cards
- Enhanced expense table with role-based columns
- Removed separate Approvals navigation tab

---

## Future Enhancements

### Potential Improvements (Not in v1.3.0)
1. **Bulk Actions:** Select multiple expenses for bulk approve/reject
2. **Quick Filters:** One-click filter for "My Pending", "All Pending", "Needs Entity"
3. **Notification Badges:** Show count of pending approvals on Expenses tab
4. **Approval History:** Timeline of approval actions
5. **Comments:** Add comments/notes when approving/rejecting
6. **Email Notifications:** Notify submitter when expense approved/rejected

---

## Support & Documentation

For questions or issues with the unified Expenses page:
1. Check this plan document
2. Review inline code comments in ExpenseSubmission.tsx
3. Check CHANGELOG.md for version-specific changes
4. Test in sandbox before production deployment

