# [Entity Name] - Zoho Books Credentials

**Date**: [Date Created]  
**Status**: [Active/Sandbox/Inactive]

---

## Production Credentials

✅ **Client ID**: `[Your Client ID]`  
✅ **Client Secret**: `[Your Client Secret]`  
✅ **Refresh Token**: `[Your Refresh Token]`  
✅ **Organization ID**: `[Your Organization ID]`

### Zoho Account IDs (from Chart of Accounts)

✅ **Expense Account ID**: `[Account ID]` (e.g., 'Trade Shows')  
✅ **Paid Through Account ID**: `[Account ID]` (e.g., 'Business Checking')

---

## Environment Variables (backend/.env)

```bash
ZOHO_[ENTITY]_ENABLED=true
ZOHO_[ENTITY]_MOCK=false
ZOHO_[ENTITY]_ENTITY_NAME=[Entity Name]
ZOHO_[ENTITY]_CLIENT_ID=[client_id]
ZOHO_[ENTITY]_CLIENT_SECRET=[client_secret]
ZOHO_[ENTITY]_REFRESH_TOKEN=[refresh_token]
ZOHO_[ENTITY]_ORGANIZATION_ID=[org_id]
ZOHO_[ENTITY]_EXPENSE_ACCOUNT_ID=[expense_account_id]
ZOHO_[ENTITY]_PAID_THROUGH_ACCOUNT_ID=[paid_through_account_id]
ZOHO_[ENTITY]_ORG_NAME=[Org Display Name]
ZOHO_[ENTITY]_EXPENSE_ACCOUNT=[Account Name]
ZOHO_[ENTITY]_PAID_THROUGH=[Payment Account Name]
```

---

## OAuth Setup (How to Get These Credentials)

### Step 1: Get Authorization Code

Generate OAuth URL:
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.expenses.CREATE,ZohoBooks.expenses.READ,ZohoBooks.settings.READ,ZohoBooks.accountants.READ&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://expapp.duckdns.org/auth/zoho/callback&access_type=offline&prompt=consent
```

1. Replace `YOUR_CLIENT_ID` with your Zoho app's Client ID
2. Open the URL in a browser
3. Log in to Zoho and authorize the app
4. Copy the entire callback URL (contains the `code` parameter)

### Step 2: Exchange Code for Refresh Token

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_CODE_HERE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://expapp.duckdns.org/auth/zoho/callback"
```

The response contains your `refresh_token` - save it securely!

### Step 3: Get Account IDs from Zoho Books

1. **Expense Account ID**:
   - Go to Chart of Accounts: `https://books.zoho.com/app/YOUR_ORG_ID#/accountant/chartofaccounts`
   - Find your expense account (e.g., "Trade Shows")
   - Click on it - the ID is in the URL

2. **Paid Through Account ID**:
   - Same page - find your payment account (e.g., "Business Checking")
   - Click on it - grab the ID from URL

---

## Backend Configuration

Edit `backend/src/config/zohoAccounts.ts`:

```typescript
const [entity]Config = {
  entityName: process.env.ZOHO_[ENTITY]_ENTITY_NAME || '[Entity Name]',
  enabled: true,
  mock: process.env.ZOHO_[ENTITY]_MOCK === 'true',
  clientId: process.env.ZOHO_[ENTITY]_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_[ENTITY]_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_[ENTITY]_REFRESH_TOKEN || '',
  organizationId: process.env.ZOHO_[ENTITY]_ORGANIZATION_ID || '',
  expenseAccountId: process.env.ZOHO_[ENTITY]_EXPENSE_ACCOUNT_ID || '',
  paidThroughAccountId: process.env.ZOHO_[ENTITY]_PAID_THROUGH_ACCOUNT_ID || '',
  orgName: process.env.ZOHO_[ENTITY]_ORG_NAME || '[Org Name]',
  expenseAccount: process.env.ZOHO_[ENTITY]_EXPENSE_ACCOUNT || '[Account Name]',
  paidThrough: process.env.ZOHO_[ENTITY]_PAID_THROUGH || '[Payment Account]'
};
accounts.set([entity]Config.entityName.toLowerCase(), [entity]Config);
```

---

## Testing

1. Deploy backend with new environment variables
2. Add entity name to Settings → Entity Options
3. Create test expense with new entity
4. Verify expense appears in Zoho Books
5. Confirm receipt attachment (if provided)

---

## Security Notes

- This file contains sensitive API credentials and should be treated with utmost care
- **DO NOT** commit this file to public repositories
- Ensure proper access controls are in place for this file on deployment servers
- Refresh tokens should be rotated periodically
- Store backups in a secure password manager or encrypted storage

---

## Support

For OAuth setup issues, see:
- Zoho Books API Documentation: https://www.zoho.com/books/api/v3/
- Main project docs: `docs/AI_MASTER_GUIDE.md`

For questions, contact the system administrator.

