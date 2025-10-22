# 🏗️ OCR Data Pool & Training Service Architecture
**Version:** 2.0.0  
**Date:** October 22, 2025  
**Status:** 🚧 Implementation in Progress

---

## 📋 Executive Summary

This document outlines the evolution of the ExpenseApp OCR training system from a monolithic, per-app solution to a **distributed microservices architecture** with centralized data collection, continuous training, and enterprise-grade deployment strategies.

### Key Enhancements

1. **Centralized Data Pool** - Single source of truth for OCR corrections across all apps/environments
2. **Training Service** - Dedicated microservice for model retraining and prompt generation
3. **Global Pattern Cache** - Shared 24-hour cache with versioning and rollback
4. **Canary & Blue-Green Deployments** - Safe rollout of model/prompt updates
5. **RBAC & Audit Logging** - Enterprise security and compliance
6. **Observability** - Monitoring, metrics, and alerting

---

## 🎯 Current Architecture (v1.13.1)

### Components

```
┌──────────────────────────────────────────────────────────────┐
│  ExpenseApp Backend (Container 203 - Sandbox)                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  AdaptiveInferenceEngine                               │  │
│  │  - Loads patterns from DB every 24h                    │  │
│  │  - Pattern detection threshold: 3+ corrections         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  UserCorrectionService                                 │  │
│  │  - Stores corrections to ocr_corrections table         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CrossEnvironmentSyncService                           │  │
│  │  - Exports corrections to JSONL files                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ModelRetrainingService                                │  │
│  │  - Analyzes corrections and generates prompts          │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                   │  │
│  │  - ocr_corrections table                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  OCR Service (Container 204 - 192.168.1.195)                 │
│  - Tesseract OCR processing                                  │
│  - 8-step preprocessing pipeline                             │
└──────────────────────────────────────────────────────────────┘
```

### Limitations

- ❌ Each app instance has its own isolated corrections database
- ❌ No centralized learning across sandbox/production/other apps
- ❌ Manual export required for training data sync
- ❌ Pattern cache lives in memory (lost on restart)
- ❌ No versioning or rollback capability
- ❌ No canary/blue-green deployment support
- ❌ Limited observability and monitoring

---

## 🚀 Target Architecture (v2.0.0)

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      App Layer (Multiple Environments)                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│  │  Production   │  │   Sandbox     │  │  Future Apps  │                  │
│  │  (201/202)    │  │    (203)      │  │               │                  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                  │
│          │                  │                  │                            │
│          └──────────────────┴──────────────────┘                            │
│                             │                                               │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │ REST API (HTTP POST/GET)
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                  OCR Data Pool Service (Container 205)                      │
│                        IP: 192.168.1.196:5000                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  API Layer (FastAPI)                                               │    │
│  │  - POST /corrections/ingest      → Store new correction            │    │
│  │  - GET  /corrections/export      → Export training data            │    │
│  │  - GET  /patterns/global         → Retrieve current patterns       │    │
│  │  - POST /patterns/refresh        → Force cache refresh             │    │
│  │  - GET  /patterns/version/{v}    → Get specific version            │    │
│  │  - POST /patterns/rollback/{v}   → Rollback to version             │    │
│  │  - GET  /audit/log               → Audit trail                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Data Normalization Layer                                          │    │
│  │  - Field canonicalization (merchant, category, dates, currency)    │    │
│  │  - PII masking (user_id tokenization, image path hashing)          │    │
│  │  - Quality scoring (confidence weighting, outlier detection)       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Pattern Cache Manager                                             │    │
│  │  - Global cache (shared across all apps)                           │    │
│  │  - 24-hour scheduled refresh                                       │    │
│  │  - Versioning (v1, v2, v3...)                                     │    │
│  │  - Rollback capability                                             │    │
│  │  - Redis backend for distributed cache                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Database                                               │    │
│  │  - corrections_master (canonical corrections)                      │    │
│  │  - pattern_cache_versions (versioned cache states)                 │    │
│  │  - audit_log (all access/modifications)                            │    │
│  │  - training_datasets (exported dataset metadata)                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  RBAC & Security                                                   │    │
│  │  - API key authentication                                          │    │
│  │  - Role-based permissions (app, admin, training_service)           │    │
│  │  - TLS encryption                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                              │ Webhook / API calls
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│               Training Service (Container 206)                              │
│                        IP: 192.168.1.197:6000                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Continuous Training Pipeline                                      │    │
│  │  - Scheduled retraining jobs (daily/weekly)                        │    │
│  │  - Pattern analysis and confidence scoring                         │    │
│  │  - LLM prompt generation and refinement                            │    │
│  │  - Model validation and A/B testing                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Deployment Manager                                                │    │
│  │  - Canary deployment (5% → 20% → 50% → 100%)                     │    │
│  │  - Blue-green switching                                            │    │
│  │  - Automatic rollback on error rate increase                       │    │
│  │  - Deployment approval workflow                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Model/Prompt Store                                                │    │
│  │  - Versioned prompts (JSON templates)                              │    │
│  │  - Inference rules (regex patterns, thresholds)                    │    │
│  │  - Performance metrics per version                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Monitoring & Alerting                                             │    │
│  │  - Training job status                                             │    │
│  │  - Deployment health checks                                        │    │
│  │  - Accuracy trend analysis                                         │    │
│  │  - Alert on regression (Prometheus + Grafana)                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OCR Service (Container 204)                             │
│                        IP: 192.168.1.195:8000                               │
│  - Tesseract OCR processing                                                 │
│  - Pulls latest patterns from Data Pool on startup                          │
│  - Sends processing metrics to Training Service                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Data Pool Service (Container 205)

