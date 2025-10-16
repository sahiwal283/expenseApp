# Deployment Migration Guide - v1.4.1

## Overview
Version 1.4.1 introduces auto-approval logic that works from "needs further review" status. Existing expenses in production need to be updated to match this new logic.

## What This Migration Does

The migration `fix_needs_further_review_status.sql` will:

1. **Auto-approve expenses with assigned entities**
   - Changes status from "needs further review" → "approved"
   - Applies to any expense with a non-null `zoho_entity`

2. **Auto-approve expenses with reviewed reimbursements**
   - Changes status from "needs further review" → "approved"
   - Applies to expenses where `reimbursement_status` is 'approved' or 'rejected'

## Safe to Run Multiple Times
✅ This migration is **idempotent** - it can be run multiple times safely without side effects.

## Deployment Steps

### Option 1: Automatic Migration (Recommended)
The migration will run automatically when you deploy the backend:

```bash
# On the production container (201)
cd /opt/expenseapp
npm run migrate
```

This will:
- Run all pending migrations in alphabetical order
- Skip migrations that have already been applied
- Log results to console

### Option 2: Manual SQL Execution
If you prefer to run the migration manually:

```bash
# SSH into Proxmox
ssh root@192.168.1.190

# Execute on production database
pct exec 201 -- sudo -u postgres psql -d expense_app -f /path/to/fix_needs_further_review_status.sql
```

### Option 3: Direct psql Command
For a quick one-time fix:

```sql
-- Auto-approve expenses with entities
UPDATE expenses 
SET status = 'approved'
WHERE status = 'needs further review' 
  AND zoho_entity IS NOT NULL 
  AND zoho_entity != '';

-- Auto-approve expenses with reviewed reimbursements
UPDATE expenses 
SET status = 'approved'
WHERE status = 'needs further review' 
  AND reimbursement_required = true 
  AND reimbursement_status IN ('approved', 'rejected');
```

## Verification

After running the migration, verify the results:

```sql
-- Check how many expenses were updated
SELECT 
  COUNT(*) FILTER (WHERE zoho_entity IS NOT NULL) as with_entities,
  COUNT(*) FILTER (WHERE reimbursement_status IN ('approved', 'rejected')) as with_reimbursement_decisions
FROM expenses 
WHERE status = 'approved';

-- Check if any expenses are still stuck
SELECT COUNT(*) 
FROM expenses 
WHERE status = 'needs further review' 
  AND (zoho_entity IS NOT NULL OR reimbursement_status IN ('approved', 'rejected'));
-- Should return 0
```

## Rollback (If Needed)

If you need to rollback (not recommended):

```sql
-- This would revert the changes, but you'd need to know which expenses were changed
-- It's safer to just leave the migration applied as it represents the correct state
```

## Production Deployment Checklist

- [ ] Deploy backend v1.4.1 to production
- [ ] Run migration: `npm run migrate`
- [ ] Verify migration results (see Verification section)
- [ ] Deploy frontend v1.4.1 to production
- [ ] Restart NPM proxy to clear cache
- [ ] Test auto-approval on a new expense
- [ ] Verify old expenses now show correct status

## Expected Results

**Sandbox (Already Applied):**
- ✅ Updated 6 expenses with assigned entities
- ✅ Updated 3 expenses with approved/rejected reimbursements

**Production (Will Vary):**
- Number of affected expenses depends on production data
- All expenses with entities or reviewed reimbursements will auto-approve

## Support

If issues arise:
1. Check backend logs: `journalctl -u expenseapp-backend -n 50`
2. Verify database connection
3. Ensure PostgreSQL user has UPDATE permissions
4. Contact developer for assistance

---
**Migration Created:** October 16, 2025  
**Version:** 1.4.1  
**Status:** ✅ Tested in Sandbox, Ready for Production

