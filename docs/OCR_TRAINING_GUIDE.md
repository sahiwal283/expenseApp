# 🎓 OCR AI Training System - Complete Guide

**Version:** 1.12.0  
**Last Updated:** October 21, 2025

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Training Pipeline](#training-pipeline)
4. [Monitoring & Analytics](#monitoring--analytics)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

The ExpenseApp uses a **hybrid AI system** that combines:

1. **Rule-Based Inference** - Pre-programmed patterns (merchants, categories, amounts)
2. **Adaptive Learning** - Automatically learns from user corrections
3. **LLM Enhancement** - Ollama validates low-confidence extractions

### **Key Features:**
- ✅ **Automatic Learning** - Improves accuracy without manual retraining
- ✅ **Real-Time Corrections** - Every user correction instantly stored
- ✅ **Pattern Detection** - Identifies common OCR misreads
- ✅ **Field Warnings** - Proactively warns about suspicious extractions
- ✅ **Historical Tracking** - Monitors accuracy trends over time

---

## 🔄 **How It Works**

### **Phase 1: Receipt Upload & OCR**
```
User uploads receipt
  ↓
Tesseract extracts text (92% avg confidence)
  ↓
8-step preprocessing:
  - DPI normalization (300 DPI)
  - Grayscale conversion
  - Border cropping
  - Bilateral denoising
  - Auto-deskewing
  - CLAHE contrast enhancement
  - Image sharpening
  - Otsu binarization
```

### **Phase 2: Field Inference**
```
OCR text
  ↓
AdaptiveInferenceEngine
  ├── RuleBasedInferenceEngine (base patterns)
  ├── Learned Patterns (from user corrections)
  └── Confidence scoring
  ↓
Extracted fields:
  - Merchant
  - Amount (with alternatives)
  - Date (normalized to YYYY-MM-DD)
  - Category
  - Location
  - Card last 4
  - Tax amount
  - Tip amount
```

### **Phase 3: Quality Assessment**
```
FieldWarningService analyzes extraction:
  ├── Merchant too long? (>50 chars)
  ├── Contains description keywords?
  ├── Multiple amounts detected?
  ├── Date in distant future/past?
  └── Low category confidence?
  ↓
Warnings displayed to user
```

### **Phase 4: User Correction**
```
User reviews & corrects fields
  ↓
On "Create Expense":
  - Compare original vs submitted
  - Detect which fields changed
  - Store correction in ocr_corrections table
  ↓
Correction record includes:
  - Original OCR text
  - Original inference
  - Corrected fields
  - Provider, confidence, environment
  - Timestamp, user ID
```

### **Phase 5: Automatic Retraining**
```
Every 24 hours:
AdaptiveInferenceEngine refreshes
  ↓
Query ocr_corrections table:
  - Find patterns with ≥3 occurrences
  - Generate regex patterns
  - Calculate learned confidence (based on frequency)
  ↓
Next OCR request:
  - Apply learned patterns
  - Override low-confidence base inferences
  - Log applied patterns
```

---

## 🔧 **Training Pipeline**

### **Automatic (Default)**
The system learns automatically - **no manual intervention needed!**

**What happens:**
1. User corrects "YOUR RIDE TO..." → "Uber" (3+ times)
2. System detects pattern: `/your ride|trip with|pickup/i` → "Uber"
3. Pattern applied automatically on next receipt
4. Confidence: 0.85 + (frequency × 0.02), max 0.98

### **Manual Analysis (Optional)**
For deeper insights, run the retraining script:

```bash
# Analyze last 30 days
cd backend
ts-node scripts/retrain_from_corrections.ts

# Analyze last 60 days
ts-node scripts/retrain_from_corrections.ts --days=60

# Minimum 5 corrections per pattern
ts-node scripts/retrain_from_corrections.ts --min-corrections=5
```

**Output:**
```
🤖 Active Learning: Analyzing User Corrections
============================================

📊 Analyzing corrections from the last 30 days...

✅ Found 47 correction patterns

============================================

🏪 Merchant Correction Patterns:

  Uber:
    Frequency: 15 corrections
    Common misreads: YOUR RIDE TO..., Trip with Richard, Pickup 7:14AM...

  Starbucks:
    Frequency: 8 corrections
    Common misreads: STARBUCKS COFFEE, STARBUCKS #1234...

📝 Suggested Updates to RuleBasedInferenceEngine.ts:
============================================

// Add to contextualMerchants array:
  // Uber - Detected from 15 user corrections
  { pattern: /your ride|trip with|pickup/i, name: 'Uber', confidence: 0.92 },
  // Starbucks - Detected from 8 user corrections
  { pattern: /starbucks coffee|starbucks #/i, name: 'Starbucks', confidence: 0.92 },
```

---

## 📊 **Monitoring & Analytics**

### **1. Training Statistics API**
```bash
# Get overall training stats
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/stats

# Response:
{
  "overall": {
    "total_corrections": 127,
    "unique_users": 8,
    "unique_expenses": 94,
    "first_correction": "2025-10-15T10:23:45Z",
    "last_correction": "2025-10-21T18:45:12Z"
  },
  "byField": [
    { "field": "merchant", "correction_count": 52 },
    { "field": "category", "correction_count": 38 },
    { "field": "amount", "correction_count": 24 },
    { "field": "date", "correction_count": 13 }
  ],
  "byProvider": [
    { "ocr_provider": "tesseract", "correction_count": 127 }
  ],
  "recentTrend": [
    { "date": "2025-10-21", "corrections": 15 },
    { "date": "2025-10-20", "corrections": 8 },
    ...
  ]
}
```

### **2. Learned Patterns API**
```bash
# View all learned patterns
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/patterns

# View merchant patterns only
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/patterns?field=merchant

# High-frequency patterns (≥5 corrections)
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/patterns?minFrequency=5

# Response:
{
  "success": true,
  "count": 12,
  "patterns": [
    {
      "field": "merchant",
      "pattern": {
        "original": "YOUR RIDE TO 3049 LAS VEGAS BLVD S ON JULY 22, 2025 AT 7:14 AM",
        "corrected": "Uber",
        "originalConfidence": 0.95
      },
      "frequency": 15,
      "lastSeen": "2025-10-21T18:43:37Z",
      "userCount": 4,
      "learnedConfidence": 0.95
    }
  ]
}
```

### **3. Historical Accuracy API**
```bash
# Get accuracy for all fields (last 30 days)
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/ocr/v2/accuracy

# Get accuracy for specific field
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/ocr/v2/accuracy?field=merchant&days=60

# Response:
{
  "field": "merchant",
  "daysBack": 30,
  "totalExtractions": 150,
  "correctionCount": 52,
  "accuracyRate": 65.3,
  "commonIssues": ["Long descriptions instead of merchant name"]
}
```

### **4. Export Training Data**
```bash
# Export as JSON
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/export > training_data.json

# Export as CSV (for Excel/ML tools)
curl -H "Authorization: Bearer $TOKEN" \
  "http://sandbox/api/training/export?format=csv" > training_data.csv

# Export last 60 days only
curl -H "Authorization: Bearer $TOKEN" \
  "http://sandbox/api/training/export?days=60" > recent_training_data.json
```

---

## 🔍 **API Reference**

### **Training Endpoints** (Admin/Developer only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/stats` | GET | Training statistics & trends |
| `/api/training/patterns` | GET | View learned patterns |
| `/api/training/export` | GET | Export training data (JSON/CSV) |
| `/api/training/refresh` | POST | Force pattern refresh |
| `/api/training/test` | POST | Test patterns on sample text |

### **OCR Endpoints** (Authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ocr/v2/process` | POST | Process receipt with OCR |
| `/api/ocr/v2/corrections` | POST | Submit user correction |
| `/api/ocr/v2/accuracy` | GET | Historical accuracy metrics |
| `/api/ocr/v2/corrections/stats` | GET | Correction statistics |
| `/api/ocr/v2/corrections/export` | GET | Export corrections for ML |

---

## ✅ **Best Practices**

### **1. Consistent Corrections**
- **DO:** Always correct to the actual merchant name (e.g., "Uber", not "Uber Technologies")
- **DO:** Use standard category names from the dropdown
- **DON'T:** Leave obvious mistakes uncorrected
- **DON'T:** "Correct" fields that are already accurate

### **2. Category Guidelines**
Use the most specific category:
- ✅ "Transportation - Uber / Lyft / Others" (not just "Transportation")
- ✅ "Accommodation - Hotel" (not "Other")
- ✅ "Meal and Entertainment" (includes coffee shops, restaurants)

### **3. Merchant Names**
- ✅ "Starbucks" (not "STARBUCKS COFFEE #12345")
- ✅ "Marriott" (not "Marriott Hotels & Resorts")
- ✅ "Uber" (not "YOUR RIDE TO...")

### **4. Amount Verification**
- Always verify it's the **total** (not subtotal, tax, or tip)
- Check for multiple amounts on receipt
- Look for "Total", "Grand Total", "Balance Due"

### **5. Date Accuracy**
- Verify year is correct (OCR often misreads 2024 vs 2025)
- Use transaction date, not print date
- Format: YYYY-MM-DD

---

## 🚨 **Troubleshooting**

### **Problem: Accuracy not improving**
**Possible causes:**
1. Not enough corrections (need ≥3 for a pattern)
2. Corrections are inconsistent (users correcting differently)
3. Patterns haven't refreshed (24-hour cycle)

**Solutions:**
```bash
# Check how many corrections exist
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/stats

# Force pattern refresh (developer only)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/refresh

# View current learned patterns
curl -H "Authorization: Bearer $TOKEN" \
  http://sandbox/api/training/patterns
```

### **Problem: Field warnings not showing**
**Check:**
1. Hard refresh browser (Cmd+Shift+R)
2. Clear service worker (DevTools → Application → Unregister)
3. Check backend logs for warnings

### **Problem: Corrections not being stored**
**Check:**
1. Look for console errors: `[OCR Correction] Failed to send`
2. Verify `ocr_corrections` table exists
3. Check user has valid auth token

---

## 🎯 **Success Metrics**

**Target Goals:**
- **Merchant Accuracy:** >85% (currently ~65%)
- **Amount Accuracy:** >95% (currently ~84%)
- **Date Accuracy:** >90% (currently ~91%)
- **Category Accuracy:** >70% (currently ~62%)

**Monitor monthly:**
```bash
# Run this on 1st of each month
ts-node scripts/retrain_from_corrections.ts --days=30 > monthly_report_$(date +%Y-%m).txt
```

---

## 📈 **Roadmap**

### **v1.13.0 - Enhanced Learning** (Next)
- [ ] Implement category pattern learning
- [ ] Add amount validation patterns
- [ ] Cross-merchant learning (similar patterns)
- [ ] Confidence decay (older patterns get lower confidence)

### **v1.14.0 - Advanced AI** (Future)
- [ ] Fine-tune Ollama on correction data
- [ ] Multi-provider ensemble (Tesseract + EasyOCR vote)
- [ ] OCR quality prediction (pre-process)
- [ ] Automatic pattern A/B testing

### **v2.0.0 - Production ML** (Long-term)
- [ ] Custom-trained OCR model for receipts
- [ ] End-to-end neural network (image → structured data)
- [ ] Active learning prompts (ask user for specific confirmations)
- [ ] Multi-language support

---

## 💡 **Tips for Developers**

### **Add custom patterns:**
Edit `/backend/src/services/ocr/inference/RuleBasedInferenceEngine.ts`:

```typescript
// Add to contextualMerchants array
{ pattern: /doordash|dasher/i, name: 'DoorDash', confidence: 0.92 },
{ pattern: /instacart|instacartshopper/i, name: 'Instacart', confidence: 0.92 },
```

### **Monitor learning in real-time:**
```bash
# Watch correction storage
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'tail -f /var/log/expenseapp/backend.log | grep OCR'"

# Check learned patterns
psql -U expenseapp -d expenseapp -c "SELECT * FROM ocr_corrections ORDER BY created_at DESC LIMIT 10;"
```

---

**Questions? Issues?**  
Check the [AI Master Guide](./AI_MASTER_GUIDE.md) or contact the development team.