```sql
--
-- Main corrections table (canonical, normalized)
--
CREATE TABLE corrections_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_app VARCHAR(50) NOT NULL,           -- 'expenseapp', 'future_app'
    source_environment VARCHAR(20) NOT NULL,   -- 'production', 'sandbox'
    source_correction_id UUID,                 -- Original ID from source app
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id_hash VARCHAR(64) NOT NULL,        -- SHA256 hash of user_id (PII masked)
    
    -- OCR data
    ocr_provider VARCHAR(20) NOT NULL,         -- 'tesseract', 'easyocr'
    ocr_text TEXT NOT NULL,
    ocr_confidence DECIMAL(4,3),
    
    -- Original inference
    original_inference JSONB NOT NULL,
    
    -- Corrected fields (normalized)
    corrected_merchant VARCHAR(200),
    corrected_amount DECIMAL(10,2),
    corrected_date DATE,
    corrected_category VARCHAR(100),
    corrected_card_last_four VARCHAR(4),
    
    -- Array of fields that were corrected
    fields_corrected TEXT[] NOT NULL,
    
    -- Quality metrics
    data_quality_score DECIMAL(3,2),           -- 0.00 to 1.00
    is_outlier BOOLEAN DEFAULT FALSE,
    outlier_reason TEXT,
    
    -- Training usage
    used_in_training BOOLEAN DEFAULT FALSE,
    training_dataset_id VARCHAR(50),
    training_run_version VARCHAR(20),
    
    -- Model/prompt version at time of correction
    model_version VARCHAR(20),
    prompt_version VARCHAR(20),
    
    -- Audit
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_source_app_env (source_app, source_environment),
    INDEX idx_created_at (created_at),
    INDEX idx_fields_corrected USING GIN (fields_corrected),
    INDEX idx_merchant (corrected_merchant),
    INDEX idx_used_in_training (used_in_training),
    INDEX idx_quality_score (data_quality_score)
);

--
-- Pattern cache versions
--
CREATE TABLE pattern_cache_versions (
    version_id SERIAL PRIMARY KEY,
    version_name VARCHAR(20) NOT NULL UNIQUE,  -- 'v1', 'v2', 'v3'...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pattern data
    pattern_data JSONB NOT NULL,              -- Full pattern set
    pattern_count INTEGER NOT NULL,
    
    -- Metrics
    based_on_corrections_count INTEGER,
    avg_pattern_confidence DECIMAL(4,3),
    
    -- Deployment status
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    
    -- Rollback info
    replaced_by_version INTEGER REFERENCES pattern_cache_versions(version_id),
    rollback_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);

--
-- Training datasets (metadata for exported datasets)
--
CREATE TABLE training_datasets (
    dataset_id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Dataset info
    correction_count INTEGER NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    
    -- Filters applied
    min_quality_score DECIMAL(3,2),
    included_environments TEXT[],
    included_apps TEXT[],
    
    -- Export info
    export_format VARCHAR(10),               -- 'jsonl', 'csv', 'parquet'
    file_path TEXT,
    file_size_bytes BIGINT,
    
    -- Training usage
    used_in_training_run VARCHAR(50),
    resulted_in_version VARCHAR(20),
    
    INDEX idx_created_at (created_at)
);

--
-- Audit log
--
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Who/What/Where
    actor_type VARCHAR(20) NOT NULL,          -- 'user', 'service', 'system'
    actor_id VARCHAR(100) NOT NULL,           -- API key, user ID, service name
    action VARCHAR(50) NOT NULL,              -- 'ingest', 'export', 'refresh', 'rollback'
    resource_type VARCHAR(50) NOT NULL,       -- 'correction', 'pattern', 'dataset'
    resource_id VARCHAR(100),
    
    -- Details
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_actor (actor_type, actor_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id)
);

--
-- API keys (for RBAC)
--
CREATE TABLE api_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,     -- SHA256 of API key
    
    -- Identity
    app_name VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    
    -- Permissions
    role VARCHAR(20) NOT NULL,                -- 'app', 'admin', 'training_service'
    permissions JSONB NOT NULL,               -- Detailed permissions
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by VARCHAR(100),
    notes TEXT,
    
    INDEX idx_key_hash (key_hash),
    INDEX idx_active (is_active)
);
```

