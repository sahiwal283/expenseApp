# Testing Strategy & Test File Organization

**Last Updated**: November 12, 2025  
**Version**: 1.28.0

---

## 📋 Overview

This document outlines the testing strategy and test file organization for the ExpenseApp project. It provides guidelines for writing, organizing, and maintaining tests to ensure consistency and reduce clutter.

---

## 🎯 Testing Principles

### 1. **Test Organization**
- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test interactions between components/modules
- **E2E Tests**: Test complete user workflows (when applicable)

### 2. **Test File Naming**
- **Backend**: `*.test.ts` (e.g., `checklist.test.ts`)
- **Frontend**: `*.test.tsx` (e.g., `CarRentalsSection.test.tsx`)
- **Integration**: Place in `tests/integration/` directory
- **Unit**: Place next to source file or in `__tests__/` directory

### 3. **Test Structure**
```
backend/tests/
  ├── routes/          # Route handler tests
  ├── services/        # Service layer tests
  ├── repositories/    # Repository tests
  ├── integration/     # Integration tests
  └── utils/           # Shared test utilities

src/
  ├── components/
  │   └── checklist/
  │       └── __tests__/  # Component tests
  └── test/
      └── utils/          # Shared test utilities
```

---

## 📁 Test File Organization

### Backend Tests

#### Routes (`backend/tests/routes/`)
- **Purpose**: Test API route handlers
- **Naming**: `{route-name}.test.ts` (e.g., `checklist.test.ts`)
- **Consolidation**: Group related routes in single file when appropriate
  - ✅ `checklist-validation.test.ts` - Zod validation tests
  - ✅ `mime-validation.test.ts` - MIME type validation tests
  - ✅ `booth-map-upload.test.ts` - Booth map upload tests
  - ❌ Avoid: Separate file for each route endpoint

#### Services (`backend/tests/services/`)
- **Purpose**: Test business logic in services
- **Naming**: `{ServiceName}.test.ts` (e.g., `DevDashboardService.test.ts`)
- **Helper Tests**: Extract helper functions to `{ServiceName}.helpers.test.ts`

#### Repositories (`backend/tests/repositories/`)
- **Purpose**: Test data access layer
- **Naming**: `{RepositoryName}.test.ts` (e.g., `ExpenseRepository.test.ts`)
- **Base Tests**: Test base repository in `BaseRepository.test.ts`

#### Integration Tests (`backend/tests/integration/`)
- **Purpose**: Test end-to-end functionality with database
- **Naming**: `{feature}.test.ts` (e.g., `checklist-loading.test.ts`)
- **Grouping**: Group related features when appropriate
  - ✅ `features.test.ts` - Multiple feature tests
  - ✅ `checklist-loading.test.ts` - Checklist-specific integration tests
  - ✅ `login-audit.test.ts` - Authentication integration tests

### Frontend Tests

#### Component Tests (`src/components/{component}/__tests__/`)
- **Purpose**: Test React components
- **Naming**: `{ComponentName}.test.tsx` (e.g., `CarRentalsSection.test.tsx`)
- **Consolidation**: 
  - ✅ One test file per component
  - ✅ Integration tests in `{feature}-workflow.integration.test.tsx`
  - ❌ Avoid: Separate files for each test scenario

#### Shared Utilities (`src/test/utils/`)
- **Purpose**: Shared mocks and helpers
- **Files**: `testHelpers.ts` - Common mocks (User, Event, Checklist)

---

## 🔧 Shared Test Utilities

### Frontend (`src/test/utils/testHelpers.ts`)

**Available Functions**:
- `createMockUser(overrides?)` - Create mock user
- `createMockEvent(overrides?)` - Create mock event
- `createEmptyChecklist(overrides?)` - Create empty checklist
- `createMockChecklist(overrides?)` - Create checklist with sample data
- `createMockFlight(overrides?)` - Create mock flight data
- `createMockHotel(overrides?)` - Create mock hotel data
- `createMockCarRental(overrides?)` - Create mock car rental data

