# 🧪 Testing & Validation Guide

**Version**: 1.0  
**Last Updated**: October 27, 2025  
**Status**: Phase 5 Deliverable

---

## 📋 Overview

This guide provides comprehensive testing and validation procedures for the ExpenseApp, focusing on the refactored code from Phases 3 & 4. Since no test infrastructure exists yet, this document serves as both manual testing procedures and a blueprint for future automated testing.

---

## ✅ Validation Checklist - Refactored Components

### Phase 3: Split Monolithic Files (26 Components)

#### ExpenseSubmission.tsx Components

**Test: Receipt Upload**
- [ ] Click "Add Expense" button
- [ ] Upload a receipt image (JPEG/PNG)
- [ ] Verify ReceiptUpload component displays preview
- [ ] Verify OCR section shows after processing
- [ ] Check browser console for errors

**Test: OCR Results Display**
- [ ] After OCR completes, verify OcrSection shows extracted fields
- [ ] Check merchant, amount, date are populated
- [ ] Verify confidence scores display
- [ ] Test "Apply OCR Results" button functionality

**Test: Form Fields**
- [ ] Fill out BasicFields (merchant, amount, date)
- [ ] Add VendorInfo (location, tax ID optional)
- [ ] Select category via CategoryManagement
- [ ] Add line items via LineItemsManager
- [ ] Attach additional files via AttachmentsSection
- [ ] All fields should save correctly

**Test: Form Actions**
- [ ] Click "Save Draft" - verify expense saved as draft
- [ ] Click "Submit" - verify expense status changes to pending
- [ ] Click "Cancel" - verify modal closes without saving

**Test: Expense List & Filters**
- [ ] ExpenseList displays all user expenses
- [ ] ExpenseFilters narrow down results correctly
- [ ] Filter by date, event, category, status
- [ ] Clear filters button resets all

#### Approvals.tsx Components

**Test: Approval Stats**
- [ ] ApprovalStats shows correct counts
- [ ] Pending, approved, rejected numbers accurate
- [ ] Stats update after approval action

**Test: Approval Filters**
- [ ] ApprovalFilters allow filtering by status, entity, user
- [ ] Filters work correctly
- [ ] Clear filters resets view

**Test: Approvals List**
- [ ] ApprovalsList displays all expenses needing approval
- [ ] Expenses show correct status colors
- [ ] Click expense opens ApprovalViewModal

**Test: Approval Modal**
- [ ] ApprovalViewModal shows expense details
- [ ] Approve button works correctly
- [ ] Reject button with reason works
- [ ] Assign entity dropdown functions
- [ ] Modal closes after action

#### DevDashboard.tsx Components

**Test: Dashboard Summary**
- [ ] DashboardSummaryCards show correct stats
- [ ] Active sessions, recent actions, alerts accurate
- [ ] Stats refresh on page load

**Test: Tab Navigation**
- [ ] DashboardTabNavigation switches between 8 tabs
- [ ] Active tab highlighted correctly
- [ ] Tab content loads properly

**Test: Overview Tab**
- [ ] OverviewTab shows version info (frontend/backend)
- [ ] System health displays memory, CPU correctly
- [ ] Database size shows accurate data

**Test: Metrics Tab**
- [ ] MetricsTab displays CPU, memory, disk usage
- [ ] Database metrics show connections, queries
- [ ] Progress bars visualize usage correctly

**Test: Model Training Tab**
- [ ] ModelTrainingTab renders training dashboard
- [ ] Accuracy metrics display
- [ ] Corrections tracking works

**Test: Audit Logs Tab**
- [ ] AuditLogsTab shows activity logs
- [ ] Search filter works
- [ ] Action filter dropdown functions
- [ ] Logs display with correct timestamps

**Test: Sessions Tab**
- [ ] SessionsTab shows active user sessions
- [ ] Status indicators (active/idle/stale) correct
- [ ] Last activity times accurate

**Test: API Analytics Tab**
- [ ] ApiAnalyticsTab shows endpoint statistics
- [ ] Top endpoints list populated
- [ ] Response times display correctly
- [ ] Error counts accurate

**Test: Alerts Tab**
- [ ] AlertsTab shows technical system alerts
- [ ] Severity colors correct (critical, warning, info)
- [ ] Status filter works
- [ ] No business alerts mixed in

**Test: Page Analytics Tab**
- [ ] PageAnalyticsTab shows page views
- [ ] Total views and unique visitors accurate
- [ ] Page breakdown table populated

---

### Phase 4: Simplified Logic (Helper Functions)

#### ocrCorrections.ts Helpers

**Test: detectFieldCorrection()**
```typescript
// Test Case 1: Field changed
const original = { merchant: { value: "Old Name" } };
const submitted = { merchant: "New Name" };
// Expected: Returns "New Name"

// Test Case 2: Field unchanged
const original = { merchant: { value: "Same Name" } };
const submitted = { merchant: "Same Name" };
// Expected: Returns undefined

// Test Case 3: Missing fields
const original = {};
const submitted = { merchant: "Name" };
// Expected: Returns undefined
```

