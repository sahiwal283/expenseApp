# 📍 Where to Check Zoho Books for Submitted Expenses

## 🔔 **New: Toast Notifications!**

When you assign an entity to an expense in the ExpenseApp, you'll now see a **toast notification** telling you if it was pushed to Zoho Books:

### **Notification Types:**

✅ **Real Zoho (haute):**
```
✅ Entity assigned! Expense is being pushed to Haute Brands Zoho Books...
```

ℹ️ **Mock Zoho (alpha/beta/gamma/delta):**
```
ℹ️ Entity assigned to alpha! (Mock mode - simulated Zoho sync)
```

✅ **Other Entities:**
```
✅ Entity "CompanyX" assigned successfully
```

---

## 📊 **Where to Find Submitted Expenses in Zoho Books**

### **Step 1: Login to Zoho Books**

**URL:** https://books.zoho.com/  
**Email:** nabeelhpe@gmail.com  
**Password:** Kidevu1714!

---

### **Step 2: Navigate to Expense Tracker**

Once logged in, you have **two ways** to access expenses:

#### **Option A: From Left Sidebar**
1. Click **"Expenses"** in the left sidebar
2. Click **"Expense Tracker"**

#### **Option B: Direct URL**
https://books.zoho.com/app/856048585#/expenses

---

### **Step 3: View Your Expenses**

You'll see a table with all expenses. Here's what each column means:

| Column | Description | Example |
|--------|-------------|---------|
| **Date** | Expense date | Oct 9, 2025 |
| **Expense#** | Zoho-generated ID | EXP-000001 |
| **Vendor Name** | Merchant from ExpenseApp | Uber, Starbucks, etc. |
| **Customer** | User who submitted | John Doe |
| **Project** | Event/Trade Show | CES 2025 |
| **Amount** | Expense amount | $100.00 |
| **Billable** | Reimbursement flag | Yes/No |
| **Receipt** | Has attachment | 📎 icon if receipt attached |
| **Status** | Zoho status | Unbilled, Invoiced, etc. |

---

### **Step 4: View Expense Details**

**Click on any expense row** to see full details:

#### **What You'll See:**

1. **Expense Information**
   - Date, Vendor, Amount
   - Customer (User who submitted)
   - Project (Event/Trade Show)
   - Account (e.g., "Travel Expenses")
   - Paid Through (e.g., "Petty Cash")

2. **Description**
   - Auto-generated from ExpenseApp
   - Format: `Category: Travel | Event: CES 2025 | [User's description]`

3. **Receipt Attachment**
   - Click **"Receipt"** tab or 📎 icon
   - View/download the uploaded receipt

4. **Expense Notes**
   - Any additional notes
   - Custom fields (if configured)

5. **Audit Trail**
   - Created date/time
   - Last modified
   - Created by (via API)

---

## 🔍 **Search & Filter Expenses**

### **Search Bar (Top Right):**
- Search by vendor name, customer, project, amount
- Example: Type "Uber" to find all Uber expenses

### **Filter Options:**

**Click "Filter" button** to filter by:

- **Date Range:** Last 7 days, This month, Custom range
- **Status:** Unbilled, Invoiced, Approved
- **Customer:** Filter by user
- **Project:** Filter by trade show event
- **Expense Account:** Travel, Meals, etc.
- **Billable:** Yes (reimbursement), No

### **Common Filters:**

**Today's Expenses:**
```
Date Range: Today
```

**Expenses for a Specific Trade Show:**
```
Project: CES 2025
```

**Reimbursable Expenses:**
```
Billable: Yes
```

---

## 📋 **Verifying ExpenseApp → Zoho Sync**

### **What to Check:**

After assigning an entity to "haute" in ExpenseApp:

1. **Wait 2-5 seconds** (sync is nearly instant)
2. **Refresh Zoho Books** (press F5 or click refresh)
3. **Check for new expense** at the top of the list
4. **Verify details match:**
   - ✅ Vendor = Merchant from ExpenseApp
   - ✅ Amount = Expense amount
   - ✅ Date = Expense date
   - ✅ Customer = User who submitted
   - ✅ Project = Trade show event
   - ✅ Receipt = Uploaded file (if any)

### **Troubleshooting:**

**If you don't see the expense:**

1. **Check toast notification** - Did it say "pushed to Zoho Books"?
2. **Check backend logs:**
   ```bash
   ssh root@192.168.1.190
   pct exec 203 -- journalctl -u expenseapp-backend -n 50 | grep Zoho
   ```
   Look for:
   ```
   [Zoho:haute:REAL] Expense created with ID: 12345678
   [Zoho:haute:REAL] Receipt attached successfully
   ```
3. **Check database for Zoho ID:**
   ```bash
   pct exec 203 -- su - postgres -c "psql -d expense_app_sandbox -c \"SELECT merchant, amount, zoho_entity, zoho_expense_id FROM expenses WHERE zoho_entity = 'haute' ORDER BY submitted_at DESC LIMIT 5;\""
   ```
