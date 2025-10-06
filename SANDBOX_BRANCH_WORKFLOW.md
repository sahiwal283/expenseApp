# Sandbox Branch Workflow Documentation

**Date:** October 6, 2025  
**Status:** ✅ Implemented and Verified

---

## 📋 Overview

This document explains the Git branch strategy used to keep sandbox and production environments completely isolated.

**Branch Structure:**
- `main` - Production codebase (PROTECTED - no sandbox changes)
- `sandbox-v0.7.1` - Sandbox environment with all UX improvements and testing changes

---

## 🌲 Branch Strategy

### Production Branch: `main`
- **Purpose:** Production-ready code only
- **Protection:** Never commit sandbox-specific changes directly
- **Deployment:** Production servers only
- **Version:** 0.7.0 (stable)

### Sandbox Branch: `sandbox-v0.7.1`
- **Purpose:** Testing, improvements, bug fixes before production
- **Freedom:** Can make changes without affecting production
- **Deployment:** Sandbox server at http://192.168.1.144
- **Version:** 0.7.1 (latest with improvements)

---

## 📝 Git Commands Reference

### Working with Sandbox Branch

**1. Switch to Sandbox Branch:**
```bash
cd /Users/sahilkhatri/Projects/Haute/expenseApp
git checkout sandbox-v0.7.1
```

**2. Check Current Branch:**
```bash
git branch --show-current
# Should output: sandbox-v0.7.1
```

**3. Make Changes (sandbox only):**
```bash
# Edit files as needed
git add -A
git commit -m "feat(sandbox): description of changes"
git push origin sandbox-v0.7.1
```

**4. View Branch History:**
```bash
git log --oneline --graph --all --decorate
```

**5. Compare Branches:**
```bash
# See what's different between sandbox and production
git diff main..sandbox-v0.7.1
```

### Switching Back to Production

**1. Switch to Main (Production) Branch:**
```bash
git checkout main
```

**2. Verify Clean State:**
```bash
git status
# Should show no sandbox changes
```

---

## 🚀 Deployment Workflow

### Deploying to Sandbox

**Prerequisites:**
- On `sandbox-v0.7.1` branch
- Changes committed and pushed to GitHub
- Built files (`npm run build`)

**Deployment Steps:**

1. **Ensure you're on the sandbox branch:**
   ```bash
   git checkout sandbox-v0.7.1
   git pull origin sandbox-v0.7.1
   ```

2. **Build the application:**
   ```bash
   # Frontend
   npm run build
   
   # Backend
   cd backend && npm run build && cd ..
   ```

3. **Deploy to sandbox:**
   ```bash
   ./deploy_v0.7.1_to_sandbox.sh
   ```

4. **Verify deployment:**
   ```bash
   curl http://192.168.1.144/
   # Check version in browser at http://192.168.1.144
   ```

### Promoting Changes to Production

**When ready to move sandbox changes to production:**

1. **Test thoroughly in sandbox:**
   - Complete all items in `SANDBOX_UX_IMPROVEMENTS_v0.7.1.md` testing checklist
   - Get approval from stakeholders
   - Document any issues found and fixed

2. **Create Pull Request:**
   ```bash
   # On GitHub, create a PR from sandbox-v0.7.1 to main
   # Review changes carefully
   # Get code review approval
   ```

3. **Merge to Main:**
   ```bash
   git checkout main
   git pull origin main
   git merge sandbox-v0.7.1
   # Resolve any conflicts
   git push origin main
   ```

4. **Deploy to Production:**
   ```bash
   # Use production deployment scripts
   # (Not covered here - use separate production workflow)
   ```

5. **Tag Release:**
   ```bash
   git tag -a v0.7.1 -m "Release v0.7.1: UX improvements"
   git push origin v0.7.1
   ```

---

## 🔒 Branch Protection Rules

### For Main Branch (Production)

**Recommended GitHub Settings:**
- ✅ Require pull request before merging
- ✅ Require approvals (at least 1)
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks to pass
- ✅ Require conversation resolution
- ❌ Do NOT allow force pushes
- ❌ Do NOT allow deletions

### For Sandbox Branch

**More Flexible:**
- ✅ Allow direct commits (for rapid iteration)
- ✅ Allow force pushes (if needed for cleanup)
- ✅ No approval required
- 🔄 Regular commits and pushes

---

## 📂 File Organization

### Sandbox-Specific Files
These files exist ONLY in the sandbox branch:

**Documentation:**
- `SANDBOX_UX_IMPROVEMENTS_v0.7.1.md`
- `SANDBOX_BRANCH_WORKFLOW.md` (this file)
- `SANDBOX_ACCESS_INFO.md`
- `SANDBOX_V0.7.0_DEPLOYMENT_COMPLETE.md`
- `EASYOCR_INTEGRATION_COMPLETE.md`
- `OCR_EVALUATION.md`
- `OCR_REPLACEMENT_COMPLETE_SUMMARY.md`

**Deployment Scripts:**
- `deploy_v0.7.1_to_sandbox.sh`
- `deploy_v0.7.0_to_sandbox.sh`
- `deploy_sandbox_simple.sh`
- `deploy_complete_fix_to_sandbox.sh`

**Sandbox Setup:**
- `populate_sandbox_data.sql`
- `ocr_service_easyocr.py`
- `ocr-service.service`
- `fix_sandbox_data.sql`

**Utilities:**
- `diagnose_and_fix_ssh.sh`
- `reset_sandbox_passwords.sh`
- `test_ssh_minimal.sh`

---

## 🔄 Sync Strategy

### Keeping Sandbox Updated with Production

If production (`main`) gets updates that sandbox needs:

