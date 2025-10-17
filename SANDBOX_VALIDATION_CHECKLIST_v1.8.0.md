# 🔍 SANDBOX VALIDATION CHECKLIST - v1.8.0
## OCR + Ollama Lite Integration Pre-Test Validation

**Branch:** v1.6.0  
**Target Environment:** Sandbox Only (Container 203)  
**Validation Date:** October 16, 2025  
**Status:** 🟡 LOCAL VERIFICATION COMPLETE - CONTAINER TESTING REQUIRED

---

## ✅ SECTION 1: Environment and Container Validation

### Local Code Verification ✅
- [x] **Branch Confirmed:** `v1.6.0`
- [x] **Frontend Version:** `1.8.0`
- [x] **Backend Version:** `1.8.0`
- [x] **Service Worker Version:** `1.8.0`

### Sandbox Configuration ✅
- [x] **Environment Template Verified:** `backend/env.sandbox.template`
  - `NODE_ENV=development`
  - `DB_HOST=localhost`
  - `DB_NAME=expenseapp_sandbox`
  - `DB_USER=expenseapp_sandbox`
  - `OLLAMA_API_URL=http://192.168.1.173:11434`
  - `OLLAMA_MODEL=dolphin-llama3`
  - `OLLAMA_TEMPERATURE=0.1`
  - `OLLAMA_TIMEOUT=30000`

### Database Migrations ✅
- [x] **Total Migrations:** 11 files present
- [x] **OCR Corrections Table:** `006_create_ocr_corrections_table.sql` (2.7KB)
- [x] **Cross-Environment Enhancement:** `007_enhance_ocr_corrections_for_cross_environment.sql` (3.5KB)
- [x] **Status Fix:** `fix_needs_further_review_status.sql` (1.5KB)

### Container Status ⏳ REQUIRES SSH ACCESS
- [ ] **Container 203 (Sandbox Combined):** Status unknown - SSH timeout
- [ ] **Container 302 (Ollama Lite):** Status unknown - SSH timeout
- [ ] **Production Isolation:** Cannot verify containers 201/202 not modified
- [ ] **Network Connectivity:** Cannot test 203 → 302 connectivity

**Action Required:** SSH access from deployment machine to verify container status.

---

## ⏳ SECTION 2: Ollama Lite Health Check (Container 302)

### Cannot Verify Without SSH Access
- [ ] Container 302 running status
- [ ] CPU-only mode configuration
- [ ] `dolphin-llama3:latest` model availability
- [ ] Sample inference request test
- [ ] Ollama service logs review
- [ ] Backend→Ollama connectivity from container 203

**Action Required:** SSH into container 302 to run:
```bash
# Check Ollama service
systemctl status ollama

# Test model availability
curl http://localhost:11434/api/tags

# Test inference
curl http://localhost:11434/api/generate -d '{
  "model": "dolphin-llama3",
  "prompt": "Extract merchant name from: STARBUCKS #1234",
  "stream": false
}'
```

---

## ✅ SECTION 3: OCR (PaddleOCR) System Validation

### Code Structure Verified ✅
- [x] **PaddleOCR Provider:** `backend/src/services/ocr/providers/PaddleOCRProvider.ts`
- [x] **Tesseract Provider:** `backend/src/services/ocr/providers/TesseractProvider.ts`
- [x] **Python Script:** `backend/src/services/ocr/paddleocr_processor.py` (188 lines)
- [x] **Main OCR Service:** `backend/src/services/ocr/OCRService.ts`

### Python Dependencies ✅
- [x] **Requirements File:** `backend/requirements.txt` exists
  - paddleocr>=2.7.0
  - paddlepaddle>=2.5.0
  - opencv-python>=4.8.0
  - numpy, Pillow

### Preprocessing Features ✅ (Code Review)
- [x] Deskewing implemented in `paddleocr_processor.py`
- [x] Contrast enhancement implemented
- [x] Noise reduction implemented
- [x] Confidence scores returned