**Test: extractCardLastFour()**
```typescript
// Test Case 1: Valid format
extractCardLastFour("Corporate Amex (...1234)");
// Expected: "1234"

// Test Case 2: Invalid format
extractCardLastFour("Invalid Card");
// Expected: undefined

// Test Case 3: Empty string
extractCardLastFour("");
// Expected: undefined
```

**Test: detectCorrections() - Integration**
- [ ] Submit expense with OCR data
- [ ] Manually change merchant name
- [ ] Verify correction logged to backend
- [ ] Check ocr_corrections table has entry

#### filterUtils.ts Helpers

**Test: hasActiveFilters()**
```typescript
// Test Case 1: No filters active
hasActiveFilters({ date: '', event: 'all', status: 'all' });
// Expected: false

// Test Case 2: One filter active
hasActiveFilters({ date: '2024-01', event: 'all' });
// Expected: true

// Test Case 3: Multiple filters active
hasActiveFilters({ date: '2024-01', status: 'pending' });
// Expected: true

// Test Case 4: Empty object
hasActiveFilters({});
// Expected: false
```

**Test: filterExpenses() - Integration**
- [ ] Load expense list
- [ ] Apply date filter - verify results narrow down
- [ ] Apply status filter - verify correct expenses shown
- [ ] Apply multiple filters - verify AND logic works
- [ ] Clear filters - verify all expenses shown again

---

## 🔄 Critical User Workflows

### Workflow 1: Submit New Expense (End-to-End)

**Steps:**
1. Login as salesperson/coordinator
2. Navigate to Expenses page
3. Click "Add Expense" button
4. Upload receipt (JPEG/PNG)
5. Wait for OCR processing (~2-3 seconds)
6. Review extracted fields
7. Apply OCR results or manually fill fields
8. Select category
9. Add line items (optional)
10. Click "Submit"
11. Verify expense appears in list with "pending" status
12. Check browser console - should have zero errors

**Expected Result:**
- ✅ Expense saved to database
- ✅ Status = "pending"
- ✅ Receipt URL stored correctly
- ✅ OCR data saved (if applicable)
- ✅ User correction logged (if field changed)

---

### Workflow 2: Approve Expense (Accountant Flow)

**Steps:**
1. Login as accountant/admin
2. Navigate to Approvals page
3. Verify pending expenses shown
4. Click an expense to open ApprovalViewModal
5. Review expense details (receipt, amount, category)
6. Click "Approve" button
7. Optionally assign Zoho entity
8. Verify expense status changes to "approved"
9. Check audit log for approval entry

**Expected Result:**
- ✅ Status changed to "approved"
- ✅ Approval timestamp recorded
- ✅ Audit log entry created
- ✅ Entity assignment saved (if selected)

---

### Workflow 3: View Developer Dashboard (Developer Role)

**Steps:**
1. Login as developer
2. Navigate to Dev Dashboard
3. Verify summary cards show current stats
4. Click through all 8 tabs:
   - Overview: Version info and system health
   - Metrics: CPU, memory, database
   - Model Training: OCR training dashboard
   - Audit Logs: Filter and search logs
   - Sessions: View active user sessions
   - API Analytics: Endpoint statistics
   - Alerts: Technical system alerts
   - Page Views: Page analytics
5. Verify all data loads correctly
6. Check browser console for errors

**Expected Result:**
- ✅ All tabs render without errors
- ✅ Data displays accurately
- ✅ No business alerts in Alerts tab
- ✅ API calls complete successfully

---

## 🚨 Regression Testing

### Areas Most Likely to Break

#### 1. Expense Submission Form
**Why:** Major refactor split into 11 components  
**Test:**
- [ ] All form fields still save correctly
- [ ] File upload still works
- [ ] OCR processing completes
- [ ] Validation errors display properly
- [ ] Submit button functions

#### 2. Approval Modal
**Why:** Split into 5 components  
**Test:**
- [ ] Modal opens correctly
- [ ] Approve/reject buttons work
- [ ] Entity assignment saves
- [ ] Modal closes properly
- [ ] Status updates reflect immediately

#### 3. Dev Dashboard Tabs
**Why:** Split into 10 tab components  
**Test:**
- [ ] Tab switching works smoothly
- [ ] Data loads for each tab
- [ ] Filters function correctly
- [ ] No console errors
- [ ] Refresh button updates data

---

## 🎯 Smoke Tests (Pre-Production Deployment)

### Quick Validation (5 minutes)

**Core Functionality:**
1. [ ] **Login**: Test login for all roles (admin, accountant, salesperson, developer)
2. [ ] **Expenses**: Create one test expense
3. [ ] **Approvals**: Approve one expense
4. [ ] **Dev Dashboard**: Open and verify loads
5. [ ] **Console**: Zero JavaScript errors