4. **Verify Zoho health:**
   - Login to sandbox: http://192.168.1.144/
   - Test the health check endpoint

**If receipt is missing:**
- Check if file was uploaded in ExpenseApp
- Check file size (< 5MB limit)
- Check backend logs for receipt attachment errors

---

## 📱 **Mobile Access**

### **Zoho Books Mobile App:**

Available for iOS and Android:
- **iOS:** https://apps.apple.com/app/zoho-books/id883099366
- **Android:** https://play.google.com/store/apps/details?id=com.zoho.books

**Login with same credentials:**
- Email: nabeelhpe@gmail.com
- Password: Kidevu1714!

**Features:**
- View all expenses
- View receipts
- Search and filter
- Push notifications for new expenses (if configured)

---

## 📊 **Expense Reports in Zoho Books**

### **View Expense Reports:**

1. Go to **"Reports"** in left sidebar
2. Click **"Expenses"**
3. Choose report type:
   - **Expense by Customer** - Group by user
   - **Expense by Project** - Group by trade show
   - **Expense by Category** - Group by expense type
   - **Billable vs Non-Billable** - Reimbursements
   - **Custom Report** - Build your own

### **Common Reports:**

**Total Expenses by Trade Show:**
```
Reports → Expenses → Expense by Project
```

**Reimbursable Expenses:**
```
Reports → Expenses → Billable Expenses Report
```

**Monthly Expense Summary:**
```
Reports → Expenses → Expense by Category
Date Range: This Month
```

---

## 🔄 **Real-Time Sync Status**

### **In ExpenseApp (Sandbox):**

**Toast Notifications:**
- Appear top-right when entity is assigned
- Auto-dismiss after 5 seconds
- Click X to dismiss manually

**Log Monitoring:**
```bash
# Real-time Zoho sync logs
ssh root@192.168.1.190
pct exec 203 -- journalctl -u expenseapp-backend -f | grep "\[Zoho\]"
```

**What to look for:**
```
✅ Success:
[Zoho:haute:REAL] Creating expense for Uber - $45.00
[Zoho:haute:REAL] Expense created with ID: 12345678
[Zoho:haute:REAL] Receipt attached successfully

ℹ️  Mock Mode:
[Zoho:alpha:MOCK] Creating mock expense for Starbucks - $15.00
[Zoho:alpha:MOCK] Mock expense created with ID: MOCK-ALPHA-1728500000-1

❌ Error:
[Zoho:haute:REAL] Failed to create expense: [error message]
```

---

## 🎯 **Quick Reference**

### **URLs:**

| Resource | URL |
|----------|-----|
| **Zoho Books Login** | https://books.zoho.com/ |
| **Expense Tracker** | https://books.zoho.com/app/856048585#/expenses |
| **Sandbox App** | http://192.168.1.144/ |

### **Credentials:**

| System | Username/Email | Password |
|--------|----------------|----------|
| **Zoho Books** | nabeelhpe@gmail.com | Kidevu1714! |
| **Sandbox** | admin | sandbox123 |

### **Entity Mapping:**

| ExpenseApp Entity | Zoho Account | Mode |
|-------------------|--------------|------|
| **haute** | Haute Brands (856048585) | REAL ✅ |
| **alpha** | Mock (100001) | MOCK 🎭 |
| **beta** | Mock (100002) | MOCK 🎭 |
| **gamma** | Mock (100003) | MOCK 🎭 |
| **delta** | Mock (100004) | MOCK 🎭 |

---

## 💡 **Pro Tips**

### **1. Bookmark the Expense Tracker**
Add this to your bookmarks for quick access:
```
https://books.zoho.com/app/856048585#/expenses
```

### **2. Enable Email Notifications**
In Zoho Books settings, enable email notifications for:
- New expenses created via API
- Expense approvals needed
- Receipt attachments added

### **3. Custom Views**
Create saved filters for common searches:
- "Today's Expenses"
- "This Week's Reimbursements"
- "Expenses by Trade Show"

### **4. Export Options**
Export expenses to:
- PDF
- Excel
- CSV
- Print

Click "More" → "Export" in Expense Tracker

---

## 🆘 **Need Help?**

### **If expenses aren't syncing:**
1. Check toast notification (did it show success?)
2. Check backend logs (see command above)
3. Verify Zoho Books health check
4. Check `ZOHO_INTEGRATION_SUMMARY.md` for troubleshooting

### **If you can't find an expense:**
1. Try searching by merchant name
2. Check date filters (expand date range)
3. Clear all filters
4. Sort by "Date" (newest first)

### **For Zoho Books support:**
- Zoho Support: https://www.zoho.com/books/help/
- API Documentation: https://www.zoho.com/books/api/v3/

---

**You now have visual feedback when expenses are pushed to Zoho Books, and you know exactly where to check!** 🎉

