# 🚀 Production Release Plan - v0.35.20

**Release Date**: October 10, 2025  
**Branch**: `v0.35.0` → `main`  
**Version**: 0.35.20 / Backend 2.6.20  
**Status**: READY FOR DEPLOYMENT  

---

## ✅ Pre-Deployment Checklist

### Code Quality & Testing
- [x] All critical bugs fixed
  - [x] Date field bug resolved (v0.35.16)
  - [x] Merchant name in description (v0.35.14)
  - [x] Paid Through account configuration (v0.35.19)
- [x] Sandbox testing completed successfully
- [x] All changes committed and pushed
- [x] Repository cleaned of temporary files
- [x] CHANGELOG.md updated with all changes
- [x] Version numbers incremented

### Documentation
- [x] CHANGELOG.md complete
- [x] API integration documented
- [x] Deployment guides in `docs/` folder
- [ ] Production environment variables documented (see below)
- [ ] Rollback plan documented (see below)

---

## 🔧 Environment Separation

### Critical: Sandbox vs Production APIs

**Current State**: 
- Sandbox environment fully functional
- Using test Zoho Books API for "haute" entity
- Mock APIs for alpha, beta, gamma, delta entities

**Production Requirements**:
- **MUST** use separate environment files
- **MUST** use different API credentials
- **MUST** use different database
- **MUST NOT** reuse sandbox credentials in production

### Environment File Locations

**Sandbox**:
- Backend env: `/etc/expenseapp/backend.env` (Container 203)
- Database: `expenseapp_sandbox`

**Production** (TO BE CONFIGURED):
- Backend env: `/etc/expenseapp-prod/backend.env` (Container TBD)
- Database: `expenseapp_production`

---

## 📋 Required Production Credentials

### Before Production Deployment, You Must Provide:

#### 1. Production Database Credentials
```bash
DB_HOST=<production_db_host>
DB_PORT=5432
DB_NAME=expenseapp_production
DB_USER=<prod_db_user>
DB_PASSWORD=<prod_db_password>
```

#### 2. Production Zoho Books API Credentials

For each production entity that needs Zoho integration:

**Haute Entity (Production)**:
```bash
ZOHO_CLIENT_ID=<production_client_id>
ZOHO_CLIENT_SECRET=<production_client_secret>
ZOHO_REFRESH_TOKEN=<production_refresh_token>
ZOHO_ORGANIZATION_ID=<production_org_id>
ZOHO_EXPENSE_ACCOUNT_ID=<production_expense_account_id>
ZOHO_PAID_THROUGH_ACCOUNT_ID=<production_paid_through_account_id>
```

**Other Entities (if applicable)**:
- Alpha: Provide credentials or keep as mock
- Beta: Provide credentials or keep as mock
- Gamma: Provide credentials or keep as mock
- Delta: Provide credentials or keep as mock

#### 3. Application Secrets
```bash
JWT_SECRET=<strong_random_secret_for_production>
SESSION_SECRET=<strong_random_secret_for_production>
```

#### 4. Production Domain Configuration
```bash
CORS_ORIGIN=https://expenseapp.yourdomain.com
FRONTEND_URL=https://expenseapp.yourdomain.com
BACKEND_URL=https://api.expenseapp.yourdomain.com
```

---

## 🏗️ Deployment Steps

### Phase 1: Create Production Environment (MANUAL - After Credentials Received)

1. **Create Production LXC Container**
   ```bash
   # On Proxmox host (192.168.1.190)
   pct create <container_id> <template> \
     --hostname expense-production \
     --memory 4096 \
     --cores 2 \
     --rootfs local-lvm:20 \
     --net0 name=eth0,bridge=vmbr0,ip=dhcp
   ```

2. **Set Up Production Database**
   ```bash
   # Inside production container
   bash /path/to/deployment/postgres/setup-postgres.sh
   # Create expenseapp_production database
   # Run migrations from backend/src/database/schema.sql
   ```

3. **Configure Production Environment File**
   ```bash
   # Create /etc/expenseapp-prod/backend.env with production credentials
   sudo mkdir -p /etc/expenseapp-prod
   sudo nano /etc/expenseapp-prod/backend.env
   # Paste production credentials (provided by you)
   ```

### Phase 2: Merge to Main Branch

1. **Switch to main branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge v0.35.0 feature branch**
   ```bash
   git merge v0.35.0 --no-ff -m "Release v0.35.20: Zoho Books integration complete"
   ```

3. **Tag the release**
   ```bash
   git tag -a v0.35.20 -m "Production Release v0.35.20

   Features:
   - Complete Zoho Books API integration
   - Multi-entity support (real + mock)
   - Automatic expense submission with receipts
   - Date, merchant, and paid-through account handling
   
   Critical Fixes:
   - Date field name correction (date vs expense_date)
   - Environment file configuration (systemd EnvironmentFile)
   - Merchant name in description
   - Business Checking paid-through account"
   
   git push origin main
   git push origin v0.35.20
   ```

### Phase 3: Deploy to Production

1. **Pull code to production container**
   ```bash
   ssh root@192.168.1.190
   pct exec <prod_container_id> -- bash -c 'cd /opt/expenseapp && git checkout main && git pull origin main'
   ```

2. **Install dependencies and build backend**
   ```bash
   pct exec <prod_container_id> -- bash -c 'cd /opt/expenseapp/backend && npm ci --production && npm run build'
   ```

3. **Update systemd service to use production env file**
   ```bash
   # Edit /etc/systemd/system/expenseapp-backend.service
   # Change: EnvironmentFile=/etc/expenseapp-prod/backend.env
   systemctl daemon-reload
   systemctl restart expenseapp-backend
   ```