### Deployment Verification ⏳
- [ ] **Python dependencies installed on container 203**
- [ ] **PaddleOCR script executable**
- [ ] **Test receipt processing**
- [ ] **Fallback to Tesseract tested**

**Action Required:** On container 203:
```bash
# Check Python dependencies
python3 -c "import paddleocr; print('PaddleOCR OK')"

# Test OCR script
python3 /opt/expenseApp/backend/src/services/ocr/paddleocr_processor.py /path/to/test-receipt.jpg
```

---

## ✅ SECTION 4: LLM Integration Accuracy

### Code Implementation Verified ✅
- [x] **LLM Provider Interface:** `backend/src/services/ocr/inference/LLMProvider.ts`
  - `OpenAIProvider` (placeholder)
  - `ClaudeProvider` (placeholder)
  - `LocalLLMProvider` (Ollama - FULLY IMPLEMENTED)
- [x] **Rule-Based Engine:** `backend/src/services/ocr/inference/RuleBasedInferenceEngine.ts`
- [x] **OCR Service Integration:** Ollama enabled in `OCRService.ts` (line 297)

### LLM Configuration ✅
```typescript
llmProvider: 'ollama',
confidenceThreshold: 0.6,
enableUserCorrections: true,
logOCRResults: true
```

### Low-Confidence Field Handling ✅ (Code Review)
- [x] `findLowConfidenceFields()` method implemented
- [x] `mergeLLMEnhancements()` logic implemented
- [x] Fallback mechanism for LLM unavailability
- [x] Confidence-based prioritization

### Runtime Testing Required ⏳
- [ ] **Low-confidence fields trigger LLM calls**
- [ ] **Ollama JSON response parsing**
- [ ] **Field merging logic works correctly**
- [ ] **Fallback activates on Ollama errors**
- [ ] **Timeout handling (30s)**

**Action Required:** Process test receipts with varying OCR confidence and verify LLM enhancement in logs.

---

## ✅ SECTION 5: User Correction Capture

### Backend Implementation Verified ✅
- [x] **User Correction Service:** `backend/src/services/ocr/UserCorrectionService.ts`
- [x] **Database Schema:** Migration `007` includes all required columns:
  - `environment` (sandbox/production tagging)
  - `llm_model_version`
  - `corrected_merchant`, `corrected_amount`, `corrected_date`, `corrected_category`, `corrected_card_last_four`
  - `fields_corrected` (array)
  - `correction_notes`
  - `data_quality_score`
  - `used_in_training`, `synced_to_training`

### API Endpoints Verified ✅
- [x] **POST /api/ocr/v2/corrections** (store correction)
- [x] **GET /api/ocr/v2/corrections/stats** (admin/dev only)
- [x] **GET /api/ocr/v2/corrections/export** (admin/dev only)

### Frontend Integration Verified ✅
- [x] **Utility Functions:** `src/utils/ocrCorrections.ts`
  - `sendOCRCorrection()`
  - `detectCorrections()`
- [x] **ExpenseSubmission Integration:** Lines 20, 128-145
- [x] **ReceiptUpload Integration:** OCR v2 API call implemented

### Runtime Testing Required ⏳
- [ ] **Submit expense with OCR data**
- [ ] **Modify OCR-suggested fields**
- [ ] **Verify correction stored in database**
- [ ] **Check environment tag = 'sandbox'**
- [ ] **Verify fields_corrected array populated**
- [ ] **Test retrieval by admin role**

**Action Required:** Full UI workflow test with actual receipt upload and manual corrections.

---

## ✅ SECTION 6: Cross-Environment Feedback Pipeline

### Implementation Verified ✅
- [x] **Sync Service:** `backend/src/services/ocr/CrossEnvironmentSyncService.ts`
  - `exportToTrainingDataset()`
  - `getSyncReport()`
  - `markDatasetUsed()`
  - `anonymizeCorrections()`
- [x] **API Routes:** `backend/src/routes/trainingSync.ts`
  - POST `/api/training/sync/export`
  - GET `/api/training/sync/report`
  - GET `/api/training/sync/dataset/:datasetId`
  - POST `/api/training/sync/mark-used/:datasetId`
  - POST `/api/training/sync/anonymize`
