# Boomin Brands - OAuth Refresh Token Setup
**Date**: October 13, 2025  
**Entity**: Boomin Brands  
**Client ID**: 1000.GVVI2XAURKFH186X3YEPV2VFDSGDDL

---

## Step 1: Get Authorization Code

**Click this URL** (log in with admin@cooliohcandy.com / Kidevu1714!):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.expenses.CREATE,ZohoBooks.expenses.UPDATE&client_id=1000.GVVI2XAURKFH186X3YEPV2VFDSGDDL&response_type=code&redirect_uri=https://expapp.duckdns.org/auth/zoho/callback&access_type=offline
```

**After authorization**, you'll be redirected to:
```
https://expapp.duckdns.org/auth/zoho/callback?code=XXXXX
```

**Copy the `code=XXXXX` value** and provide it to me.

---

## Step 2: Exchange Code for Refresh Token

Once you provide the code, I'll run:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=YOUR_CODE_HERE" \
  -d "client_id=1000.GVVI2XAURKFH186X3YEPV2VFDSGDDL" \
  -d "client_secret=4e4dca00ee845a59a0660cc2932ff60b23dab188f4" \
  -d "redirect_uri=https://expapp.duckdns.org/auth/zoho/callback" \
  -d "grant_type=authorization_code"
```

---

## Reference URLs

- **Expense Account (Trade Shows)**: 4849689000000626507
- **Paid Through (Business Checking Plus)**: 4849689000000430009
- **Organization ID**: Will be extracted from API response

---

**WAITING FOR**: Authorization code from OAuth flow

