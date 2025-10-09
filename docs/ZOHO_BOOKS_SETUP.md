# Zoho Books Integration Setup Guide

This guide will walk you through setting up the Zoho Books API integration for automatic expense submission.

---

## 📋 Prerequisites

- Active Zoho Books account
- Admin access to Zoho Books
- Access to Zoho API Console

---

## 🔑 Step 1: Create a Zoho API Console Application

### 1.1 Go to Zoho API Console
Visit: [https://api-console.zoho.com/](https://api-console.zoho.com/)

### 1.2 Create a New Client
1. Click **"Add Client"**
2. Select **"Server-based Applications"**
3. Fill in the details:
   - **Client Name**: `ExpenseApp Integration`
   - **Homepage URL**: `https://your-domain.com` (or `http://localhost:3000` for testing)
   - **Authorized Redirect URIs**: `https://your-domain.com/auth/zoho/callback` (or `http://localhost:3000/auth/zoho/callback`)
4. Click **"Create"**

### 1.3 Note Your Credentials
After creating the client, you'll see:
- **Client ID** - Save this
- **Client Secret** - Save this (you won't be able to see it again!)

---

## 🔐 Step 2: Generate OAuth Tokens

### 2.1 Generate Authorization Code

Open this URL in your browser (replace `YOUR_CLIENT_ID` with your actual Client ID):

```
https://accounts.zoho.com/oauth/v2/auth?
  scope=ZohoBooks.fullaccess.all
  &client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=https://your-domain.com/auth/zoho/callback
  &access_type=offline
```

**Important Notes:**
- For `scope`, use `ZohoBooks.fullaccess.all` for full access
- The `access_type=offline` parameter is **required** to get a refresh token
- Use the exact `redirect_uri` you registered in Step 1.2

### 2.2 Authorize the Application
1. Log in to your Zoho account if prompted
2. Review the permissions requested
3. Click **"Accept"**
4. You'll be redirected to your redirect URI with a `code` parameter in the URL

### 2.3 Extract the Authorization Code
From the redirected URL, copy the `code` parameter value:
```
https://your-domain.com/auth/zoho/callback?code=1000.abc123xyz789...
```
Copy everything after `code=` (before any `&` if present)

### 2.4 Exchange Code for Refresh Token

Use `curl` to exchange the authorization code for a refresh token:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI" \
  -d "grant_type=authorization_code"
```

**Example:**
```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "code=1000.abc123xyz789..." \
  -d "client_id=1000.ABCDEFGHIJ..." \
  -d "client_secret=xyz789abc456..." \
  -d "redirect_uri=https://your-domain.com/auth/zoho/callback" \
  -d "grant_type=authorization_code"
```

### 2.5 Save the Refresh Token
The response will contain:
```json
{
  "access_token": "1000.access_token_here...",
  "refresh_token": "1000.refresh_token_here...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Save the `refresh_token`** - this is what you'll use in the application!

---

## 🏢 Step 3: Get Your Organization ID

### Option A: From Zoho Books Dashboard
1. Log in to [Zoho Books](https://books.zoho.com/)
2. Look at the URL: `https://books.zoho.com/app/ORGANIZATION_ID#/dashboard`
3. The `ORGANIZATION_ID` is the number in the URL

### Option B: Via API
```bash
curl -X GET "https://www.zohoapis.com/books/v3/organizations" \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN"
```

The response will show your organization(s) and their IDs.

---

## 💼 Step 4: Configure Chart of Accounts

You need to know the names of:
1. **Expense Account** - Where expenses are recorded (e.g., "Travel Expenses", "Office Supplies")
2. **Paid Through Account** - Which account pays for expenses (e.g., "Petty Cash", "Corporate Card")

### Find Account Names in Zoho Books:
1. Go to **Accountant** → **Chart of Accounts**
2. Find your expense account names under **Expenses**
3. Find your bank/cash account names under **Cash & Bank**
4. Note the exact names (case-sensitive!)

---

## ⚙️ Step 5: Configure Environment Variables

### 5.1 Sandbox Configuration

SSH into your sandbox container:
```bash
ssh root@192.168.1.190
pct exec 203 -- bash
```

Create/edit the backend `.env` file:
```bash
nano /opt/expenseapp/backend/.env
```

Add these variables:
```bash
# ========== ZOHO BOOKS CONFIGURATION ==========

# OAuth Credentials
ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID_HERE
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=1000.your_refresh_token_here

# Organization
ZOHO_ORGANIZATION_ID=12345678

# Chart of Accounts
ZOHO_EXPENSE_ACCOUNT_NAME=Travel Expenses
ZOHO_PAID_THROUGH_ACCOUNT=Petty Cash

# API Endpoints (optional - defaults shown)
# ZOHO_API_BASE_URL=https://www.zohoapis.com/books/v3
# ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com/oauth/v2
```

**Important Security Notes:**
- ✅ Never commit `.env` files to Git
- ✅ Use different credentials for sandbox vs production
- ✅ Restrict file permissions: `chmod 600 /opt/expenseapp/backend/.env`
- ✅ Only give credentials to trusted team members

### 5.2 Production Configuration

**DO NOT configure production until thoroughly tested in sandbox!**

When ready for production:
1. Create a **separate** Zoho API client for production
2. Generate **new** OAuth tokens using the production redirect URI
3. Configure production environment variables in container 201
4. Test thoroughly before going live

---

## 🧪 Step 6: Test the Integration

### 6.1 Restart Backend Service
```bash
systemctl restart expenseapp-backend
journalctl -u expenseapp-backend -f
```

Look for log messages like:
```
[Zoho] Zoho Books integration not configured, skipping submission
```
or
```
[Zoho] Expense created with ID: 12345
```

### 6.2 Check Health Endpoint
```bash
curl -X GET "http://localhost:5000/api/expenses/zoho/health" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "configured": true,
  "healthy": true,
  "message": "Connected to Zoho Books (Org: 12345678)"
}
```

### 6.3 Submit a Test Expense
1. Log in to the sandbox app: `http://192.168.1.144/`
2. Submit a new expense with a receipt
3. Check the backend logs:
   ```bash
   journalctl -u expenseapp-backend -n 50 | grep Zoho
   ```
4. Verify in Zoho Books:
   - Go to **Expenses** → **Expense Tracker**
   - Look for your newly submitted expense

---

## 🔧 Troubleshooting

### Issue: "Missing required Zoho Books configuration"
**Solution**: Ensure all environment variables are set correctly in `.env`

### Issue: "Failed to refresh OAuth token"
**Possible causes:**
- Refresh token expired (they last 1 year by default)
- Client ID/Secret incorrect
- Network connectivity issues

**Solution**: Generate a new refresh token (Steps 2.1-2.5)

### Issue: "Zoho API error: Invalid organization_id"
**Solution**: Double-check your `ZOHO_ORGANIZATION_ID` matches your Zoho Books org

### Issue: "Failed to attach receipt"
**Possible causes:**
- File too large (Zoho limit: 5MB)
- File type not supported
- Permissions issue on uploaded file

**Solution**: Check file size/type and permissions in `uploads/` directory

### Issue: "Account not found: Travel Expenses"
**Solution**: Verify exact account name in Zoho Books Chart of Accounts (case-sensitive!)

---

## 📊 Monitoring & Logs

### Backend Logs
```bash
# Real-time logs
journalctl -u expenseapp-backend -f

# Filter for Zoho-related logs
journalctl -u expenseapp-backend | grep "\[Zoho\]"

# Last 100 Zoho logs
journalctl -u expenseapp-backend -n 100 | grep "\[Zoho\]"
```

### Log Message Examples

**Success:**
```
[Zoho] Creating expense for Uber - $45.00
[Zoho] Expense created with ID: 12345678
[Zoho] Attaching receipt to expense 12345678
[Zoho] Receipt attached successfully
[Zoho] Expense abc-123-def submitted successfully. Zoho ID: 12345678
```

**Warnings:**
```
[Zoho] Zoho Books integration not configured, skipping submission
[Zoho] Failed to attach receipt: File too large
[Zoho] Continuing despite receipt attachment failure
```

**Errors:**
```
[Zoho] Failed to refresh access token: Invalid refresh_token
[Zoho] Failed to create expense: Account not found
[Zoho] Error submitting expense abc-123: Network timeout
```

---

## 🔄 Token Refresh

The integration automatically refreshes access tokens:
- Access tokens expire after 1 hour
- The service automatically refreshes before expiration
- Refresh tokens are valid for 1 year
- **Set a calendar reminder** to regenerate refresh tokens every 11 months!

---

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
   - `.env` files are in `.gitignore`
   - Double-check before committing!

2. **Use environment-specific credentials**
   - Sandbox: Test credentials
   - Production: Separate, secure credentials

3. **Restrict file permissions**
   ```bash
   chmod 600 /opt/expenseapp/backend/.env
   chown expenseapp:expenseapp /opt/expenseapp/backend/.env
   ```

4. **Rotate credentials regularly**
   - Refresh tokens every 11 months
   - Change client secrets if compromised

5. **Monitor API usage**
   - Check Zoho API Console for usage/limits
   - Set up alerts for unusual activity

6. **Limit API scope**
   - Use minimal required permissions
   - Currently using `ZohoBooks.fullaccess.all` (can be refined)

---

## 📚 Additional Resources

- [Zoho Books API Documentation](https://www.zoho.com/books/api/v3/)
- [Zoho OAuth 2.0 Documentation](https://www.zoho.com/accounts/protocol/oauth.html)
- [Zoho API Console](https://api-console.zoho.com/)
- [Zoho Books Support](https://www.zoho.com/books/help/)

---

## ✅ Post-Setup Checklist

- [ ] API Console application created
- [ ] Client ID and Client Secret obtained
- [ ] Refresh token generated
- [ ] Organization ID identified
- [ ] Chart of Accounts configured
- [ ] Environment variables set in sandbox
- [ ] Backend service restarted
- [ ] Health check endpoint returns success
- [ ] Test expense submitted successfully
- [ ] Expense visible in Zoho Books
- [ ] Receipt attached in Zoho Books
- [ ] Logs showing successful submissions
- [ ] Production credentials prepared (when ready)
- [ ] Calendar reminder set for token refresh

---

**Need Help?** Contact the development team or refer to the main `README.md` for additional support options.

