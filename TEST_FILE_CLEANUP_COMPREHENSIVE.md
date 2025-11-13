# Comprehensive Test File Cleanup Plan

**Date:** November 12, 2025  
**Testing Agent:** Testing Agent  
**Status:** In Progress

## Analysis Summary

**Total Test Files:** 48 files
- Backend: 27 files
- Frontend: 21 files

## Consolidation Plan

### 1. PDF Test Files (Backend) - 8 files → 3 files

**Consolidate into `pdf-generation.test.ts`:**
- ✅ `pdf-consolidation.test.ts` → Merge as describe blocks
- ✅ `pdf-content-updates.test.ts` → Merge as describe blocks
- ✅ `pdf-layout-optimization.test.ts` → Merge as describe blocks
- ✅ `pdf-download-fix.test.ts` → Merge as describe blocks
- ✅ `pdf-download-security-blank-page.test.ts` → Merge as describe blocks

**Keep Separate:**
- `pdf-generation.test.ts` - Main comprehensive service tests
- `pdf-download-endpoint.test.ts` - API endpoint tests (different scope)
- `zoho-integration-pdf.test.ts` - Zoho-specific integration tests

**Files to Delete:** 5 files

### 2. PDF Test Files (Frontend) - 2 files → 1 file

**Consolidate:**
- ✅ `api.pdf-download-debugging.test.ts` → Merge into `api.pdf-download.test.ts`

**Keep:**
- `api.pdf-download.test.ts` - Main frontend PDF download tests

**Files to Delete:** 1 file

### 3. ReceiptsViewerModal Tests - 4 files → 1 file

**Consolidate into `ReceiptsViewerModal.test.tsx`:**
- ✅ `ReceiptsViewerModal.closure.test.tsx` → Merge as describe blocks
- ✅ `ReceiptsViewerModal.expense-details.test.tsx` → Merge as describe blocks
- ✅ `ReceiptsViewerModal.integration.test.tsx` → Merge as describe blocks

**Keep:**
- `ReceiptsViewerModal.test.tsx` - Main component tests

**Files to Delete:** 3 files

### 4. Booth Map Tests - Review for consolidation

**Backend:**
- `booth-map-upload.test.ts` (route tests) - KEEP
- `booth-map-upload-e2e.test.ts` (integration tests) - KEEP (different scope)

**Frontend:**
- `BoothMapDisplay.test.tsx` - KEEP (component-specific)
- `BoothMapImage.test.tsx` - Review if can merge into BoothMapDisplay
- `BoothMapModalIntegration.test.tsx` - KEEP (integration-specific)
- `BoothMapViewer.test.tsx` - KEEP (component-specific)

**Decision:** Keep separate - they test different components/scopes

### 5. Checklist Tests - Review

**Frontend:**
- `checklist-defensive.test.tsx` - Review if can merge into TradeShowChecklist.test.tsx
- `checklist-workflow.integration.test.tsx` - KEEP (integration-specific)
- `TradeShowChecklist.test.tsx` - KEEP (main component)

**Decision:** Keep `checklist-defensive.test.tsx` separate for now (defensive checks are important)

### 6. EventSetup Tests - Review

**Frontend:**
- `ChecklistLoading.test.tsx` - KEEP (specific feature)
- `ChecklistSummary.test.tsx` - KEEP (component-specific)
- `EventDetailsModal.test.tsx` - KEEP (component-specific)
- `BoothMapImage.test.tsx` - Review consolidation

**Decision:** Keep separate - they test different components

### 7. Other Files - Review

**Backend:**
- `checklist-validation.test.ts` - KEEP (validation-specific)
- `mime-validation.test.ts` - KEEP (validation-specific)
- `cors-api.test.ts` - KEEP (API-specific)
- `database-schema.test.ts` - KEEP (schema validation)
- `migration-023.test.ts` - KEEP (migration-specific)

**Frontend:**
- `api.checklist.test.ts` - KEEP (API-specific)
- `apiClient.cors.test.ts` - KEEP (CORS-specific)
- `EventDropdown.test.tsx` - KEEP (component-specific)
- `ReceiptFiltering.test.tsx` - KEEP (feature-specific)

## Summary

### Files to Delete (9 files):
1. ✅ `backend/tests/integration/pdf-download.test.ts` (already deleted)
2. `backend/tests/integration/pdf-consolidation.test.ts`
3. `backend/tests/integration/pdf-content-updates.test.ts`
4. `backend/tests/integration/pdf-layout-optimization.test.ts`
5. `backend/tests/integration/pdf-download-fix.test.ts`
6. `backend/tests/integration/pdf-download-security-blank-page.test.ts`
7. `src/utils/__tests__/api.pdf-download-debugging.test.ts`
8. `src/components/checklist/__tests__/ReceiptsViewerModal.closure.test.tsx`
9. `src/components/checklist/__tests__/ReceiptsViewerModal.expense-details.test.tsx`
10. `src/components/checklist/__tests__/ReceiptsViewerModal.integration.test.tsx`

### Files to Consolidate Into:
- `backend/tests/integration/pdf-generation.test.ts` - Add 5 describe blocks
- `src/utils/__tests__/api.pdf-download.test.ts` - Add debugging describe block
- `src/components/checklist/__tests__/ReceiptsViewerModal.test.tsx` - Add 3 describe blocks

### Expected Results:
- **Before:** 48 test files
- **After:** 39 test files
- **Reduction:** 9 files deleted, tests consolidated

## Next Steps

1. Consolidate backend PDF tests into pdf-generation.test.ts
2. Consolidate frontend PDF tests into api.pdf-download.test.ts
3. Consolidate ReceiptsViewerModal tests into ReceiptsViewerModal.test.tsx
4. Delete consolidated files
5. Run all tests to verify
6. Update TESTING_STRATEGY.md