4. **Build and deploy frontend**
   ```bash
   pct exec <prod_container_id> -- bash -c 'cd /opt/expenseapp && npm ci && npm run build && rm -rf /var/www/html/* && cp -r dist/* /var/www/html/'
   ```

5. **Verify deployment**
   ```bash
   # Check backend status
   systemctl status expenseapp-backend
   
   # Check backend version
   curl http://localhost:3000/api/health | jq .version
   
   # Check frontend version
   curl http://localhost/index.html | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+'
   ```

### Phase 4: Validation & Monitoring

1. **Check logs for errors**
   ```bash
   journalctl -u expenseapp-backend -f
   ```

2. **Test critical endpoints**
   ```bash
   # Health check
   curl https://api.expenseapp.yourdomain.com/api/health
   
   # Zoho health check
   curl https://api.expenseapp.yourdomain.com/api/expenses/zoho/health
   ```

3. **Test expense submission workflow**
   - Log into production frontend
   - Create test expense
   - Upload receipt
   - Submit for approval
   - Assign to entity with Zoho integration
   - Verify in Zoho Books

4. **Monitor for 24 hours**
   - Check error logs
   - Verify all integrations working
   - Monitor database connections
   - Check API response times

---

## 🔄 Rollback Plan

### If Issues Arise During Deployment:

1. **Immediate Rollback**
   ```bash
   # Stop production services
   systemctl stop expenseapp-backend
   
   # Switch to previous stable version
   cd /opt/expenseapp
   git checkout <previous_stable_tag>
   
   # Rebuild and restart
   cd backend && npm run build
   systemctl start expenseapp-backend
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup if schema changes were made
   pg_restore -d expenseapp_production /path/to/backup.dump
   ```

3. **Notify Users**
   - Update status page
   - Send notification if applicable
   - Document incident

---

## 📊 Environment Configuration Details

### Backend Environment Variables

#### Required for All Environments
```bash
# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong_secret>

# Database
DB_HOST=<host>
DB_PORT=5432
DB_NAME=<database_name>
DB_USER=<user>
DB_PASSWORD=<password>

# Frontend
CORS_ORIGIN=<frontend_url>
```

#### Required for Zoho Integration
```bash
# Zoho Books API (Haute Entity)
ZOHO_CLIENT_ID=<client_id>
ZOHO_CLIENT_SECRET=<client_secret>
ZOHO_REFRESH_TOKEN=<refresh_token>
ZOHO_ORGANIZATION_ID=<org_id>
ZOHO_EXPENSE_ACCOUNT_ID=<expense_account_id>
ZOHO_PAID_THROUGH_ACCOUNT_ID=<paid_through_account_id>

# Additional entities (if needed)
ZOHO_ALPHA_ENABLED=true/false
ZOHO_ALPHA_MOCK=true/false
# ... (similar for beta, gamma, delta)
```

#### Optional
```bash
# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/lib/expenseapp/uploads

# Logging
LOG_LEVEL=info
```

---

## 🔒 Security Checklist

- [ ] All production secrets are unique (not reused from sandbox)
- [ ] JWT_SECRET is strong and random
- [ ] Database uses strong passwords
- [ ] API credentials are for production Zoho organization
- [ ] CORS is configured for production domain only
- [ ] Environment files have restricted permissions (600)
- [ ] SSL/TLS certificates are valid and auto-renewing
- [ ] Firewall rules are configured
- [ ] Database backups are automated
- [ ] Log rotation is configured

---

## 📝 Post-Deployment Tasks

1. **Update documentation**
   - [ ] Update README with production URLs
   - [ ] Document production environment setup
   - [ ] Update architecture diagrams

2. **Set up monitoring**
   - [ ] Configure application monitoring
   - [ ] Set up error alerting
   - [ ] Configure performance monitoring
   - [ ] Set up uptime monitoring

3. **Configure backups**
   - [ ] Database backups (daily)
   - [ ] Code backups (via Git)
   - [ ] Uploaded files backups
   - [ ] Configuration backups

4. **User communication**
   - [ ] Announce production availability
   - [ ] Provide user training/documentation
   - [ ] Set up support channels

---

## 🎯 Success Criteria

Production deployment is considered successful when:

- [x] Application accessible at production URL
- [ ] All API endpoints responding correctly
- [ ] Database migrations completed
- [ ] Zoho Books integration working (after credentials provided)
- [ ] File uploads working
- [ ] Authentication working
- [ ] No errors in logs for 24 hours
- [ ] Performance meets expectations
- [ ] Backup systems operational

---

## 📞 Support & Escalation

**If Issues Occur**:
1. Check logs: `journalctl -u expenseapp-backend -f`
2. Check service status: `systemctl status expenseapp-backend`
3. Check database connectivity: `psql -U <user> -d expenseapp_production -c "SELECT 1"`
4. Refer to `docs/TROUBLESHOOTING.md`
5. Roll back if necessary (see Rollback Plan above)

---

## 📅 Timeline

**Preparation Phase**: Now - Awaiting production credentials  
**Merge to Main**: After credentials verification  
**Production Deployment**: Scheduled after merge approval  
**Monitoring Period**: 24-48 hours post-deployment  
**Production Ready**: After monitoring period with no issues  

---

**Status**: ⏸️ AWAITING PRODUCTION CREDENTIALS  
**Next Step**: Provide production API credentials and database information  
**Contact**: Ready to proceed once credentials are received  