- [x] **Database Views:** Migration `007` creates:
  - `ocr_training_ready_corrections`
  - `ocr_correction_stats_by_env`

### Export Format ✅ (Code Review)
- [x] **JSONL format** for ML training
- [x] **Dataset versioning** with UUID
- [x] **Environment tagging** preserved
- [x] **Quality score filtering** (>= 0.7)

### Testing Required ⏳
- [ ] **Export corrections from sandbox**
- [ ] **Verify JSONL file format**
- [ ] **Check anonymization logic**
- [ ] **Test sync report API**
- [ ] **Verify dataset retrieval**

**Action Required:** Generate test dataset and verify ETL pipeline.

---

## ✅ SECTION 7: UI and Workflow Testing

### Frontend Components Verified ✅
- [x] **ReceiptUpload.tsx:** Updated to call `/api/ocr/v2/process`
- [x] **OCR v2 Response Handling:**
  - Confidence badges
  - Category suggestions
  - Review warnings
  - Low-confidence field highlighting
- [x] **ExpenseSubmission.tsx:**
  - OCR v2 data capture
  - Correction detection
  - Correction submission

### Types Updated ✅
- [x] **ReceiptData interface** includes `ocrV2Data`
- [x] Confidence scores
- [x] Category suggestions
- [x] Review flags

### Runtime Testing Required ⏳
- [ ] **Upload receipt → verify OCR v2 processing**
- [ ] **Check confidence badges display**
- [ ] **Verify category suggestions shown**
- [ ] **Test low-confidence field highlighting**
- [ ] **Submit expense → verify workflow**
- [ ] **Test approval process unchanged**
- [ ] **Test entity assignment unchanged**
- [ ] **Test Zoho push unchanged**

**Action Required:** Full E2E workflow test in sandbox UI.

---

## ✅ SECTION 8: Performance & Diagnostics

### Code Instrumentation Verified ✅
- [x] **Processing time tracking** in OCRService
- [x] **Confidence logging** throughout pipeline
- [x] **Error logging** in all services
- [x] **LLM call timeouts** (30s configured)

### Testing Required ⏳
- [ ] **Measure OCR + LLM latency**
- [ ] **Check container 203 CPU usage**
- [ ] **Check container 302 CPU/memory**
- [ ] **Inspect backend logs** for errors
- [ ] **Verify no cross-environment DB queries**
- [ ] **Test under load** (multiple receipts)

**Action Required:** Performance benchmarking with Dev Dashboard metrics.

---

## ✅ SECTION 9: Documentation Verification

### Documentation Files Present ✅
- [x] **AI_MASTER_GUIDE.md:** 4,800 lines, updated with v1.8.0 section
- [x] **OCR README.md:** `backend/src/services/ocr/README.md` (110+ lines added for v1.8.0)
- [x] **OLLAMA_SETUP.md:** `backend/src/services/ocr/OLLAMA_SETUP.md`
- [x] **OCR_AUDIT_REPORT.md:** `docs/OCR_AUDIT_REPORT.md`

### Documentation Content Verified ✅
- [x] **v1.8.0 Architecture** fully documented
- [x] **All 4 key components** (frontend, database, sync, API) covered
- [x] **Configuration guide** with env vars
- [x] **Usage examples** with curl commands
- [x] **Continuous learning workflow** (5 phases)
- [x] **Privacy & security** considerations
- [x] **Testing procedures** documented
- [x] **Performance considerations** documented
- [x] **Troubleshooting guide** (3 common issues)
- [x] **Future enhancements** (v1.9.0 roadmap)
- [x] **Lessons learned** section

### Version Consistency ✅
- [x] All version numbers match: `1.8.0`
- [x] Service worker cache name updated
- [x] CHANGELOG.md up to date

---

## ⏳ SECTION 10: Final Sandbox Sign-Off

