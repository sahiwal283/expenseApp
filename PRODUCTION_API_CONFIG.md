# Production API Configuration Checklist

**Version:** v0.35.22  
**Date:** October 10, 2025  
**Status:** 🟡 In Progress

---

## 🏢 Haute Brands Entity Configuration

### ✅ Received Credentials
- **Organization ID:** `856048585`
- **Client ID:** `1000.6XS1OS32BX1BGKV25XDOIBWHSQN9VI`
- **Client Secret:** `3d9be2c0d9b132251c91bffacd01186b13a3f5a05a`
- **Production Domain:** `https://expapp.duckdns.org/`

### 🔴 Still Required (User Action Needed)
1. **Refresh Token** 
   - ⏳ **ACTION:** Follow steps in [OAUTH_INSTRUCTIONS.md](OAUTH_INSTRUCTIONS.md)
   - Visit the OAuth URL, get the code, exchange for token

2. **Expense Account ID**
   - Where: https://books.zoho.com/app/856048585#/accountant/chartofaccounts
   - Find "Meals" or "Travel Expenses" account → Click → Copy ID from URL

3. **Paid Through Account ID**
   - Where: https://books.zoho.com/app/856048585#/accountant/chartofaccounts
   - Find "Business Checking" account → Click → Copy ID from URL

---

## 🔐 Additional Production Requirements

### ✅ Application Secrets (Generated)
- ✅ **JWT_SECRET:** `b3E4pKQgio3KuEuuV6ijiYP2cVJYAM2V2NfhPok6XiI=`
- ✅ **SESSION_SECRET:** `QFASGIansbkI7LlQ/cC4tWSz1FJ2adsvrkZJE5QGLFc=`

### Database Configuration
- ⏳ **DB_HOST** - Production PostgreSQL host (can use sandbox DB for now?)
- ⏳ **DB_PORT** - Default: 5432
- ⏳ **DB_NAME** - Default: `expenseapp_production`
- ⏳ **DB_USER** - Production database user
- ⏳ **DB_PASSWORD** - Production database password

### ✅ Domain Configuration
- ✅ **Production Domain:** `https://expapp.duckdns.org/`
- ✅ **OAuth Redirect URI:** `https://expapp.duckdns.org/auth/zoho/callback`

---

## 📝 Configuration Steps

Once all credentials are received:

1. ✅ **Version Numbers Updated**
   - Frontend: v0.35.22
   - Backend: v2.6.22

2. ⏳ **Create Production Environment File**
   - Location: `/etc/expenseapp/backend.env` (Container 203)
   - Template: `backend/env.production.template`

3. ⏳ **Deploy to Production**
   - Build and deploy backend
   - Build and deploy frontend
   - Restart services

4. ⏳ **Test API Integration**
   - Submit test expense
   - Verify in Zoho Books
   - Check logs for errors

---

## 🎯 Next Actions

**User needs to provide:**
1. Haute Brands Refresh Token
2. Haute Brands Expense Account ID
3. Haute Brands Paid Through Account ID
4. Production database credentials
5. Production domain name
6. Generate application secrets (or have AI generate them)

**AI will:**
1. Configure production environment file
2. Deploy to production container (203)
3. Test and verify integration
4. Update CHANGELOG
5. Create deployment summary

---

## 📚 Reference Documentation
- [PRODUCTION_RELEASE_PLAN.md](PRODUCTION_RELEASE_PLAN.md)
- [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)
- [ZOHO_BOOKS_SETUP.md](docs/ZOHO_BOOKS_SETUP.md)

