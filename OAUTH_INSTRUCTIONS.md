# 🔐 Zoho OAuth - Get Your Refresh Token

**Date:** October 10, 2025  
**For:** Haute Brands Production API

---

## ✅ What I've Done Automatically

- ✅ Generated JWT_SECRET: `b3E4pKQgio3KuEuuV6ijiYP2cVJYAM2V2NfhPok6XiI=`
- ✅ Generated SESSION_SECRET: `QFASGIansbkI7LlQ/cC4tWSz1FJ2adsvrkZJE5QGLFc=`
- ✅ Verified production domain: `https://expapp.duckdns.org/`

---

## 🎯 Step 1: Get Authorization Code

**Click this link** (or copy/paste into browser):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.expenses.CREATE,ZohoBooks.expenses.READ,ZohoBooks.settings.READ,ZohoBooks.accountants.READ&client_id=1000.6XS1OS32BX1BGKV25XDOIBWHSQN9VI&response_type=code&redirect_uri=https://expapp.duckdns.org/auth/zoho/callback&access_type=offline&prompt=consent
```

**What will happen:**
1. Zoho will ask you to log in (use nabeelhpe@gmail.com)
2. Zoho will ask you to authorize the app
3. You'll be redirected to: `https://expapp.duckdns.org/auth/zoho/callback?code=XXXXXXXXXX`
4. **Copy the entire URL** from your browser's address bar

---

## 🎯 Step 2: Exchange Code for Refresh Token

Once you have the code, run this command (replace `YOUR_CODE_HERE` with the actual code):

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "client_id=1000.6XS1OS32BX1BGKV25XDOIBWHSQN9VI" \
  -d "client_secret=3d9be2c0d9b132251c91bffacd01186b13a3f5a05a" \
  -d "code=YOUR_CODE_HERE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://expapp.duckdns.org/auth/zoho/callback"
```

**The response will contain your refresh_token** - copy it!

---

## 📝 Account IDs Needed

While doing the OAuth flow, also grab these from Zoho Books:

### Expense Account ID
1. Go to: https://books.zoho.com/app/856048585#/accountant/chartofaccounts
2. Search for "Meals" or "Travel Expenses" or whichever account you want expenses posted to
3. Click on it - the ID will be in the URL
4. Example: `https://books.zoho.com/app/856048585#/accountant/chartofaccounts/1234567890000123456`
5. The ID is: `1234567890000123456`

### Paid Through Account ID (Business Checking)
1. Same page: https://books.zoho.com/app/856048585#/accountant/chartofaccounts
2. Search for "Business Checking"
3. Click on it - grab the ID from URL

---

## 🚀 Once You Have Everything

Provide me:
1. ✅ Client ID (already have)
2. ✅ Client Secret (already have)
3. ✅ Organization ID: 856048585 (already have)
4. ⏳ **Refresh Token** (from Step 2 above)
5. ⏳ **Expense Account ID** (from Zoho Books)
6. ⏳ **Paid Through Account ID** (from Zoho Books)

And I'll deploy everything to production immediately! 🎉