### Pre-Deployment Checks ✅
- [x] **TypeScript compilation:** No errors
- [x] **All files present:** Verified
- [x] **Git status:** Clean on branch v1.6.0
- [x] **Documentation:** Complete and updated
- [x] **Version numbers:** Consistent (1.8.0)

### Deployment Ready ⏳
- [ ] **Backend deployed to container 203**
- [ ] **Frontend deployed to container 203**
- [ ] **Database migrations run**
- [ ] **Environment variables set**
- [ ] **Service restarted**
- [ ] **Nginx cache cleared**

### Testing Required ⏳
- [ ] **Upload 5+ diverse receipts**
- [ ] **Verify OCR accuracy improvements**
- [ ] **Check LLM enhancements logged**
- [ ] **Confirm user corrections captured**
- [ ] **Review error logs**
- [ ] **Verify Dev Dashboard metrics**
- [ ] **Compare to baseline Tesseract performance**

---

## 🚨 CRITICAL REMINDERS

### ⛔ Production Isolation
- **NEVER** access containers 201 or 202
- **NEVER** modify production database
- **ALL** testing in sandbox (203) only
- Verify environment variable `NODE_ENV=development`

### 📁 Deployment Paths (CRITICAL!)
- **Backend:** `/opt/expenseApp/backend/` (capital 'A')
- **Frontend:** `/var/www/expenseapp/current/` (lowercase 'a')
- **Nginx Config:** Check proxy to correct backend port

### 🔧 Common Issues
1. **404 on new routes:** Verify `node_modules` in correct path
2. **Ollama timeout:** Check container 302 network accessibility
3. **Python errors:** Verify PaddleOCR dependencies installed
4. **Database errors:** Run migrations 006 and 007

---

## 📊 VALIDATION SUMMARY

| Section | Local Verification | Container Testing | Status |
|---------|-------------------|-------------------|--------|
| 1. Environment & Config | ✅ Complete | ⏳ Required | 🟡 Partial |
| 2. Ollama Health | N/A | ⏳ Required | 🔴 Blocked |
| 3. OCR System | ✅ Code OK | ⏳ Required | 🟡 Partial |
| 4. LLM Integration | ✅ Code OK | ⏳ Required | 🟡 Partial |
| 5. User Corrections | ✅ Complete | ⏳ Required | 🟡 Partial |
| 6. Feedback Pipeline | ✅ Complete | ⏳ Required | 🟡 Partial |
| 7. UI Workflow | ✅ Code OK | ⏳ Required | 🟡 Partial |
| 8. Performance | ✅ Instrumented | ⏳ Required | 🟡 Partial |
| 9. Documentation | ✅ Complete | N/A | 🟢 Complete |
| 10. Final Sign-Off | ✅ Pre-checks OK | ⏳ Required | 🟡 Partial |

**Overall Status:** 🟡 **LOCAL VERIFICATION COMPLETE - READY FOR CONTAINER DEPLOYMENT AND TESTING**

---

## 🎯 NEXT STEPS

### Immediate Actions (On Deployment Machine with SSH Access)
1. Deploy backend to container 203:
   ```bash
   cd /Users/sahilkhatri/Projects/Haute/expenseApp
   ./deploy-sandbox.sh
   ```

2. SSH into container 203 and verify:
   ```bash
   ssh root@192.168.1.144
   pct enter 203
   
   # Check backend service
   systemctl status expenseapp-backend
   
   # Check Python OCR dependencies
   python3 -c "import paddleocr; print('OK')"
   
   # Run database migrations
   cd /opt/expenseApp/backend
   npm run migrate
   
   # Test Ollama connectivity
   curl http://192.168.1.173:11434/api/tags
   ```

3. SSH into container 302 (Ollama):
   ```bash
   pct enter 302
   systemctl status ollama
   ollama list
   ```

4. Run E2E tests in sandbox UI:
   - Upload receipts
   - Verify OCR + LLM workflow
   - Submit expenses with corrections
   - Check database for stored corrections

5. Generate validation report with actual metrics

---

**Validation Completed By:** AI Agent  
**Review Required By:** Human Developer  
**Approval Required Before:** Production Deployment

