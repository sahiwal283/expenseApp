# Deployment Guide v0.35.25 - Enhanced Receipt Upload Logging
**Date**: October 13, 2025  
**Version**: Frontend 0.35.25 / Backend 2.6.25  
**Target**: Production Container 201 ONLY

---

## 🔴 CRITICAL PRE-DEPLOYMENT VERIFICATION

### 1. Verify Container Assignments (DO NOT SKIP)

```bash
ssh root@192.168.1.190 "
  echo '=== CONTAINER VERIFICATION ===' &&
  echo 'Container 201 (Production):' &&
  pct exec 201 -- grep NODE_ENV /opt/expenseApp/backend/.env &&
  pct exec 201 -- grep ZOHO_HAUTE_MOCK /opt/expenseApp/backend/.env &&
  echo '' &&
  echo 'Container 203 (Sandbox):' &&
  pct exec 203 -- grep NODE_ENV /etc/expenseapp/backend.env &&
  pct exec 203 -- grep ZOHO_HAUTE_MOCK /etc/expenseapp/backend.env
"
```

**Expected Output**:
```
=== CONTAINER VERIFICATION ===
Container 201 (Production):
NODE_ENV=production
ZOHO_HAUTE_MOCK=false

Container 203 (Sandbox):
NODE_ENV=sandbox
ZOHO_HAUTE_MOCK=true
```

**❌ STOP DEPLOYMENT** if:
- Container 201 shows `NODE_ENV=sandbox` or `ZOHO_HAUTE_MOCK=true`
- Container 203 shows `NODE_ENV=production` or `ZOHO_HAUTE_MOCK=false`

---

## 📦 What's Being Deployed

### Changes in This Release
- **Enhanced logging** for receipt upload process
- **File size and upload duration** tracking
- **Detailed Zoho API responses** in logs
- **Better error messages** with HTTP status codes
- **Visual indicators** (📎, ✅, ❌, ⚠️) for easy log scanning

### Files Modified
- `backend/src/services/zohoMultiAccountService.ts` - Enhanced receipt upload logging
- `backend/package.json` - Version 2.6.24 → 2.6.25
- `package.json` - Version 0.35.24 → 0.35.25
- `docs/CHANGELOG.md` - Added v0.35.25 entry

### No New Features
**IMPORTANT**: This is NOT a new feature implementation. Receipt uploads have been working since earlier versions. This release only adds better logging for visibility and debugging.

---

## 🚀 Deployment Steps

### Step 1: Prepare Deployment Package

```bash
cd /Users/sahilkhatri/Projects/Haute/expenseApp
```

### Step 2: Build Backend

```bash
cd backend
npm run build
cd ..
```

**Verification**: Should complete without errors

### Step 3: Package Backend for Deployment

```bash
tar czf backend-dist-v2.6.25.tar.gz -C backend dist
ls -lh backend-dist-v2.6.25.tar.gz
```

**Verification**: File should be ~500KB-2MB

### Step 4: Transfer to Proxmox Host

```bash
scp backend-dist-v2.6.25.tar.gz root@192.168.1.190:/tmp/
```

**Verification**: File transfer completes successfully

### Step 5: Deploy to Production Container 201 ONLY

```bash
ssh root@192.168.1.190 "
  echo '=== DEPLOYING TO CONTAINER 201 (PRODUCTION) ===' &&
  pct push 201 /tmp/backend-dist-v2.6.25.tar.gz /tmp/backend-dist.tar.gz &&
  pct exec 201 -- bash -c '
    echo \"Backing up current backend...\" &&
    cd /opt/expenseApp/backend &&
    [ -d dist ] && mv dist dist.backup.\$(date +%Y%m%d_%H%M%S) &&
    echo \"Extracting new backend...\" &&
    tar xzf /tmp/backend-dist.tar.gz &&
    ls -la dist/ | head -5 &&
    echo \"\" &&
    echo \"Restarting backend service...\" &&
    systemctl restart expenseapp-backend &&
    sleep 3 &&
    systemctl status expenseapp-backend --no-pager
  '
"
```