```bash
# On sandbox branch
git checkout sandbox-v0.7.1
git fetch origin main
git merge origin/main
# Resolve conflicts if any
git push origin sandbox-v0.7.1
```

### Handling Conflicts

If merge conflicts occur:

1. **Identify conflicts:**
   ```bash
   git status
   # Will show files with conflicts
   ```

2. **Resolve manually:**
   - Open conflicted files
   - Choose which changes to keep
   - Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)

3. **Complete merge:**
   ```bash
   git add .
   git commit -m "merge: resolved conflicts from main"
   git push origin sandbox-v0.7.1
   ```

---

## ✅ Current Deployment Status

### Sandbox Environment

**URL:** http://192.168.1.144

**Branch:** `sandbox-v0.7.1`

**Versions:**
- Frontend: v0.7.1
- Backend: v1.1.1

**Last Deployed:** October 6, 2025

**GitHub:**
- Repository: https://github.com/sahiwal283/expenseApp
- Sandbox Branch: https://github.com/sahiwal283/expenseApp/tree/sandbox-v0.7.1

**Verification:**
```bash
# Frontend deployed
ssh root@192.168.1.190 'pct exec 203 -- stat /var/www/html/index.html'
# Should show: Modify: 2025-10-06 20:57:54

# Backend version
curl -s http://192.168.1.144/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\nHTTP: %{http_code}\n"
# Should show: HTTP: 401 (expected for wrong credentials)

# Version in app
curl -s http://192.168.1.144/assets/*.js | grep -o "0\.7\.[0-9]"
# Should output: 0.7.1
```

---

## 🐛 Troubleshooting

### Issue: "I'm on the wrong branch"

**Solution:**
```bash
git branch --show-current  # Check current branch
git checkout sandbox-v0.7.1  # Switch to sandbox
```

### Issue: "Changes appear in wrong branch"

**Solution:**
```bash
# Stash changes
git stash

# Switch to correct branch
git checkout sandbox-v0.7.1

# Apply changes
git stash pop
```

### Issue: "Deployment not reflecting changes"

**Checklist:**
1. ✅ On correct branch (`sandbox-v0.7.1`)
2. ✅ Changes committed and pushed to GitHub
3. ✅ Built files (`npm run build`)
4. ✅ Deployment script executed successfully
5. ✅ Browser cache cleared (Ctrl+Shift+R or Cmd+Shift+R)

**Hard Reset Browser Cache:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Issue: "Seeing old version (v0.7.0)"

**Cause:** Browser caching

**Solution:**
```bash
# Hard refresh in browser
# Chrome/Firefox: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Or access with cache-busting parameter
http://192.168.1.144/?v=20251006
```

---

## 📊 Branch Comparison

| Feature | Main (Production) | Sandbox-v0.7.1 |
|---------|------------------|----------------|
| **Version** | 0.7.0 | 0.7.1 |
| **Login Credentials** | Generic demo | Actual sandbox accounts |
| **Location Field** | Present | Removed |
| **Receipt Saving** | Bug present | Fixed |
| **Notification Bell** | Red dot persists | Fixed |
| **Accountant Cards** | Different format | Matches admin format |
| **Entity Assignment** | Bug present | Fixed |
| **OCR Engine** | Tesseract.js | EasyOCR |
| **Deployment Target** | Production servers | Sandbox (192.168.1.144) |

---

## 🔐 Security Notes

### Sandbox Credentials (Public in Sandbox Branch ONLY)

**These credentials are ONLY for sandbox/testing:**
- `admin` / `sandbox123`
- `coordinator` / `sandbox123`
- `salesperson` / `sandbox123`
- `accountant` / `sandbox123`
- `salesperson2` / `sandbox123`

**⚠️ IMPORTANT:** These credentials MUST be changed before production deployment.

### Production Credentials

- NEVER commit production credentials to Git
- Use environment variables
- Use secure secret management
- Rotate passwords regularly

---

## 📞 Quick Reference

### Check Current Environment

```bash
# Which branch am I on?
git branch --show-current

# What version is deployed?
curl http://192.168.1.144/assets/*.js | grep -o "0\.7\.[0-9]"

# Is sandbox running?
curl -s http://192.168.1.144/ -o /dev/null -w "Status: %{http_code}\n"
```

### Common Workflows

**Start work on sandbox:**
```bash
git checkout sandbox-v0.7.1
git pull origin sandbox-v0.7.1
# Make changes
npm run build
./deploy_v0.7.1_to_sandbox.sh
```

**Save progress:**
```bash
git add -A
git commit -m "feat(sandbox): your description"
git push origin sandbox-v0.7.1
```

**Deploy to sandbox:**
```bash
npm run build
cd backend && npm run build && cd ..
./deploy_v0.7.1_to_sandbox.sh
```

---

## ✅ Summary

**Sandbox and production are now completely isolated:**

- ✅ **Separate Branch:** `sandbox-v0.7.1` for testing
- ✅ **Protected Main:** Production code on `main` branch
- ✅ **Clear Workflow:** Documented process for both environments
- ✅ **Verified Deployment:** v0.7.1 running on sandbox
- ✅ **Easy Promotion:** PR process to move changes to production when ready

**Next Steps:**
1. Test all improvements in sandbox
2. Get stakeholder approval
3. Create PR to merge into `main` when ready
4. Deploy to production

---

**For Support:**
- Check this document first
- Review `SANDBOX_UX_IMPROVEMENTS_v0.7.1.md` for feature details
- Check deployment logs on sandbox server
- Verify Git branch before making changes

**Last Updated:** October 6, 2025  
**Branch:** `sandbox-v0.7.1`  
**Status:** ✅ **ACTIVE AND DEPLOYED**