### Training Service (Container 206)

```sql
--
-- Training runs
--
CREATE TABLE training_runs (
    run_id VARCHAR(50) PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    dataset_id VARCHAR(50) REFERENCES training_datasets(dataset_id),
    corrections_since DATE NOT NULL,
    min_frequency INTEGER DEFAULT 3,
    
    -- Status
    status VARCHAR(20) NOT NULL,              -- 'pending', 'running', 'completed', 'failed'
    progress_pct INTEGER DEFAULT 0,
    
    -- Results
    patterns_generated INTEGER,
    prompt_version_created VARCHAR(20),
    model_version_created VARCHAR(20),
    
    -- Metrics
    validation_accuracy JSONB,                -- Per-field accuracy
    improvement_over_previous DECIMAL(5,2),   -- Percentage points
    
    -- Deployment
    deployment_status VARCHAR(20),            -- 'pending', 'canary', 'blue-green', 'deployed', 'rolled_back'
    deployment_started_at TIMESTAMP WITH TIME ZONE,
    deployment_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    stack_trace TEXT,
    
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

--
-- Deployment history
--
CREATE TABLE deployments (
    deployment_id SERIAL PRIMARY KEY,
    training_run_id VARCHAR(50) REFERENCES training_runs(run_id),
    
    -- Version info
    version_name VARCHAR(20) NOT NULL,
    deployment_type VARCHAR(20) NOT NULL,     -- 'canary', 'blue-green', 'full'
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Canary details
    canary_percentage INTEGER,                -- 5, 20, 50, 100
    canary_target_apps TEXT[],
    
    -- Blue-green details
    blue_version VARCHAR(20),
    green_version VARCHAR(20),
    active_slot VARCHAR(10),                  -- 'blue', 'green'
    
    -- Health metrics
    success_rate DECIMAL(5,2),
    error_rate DECIMAL(5,2),
    avg_confidence DECIMAL(4,3),
    rollback_triggered BOOLEAN DEFAULT FALSE,
    rollback_reason TEXT,
    
    INDEX idx_started_at (started_at),
    INDEX idx_version (version_name)
);

--
-- Prompt versions
--
CREATE TABLE prompt_versions (
    version_id SERIAL PRIMARY KEY,
    version_name VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prompt templates
    merchant_prompt TEXT,
    category_prompt TEXT,
    amount_prompt TEXT,
    date_prompt TEXT,
    
    -- Metadata
    based_on_run_id VARCHAR(50) REFERENCES training_runs(run_id),
    improvement_notes TEXT,
    
    -- Deployment
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);
```

