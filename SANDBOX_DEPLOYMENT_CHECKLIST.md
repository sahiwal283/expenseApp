# Sandbox Deployment Checklist v1.0.12

**CRITICAL: Follow this checklist EXACTLY to avoid caching issues**

## Pre-Deployment Checks

- [ ] All changes are on the **v1.0.10** branch (not main)
- [ ] Version number updated in `package.json`
- [ ] Service worker cache names updated in `public/service-worker.js`:
  - [ ] `CACHE_NAME = 'expenseapp-vX.X.X'`
  - [ ] `STATIC_CACHE = 'expenseapp-static-vX.X.X'`
  - [ ] Console log messages updated with correct version
- [ ] Changes committed and pushed to GitHub

## Build Process

```bash
# 1. Clean old build
rm -rf dist/

# 2. Build with timestamp
npm run build

# 3. Add build ID to index.html
BUILD_ID=$(date +%Y%m%d_%H%M%S)
echo "<!-- Build: ${BUILD_ID} -->" >> dist/index.html

# 4. Create timestamped tarball
tar -czf frontend-v1.0.X-$(date +%H%M%S).tar.gz -C dist .
```

## Deployment to Sandbox (Container 203)

**CRITICAL: Sandbox serves from `/var/www/expenseapp` NOT `/var/www/html`**

```bash
# 1. Copy to Proxmox host
TARFILE=$(ls -t frontend-v1.0.*-*.tar.gz | head -1)
scp "$TARFILE" root@192.168.1.190:/tmp/sandbox-deploy.tar.gz

# 2. Deploy to correct directory
ssh root@192.168.1.190 "
  pct push 203 /tmp/sandbox-deploy.tar.gz /tmp/sandbox-deploy.tar.gz &&
  pct exec 203 -- bash -c '
    cd /var/www/expenseapp &&
    rm -rf * &&
    tar -xzf /tmp/sandbox-deploy.tar.gz &&
    chown -R 501:staff /var/www/expenseapp &&
    systemctl restart nginx
  '
"

# 3. Restart NPMplus to clear proxy cache
ssh root@192.168.1.190 "pct stop 104 && sleep 3 && pct start 104"
```

## Verification

```bash
# 1. Check files on server
ssh root@192.168.1.190 "pct exec 203 -- bash -c '
  echo \"=== FILES ===\"
  ls -lh /var/www/expenseapp/
  echo
  echo \"=== SERVICE WORKER VERSION ===\"
  head -3 /var/www/expenseapp/service-worker.js
  echo
  echo \"=== BUILD ID ===\"
  grep \"Build:\" /var/www/expenseapp/index.html
  echo
  echo \"=== CACHE HEADERS ===\"
  curl -s -I http://localhost/index.html | grep -E \"Cache-Control|Pragma\"
'"
```

## Expected Output

✅ Service Worker version matches deployed version  
✅ Build ID timestamp is recent  
✅ Cache headers include: `no-store, no-cache, must-revalidate`  
✅ Nginx is active

## Browser Testing

**URL:** http://192.168.1.144

1. **Close all browser tabs** with sandbox site
2. **Clear browsing data:**
   - Cached images and files
   - Cookies and site data
   - Time range: All time
3. **Restart browser completely**
4. **Open incognito window**
5. **Open DevTools** (F12)
6. **Go to Network tab**
7. **Check "Disable cache"**
8. **Load sandbox URL**
9. **Verify:**
   - Version in footer matches deployed version
   - Console shows correct service worker version
   - JS file hash matches what's in `dist/` folder

## Rollback Procedure

If deployment fails:

```bash
# Keep previous tarball as backup
# To rollback:
ssh root@192.168.1.190 "
  pct push 203 /tmp/backup-previous-version.tar.gz /tmp/rollback.tar.gz &&
  pct exec 203 -- bash -c '
    cd /var/www/expenseapp &&
    rm -rf * &&
    tar -xzf /tmp/rollback.tar.gz &&
    chown -R 501:staff /var/www/expenseapp &&
    systemctl restart nginx
  ' &&
  pct stop 104 && sleep 2 && pct start 104
"
```

## Key Lessons

### ❌ Common Mistakes

1. **Wrong directory:** Deploying to `/var/www/html` instead of `/var/www/expenseapp`
2. **Forgot to update service worker cache names**
3. **Didn't restart NPMplus** - old proxy cache persists
4. **Didn't restart nginx** - used `reload` instead of `restart`
5. **Didn't clear browser cache** - tested with stale cached files

### ✅ Success Criteria

- Service worker cache name matches version
- Nginx serves files from correct directory (`/var/www/expenseapp`)
- Nginx has aggressive no-cache headers
- NPMplus proxy cache cleared
- Browser cache cleared during testing

## Nginx Configuration

**File:** `/etc/nginx/sites-available/expenseapp` (in container 203)

**Critical sections:**
- `root /var/www/expenseapp;` (NOT /var/www/html)
- `location = /index.html` - has no-cache headers
- `location ~* \.(js|css)$` - has no-cache headers
- `location = /service-worker.js` - has no-cache headers

If cache headers are missing, redeploy nginx config with:
```bash
scp /tmp/sandbox-nginx.conf root@192.168.1.190:/tmp/
ssh root@192.168.1.190 "
  pct push 203 /tmp/sandbox-nginx.conf /etc/nginx/sites-available/expenseapp &&
  pct exec 203 -- bash -c 'nginx -t && systemctl restart nginx'
"
```

## Support

If issues persist after following this checklist:
1. Check container 203 is running: `pct list | grep 203`
2. Check nginx logs: `pct exec 203 -- tail -50 /var/log/nginx/error.log`
3. Verify correct IP: `pct exec 203 -- hostname -I` (should be 192.168.1.144)
4. Test direct access: `pct exec 203 -- curl -I http://localhost/index.html`

