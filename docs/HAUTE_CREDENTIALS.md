# Haute Brands - Zoho Books Credentials
**Date**: October 14, 2025  
**Status**: Active in Production

---

## Obtained Credentials

✅ **Client ID**: 1000.6XS1OS32BX1BGKV25XDOIBWHSQN9VI  
✅ **Client Secret**: 3d9be2c0d9b132251c91bffacd01186b13a3f5a05a  
✅ **Refresh Token**: 1000.7e4e2b5188202a63b41db71745b82ab5.79add3219be6c28cbdd71e4f599997d6  
✅ **Organization ID**: 856048585  
✅ **Expense Account ID**: 5254962000000091094 (Trade Shows)  
✅ **Paid Through Account ID**: 5254962000000129043 (Business Checking)

---

## Environment Variables

**Production** (`backend/env.production.READY`):
```bash
ZOHO_CLIENT_ID=1000.6XS1OS32BX1BGKV25XDOIBWHSQN9VI
ZOHO_CLIENT_SECRET=3d9be2c0d9b132251c91bffacd01186b13a3f5a05a
ZOHO_REFRESH_TOKEN=1000.7e4e2b5188202a63b41db71745b82ab5.79add3219be6c28cbdd71e4f599997d6
ZOHO_ORGANIZATION_ID=856048585
ZOHO_EXPENSE_ACCOUNT_ID=5254962000000091094
ZOHO_PAID_THROUGH_ACCOUNT_ID=5254962000000129043
```

**Sandbox** (same credentials for testing)

---

## Zoho Books Access

- **URL**: https://one.zoho.com/zohoone/hautebrands/home/cxapp/books/app/856048585#/expenses
- **Organization**: Haute Brands
- **Account Type**: Standard

---

## Security Notes

⚠️ **IMPORTANT**: 
- These credentials provide FULL ACCESS to Haute Brands Zoho Books
- Can create, read, update expenses
- Can access financial data
- Refresh token never expires (unless manually revoked)
- Keep this file secure and out of public repositories

---

## OAuth Setup Reference

If credentials need to be regenerated, follow the OAuth flow documented in `AI_MASTER_GUIDE.md` section "ZOHO BOOKS INTEGRATION".

**Scopes Required**:
- `ZohoBooks.expenses.CREATE`
- `ZohoBooks.expenses.READ`
- `ZohoBooks.settings.READ`
- `ZohoBooks.accountants.READ`

---

## Related Files

- `BOOMIN_CREDENTIALS.md` - Boomin Brands credentials
- `backend/env.production.READY` - Production environment file
- `backend/src/config/zohoAccounts.ts` - Zoho configuration code
- `AI_MASTER_GUIDE.md` - OAuth setup instructions