---

## 🔄 Data Flow

### 1. Correction Ingestion

```
User corrects field in ExpenseApp
         ↓
ExpenseApp calls Data Pool API:
  POST /corrections/ingest
  {
    "source_app": "expenseapp",
    "source_environment": "sandbox",
    "source_correction_id": "uuid",
    "user_id": "uuid",          ← Will be hashed by Data Pool
    "ocr_text": "...",
    "original_inference": {...},
    "corrected_fields": {...}
  }
         ↓
Data Pool:
  1. Hash user_id (PII masking)
  2. Normalize merchant/category/date
  3. Calculate quality score
  4. Store in corrections_master
  5. Log to audit_log
  6. Return success
```

### 2. Pattern Cache Refresh (24-hour cycle)

```
Scheduled job triggers at midnight
         ↓
Data Pool aggregates corrections:
  SELECT corrected_merchant, 
         original_inference->>'merchant',
         COUNT(*) as frequency
  FROM corrections_master
  WHERE created_at >= NOW() - INTERVAL '90 days'
    AND used_in_training = FALSE
  GROUP BY corrected_merchant, original_inference->>'merchant'
  HAVING COUNT(*) >= 3
         ↓
Generate patterns:
  {
    "merchant": [
      {
        "pattern": "/your ride|trip with/i",
        "corrected_value": "Uber",
        "confidence": 0.95,
        "frequency": 47,
        "last_seen": "2025-10-22T10:00:00Z"
      }
    ]
  }
         ↓
Save as new version:
  INSERT INTO pattern_cache_versions
  (version_name, pattern_data, pattern_count, is_active)
  VALUES ('v42', patterns_json, 127, true)
         ↓
Notify all apps (webhook):
  POST https://sandbox/api/ocr/v2/patterns/reload
```

### 3. Training Pipeline (Weekly)

```
Training Service schedules job
         ↓
Call Data Pool:
  GET /corrections/export?since=7d&min_quality=0.7
         ↓
Analyze corrections:
  - Identify common misreads
  - Generate improved prompts
  - Test against validation set
         ↓
Create new version:
  INSERT INTO prompt_versions
  (version_name, merchant_prompt, category_prompt, ...)
  VALUES ('v2.3.0', '...', '...', ...)
         ↓
Deploy with canary:
  1. Deploy to 5% of requests
  2. Monitor error rates for 1 hour
  3. If success_rate > 95%:
     → Expand to 20%, then 50%, then 100%
  4. If error_rate > 5%:
     → Automatic rollback to previous version
```

### 4. Blue-Green Deployment

```
New model version ready
         ↓
Current: BLUE (v2.2.0) serving 100% traffic
         ↓
Deploy to GREEN slot:
  - Install v2.3.0 on GREEN
  - Run health checks
  - Validate on synthetic data
         ↓
Switch traffic:
  BLUE (v2.2.0): 100% → 50% → 0%
  GREEN (v2.3.0): 0% → 50% → 100%
         ↓
Monitor for 24 hours
         ↓
If issues detected:
  → Instant switch back to BLUE
Else:
  → Mark BLUE as inactive
  → GREEN becomes new production
```

---

## 🔐 Security & RBAC

### API Key Roles

| Role | Permissions |
|------|-------------|
| `app` | - POST /corrections/ingest<br>- GET /patterns/global<br>- GET /patterns/version/{v} |
| `admin` | - All `app` permissions<br>- POST /patterns/refresh<br>- POST /patterns/rollback/{v}<br>- GET /audit/log<br>- POST /api-keys/create |
| `training_service` | - All `app` permissions<br>- GET /corrections/export<br>- POST /training/runs<br>- POST /deployments/canary<br>- POST /deployments/blue-green |

