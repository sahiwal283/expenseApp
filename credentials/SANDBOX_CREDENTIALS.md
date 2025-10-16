# Sandbox Environment - Zoho Books Credentials
**Date**: October 16, 2025  
**Status**: Active in Sandbox (Container 203)  
**Purpose**: Testing and development without affecting production data

---

## 🎯 Why Separate Credentials?

The sandbox uses **separate OAuth credentials** and a **different expense account** than production:

✅ **Data Isolation**: Test expenses don't mix with production data  
✅ **Security**: Sandbox breach doesn't compromise production  
✅ **Testing Freedom**: Can delete all test data without worry  
✅ **Audit Trail**: Easy to identify test vs real expenses  

Both sandbox and production connect to the **same Zoho Books organization** (Haute Brands) but write to different accounts.

---

## Obtained Credentials

✅ **Client ID**: 1000.PWO6LIXJ34P6SL4AULI2EJR4EGPHAA  
✅ **Client Secret**: d76b4a54e38edeac6d6be3f31b6ba9a4e1fab4e55b  
✅ **Refresh Token**: 1000.c07b3a058d7a79e75cfbb5c1a0adf7d2.52a01d40a54b6e2c5766f99d24da1f75  
✅ **Organization ID**: 856048585 (Haute Brands - SAME as production)  
✅ **Expense Account ID**: 5254962000000091710 (**"Meals"** - DIFFERENT from production)  
✅ **Paid Through Account ID**: 5254962000000129043 (Business Checking - same as production)

---

## Environment Variables

**Sandbox** (`/etc/expenseapp/backend.env` on Container 203):
```bash
ZOHO_CLIENT_ID=1000.PWO6LIXJ34P6SL4AULI2EJR4EGPHAA
ZOHO_CLIENT_SECRET=d76b4a54e38edeac6d6be3f31b6ba9a4e1fab4e55b
ZOHO_REFRESH_TOKEN=1000.c07b3a058d7a79e75cfbb5c1a0adf7d2.52a01d40a54b6e2c5766f99d24da1f75
ZOHO_ORGANIZATION_ID=856048585
ZOHO_EXPENSE_ACCOUNT_ID=5254962000000091710
ZOHO_PAID_THROUGH_ACCOUNT_ID=5254962000000129043
ZOHO_EXPENSE_ACCOUNT_NAME=Meals
ZOHO_PAID_THROUGH_ACCOUNT=Business Checking

# Multi-entity flag
ZOHO_HAUTE_ENABLED=true
ZOHO_HAUTE_MOCK=false
ZOHO_HAUTE_ENTITY_NAME=Haute Brands
```

---

## Key Differences from Production

| Setting | Sandbox | Production |
|---------|---------|------------|
| **Client ID** | `1000.PWO6LIXJ34P...` | `1000.6XS1OS32BX...` |
| **Organization** | 856048585 (Haute Brands) | 856048585 (Haute Brands) |
| **Expense Account** | **"Meals"** (5254962...091710) | **"Trade Shows"** (5254962...091094) |
| **Purpose** | Testing/Development | Real business expenses |
| **Data Scope** | Test data only | Production financial data |

---

## Zoho Books Access

- **URL**: https://one.zoho.com/zohoone/hautebrands/home/cxapp/books/app/856048585#/expenses
- **Organization**: Haute Brands (same as production)
- **Expense Account**: Look for "Meals" category
- **Test Data**: All sandbox expenses appear in the "Meals" expense account

---

## Testing Workflow

When testing "Push to Zoho" in sandbox:

1. ✅ Expense is created in ExpenseApp sandbox database
2. ✅ Push to Zoho sends to **"Meals" account** in Haute Brands Zoho Books
3. ✅ Production "Trade Shows" account remains untouched
4. ✅ Easy to verify: Check "Meals" account in Zoho Books for test expenses
5. ✅ Easy cleanup: Delete all "Meals" transactions without affecting production

---

## Security Notes

⚠️ **IMPORTANT**: 
- These credentials provide access to Haute Brands Zoho Books
- Specifically write to "Meals" expense account
- Cannot affect production "Trade Shows" data (different OAuth app)
- Refresh token never expires (unless manually revoked)
- Keep this file secure and out of public repositories

---

## Credential Management

**If credentials need regeneration:**
1. Follow OAuth flow in `AI_MASTER_GUIDE.md` section "ZOHO BOOKS INTEGRATION"
2. Create a **new OAuth app** in Zoho (don't reuse production app)
3. Use same Organization ID: 856048585
4. Use same Expense Account: "Meals" (5254962000000091710)
5. Update sandbox environment file: `/etc/expenseapp/backend.env`
6. Restart backend: `systemctl restart expenseapp-backend`

**Scopes Required**:
- `ZohoBooks.expenses.CREATE`
- `ZohoBooks.expenses.READ`
- `ZohoBooks.settings.READ`
- `ZohoBooks.accountants.READ`

---

## Related Files

- `HAUTE_CREDENTIALS.md` - Production Haute Brands credentials (different OAuth app)
- `BOOMIN_CREDENTIALS.md` - Boomin Brands credentials (production only)
- `backend/env.sandbox.READY` - Template for sandbox environment
- `backend/src/config/zohoAccounts.ts` - Multi-entity Zoho configuration
- `AI_MASTER_GUIDE.md` - OAuth setup instructions

---

## Deployment Location

**Server**: Proxmox Host (192.168.1.190)  
**Container**: LXC 203 (expense-sandbox)  
**Environment File**: `/etc/expenseapp/backend.env`  
**Access**: `ssh root@192.168.1.190` then `pct exec 203 -- bash`

---

**Last Updated**: October 16, 2025  
**Verified Working**: ✅ Yes  
**Next Review**: When production credentials are updated

