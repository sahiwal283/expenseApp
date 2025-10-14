# 🔑 Sandbox Credentials

## Standard Sandbox Password

**ALL sandbox users use the same password:** `sandbox123`

This is enforced and should never be changed for the sandbox environment.

---

## User Accounts

| Username | Email | Role | Password |
|----------|-------|------|----------|
| admin | admin@example.com | admin | `sandbox123` |
| coordinator | coordinator@example.com | coordinator | `sandbox123` |
| salesperson | salesperson@example.com | salesperson | `sandbox123` |
| accountant | accountant@example.com | accountant | `sandbox123` |

---

## Sandbox Access

- **URL:** http://192.168.1.144
- **API:** http://192.168.1.144/api/
- **Container:** 203 (expense-sandbox)
- **IP:** 192.168.1.144

---

## If Passwords Are Wrong

If you can't log in, run this script to reset all passwords to `sandbox123`:

```bash
# From your local machine
ssh root@192.168.1.190

# Enter sandbox container
pct exec 203 -- bash

# Reset passwords
cd /opt/expenseApp/backend
node reset-sandbox-passwords.js
```

Or run it directly:
```bash
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && node reset-sandbox-passwords.js'"
```

---

## Database Access

- **Database:** `expense_app_sandbox`
- **User:** `expense_sandbox`
- **Password:** `sandbox123`

```bash
# Connect to database
pct exec 203 -- sudo -u postgres psql -d expense_app_sandbox
```

---

## Important Notes

1. ✅ **Seed script automatically uses `sandbox123`** when `NODE_ENV=development` or database name contains "sandbox"
2. ✅ **Reset script** (`reset-sandbox-passwords.js`) is available in the backend directory
3. ✅ **Never change** sandbox passwords to anything other than `sandbox123`
4. ⚠️ **Production** uses different passwords (not `sandbox123`)

---

## Troubleshooting

**Problem:** Can't log in with `sandbox123`

**Solution:**
```bash
cd /Users/sahilkhatri/Projects/Haute/expenseApp
ssh root@192.168.1.190 "pct exec 203 -- bash -c 'cd /opt/expenseApp/backend && node reset-sandbox-passwords.js'"
```

This will reset all users to `sandbox123` immediately.

---

**Last Updated:** October 14, 2025
**Version:** 1.0.1