**Verification**: 
- Service should show "active (running)"
- No immediate errors in status output

### Step 6: Monitor Backend Startup

```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend --since '1 minute ago' --no-pager | tail -20"
```

**Expected Output Should Include**:
```
[Zoho:MultiAccount] Initializing 1 Zoho account(s)...
[Zoho:MultiAccount] ✓ HAUTE BRANDS - REAL - Haute Brands
Server running on port 3000
Environment: production
Version: 2.6.25
```

**❌ STOP if you see**:
- `Version: 2.6.24` (deployment didn't apply)
- `[Zoho:MultiAccount] ✓ HAUTE - MOCK` (wrong environment)
- Errors about missing modules or files

---

## ✅ Post-Deployment Verification

### Step 1: Verify Version

```bash
ssh root@192.168.1.190 "pct exec 201 -- cat /opt/expenseApp/backend/package.json | grep version"
```

**Expected**: `"version": "2.6.25",`

### Step 2: Verify Upload Directory Exists

```bash
ssh root@192.168.1.190 "pct exec 201 -- ls -la /var/lib/expenseapp/uploads/ | head -10"
```

**Expected**: Directory exists and shows uploaded receipt files

### Step 3: Test Receipt Upload with Live Expense

1. Go to https://expapp.duckdns.org/
2. Log in as `admin` / `admin`
3. Create new expense:
   - Merchant: "Test Receipt Upload"
   - Amount: $50.00
   - Category: Any
   - **Upload a receipt image** (JPEG/PNG)
   - Tag with: "Haute Brands"
   - Submit

### Step 4: Monitor Logs in Real-Time

```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend -f | grep --line-buffered -E 'Receipt|📎|✅|❌'"
```

**Expected Output**:
```
[Zoho:Haute Brands:REAL] 📎 Receipt file found: 1697123456-789.jpg
[Zoho:Haute Brands:REAL] 📎 Attaching receipt to expense 5254962000000234567
[Zoho:Haute Brands:REAL]    File: 1697123456-789.jpg (1.24 MB)
[Zoho:Haute Brands:REAL] ✅ Receipt attached successfully in 2.34s
[Zoho:Haute Brands:REAL]    Zoho Response: { "code": 0, "message": "success" }
```

### Step 5: Verify in Zoho Books

1. Go to: https://books.zoho.com/app/856048585#/expenses
2. Find the expense you just created
3. Open the expense details
4. **Verify receipt attachment is present**
5. Download/view the receipt to confirm it matches uploaded file

---

## 🔄 Rollback Procedure (If Needed)

### If Deployment Fails

```bash
ssh root@192.168.1.190 "pct exec 201 -- bash -c '
  cd /opt/expenseApp/backend &&
  BACKUP=\$(ls -t dist.backup.* | head -1) &&
  echo \"Rolling back to: \$BACKUP\" &&
  rm -rf dist &&
  mv \$BACKUP dist &&
  systemctl restart expenseapp-backend &&
  echo \"Rollback complete\"
'"
```

---

## 📊 Success Criteria

- [x] Backend version shows 2.6.25
- [x] Service running without errors
- [x] Zoho account showing "HAUTE BRANDS - REAL"
- [ ] Test expense created with receipt
- [ ] Receipt upload logs visible with 📎 and ✅ indicators
- [ ] Receipt appears in Zoho Books expense record
- [ ] No errors in production logs

---

## 🚨 Troubleshooting

### Issue: Version Still Shows 2.6.24

**Cause**: Deployment didn't extract properly  
**Fix**: Re-run Step 5 and check for extraction errors

### Issue: Receipt Not Uploading

**Check 1 - File Exists**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- ls -la /var/lib/expenseapp/uploads/"
```
If empty, issue is with file upload to backend, not Zoho upload.

**Check 2 - Upload Directory Permission**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- ls -ld /var/lib/expenseapp/uploads/"
```
Should be owned by the user running the backend service.

**Check 3 - Full Logs**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend --since '10 minutes ago' --no-pager | grep -A10 'Attaching receipt'"
```

### Issue: "Receipt file not found" in Logs

**Cause**: `receipt_url` in database doesn't match actual file path  
**Debug**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- su - postgres -c '
  psql -d expense_app -c \"
    SELECT id, merchant, receipt_url 
    FROM expenses 
    WHERE receipt_url IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 5;
  \"
'"
```

Compare `receipt_url` values with files in `/var/lib/expenseapp/uploads/`

### Issue: Zoho API Error

**Symptoms**: Logs show ❌ and HTTP error status  
**Check Logs**:
```bash
ssh root@192.168.1.190 "pct exec 201 -- journalctl -u expenseapp-backend -n 50 | grep -A5 'Failed to attach receipt'"
```

**Common Causes**:
- File too large (>10MB)
- Invalid file format (must be image or PDF)
- Zoho API token expired (service auto-refreshes, retry in 1 minute)
- Network connectivity to Zoho servers

---

## 📝 Post-Deployment Checklist

- [ ] Deployment completed without errors
- [ ] Backend service running (systemctl status)
- [ ] Version verified as 2.6.25
- [ ] Zoho account initialized correctly (REAL mode)
- [ ] Test expense created with receipt
- [ ] Receipt upload logged with 📎 indicator
- [ ] Receipt upload succeeded with ✅ indicator
- [ ] Receipt visible in Zoho Books dashboard
- [ ] No errors in last 100 log lines
- [ ] Git commit created
- [ ] Git push to remote repository
- [ ] User notified of successful deployment

---

## 🔒 Security Reminders

1. **Container 203 (Sandbox)**: Should remain untouched with mock credentials
2. **Production Credentials**: Only in Container 201
3. **Environment File**: `/opt/expenseApp/backend/.env` with 600 permissions
4. **Backup**: Previous `dist` directory backed up with timestamp

---

## 📚 Documentation References

- **Session Summary**: `SESSION_SUMMARY_v0.35.24_PRODUCTION_SUCCESS.md`
- **Environment Separation Fix**: `CRITICAL_FIX_ENVIRONMENT_SEPARATION.md`
- **Full Changelog**: `docs/CHANGELOG.md`
- **Container Mapping**:
  - Container 201: Production Backend (192.168.1.201)
  - Container 202: Production Frontend
  - Container 203: Sandbox Backend (DO NOT TOUCH)
  - Container 104: Nginx Proxy Manager (192.168.1.160)

---

## 🎯 Expected Behavior After Deployment

When an expense is submitted with a receipt:

1. **Expense Creation**:
   - Expense created in app database
   - Expense pushed to Zoho Books API
   - Zoho expense ID returned

2. **Receipt Upload** (if receipt provided):
   - Log: `📎 Receipt file found: filename.jpg`
   - Log: `📎 Attaching receipt to expense {zoho_id}`
   - Log: `File: filename.jpg (X.XX MB)`
   - File uploaded to Zoho via FormData POST
   - Log: `✅ Receipt attached successfully in X.XXs`
   - Log: `Zoho Response: { "code": 0, "message": "success" }`

3. **Result**:
   - Expense visible in app
   - Expense visible in Zoho Books with receipt attachment
   - Both base expense data AND receipt file present in Zoho

---

**Deployment Prepared By**: AI Assistant (Claude Sonnet 4.5)  
**Deployment Target**: Production Container 201  
**Risk Level**: LOW (logging enhancement only, no logic changes)  
**Rollback Available**: YES (automated backup created)

---

**GOOD LUCK WITH DEPLOYMENT! 🚀**