**Usage**:
```typescript
import { createMockUser, createMockEvent, createMockChecklist } from '../../../test/utils/testHelpers';

const user = createMockUser({ role: 'admin' });
const event = createMockEvent({ name: 'Custom Event' });
const checklist = createMockChecklist({ flights: [] });
```

### Backend (`backend/tests/utils/testHelpers.ts`)

**Available Functions**:
- `createMockQueryResult<T>(rows)` - Create mock database result
- `createMockEmptyResult()` - Create empty query result
- `createMockFile(filename, mimetype, size?)` - Create mock file for upload tests
- `isValidMimeType(mimeType)` - Validate MIME type
- `ALLOWED_MIME_TYPES` - Array of allowed MIME types
- `MAX_FILE_SIZE` - Maximum file size constant

**Usage**:
```typescript
import { createMockFile, isValidMimeType, MAX_FILE_SIZE } from '../utils/testHelpers';

const file = createMockFile('booth-map.jpg', 'image/jpeg');
expect(isValidMimeType(file.mimetype)).toBe(true);
```

---

## 🧹 Test File Cleanup Guidelines

### Files to Consolidate

1. **Duplicate Mocks**: Use shared utilities instead
   - ✅ Use `testHelpers.ts` for common mocks
   - ❌ Avoid: Copying mock data across files

2. **Single-Use Test Files**: Merge into related test files
   - ✅ Consolidate: `booked-status-regression.test.tsx` → Merge into component tests
   - ✅ Consolidate: Similar validation tests → Single validation test file

3. **Empty Test Files**: Delete immediately
   - ❌ Delete: Empty test files (no tests)
   - ✅ Create: Tests before committing file

### Files to Keep Separate

1. **Integration Tests**: Keep separate from unit tests
   - ✅ `integration/` directory for database-dependent tests
   - ✅ Separate files for different integration scenarios

2. **Component Tests**: One file per component
   - ✅ `CarRentalsSection.test.tsx` - All CarRentalsSection tests
   - ✅ `HotelsSection.test.tsx` - All HotelsSection tests

3. **Service Tests**: Separate files for different services
   - ✅ `DevDashboardService.test.ts` - Service tests
   - ✅ `DevDashboardService.helpers.test.ts` - Helper function tests

---

## 📊 Current Test File Structure

### Backend Tests (13 files)

**Routes** (3 files):
- `checklist-validation.test.ts` - Zod validation
- `mime-validation.test.ts` - MIME type validation
- `booth-map-upload.test.ts` - Booth map upload ✅ NEW

**Services** (2 files):
- `DevDashboardService.test.ts` - Main service tests
- `DevDashboardService.helpers.test.ts` - Helper function tests

**Repositories** (2 files):
- `BaseRepository.test.ts` - Base repository tests
- `ExpenseRepository.test.ts` - Expense repository tests

**Integration** (7 files):
- `checklist-loading.test.ts` - Checklist loading
- `cors-api.test.ts` - CORS and API configuration
- `database-schema.test.ts` - Database schema validation
- `features.test.ts` - Feature integration tests
- `login-audit.test.ts` - Login and audit logging
- `migration-023.test.ts` - Migration 023 tests
- `pdf-generation.test.ts` - PDF generation tests

### Frontend Tests (5 files)

**Checklist Component Tests**:
- `CarRentalsSection.test.tsx` - Car rentals component
- `HotelsSection.test.tsx` - Hotels component
- `TradeShowChecklist.test.tsx` - Main checklist component
- `checklist-defensive.test.tsx` - Defensive checks
- `checklist-workflow.integration.test.tsx` - Integration workflow

**Deleted**:
- `booked-status-regression.test.tsx` - Empty file (deleted) ✅

---

## ✅ Best Practices

