# 🔒 Environment Separation Guide & Safeguards

**Last Updated:** November 10, 2025  
**Purpose:** Prevent cross-environment misconfigurations that can cause production failures

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Differences](#environment-differences)
3. [Critical Environment Variables](#critical-environment-variables)
4. [Build Process](#build-process)
5. [Case Study: API URL Misconfiguration](#case-study-api-url-misconfiguration)
6. [Deployment Checklist](#deployment-checklist)
7. [Build-Time Validation](#build-time-validation)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**CRITICAL:** Production and Sandbox environments MUST be completely isolated. Any misconfiguration can cause:
- Production users unable to access the application
- Data corruption or loss
- Security vulnerabilities
- Service outages

**This guide prevents these issues by:**
- Documenting all environment differences
- Providing build-time validation
- Creating deployment checklists
- Documenting past failures

---

## Environment Differences

### Production Environment

**Location:** Proxmox LXC CT 2120 (frontend) & CT 2220 (backend)  
**URL:** https://argo.booute.duckdns.org  
**Internal:** CT 2120 (frontend, 192.168.1.139:80) / CT 2220 (backend, 192.168.1.201:3000)  
**Database:** `expense_app_production` (CT 2320)  
**Purpose:** Live users, real financial data  
**Version:** see CHANGELOG.md

**Key Characteristics:**
- ✅ Stable, tested code only
- ✅ Real financial data
- ✅ Production-grade security
- ✅ Embedded Tesseract OCR (no external OCR service)
- ✅ No experimental features

### Sandbox Environment

**Location:** Proxmox LXC CT 2600 (all-in-one)  
**URL:** http://<sandbox-host>  
**IP Address:** <sandbox-host>  
**Database:** `expense_app_sandbox` (CT 2600)  
**Purpose:** Testing, development, feature validation  
**Version:** see CHANGELOG.md

**Key Characteristics:**
- ✅ Latest features and experiments
- ✅ Test data only
- ✅ External OCR Service (192.168.1.195:8000)
- ✅ Data Pool Integration (192.168.1.196:5000)
- ✅ Model Training (192.168.1.197:5001)
- ✅ Ollama LLM (192.168.1.173:11434)

### Critical Separation Rules

1. **NEVER** build sandbox with production URLs
2. **NEVER** build production with sandbox URLs
3. **NEVER** use production credentials in sandbox
4. **NEVER** use sandbox credentials in production
5. **ALWAYS** validate environment before building
6. **ALWAYS** test in sandbox before production deployment

---

## Critical Environment Variables

### Frontend Environment Variables

#### `VITE_API_BASE_URL` (CRITICAL)

**Purpose:** Base URL for all API requests

**Production:**
```bash
VITE_API_BASE_URL=/api
# OR
VITE_API_BASE_URL=https://argo.booute.duckdns.org/api
```

**Sandbox:**
```bash
VITE_API_BASE_URL=http://<sandbox-host>/api
# OR
VITE_API_BASE_URL=/api
```

**⚠️ CRITICAL:** This is the MOST COMMON source of misconfiguration. If sandbox builds with production URL, it will try to connect to production API, causing authentication failures and data access issues.

#### `VITE_USE_SERVER` (Optional)

**Purpose:** Whether to use server-side API calls

**Default:** `true`  
**Both Environments:** Usually `true`

### Backend Environment Variables

#### `NODE_ENV`

**Production:**
```bash
NODE_ENV=production
```

**Sandbox:**
```bash
NODE_ENV=development
```

#### `DATABASE_URL` / `DB_*` Variables

**Production:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_app_production
DB_USER=expense_user
DB_PASSWORD=<production_password>
```

**Sandbox:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_app_sandbox
DB_USER=expense_user
DB_PASSWORD=<sandbox_password>
```

**⚠️ CRITICAL:** Database names MUST differ. Never use production database in sandbox.

#### `JWT_SECRET`

**Production:**
```bash
JWT_SECRET=<production_secret>
```

**Sandbox:**
```bash
JWT_SECRET=<sandbox_secret>
```

**⚠️ CRITICAL:** Secrets MUST differ. Using production secret in sandbox creates security vulnerabilities.

#### `CORS_ORIGIN`

**Production:**
```bash
CORS_ORIGIN=https://argo.booute.duckdns.org
```

**Sandbox:**
```bash
CORS_ORIGIN=http://<sandbox-host>,http://localhost:5173
```

#### OCR Service URLs (Sandbox Only)

**Sandbox:**
```bash
OCR_SERVICE_URL=http://192.168.1.195:8000
DATA_POOL_URL=http://192.168.1.196:5000
TRAINING_SERVICE_URL=http://192.168.1.197:5001
OLLAMA_API_URL=http://192.168.1.173:11434
```

**Production:**
```bash
# NOT SET - Production uses embedded Tesseract
```

---

## Build Process

### Sandbox Build

**Command:**
```bash
npm run build:sandbox
```

**What It Does:**
- Runs `vite build --mode development`
- Uses `.env.development` or development environment variables
- Sets `NODE_ENV=development`
- Builds with sandbox API URLs

**Validation:**
- ✅ `VITE_API_BASE_URL` must NOT be production URL
- ✅ `VITE_API_BASE_URL` should be `http://<sandbox-host>/api` or `/api`
- ✅ Build output should NOT contain the deprecated domain (see docs/ARGO_RENAME_DEFERRED.md)

**Output Location:**
- `dist/` directory
- Deployed to CT 2600 at `/var/www/trade-show-app`

### Production Build

**Command:**
```bash
npm run build:production
```

**What It Does:**
- Runs `vite build --mode production`
- Uses `.env.production` or production environment variables
- Sets `NODE_ENV=production`
- Builds with production API URLs

**Validation:**
- ✅ `VITE_API_BASE_URL` must be `/api` or `https://argo.booute.duckdns.org/api`
- ✅ `VITE_API_BASE_URL` must NOT be sandbox URL
- ✅ Build output should NOT contain `<sandbox-host>`

**Output Location:**
- `dist/` directory
- Deployed to CT 2120 at `/var/www/trade-show-app`

### Build-Time Validation

**⚠️ ALWAYS run validation before building:**

```bash
node scripts/validate-env.js
```

This script will:
- ✅ Check current environment variables
- ✅ Verify API URLs match target environment
- ✅ Fail if misconfigured (prevents bad builds)
- ✅ Provide clear error messages

**See [Build-Time Validation](#build-time-validation) section for details.**

---

## Case Study: API URL Misconfiguration

### What Happened

**Date:** November 2025  
**Environment:** Sandbox  
**Issue:** Sandbox frontend built with production API URL

### Symptoms

- Users unable to log in to sandbox
- Authentication failures
- API requests going to production instead of sandbox
- CORS errors
- Data access issues

### Root Cause

**Frontend was built with:**
```bash
VITE_API_BASE_URL=https://argo.booute.duckdns.org/api
```

**Should have been:**
```bash
VITE_API_BASE_URL=http://<sandbox-host>/api
```

**Why It Happened:**
- Environment variable not set correctly before build
- No build-time validation
- Build script didn't check for misconfiguration
- Deployed without verifying API URL in build output

### Impact

- **Severity:** HIGH
- **Duration:** Until fixed and redeployed
- **Users Affected:** All sandbox users
- **Data Risk:** Low (sandbox only, but could have been production)

### Resolution

1. Identified misconfiguration in build output
2. Set correct `VITE_API_BASE_URL` for sandbox
3. Rebuilt frontend with correct environment
4. Redeployed to sandbox
5. Verified API calls going to correct endpoint

### Prevention

**This guide and validation script prevent this by:**
- ✅ Documenting correct environment variables
- ✅ Build-time validation before build
- ✅ Clear error messages if misconfigured
- ✅ Deployment checklist verification

---

## Deployment Checklist

### Pre-Build Checklist

**Before building, verify:**

- [ ] **Environment variable set correctly**
  - [ ] Sandbox: `VITE_API_BASE_URL=http://<sandbox-host>/api` or `/api`
  - [ ] Production: `VITE_API_BASE_URL=/api` or `https://argo.booute.duckdns.org/api`
- [ ] **Run validation script**
  ```bash
  node scripts/validate-env.js
  ```
- [ ] **Check current environment**
  ```bash
  echo $VITE_API_BASE_URL
  ```
- [ ] **Verify target environment**
  - [ ] Building for sandbox? Check sandbox URL
  - [ ] Building for production? Check production URL

### Pre-Deployment Checklist

**Before deploying, verify:**

- [ ] **Build completed successfully**
- [ ] **Validation script passed**
- [ ] **Build output checked**
  - [ ] Search build output for API URLs
  - [ ] Verify correct URLs present
  - [ ] Verify wrong URLs NOT present
- [ ] **Target environment confirmed**
  - [ ] Sandbox build → CT 2600
  - [ ] Production build → CT 2120
- [ ] **Database credentials verified**
  - [ ] Sandbox → `expense_app_sandbox`
  - [ ] Production → `expense_app_production`
- [ ] **Backend environment verified**
  - [ ] Sandbox backend → CT 2600
  - [ ] Production backend → CT 2220

### Post-Deployment Checklist

**After deploying, verify:**

- [ ] **Application loads correctly**
  - [ ] Sandbox: http://<sandbox-host>
  - [ ] Production: https://argo.booute.duckdns.org
- [ ] **API calls working**
  - [ ] Check browser Network tab
  - [ ] Verify API requests go to correct endpoint
  - [ ] No CORS errors
- [ ] **Authentication working**
  - [ ] Can log in
  - [ ] Session persists
  - [ ] No authentication errors
- [ ] **Data access correct**
  - [ ] Sandbox shows test data
  - [ ] Production shows real data
  - [ ] No cross-environment data leakage

---

## Build-Time Validation

### Validation Script

**Location:** `scripts/validate-env.js`

**Purpose:** Check environment configuration before build to prevent misconfigurations

**Usage:**
```bash
# Validate for sandbox build
node scripts/validate-env.js --mode development

# Validate for production build
node scripts/validate-env.js --mode production

# Auto-detect mode from NODE_ENV
node scripts/validate-env.js
```

### What It Checks

1. **API URL Validation**
   - ✅ Sandbox builds must NOT use production URL
   - ✅ Production builds must NOT use sandbox URL
   - ✅ API URL format is valid

2. **Environment Variable Presence**
   - ✅ Required variables are set
   - ✅ No conflicting variables

3. **Build Mode Validation**
   - ✅ Mode matches environment
   - ✅ NODE_ENV matches mode

### Integration with Build Scripts

**Add to `package.json`:**
```json
{
  "scripts": {
    "prebuild:sandbox": "node scripts/validate-env.js --mode development",
    "prebuild:production": "node scripts/validate-env.js --mode production"
  }
}
```

This ensures validation runs automatically before every build.

### Error Messages

**If misconfigured, script will:**
- ❌ Exit with error code 1
- ❌ Print clear error message
- ❌ Show what's wrong
- ❌ Suggest correct configuration
- ❌ Prevent build from starting

**Example Error:**
```
❌ ENVIRONMENT MISCONFIGURATION DETECTED

Building for SANDBOX but found PRODUCTION API URL:
  VITE_API_BASE_URL=https://argo.booute.duckdns.org/api

This will cause sandbox to connect to production API!

Fix:
  export VITE_API_BASE_URL=http://<sandbox-host>/api
  npm run build:sandbox
```

---

## Troubleshooting

### Issue: Build uses wrong API URL

**Symptoms:**
- Build completes but uses wrong environment
- API calls fail after deployment

**Diagnosis:**
```bash
# Check environment variable
echo $VITE_API_BASE_URL

# Check build output
# (deprecated domain check — see docs/ARGO_RENAME_DEFERRED.md)
grep -r "<sandbox-host>" dist/
```

**Fix:**
1. Set correct environment variable
2. Run validation script
3. Rebuild
4. Redeploy

### Issue: Validation script fails

**Symptoms:**
- `validate-env.js` exits with error
- Build won't start

**Diagnosis:**
- Read error message
- Check environment variables
- Verify target environment

**Fix:**
1. Follow error message instructions
2. Set correct environment variables
3. Run validation again
4. Proceed with build

### Issue: Cross-environment data access

**Symptoms:**
- Sandbox shows production data
- Production shows sandbox data

**Diagnosis:**
- Check database credentials
- Check API URL in build
- Check backend configuration

**Fix:**
1. Verify database names differ
2. Verify API URLs correct
3. Rebuild and redeploy
4. Clear caches

### Issue: Authentication failures

**Symptoms:**
- Users can't log in
- 401/403 errors
- Session issues

**Diagnosis:**
- Check API URL in build
- Check CORS configuration
- Check JWT secret

**Fix:**
1. Verify API URL matches environment
2. Check CORS_ORIGIN setting
3. Verify JWT_SECRET correct
4. Rebuild and redeploy

---

## Quick Reference

### Sandbox Configuration

```bash
# Frontend
VITE_API_BASE_URL=http://<sandbox-host>/api
NODE_ENV=development

# Backend
DB_NAME=expense_app_sandbox
JWT_SECRET=<sandbox_secret>
CORS_ORIGIN=http://<sandbox-host>,http://localhost:5173
OCR_SERVICE_URL=http://192.168.1.195:8000
```

### Production Configuration

```bash
# Frontend
VITE_API_BASE_URL=/api
NODE_ENV=production

# Backend
DB_NAME=expense_app_production
JWT_SECRET=<production_secret>
CORS_ORIGIN=https://argo.booute.duckdns.org
# OCR_SERVICE_URL NOT SET (uses embedded Tesseract)
```

### Build Commands

```bash
# Sandbox
npm run build:sandbox

# Production
npm run build:production
```

### Validation Commands

```bash
# Validate before sandbox build
node scripts/validate-env.js --mode development

# Validate before production build
node scripts/validate-env.js --mode production
```

---

## Best Practices

1. **Always validate before building**
   - Run `validate-env.js` before every build
   - Never skip validation

2. **Use separate build commands**
   - `npm run build:sandbox` for sandbox
   - `npm run build:production` for production
   - Never use generic `npm run build`

3. **Check build output**
   - Search for API URLs in build output
   - Verify correct URLs present
   - Verify wrong URLs NOT present

4. **Test after deployment**
   - Verify application loads
   - Check API calls in browser Network tab
   - Verify authentication works
   - Check data access

5. **Document changes**
   - Update this guide if environment changes
   - Update validation script if needed
   - Communicate changes to team

6. **Never assume**
   - Always verify environment variables
   - Always check build output
   - Always test after deployment

---

**END OF ENVIRONMENT SEPARATION GUIDE**

For questions or issues, refer to `docs/MASTER_GUIDE.md` or contact DevOps Agent.


