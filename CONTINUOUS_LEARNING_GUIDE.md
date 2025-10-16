# Continuous Learning Pipeline - Complete Guide

**Branch:** v1.6.0 (Sandbox Only)  
**Status:** ✅ Fully Implemented  
**Date:** October 16, 2025

---

## 📋 Overview

The Continuous Learning Pipeline enables the expenseApp OCR system to automatically improve accuracy by learning from user corrections. This creates a feedback loop where every user correction makes the system smarter.

### Key Benefits

- ✅ **Automatic Improvement** - No manual prompt tuning required
- ✅ **Data-Driven** - Uses real user corrections to guide improvements
- ✅ **Version Control** - Track model versions with rollback support
- ✅ **Safe Deployment** - Validation before deployment, easy rollback
- ✅ **Transparent** - Full audit trail of improvements and their impact

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                   CONTINUOUS LEARNING CYCLE                  │
└─────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │ User Upload  │
   │   Receipt    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ OCR + LLM    │
   │  Inference   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ User Reviews │
   │ and Corrects │◄─── Corrections Stored
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────┐
   │ Pattern Analysis         │
   │ (Weekly/Monthly)         │
   │ - Common misreads        │
   │ - Category errors        │
   │ - Amount extraction bugs │
   └──────┬───────────────────┘
          │
          ▼
   ┌──────────────────────────┐
   │ Prompt Refinement        │
   │ - Add examples           │
   │ - Adjust thresholds      │
   │ - Update keywords        │
   └──────┬───────────────────┘
          │
          ▼
   ┌──────────────────────────┐
   │ Validation               │
   │ - Test on recent data    │
   │ - Calculate accuracy     │
   │ - Compare to baseline    │
   └──────┬───────────────────┘
          │
       Improved? ──YES──┐
          │              │
         NO              ▼
          │         Deploy New
          │          Version
          │              │
          └──────────────┘
                 │
                 ▼
           Next Cycle
```

---

## 🗄️ Database Schema

### ocr_corrections Table

```sql
CREATE TABLE ocr_corrections (
  id UUID PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Original OCR data
  ocr_provider VARCHAR(50),           -- 'paddleocr', 'tesseract'
  ocr_text TEXT,                      -- Raw OCR output
  ocr_confidence DECIMAL(3,2),        -- Overall confidence
  original_inference JSONB,           -- Full inference object
  
  -- User corrections
  corrected_merchant VARCHAR(255),
  corrected_amount DECIMAL(12,2),
  corrected_date VARCHAR(50),
  corrected_card_last_four VARCHAR(4),
  corrected_category VARCHAR(100),
  
  -- Metadata
  fields_corrected TEXT[],            -- e.g., ['merchant', 'category']
  correction_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
- `idx_ocr_corrections_user_id` - Query by user
- `idx_ocr_corrections_expense_id` - Query by expense
- `idx_ocr_corrections_created_at` - Time-based queries
- `idx_ocr_corrections_fields_corrected` - GIN index for array queries

---

## 📡 API Reference

### Learning Analytics API

Base: `/api/learning`  
Access: Admin, Developer only

#### GET /api/learning/stats

Get overall correction statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalCorrections": 127,
    "byField": [
      {
        "field": "merchant",
        "correctionCount": 45,
        "avgOcrConfidence": 0.68
      },
      {
        "field": "category",
        "correctionCount": 32,
        "avgOcrConfidence": 0.71
      }
    ],
    "timeSeries": [
      { "date": "2025-10-15", "corrections": 12 },
      { "date": "2025-10-14", "corrections": 8 }
    ],
    "topCorrectors": [
      { "name": "John Doe", "username": "jdoe", "corrections": 23 }
    ]
  }
}
```

#### GET /api/learning/patterns

Identify common correction patterns.

**Response:**
```json
{
  "success": true,
  "patterns": {
    "merchants": [
      {
        "original_merchant": "WALMAR",
        "corrected_merchant": "Walmart",
        "frequency": 15
      }
    ],
    "categories": [
      {
        "original_category": "Other",
        "corrected_category": "Meal and Entertainment",
        "frequency": 8
      }
    ],
    "amounts": [
      {
        "original_amount": "45.9",
        "corrected_amount": "45.99",
        "difference": 0.09,
        "frequency": 3
      }
    ]
  },
  "insights": {
    "merchantMisreads": 12,
    "categoryMisclassifications": 8,
    "amountErrors": 3
  }
}
```

#### GET /api/learning/training-data

Export corrections for model training.

**Query Parameters:**
- `since` - ISO date (optional)
- `limit` - Max examples (default: 1000)
- `format` - 'json' | 'jsonl' (default: 'jsonl')

**Response (JSONL):**
```jsonl
{"input":{"text":"WALMART...","originalInference":{...}},"output":{"merchant":"Walmart",...},"metadata":{...}}
{"input":{"text":"STARBUCKS...","originalInference":{...}},"output":{"category":"Meal and Entertainment",...},"metadata":{...}}
```

#### GET /api/learning/accuracy-metrics

Calculate accuracy trends over time.

**Query Parameters:**
- `days` - Lookback period (default: 30)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "accuracyTrend": [
      {
        "week": "2025-10-13",
        "total_corrections": 45,
        "unique_expenses": 42
      }
    ],
    "fieldAccuracy": [
      {
        "field": "merchant",
        "corrections": 15,
        "avgConfidence": 0.72,
        "estimatedAccuracy": 95.0
      }
    ]
  }
}
```