### Authentication Flow

```
Client sends request:
  Authorization: Bearer sk_live_abc123...
         ↓
Data Pool validates:
  1. Hash API key
  2. Lookup in api_keys table
  3. Check is_active = true
  4. Check expires_at > NOW()
  5. Verify role has required permission
         ↓
If valid:
  → Process request
  → Log to audit_log
Else:
  → Return 401 Unauthorized
```

### PII Masking

```python
def mask_pii(correction_data):
    # Hash user_id
    correction_data['user_id_hash'] = hashlib.sha256(
        correction_data['user_id'].encode()
    ).hexdigest()
    del correction_data['user_id']
    
    # Hash receipt image path (if present)
    if 'receipt_image_path' in correction_data:
        path_hash = hashlib.sha256(
            correction_data['receipt_image_path'].encode()
        ).hexdigest()[:16]
        correction_data['receipt_image_path_hash'] = path_hash
        del correction_data['receipt_image_path']
    
    # Tokenize expense_id
    if 'expense_id' in correction_data:
        correction_data['expense_id_token'] = f"exp_{uuid.uuid4().hex[:12]}"
        del correction_data['expense_id']
    
    return correction_data
```

---

## 📈 Monitoring & Observability

### Metrics to Track

**Data Pool:**
- Ingestion rate (corrections/hour)
- Pattern cache hit rate
- API latency (p50, p95, p99)
- Active API keys per role
- Audit log size

**Training Service:**
- Training run duration
- Pattern generation rate
- Deployment success rate
- Canary error rates
- Model accuracy trends

### Dashboards (Grafana)

1. **OCR System Health**
   - Total corrections collected
   - Corrections by app/environment
   - Corrections by field
   - Quality score distribution

2. **Training Pipeline**
   - Training runs (status, duration)
   - Pattern count over time
   - Accuracy improvements
   - Deployment timeline

3. **Pattern Cache**
   - Cache version history
   - Pattern count per version
   - Rollback frequency
   - Cache refresh duration

---

## 🚀 Deployment Strategy

### Phase 1: Data Pool Setup (Days 1-2)

1. Create LXC container 205 (data-pool)
2. Install PostgreSQL, Redis, FastAPI
3. Initialize database schema
4. Deploy Data Pool API
5. Create API keys for sandbox/production
6. Test ingestion endpoint

### Phase 2: Migration (Days 3-4)

1. Export existing corrections from sandbox (203)
2. Import into Data Pool with normalization
3. Update ExpenseApp to dual-write:
   - Local DB (existing)
   - Data Pool API (new)
4. Verify data sync

### Phase 3: Training Service (Days 5-7)

1. Create LXC container 206 (training-service)
2. Deploy Training Service
3. Implement continuous training pipeline
4. Test canary deployment flow
5. Test blue-green switching

### Phase 4: Integration (Days 8-9)

1. Update ExpenseApp to pull patterns from Data Pool
2. Remove local pattern caching
3. Implement webhook listeners
4. End-to-end testing

### Phase 5: Monitoring (Days 10-11)

1. Set up Prometheus exporters
2. Create Grafana dashboards
3. Configure alerts
4. Documentation

---

## 🎯 Success Criteria

- [ ] Data Pool ingests corrections from multiple apps
- [ ] 24-hour pattern refresh completes successfully
- [ ] Pattern versioning and rollback work
- [ ] Training pipeline runs automatically
- [ ] Canary deployment progresses safely
- [ ] Blue-green switching is instant (<1s downtime)
- [ ] All APIs authenticated and logged
- [ ] Monitoring dashboards show real-time data
- [ ] Documentation complete and accurate

---

## 📚 API Reference

See separate file: `OCR_DATA_POOL_API.md`

---

## 🔧 Operations Guide

See separate file: `OCR_DATA_POOL_OPS.md`

---

**Next Steps:**  
1. Review and approve architecture
2. Create LXC containers
3. Begin Phase 1 implementation


