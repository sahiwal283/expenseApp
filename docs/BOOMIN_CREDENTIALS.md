# Boomin Brands - Zoho Books Credentials
**Date**: October 13, 2025  
**Status**: Ready for deployment (pending Organization ID)

---

## Obtained Credentials

✅ **Client ID**: 1000.GVVI2XAURKFH186X3YEPV2VFDSGDDL  
✅ **Client Secret**: 4e4dca00ee845a59a0660cc2932ff60b23dab188f4  
✅ **Refresh Token**: 1000.c9bcaf317cd421e0c66b8f9c3ccc7f74.3d52d8d868caa13e30611c4025a94c79  
❓ **Organization ID**: PENDING (need from Zoho Books URL)  
✅ **Expense Account ID**: 4849689000000626507 (Trade Shows)  
✅ **Paid Through Account ID**: 4849689000000430009 (Business Checking Plus)

---

## To Get Organization ID

1. Log in to Zoho Books: https://books.zoho.com
2. Use credentials: admin@cooliohcandy.com / Kidevu1714!
3. Look at the URL - it will be: `https://books.zoho.com/app/{ORG_ID}#/...`
4. Copy the ORG_ID number

**OR** provide the full URL from one of these:
- Expense Account: 4849689000000626507
- Paid Through Account: 4849689000000430009

---

## Environment Variables to Add (Production Container 201)

```bash
# Boomin Brands Entity - REAL API (Production)
ZOHO_BOOMIN_ENABLED=true
ZOHO_BOOMIN_MOCK=false
ZOHO_BOOMIN_ENTITY_NAME=Boomin Brands
ZOHO_BOOMIN_CLIENT_ID=1000.GVVI2XAURKFH186X3YEPV2VFDSGDDL
ZOHO_BOOMIN_CLIENT_SECRET=4e4dca00ee845a59a0660cc2932ff60b23dab188f4
ZOHO_BOOMIN_REFRESH_TOKEN=1000.c9bcaf317cd421e0c66b8f9c3ccc7f74.3d52d8d868caa13e30611c4025a94c79
ZOHO_BOOMIN_ORGANIZATION_ID=XXXXXXXX  # PENDING - need from user
ZOHO_BOOMIN_EXPENSE_ACCOUNT_ID=4849689000000626507
ZOHO_BOOMIN_PAID_THROUGH_ACCOUNT_ID=4849689000000430009
ZOHO_BOOMIN_ORG_NAME=Boomin Brands
ZOHO_BOOMIN_EXPENSE_ACCOUNT=Trade Shows
ZOHO_BOOMIN_PAID_THROUGH=Business Checking Plus
```

---

## Code Changes Made

1. ✅ Added Boomin Brands configuration to `backend/src/config/zohoAccounts.ts`
2. ✅ Follows same dual-registration pattern as Haute Brands
3. ✅ Registers as both "boomin brands" and "boomin" for flexibility
4. ✅ Backend compiled successfully

---

**WAITING FOR**: Organization ID to complete setup