**Version Check:**
- [ ] Frontend version correct (check `package.json`)
- [ ] Backend version correct (check Dev Dashboard → Overview)
- [ ] Deployment timestamp recent

**Performance Check:**
- [ ] Page load < 2 seconds
- [ ] Expense submission < 5 seconds (with OCR)
- [ ] Dashboard loads < 1 second

---

## 🧪 Unit Test Templates (For Future Implementation)

### Template 1: Helper Function Test

```typescript
// File: src/utils/__tests__/ocrCorrections.test.ts
import { describe, it, expect } from 'vitest';
import { detectFieldCorrection, extractCardLastFour } from '../ocrCorrections';

describe('ocrCorrections', () => {
  describe('detectFieldCorrection', () => {
    it('should return corrected value when field changed', () => {
      const original = { merchant: { value: 'Old Name' } };
      const submitted = { merchant: 'New Name' };
      
      const result = detectFieldCorrection(original, submitted, 'merchant');
      
      expect(result).toBe('New Name');
    });

    it('should return undefined when field unchanged', () => {
      const original = { merchant: { value: 'Same Name' } };
      const submitted = { merchant: 'Same Name' };
      
      const result = detectFieldCorrection(original, submitted, 'merchant');
      
      expect(result).toBeUndefined();
    });
  });

  describe('extractCardLastFour', () => {
    it('should extract last 4 digits from valid format', () => {
      const result = extractCardLastFour('Corporate Amex (...1234)');
      expect(result).toBe('1234');
    });

    it('should return undefined for invalid format', () => {
      const result = extractCardLastFour('Invalid');
      expect(result).toBeUndefined();
    });
  });
});
```

### Template 2: Component Test

```typescript
// File: src/components/expenses/__tests__/ExpenseFilters.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseFilters } from '../ExpenseFilters';

describe('ExpenseFilters', () => {
  it('should render all filter inputs', () => {
    const mockOnFilterChange = vi.fn();
    
    render(
      <ExpenseFilters
        filters={{}}
        onFilterChange={mockOnFilterChange}
        events={[]}
        categories={[]}
      />
    );
    
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('should call onFilterChange when filter value changes', () => {
    const mockOnFilterChange = vi.fn();
    
    render(
      <ExpenseFilters
        filters={{}}
        onFilterChange={mockOnFilterChange}
        events={[]}
        categories={[]}
      />
    );
    
    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2024-01' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2024-01' })
    );
  });
});
```

### Template 3: Integration Test

```typescript
// File: src/__tests__/integration/expense-workflow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

describe('Expense Submission Workflow', () => {
  beforeEach(() => {
    // Setup: Mock API, authentication
  });

  it('should complete full expense submission flow', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    // Step 1: Login
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    // Step 2: Navigate to expenses
    await waitFor(() => expect(screen.getByText(/expenses/i)).toBeInTheDocument());
    await user.click(screen.getByText(/add expense/i));
    
    // Step 3: Upload receipt
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload/i);
    await user.upload(input, file);
    
    // Step 4: Fill form
    await waitFor(() => expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/merchant/i), 'Test Merchant');
    await user.type(screen.getByLabelText(/amount/i), '123.45');
    
    // Step 5: Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    // Verify: Expense created
    await waitFor(() => {
      expect(screen.getByText(/expense submitted/i)).toBeInTheDocument();
    });
  });
});
```

---

## 📊 Test Coverage Goals (Future)

When implementing automated tests, aim for:

| Module | Coverage Target | Priority |
|--------|----------------|----------|
| **Utils** | 90%+ | 🔴 High |
| **Helper Functions** | 95%+ | 🔴 High |
| **Components** | 70%+ | 🟡 Medium |
| **Orchestrators** | 60%+ | 🟡 Medium |
| **Integration** | 50%+ | 🟢 Low |

---

## 🚀 Setting Up Test Infrastructure (Future)

### Step 1: Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### Step 2: Configure Vitest

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

### Step 3: Add Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Step 4: Create Test Setup

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

---

## ✅ Phase 5 Completion Checklist

- [x] Manual validation checklist created
- [x] Critical user workflows documented
- [x] Regression testing areas identified
- [x] Smoke test procedures defined
- [x] Unit test templates provided
- [x] Integration test examples included
- [x] Test infrastructure setup guide documented
- [x] Coverage goals defined

---

## 📝 Notes

- **Current State**: No test infrastructure exists
- **Production Status**: App is working correctly after Phases 3 & 4
- **Zero Errors**: All refactored code passes linting
- **Manual Testing**: Required before production deployment
- **Future Work**: Implement automated tests using templates provided

---

*Last Updated: October 27, 2025*  
*Phase 5: Test Coverage & Validation*  
*Status: Documentation Complete*

