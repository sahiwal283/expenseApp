# 🧪 Testing Guide - v0.35.15

## 🎯 What's New in This Version

### Enhanced Date Investigation Tools
I've implemented comprehensive diagnostic logging to finally solve the date discrepancy issue.

**The Problem**: You're seeing Oct 9 in Zoho Books when you send Oct 7.

**The Solution**: We'll now see EXACTLY what Zoho returns to determine WHERE the date is changing.

---

## ✅ What's Already Done

1. ✅ **API Response Logging**: Full Zoho response is now logged
2. ✅ **Date Comparison**: Explicit "We sent X, Zoho stored Y" in logs
3. ✅ **ISO Date Format**: Ready to test if needed (with timezone)
4. ✅ **Deployed**: v0.35.15 is live on sandbox
5. ✅ **Log Monitoring**: Running in background

---

## 🧪 YOUR TESTING TASKS

### Test 1: API Response Analysis (MOST IMPORTANT) 🔴

**This test will definitively show where the date is being changed.**

#### Steps:

1. **Open Sandbox**:
   - Go to: https://sandbox.expenseapp.example.com
   - **Hard Refresh**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
   - Verify top-right shows: **v0.35.15**

2. **Go to Approvals Page**

3. **Find an Expense**:
   - Look for an expense dated **October 7, 2025**
   - (Or any past date that's NOT today)

4. **Assign to Haute Entity**:
   - Click the entity dropdown
   - Select **"haute"**
   - (Or reassign if already assigned to haute)
   - Wait for success toast notification

5. **Check Logs**:
   - Your terminal should show the API response
   - Look for lines like:
     ```
     [Zoho:haute:REAL] API Response: { ... }
     [Zoho:haute:REAL] ⚠️  DATE CHECK: We sent: 2025-10-07, Zoho stored: 2025-10-XX
     ```

6. **Check Zoho Books UI**:
   - Login: nabeelhpe@gmail.com / Kidevu1714!
   - Navigate to: **Accountant → Expenses**
   - Open the expense you just created
   - Check the **"Expense Date"** field

#### What to Report:

**Screenshot 1**: Terminal logs showing the API response and date check
**Screenshot 2**: Zoho Books expense showing the date

**Critical Question**: Does the API response date match the Zoho UI date?

- **If YES** (both wrong): API is converting the date ➔ We'll try ISO format
- **If NO** (API correct, UI wrong): UI timezone issue ➔ We'll check settings
- **If BOTH CORRECT**: 🎉 Problem solved!

---

### Test 2: ISO Format (Only If Needed)

**Skip this unless Test 1 shows the API is converting the date.**

If the API response shows the wrong date, we'll enable ISO format:

```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'echo \"ZOHO_USE_ISO_DATE=true\" >> /opt/expenseapp/backend/.env && systemctl restart expenseapp-backend'"
```

Then repeat Test 1 with a different expense.

---

### Test 3: Merchant Name Verification ✅

**This should already be working from v0.35.14, just need to verify.**

#### Steps:

1. Login to Zoho Books: nabeelhpe@gmail.com / Kidevu1714!
2. Navigate to: **Accountant → Expenses**
3. Open any expense submitted from the app
4. Check the **Description** field

#### Expected:

```
User: Admin User | Merchant: Hertz Car Rental | Category: Transportation | Event: NAB Show 2025
```

✅ **Merchant name should appear between User and Category**

---

## 📊 What You'll Learn from These Tests

### Scenario A: API Response Shows Correct Date
**Example**:
```
[Zoho:haute:REAL] ⚠️  DATE CHECK: We sent: 2025-10-07, Zoho stored: 2025-10-07
```
But Zoho Books UI shows Oct 9.

**Diagnosis**: Zoho Books UI timezone display issue  
**Next Step**: Check organization timezone settings in Zoho

### Scenario B: API Response Shows Wrong Date
**Example**:
```
[Zoho:haute:REAL] ⚠️  DATE CHECK: We sent: 2025-10-07, Zoho stored: 2025-10-09
```

**Diagnosis**: API is converting the date  
**Next Step**: Enable ISO format with explicit timezone (Test 2)

### Scenario C: Everything Works
**Example**:
```
[Zoho:haute:REAL] ⚠️  DATE CHECK: We sent: 2025-10-07, Zoho stored: 2025-10-07
```
And Zoho Books UI shows Oct 7.

**Diagnosis**: 🎉 Fixed! The enhanced logging revealed the issue  
**Next Step**: Production deployment

---

## 🆘 If You Need Help

### View Logs Manually
```bash
ssh root@192.168.1.190 "pct exec 203 -- journalctl -u expenseapp-backend --since '5 minutes ago' --no-pager | grep -E 'API Response|DATE CHECK'"
```

### Check Backend Status
```bash
ssh root@192.168.1.190 "pct exec 203 -- systemctl status expenseapp-backend"
```

### Restart Backend
```bash
ssh root@192.168.1.190 "pct exec 203 -- systemctl restart expenseapp-backend"
```

---

## 📝 Quick Summary

**What I Did**:
1. Added full API response logging to see what Zoho returns
2. Added explicit date comparison ("We sent X, Zoho stored Y")
3. Implemented ISO 8601 format option (ready if needed)
4. Researched Zoho timezone behavior
5. Deployed v0.35.15 to sandbox

**What You Need to Do**:
1. ✅ Test 1: Assign expense, check logs and Zoho UI
2. ⏳ Test 2: Only if needed - enable ISO format
3. ✅ Test 3: Verify merchant name appears

**Expected Outcome**:
- We'll definitively know where the date is changing
- We'll have a clear path to fix it
- Production deployment will be unblocked

---

## 📞 Report Back

Please share:
1. Screenshot of terminal logs showing API response
2. Screenshot of Zoho Books expense showing date
3. Confirmation of merchant name in description
4. Any errors or unexpected behavior

**Reference Documents**:
- `SESSION_STATUS_v0.35.15.md` - Complete session status
- `AI_SESSION_SUMMARY_v0.35.15.md` - Technical details for AI
- `docs/CHANGELOG.md` - What changed in v0.35.15

---

**Ready to test!** 🚀

The comprehensive logging will finally give us the evidence we need to solve this.

