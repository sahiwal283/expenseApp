# Database Setup - Sandbox v0.14.0

**Date:** October 7, 2025  
**Status:** ✅ COMPLETE  

---

## Issue

Sandbox environment had no data:
- No users
- No events
- No expenses
- No settings

This made testing impossible.

---

## Solution

Created and populated the PostgreSQL database with comprehensive test data.

---

## Database Created

### Tables:
- `users` - User accounts with roles
- `trade_shows` - Trade show events
- `expenses` - Expense records
- `settings` - Application configuration

### Indexes:
- `idx_expenses_user_id`
- `idx_expenses_event_id`
- `idx_expenses_status`
- `idx_expenses_date`

---

## Test Data Populated

### Users (4):

| Username   | Password    | Role       | Department |
|------------|-------------|------------|------------|
| admin      | sandbox123  | admin      | IT         |
| manager    | sandbox123  | manager    | Sales      |
| employee   | sandbox123  | employee   | Sales      |
| accountant | sandbox123  | accountant | Finance    |

**Password:** All users use `sandbox123` (bcrypt hashed)

### Trade Shows (4):

1. **CES 2025**
   - Location: Las Vegas, NV
   - Dates: January 9-12, 2025
   - Budget: $50,000
   - Status: Upcoming

2. **Mobile World Congress**
   - Location: Barcelona, Spain
   - Dates: February 26 - March 1, 2025
   - Budget: $75,000
   - Status: Upcoming

3. **NAB Show**
   - Location: Las Vegas, NV
   - Dates: April 6-10, 2025
   - Budget: $60,000
   - Status: Upcoming

4. **E3 Gaming Expo**
   - Location: Los Angeles, CA
   - Dates: June 11-13, 2025
   - Budget: $45,000
   - Status: Upcoming

### Expenses (1 sample):

- **Hertz Car Rental**
  - Amount: $229.53
  - Category: Transportation
  - Date: January 8, 2025
  - Description: Rental car for CES 2025
  - Status: Pending
  - Card: Corporate Amex
  - Location: Indianapolis, IN
  - Submitted by: employee

### Settings (2):

1. **Card Options:**
   - Corporate Amex
   - Corporate Visa
   - Personal Card (Reimbursement)
   - Company Debit
   - Cash

2. **Entity Options:**
   - Entity A - Main Operations
   - Entity B - Sales Division
   - Entity C - Marketing Department
   - Entity D - International Operations

---

## Verification

```sql
-- Users count
SELECT COUNT(*) FROM users;
-- Result: 4

-- Events count
SELECT COUNT(*) FROM trade_shows;
-- Result: 4

-- Expenses count
SELECT COUNT(*) FROM expenses;
-- Result: 1

-- Settings count
SELECT COUNT(*) FROM settings;
-- Result: 2
```

---

## Commands Executed

```bash
# 1. Create database
su - postgres -c "psql -c 'CREATE DATABASE expenseapp;'"

# 2. Create schema
su - postgres -c "psql -d expenseapp -f schema.sql"

# 3. Populate test data
su - postgres -c "psql -d expenseapp -f test_data.sql"
```

---

## Access Information

**Sandbox URL:** http://192.168.1.144/  
**Version:** v0.14.0

**Test Users:**
- `admin` / `sandbox123` - Full admin access
- `manager` / `sandbox123` - Manager access
- `employee` / `sandbox123` - Employee access
- `accountant` / `sandbox123` - Accountant access

---

## Testing Checklist

- [x] Database created successfully
- [x] Schema applied correctly
- [x] Test users created with bcrypt passwords
- [x] Trade show events populated
- [x] Sample expense created
- [x] Settings configured
- [x] All users can login
- [x] Dashboard displays data
- [x] Events visible in dropdown
- [x] Expenses visible in list

---

## Notes

### Password Security
- All test passwords are `sandbox123`
- Hashed using bcrypt with cost factor 10
- Hash: `$2b$10$6HvB8yPPJ8YqF0Cj5g4J0ewqYl.X2fJqy8Q8MnHvLgzKy5JqNqj4W`

### Database Configuration
- Database: `expenseapp`
- PostgreSQL version: Latest
- Character encoding: UTF8
- Connection: Unix socket

### Future Improvements
- Add more sample expenses across different users
- Add approved/rejected expense examples
- Add expenses requiring reimbursement
- Add expenses with uploaded receipts
- Add more diverse event types

---

**Status:** ✅ COMPLETE  
**Deployed:** October 7, 2025  
**Version:** v0.14.0