### 1. **Use Shared Utilities**
```typescript
// ✅ Good: Use shared utilities
import { createMockUser, createMockEvent } from '../../../test/utils/testHelpers';
const user = createMockUser({ role: 'admin' });

// ❌ Bad: Duplicate mock data
const mockUser = { id: 'user-1', name: 'Test User', ... };
```

### 2. **Group Related Tests**
```typescript
// ✅ Good: Group related tests in describe blocks
describe('Checklist Loading', () => {
  describe('Empty Checklist', () => { ... });
  describe('Partial Data', () => { ... });
});

// ❌ Bad: Separate files for each scenario
// empty-checklist.test.ts
// partial-data.test.ts
```

### 3. **Consolidate Validation Tests**
```typescript
// ✅ Good: Single file for validation tests
describe('Input Validation', () => {
  describe('Custom Items', () => { ... });
  describe('Templates', () => { ... });
});

// ❌ Bad: Separate files for each validation type
```

### 4. **Document Test Purpose**
```typescript
/**
 * Checklist Loading Integration Tests
 * 
 * Tests checklist loading scenarios:
 * - Empty checklist (new event)
 * - Partial data (some sections empty)
 * - Full data (all sections populated)
 */
```

### 5. **Clean Up After Tests**
```typescript
// ✅ Good: Clean up test data
afterAll(async () => {
  await pool.query('DELETE FROM test_data WHERE id = $1', [testId]);
});

// ❌ Bad: Leave test data in database
```

---

## 🚫 Anti-Patterns to Avoid

1. **Duplicate Mock Data**
   - ❌ Copying mock objects across files
   - ✅ Use shared utilities

2. **Empty Test Files**
   - ❌ Committing empty test files
   - ✅ Delete or add tests before committing

3. **Over-Fragmentation**
   - ❌ One test file per test case
   - ✅ Group related tests in describe blocks

4. **Missing Documentation**
   - ❌ Tests without purpose documentation
   - ✅ Document test purpose and scenarios

5. **Hardcoded Test Data**
   - ❌ Hardcoded IDs, dates, etc.
   - ✅ Use helper functions with overrides

---

## 📈 Test Coverage Goals

- **Unit Tests**: >80% coverage for new code
- **Integration Tests**: Cover all critical workflows
- **E2E Tests**: Cover critical user journeys (when applicable)

---

## 🔄 Maintenance

### Regular Cleanup Tasks

1. **Monthly Review**:
   - Review test files for consolidation opportunities
   - Check for duplicate mocks/data
   - Remove unused test utilities

2. **After Major Features**:
   - Consolidate related test files
   - Update shared utilities
   - Document new test patterns

3. **Before Releases**:
   - Verify all tests pass
   - Check test coverage
   - Update documentation

---

## 📝 Test File Checklist

When creating a new test file, ensure:

- [ ] Uses shared test utilities (if applicable)
- [ ] Follows naming conventions
- [ ] Includes purpose documentation
- [ ] Groups related tests in describe blocks
- [ ] Cleans up test data after tests
- [ ] Has appropriate test coverage (>80% for new code)
- [ ] No duplicate mock data
- [ ] Tests are deterministic (no flaky tests)

---

## 🎯 Summary

**Key Principles**:
1. ✅ Use shared utilities to reduce duplication
2. ✅ Group related tests in describe blocks
3. ✅ Consolidate similar test files when appropriate
4. ✅ Document test purpose and organization
5. ✅ Clean up empty/unnecessary test files

**Current Status**:
- ✅ Shared utilities created (`testHelpers.ts`)
- ✅ Empty test file deleted (`booked-status-regression.test.tsx`)
- ✅ Test organization documented
- ✅ Consolidation opportunities identified

**Next Steps**:
- Migrate existing tests to use shared utilities (gradual)
- Continue consolidating similar test files
- Maintain test organization guidelines

---

*This document should be updated as the test suite evolves.*