---

### Model Retraining API

Base: `/api/retraining`  
Access: Developer only

#### POST /api/retraining/start

Start a new retraining job.

**Request Body:**
```json
{
  "sinceDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "retrain-1729123456789",
    "status": "pending",
    "correctionsSince": "2025-09-16T00:00:00.000Z"
  },
  "message": "Retraining job started. This may take several minutes."
}
```

#### GET /api/retraining/jobs

List all retraining jobs.

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "retrain-1729123456789",
      "status": "completed",
      "startedAt": "2025-10-16T10:00:00Z",
      "completedAt": "2025-10-16T10:05:23Z",
      "newModelVersion": "1.0.3",
      "metrics": {
        "merchantAccuracy": 95.2,
        "amountAccuracy": 97.8,
        "categoryAccuracy": 88.5,
        "overallAccuracy": 93.8
      }
    }
  ]
}
```

#### GET /api/retraining/versions

List all model versions.

**Response:**
```json
{
  "success": true,
  "currentVersion": {
    "version": "1.0.2",
    "deployed": true,
    "createdAt": "2025-10-15T12:00:00Z",
    "performanceMetrics": {
      "overallAccuracy": 91.5
    }
  },
  "versions": [
    {
      "version": "1.0.2",
      "deployed": true,
      "basedOnCorrections": 45,
      "performanceMetrics": {...}
    },
    {
      "version": "1.0.1",
      "deployed": false,
      "basedOnCorrections": 32,
      "performanceMetrics": {...}
    }
  ]
}
```

#### POST /api/retraining/deploy/:version

Deploy a specific model version.

**Response:**
```json
{
  "success": true,
  "message": "Model version 1.0.3 deployed successfully",
  "version": "1.0.3"
}
```

#### POST /api/retraining/rollback

Rollback to previous version.

**Response:**
```json
{
  "success": true,
  "message": "Rolled back to previous version",
  "currentVersion": {
    "version": "1.0.1",
    "deployed": true
  }
}
```

---

## 🔧 Usage Examples

### Monitoring Corrections

```bash
# Get correction statistics
curl http://192.168.1.144/api/learning/stats \
  -H "Authorization: Bearer $TOKEN"

# Identify patterns
curl http://192.168.1.144/api/learning/patterns \
  -H "Authorization: Bearer $TOKEN"
```

### Running Retraining

```bash
# Start retraining with last 30 days of corrections
curl -X POST http://192.168.1.144/api/retraining/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sinceDays": 30}'

# Check job status
JOB_ID="retrain-1729123456789"
curl http://192.168.1.144/api/retraining/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Deploying New Version

```bash
# List available versions
curl http://192.168.1.144/api/retraining/versions \
  -H "Authorization: Bearer $TOKEN"

# Deploy version 1.0.3
curl -X POST http://192.168.1.144/api/retraining/deploy/1.0.3 \
  -H "Authorization: Bearer $TOKEN"

# If something goes wrong, rollback
curl -X POST http://192.168.1.144/api/retraining/rollback \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Retraining Process

### What Happens During Retraining?

1. **Analyze Corrections** (30 seconds)
   - Query corrections from last N days
   - Identify common patterns
   - Calculate field-specific error rates

2. **Create Prompt Improvements** (15 seconds)
   - Extract merchant misread examples
   - Find category keyword patterns
   - Identify amount extraction bugs
   - Generate new prompt examples

3. **Update Prompt Templates** (5 seconds)
   - Version-controlled prompt updates
   - Add correction-based examples
   - Adjust confidence thresholds

4. **Validate Improvements** (30 seconds)
   - Test on recent corrections
   - Calculate accuracy metrics
   - Compare to baseline

5. **Save Model Version** (5 seconds)
   - Store versioned model metadata
   - Record performance metrics
   - Mark as ready for deployment

**Total Time:** ~1-2 minutes per retraining job

### When to Retrain?

**Trigger Retraining When:**
- ✅ 50+ corrections accumulated
- ✅ Accuracy drops below 85%
- ✅ New receipt types appear frequently
- ✅ Weekly/monthly schedule

**Don't Retrain If:**
- ❌ < 20 corrections (insufficient data)
- ❌ Accuracy already > 95%
- ❌ Corrections are random (no patterns)

---

## 📊 Monitoring Dashboard

### Key Metrics to Track

1. **Correction Rate**
   - Total corrections / total OCR operations
   - Target: < 10%

2. **Field-Specific Accuracy**
   - Merchant: Target > 92%
   - Amount: Target > 95%
   - Date: Target > 90%
   - Category: Target > 85%

3. **Confidence Scores**
   - Average confidence when corrections needed
   - Use to adjust thresholds

4. **Improvement Trend**
   - Corrections decreasing over time?
   - Accuracy increasing?

### Grafana Dashboard (Future)

```yaml
# Example dashboard config
dashboard:
  title: "OCR Continuous Learning"
  panels:
    - title: "Correction Rate Over Time"
      query: "SELECT DATE(created_at), COUNT(*) FROM ocr_corrections GROUP BY DATE(created_at)"
    
    - title: "Field Accuracy"
      query: "SELECT field, 100 - (COUNT(*) / total * 100) as accuracy FROM ocr_corrections"
    
    - title: "Top Misread Merchants"
      query: "SELECT original_merchant, COUNT(*) FROM ocr_corrections WHERE field='merchant'"
