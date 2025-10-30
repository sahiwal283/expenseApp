# 🚀 Deployment Guide - Critical Information

## ⚠️ CRITICAL: `.env.production` File Issue

### What Happened (October 28, 2025)

The app was trying to call production API (`https://expapp.duckdns.org/api`) instead of sandbox API (`http://192.168.1.144/api`) even when deployed to sandbox. This caused CORS errors and prevented features from working.

**Root Cause:** Vite automatically loads `.env.production` during production builds (`npm run build`), which contained:
```env
VITE_API_URL=https://expapp.duckdns.org/api
```

### Why This Happened

- **Vite's default behavior:** When you run `npm run build`, Vite uses `.env.production` if it exists
- **Problem:** We build optimized/minified code for both sandbox AND production
- **Result:** Sandbox deployments were accidentally using production API URLs

### ✅ The Fix

**1. Created Separate Build Commands:**
```json
{
  "scripts": {
    "build:sandbox": "vite build --mode development",    // ← Use this for sandbox
    "build:production": "vite build --mode production",  // ← Use this for production
  }
}
```

**2. Updated `deploy-sandbox.sh` Script:**
- Automatically renames `.env.production` before building for sandbox
- Uses `npm run build:sandbox` (development mode = relative URLs)
- Restores `.env.production` after build
- Includes NPMplus proxy restart (critical for cache clearing)

### 🎯 Going Forward

**For Sandbox Deployments:**
```bash
# Option 1: Use the script (RECOMMENDED)
./deploy-sandbox.sh frontend

# Option 2: Manual (if needed)
npm run build:sandbox  # ← NOT npm run build!
```

**For Production Deployments:**
```bash
npm run build:production  # ← Uses .env.production with correct production URLs
```

**NEVER use `npm run build` directly** - it's ambiguous and uses production URLs by default.

## 🔐 Environment Files Explained

| File | Purpose | API URL | Used By |
|------|---------|---------|---------|
| `.env.production` | Production builds | `https://expapp.duckdns.org/api` | `build:production` |
| `.env.production.backup` | Backup (disabled) | N/A | None |
| (no env file) | Development/Sandbox | Relative `/api` | `build:sandbox`, `dev` |

## 📝 Deployment Checklist

### Sandbox Deployment
- [ ] On `v1.6.0` branch
- [ ] Use `./deploy-sandbox.sh frontend` OR `npm run build:sandbox`
- [ ] Script will automatically handle `.env.production`
- [ ] Script will restart NPMplus proxy (Container 104)
- [ ] Hard refresh browser after deployment

### Production Deployment
- [ ] Merge `v1.6.0` to `main` branch
- [ ] Use `npm run build:production` 
- [ ] `.env.production` should exist and have correct production URL
- [ ] Deploy to Container 201/202
- [ ] Tag release in git

## 🐛 If You See CORS Errors

**Symptoms:**
- `Access to fetch at 'https://expapp.duckdns.org/api/...' from origin 'http://192.168.1.144' has been blocked by CORS`
- Features not loading in sandbox
- Console shows production URLs being called

**Fix:**
1. You built with wrong command! Used `npm run build` instead of `npm run build:sandbox`
2. Rebuild: `npm run build:sandbox`
3. Redeploy: `./deploy-sandbox.sh frontend`
4. Hard refresh browser

## 📚 Related Files

- `package.json` - Build scripts definitions
- `deploy-sandbox.sh` - Automated sandbox deployment
- `.env.production` - Production API configuration
- `vite.config.ts` - Build configuration

---

**Last Updated:** October 28, 2025  
**Issue Resolved:** CORS errors due to .env.production in sandbox builds

