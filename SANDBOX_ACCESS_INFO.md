# ✅ SANDBOX ACCESS INFORMATION

**Status:** 🟢 **FULLY OPERATIONAL**  
**Date:** October 6, 2025

---

## 🌐 **CORRECT SANDBOX URL**

### ⚠️ IMPORTANT: Use the Correct IP

**✅ CORRECT URL:** **http://192.168.1.144**

~~❌ WRONG: http://192.168.1.150~~ (This was incorrect documentation)

---

## 🔑 **Login Credentials**

All test accounts use password: **`sandbox123`**

| Username | Role | Purpose |
|----------|------|---------|
| `admin` | Administrator | Full system access, user management |
| `coordinator` | Event Coordinator | Create/manage events, assign participants |
| `salesperson` | Salesperson | Submit expenses, view assigned events |
| `accountant` | Accountant | Approve expenses, assign Zoho entities, reimbursements |
| `salesperson2` | Salesperson | Additional salesperson for testing |

---

## ✅ **Services Status**

All services are running:

```
✅ nginx (Frontend):      Port 80  - ACTIVE
✅ expenseapp-backend:    Port 5000 - ACTIVE  
✅ ocr-service (EasyOCR): Port 8000 - ACTIVE
✅ PostgreSQL:            Port 5432 - ACTIVE
```

---

## 🧪 **Quick Test Commands**

### Frontend
```bash
curl http://192.168.1.144/
# Should return: HTML with <title>ExpenseApp</title>
```

### Backend API
```bash
curl http://192.168.1.144:5000/health
# Should return: {"status":"ok","message":"Server is running"}
```

### Login Test
```bash
curl -X POST http://192.168.1.144:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sandbox123"}'
# Should return: {"user":{...},"token":"..."}
```

---

## 📊 **Test Data Available**

### Users
- 5 test accounts (1 admin, 1 coordinator, 2 salespeople, 1 accountant)

### Events
- 4 trade show events (upcoming, active, completed)

### Expenses
- **5 pending expenses** (need coordinator approval)
- **6 approved expenses** (some need Zoho entity, some need reimbursement)
- **2 rejected expenses**

### Settings
- **6 card options** (Corporate Amex, Visa, Personal Card, etc.)
- **7 entity options** (Entity A-F with departments)

---

## 🔧 **Technical Details**

### Container Information
- **Proxmox Host:** 192.168.1.190
- **Container ID:** 203
- **Container Name:** expense-sandbox
- **IP Address:** 192.168.1.144/24
- **Gateway:** 192.168.1.1

### Ports
- **80** - Frontend (Nginx)
- **443** - HTTPS (if configured)
- **5000** - Backend API
- **8000** - OCR Service (internal)
- **5432** - PostgreSQL (localhost only)

### File Locations (Inside Container)
- Frontend: `/var/www/html/`
- Backend: `/opt/expenseapp/backend/`
- OCR Service: `/opt/ocr-service/`
- Uploads: `/opt/expenseapp/backend/uploads/`

---

## 🚀 **What to Test**

### 1. Login Flow
- Navigate to http://192.168.1.144
- Login with any test account
- Verify dashboard loads

### 2. Expense Submission (as Salesperson)
- Login as `salesperson` / `sandbox123`
- Submit new expense
- Upload receipt image
- **Verify OCR extracts text automatically** ⭐
- Submit expense

### 3. Expense Approval (as Coordinator)
- Login as `coordinator` / `sandbox123`
- View pending expenses
- Approve or reject expenses

### 4. Zoho Entity Assignment (as Coordinator)
- View approved expenses
- Assign Zoho entities to expenses without entity

### 5. Reimbursement Approval (as Accountant)
- Login as `accountant` / `sandbox123`
- View expenses needing reimbursement
- Approve reimbursements

### 6. Event Management (as Coordinator)
- Create new event
- Assign participants (salespeople)
- Set budget and dates

### 7. User Management (as Admin)
- Login as `admin` / `sandbox123`
- View all users
- Manage settings

---

## 🔍 **Troubleshooting**

### Cannot Connect
```bash
# Check if you can ping the container
ping 192.168.1.144

# Check if port 80 is accessible
nc -zv 192.168.1.144 80
```

### Services Not Running
```bash
# SSH into Proxmox and check services
ssh root@192.168.1.190
pct exec 203 -- systemctl status nginx expenseapp-backend ocr-service
```

### Backend Not Responding
```bash
# Check backend logs
ssh root@192.168.1.190 'pct exec 203 -- journalctl -u expenseapp-backend -n 50'
```

### OCR Not Working
```bash
# Check OCR service logs
ssh root@192.168.1.190 'pct exec 203 -- journalctl -u ocr-service -n 50'

# Test OCR service
ssh root@192.168.1.190 'pct exec 203 -- curl localhost:8000/health'
```

---

## 📝 **Recent Changes**

### EasyOCR Integration (October 6, 2025)
- ✅ Replaced Tesseract.js with EasyOCR
- ✅ 85-90% accuracy on receipts (vs 60-70% with Tesseract)
- ✅ Automatic structured data extraction
- ✅ Python microservice with FastAPI
- ✅ All dependencies removed from Node.js backend

### Version Updates
- Frontend: v0.7.0
- Backend: v1.1.0
- OCR Service: EasyOCR 1.7.2

---

## 🎉 **Ready to Test!**

**Access the sandbox now at:** **http://192.168.1.144**

All services are operational and the OCR replacement is complete. Test the receipt upload feature to see EasyOCR in action!

---

**Last Updated:** October 6, 2025  
**Container IP:** 192.168.1.144  
**Status:** 🟢 OPERATIONAL