```

---

## 🔒 Security & Safety

### Access Control

- **Learning Analytics**: Admin, Developer
- **Model Retraining**: Developer only
- **User Corrections**: All authenticated users

### Safety Mechanisms

1. **Version Control**
   - Every model change is versioned
   - Full audit trail
   - Easy rollback

2. **Validation Before Deployment**
   - Test on recent data
   - Require accuracy improvement
   - Manual approval for deployment

3. **Rollback Support**
   - One-click rollback to previous version
   - Automatic rollback on errors
   - Keep last 10 versions

4. **Sandbox Testing**
   - Test all improvements in sandbox first
   - Never deploy directly to production
   - Monitor for 24-48 hours before prod

---

## 🚀 Deployment Workflow

### Sandbox Deployment (Current)

1. **Monitor corrections** via `/api/learning/stats`
2. **Run retraining** when patterns emerge
3. **Validate results** in retraining job output
4. **Deploy new version** via `/api/retraining/deploy/:version`
5. **Monitor for 24 hours** - watch correction rate
6. **Rollback if needed** or keep and iterate

### Production Deployment (Future)

1. **Validate in sandbox** for 1 week minimum
2. **Get user feedback** on improvements
3. **Run A/B test** (50% old, 50% new)
4. **Gradual rollout** (10% → 50% → 100%)
5. **Monitor closely** for regressions
6. **Document changes** in changelog

---

## 📖 Best Practices

### For Developers

1. **Review patterns weekly** - Check `/api/learning/patterns`
2. **Retrain monthly minimum** - Even if accuracy is good
3. **Monitor correction rate** - Should decrease over time
4. **Version everything** - Never deploy unversioned changes
5. **Test in sandbox first** - Always validate before production

### For Users

1. **Correct all fields** - Even if just one is wrong
2. **Add notes** - Explain why correction was needed
3. **Be consistent** - Use same formatting for similar items
4. **Review confidence scores** - Low confidence = needs attention

### For Admins

1. **Monitor dashboard daily** - Watch for anomalies
2. **Review top correctors** - Thank active users
3. **Schedule retraining** - Weekly/monthly cadence
4. **Archive old versions** - Keep last 10, archive rest

---

## 🐛 Troubleshooting

### Retraining Job Stuck

**Problem:** Job status = 'running' for > 10 minutes

**Solution:**
```bash
# Check backend logs
journalctl -u expenseapp-backend -f | grep Retraining

# If stuck, restart backend
systemctl restart expenseapp-backend

# Job will resume or fail gracefully
```

### Accuracy Not Improving

**Problem:** Accuracy metrics not increasing after retraining

**Causes:**
1. Insufficient corrections (need 50+ for patterns)
2. Corrections are random (no patterns to learn)
3. OCR quality issue (need to fix upstream)

**Solutions:**
- Wait for more corrections
- Review patterns manually
- Improve image preprocessing
- Consider different OCR provider

### Rollback Not Working

**Problem:** Rollback completes but accuracy still poor

**Causes:**
- Previous version also had issues
- Need to go back 2+ versions

**Solution:**
```bash
# List versions
curl http://192.168.1.144/api/retraining/versions \
  -H "Authorization: Bearer $TOKEN"

# Deploy specific older version
curl -X POST http://192.168.1.144/api/retraining/deploy/1.0.0 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📈 Success Metrics

### Short-term (1 month)

- ✅ Correction rate decreases by 20%
- ✅ At least 2 retraining jobs completed
- ✅ Merchant accuracy > 90%
- ✅ User feedback positive

### Long-term (6 months)

- ✅ Correction rate < 5%
- ✅ All field accuracy > 90%
- ✅ Model versions 1.5.0+
- ✅ Zero rollbacks needed
- ✅ Users stop noticing OCR errors

---

## 🔮 Future Enhancements

1. **Automated A/B Testing**
   - Test new versions against baseline
   - Gradual rollout based on performance

2. **User Feedback Loop**
   - Rate LLM suggestions
   - Report false positives
   - Suggest improvements

3. **Multi-Model Ensemble**
   - Combine multiple LLMs
   - Voting system for ambiguous cases

4. **Fine-tuning Integration**
   - Export to fine-tuning format
   - Integrate with Ollama model creation
   - Custom models per category

5. **Real-time Monitoring**
   - Grafana dashboards
   - Alerts for accuracy drops
   - Automated retraining triggers

---

**Last Updated:** October 16, 2025  
**Branch:** v1.6.0 (Sandbox Only)  
**Status:** Ready for Testing

