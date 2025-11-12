# Production Migration Plan & Verification Report

**Date:** November 12, 2025  
**Prepared By:** Database Agent  
**Status:** ⚠️ ISSUES IDENTIFIED - Requires Resolution Before Production

---

## Executive Summary

**Critical Issues Found:**
1. ⚠️ **Many migration files NOT tracked in git** (002, 007-022)
2. ⚠️ **Duplicate migration number 023** (two files with same number)
3. ⚠️ **Migration 024 not in production** (user_checklist_items table missing)
4. ✅ **Production schema verified** - Core tables exist and are correct

**Recommendation:** Resolve git tracking issues before production deployment.

---

## 1. Migration File Status

### Files Tracked in Git ✅
- `003_create_roles_table.sql`
- `004_create_audit_log.sql`
- `006_create_ocr_corrections_table.sql`
- `023_fix_audit_log_table_name.sql`
- `023_rename_audit_log_to_audit_logs.sql` ⚠️ **DUPLICATE**
- `024_create_user_checklist_items.sql`

### Files NOT Tracked in Git ❌
- `002_add_temporary_role.sql`
- `007_enhance_ocr_corrections_for_cross_environment.sql`
- `008_create_user_sessions_table.sql`
- `009_create_api_requests_table.sql`
- `010_add_developer_role.sql`
- `011_add_offline_sync_support.sql`
- `012_add_pending_role.sql`
- `013_add_pending_user_role.sql`
- `014_add_zoho_expense_id.sql`
- `015_fix_needs_further_review_status.sql`
- `016_add_show_and_travel_dates.sql`
- `017_add_event_checklist.sql`
- `018_add_custom_checklist_items.sql`
- `019_add_checklist_templates.sql`
- `020_add_metadata_to_api_requests.sql`
- `021_add_booth_map.sql`
- `022_add_car_rental_assignment.sql`

**Total Missing:** 17 migration files not tracked in git

---

## 2. Critical Issues

### Issue 1: Duplicate Migration 023 ⚠️

**Problem:** Two migration files with number 023:
- `023_fix_audit_log_table_name.sql`
- `023_rename_audit_log_to_audit_logs.sql`

**Impact:** Migration system runs files alphabetically. Both files will execute, potentially causing conflicts.

**Resolution Required:**
- Determine which migration should be kept
- Delete or rename the duplicate
- Ensure only one migration 023 exists

**Recommendation:** Keep `023_fix_audit_log_table_name.sql` (more comprehensive), remove `023_rename_audit_log_to_audit_logs.sql`

### Issue 2: Missing Migrations in Git ⚠️

**Problem:** 17 migration files exist in filesystem but are not tracked in git.

**Impact:** 
- Migrations may not be deployed to production
- Version control history incomplete
- Cannot verify which migrations have been applied

**Resolution Required:**
- Add all missing migration files to git
- Verify they are safe for production
- Ensure proper sequencing

### Issue 3: Migration 024 Not in Production ⚠️

**Problem:** `user_checklist_items` table does not exist in production.

**Impact:** New feature (user checklist items) will not work in production.

**Resolution Required:**
- Run migration 024 in production after resolving git issues
- Verify table creation succeeds
- Test functionality

---

## 3. Production Schema Verification

### Current Production Tables (Verified)

**Core Tables:** ✅
- `users` - User accounts
- `events` - Trade show events
- `event_participants` - Event participants
- `expenses` - Expense records
- `app_settings` - Application settings

**Checklist Tables:** ✅
- `event_checklists` - Main checklist per event
- `checklist_flights` - Flight bookings
- `checklist_hotels` - Hotel reservations
- `checklist_car_rentals` - Car rentals
- `checklist_booth_shipping` - Booth shipping
- `checklist_custom_items` - Custom checklist items
- `checklist_templates` - Checklist templates

**System Tables:** ✅
- `audit_logs` - Audit logging (correct plural name)
- `user_sessions` - User session tracking
- `api_requests` - API request logging
- `roles` - Dynamic role management

**Analytics Tables:** ✅
- `api_analytics` - API analytics
- `page_analytics` - Page analytics
- `system_alerts` - System alerts
- `system_metrics` - System metrics

### Missing Tables in Production ❌
- `user_checklist_items` - User-facing checklist items (migration 024)
- `ocr_corrections` - OCR corrections (migration 006) - May not be needed in production

---

## 4. Migration Safety Analysis

### Idempotency Check ✅

**All migrations reviewed use:**
- `CREATE TABLE IF NOT EXISTS` - Safe to run multiple times
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - Safe to run multiple times
- `CREATE INDEX IF NOT EXISTS` - Safe to run multiple times
- `DO $$ ... IF EXISTS ... END $$` - Conditional logic prevents errors

**Result:** All migrations are idempotent and safe to run multiple times.

### Destructive Operations Check ✅

**No destructive operations found:**
- ❌ No `DROP TABLE` (except in conditional logic for migration 023)
- ❌ No `DROP COLUMN`
- ❌ No `TRUNCATE`
- ❌ No `DELETE FROM` (data deletion)

**Result:** No destructive operations that could cause data loss.

### Rollback Procedures ⚠️

**Status:** Migrations do not have automatic rollback procedures.

**Manual Rollback Required:**
- Document reverse SQL for each migration
- Test rollback in sandbox before production
- Create rollback scripts if needed

---

## 5. Migration Execution Order

### Current Execution Method

**Migration System:** `backend/src/database/migrate.ts`
- Runs `schema.sql` first
- Then runs all `.sql` files in `migrations/` folder alphabetically
- Uses error codes (42710, 42P07) to skip already-applied migrations

### Expected Execution Order (Alphabetical)

1. `002_add_temporary_role.sql` (if in git)
2. `003_create_roles_table.sql` ✅
3. `004_create_audit_log.sql` ✅
4. `006_create_ocr_corrections_table.sql` ✅
5. `007_enhance_ocr_corrections_for_cross_environment.sql` (if in git)
6. `008_create_user_sessions_table.sql` (if in git)
7. `009_create_api_requests_table.sql` (if in git)
8. `010_add_developer_role.sql` (if in git)
9. `011_add_offline_sync_support.sql` (if in git)
10. `012_add_pending_role.sql` (if in git)
11. `013_add_pending_user_role.sql` (if in git)
12. `014_add_zoho_expense_id.sql` (if in git)
13. `015_fix_needs_further_review_status.sql` (if in git)
14. `016_add_show_and_travel_dates.sql` (if in git)
15. `017_add_event_checklist.sql` (if in git)
16. `018_add_custom_checklist_items.sql` (if in git)
17. `019_add_checklist_templates.sql` (if in git)
18. `020_add_metadata_to_api_requests.sql` (if in git)
19. `021_add_booth_map.sql` (if in git)
20. `022_add_car_rental_assignment.sql` (if in git)
21. `023_fix_audit_log_table_name.sql` ✅ (or duplicate)
22. `023_rename_audit_log_to_audit_logs.sql` ⚠️ **DUPLICATE**
23. `024_create_user_checklist_items.sql` ✅

---

## 6. Production Migration Plan

### Pre-Deployment Checklist

**Before Running Migrations:**
- [ ] Resolve duplicate migration 023
- [ ] Add all missing migrations to git
- [ ] Verify all migrations are idempotent
- [ ] Test migrations in sandbox
- [ ] Backup production database
- [ ] Document rollback procedures

### Migration Execution Steps

**Step 1: Backup Production Database**
```bash
# Create full database backup
ssh root@192.168.1.190 "pct exec 201 -- sudo -u postgres pg_dump expense_app_production > /backup/pre-migration-$(date +%Y%m%d-%H%M%S).sql"
```

**Step 2: Verify Current Schema**
```bash
# Check current tables
ssh root@192.168.1.190 "pct exec 201 -- sudo -u postgres psql expense_app_production -c '\dt'"
```

**Step 3: Run Migrations**
```bash
# Run migration script
cd backend && npm run migrate
```

**Step 4: Verify Migration Success**
```bash
# Check new tables exist
ssh root@192.168.1.190 "pct exec 201 -- sudo -u postgres psql expense_app_production -c '\d user_checklist_items'"
```

**Step 5: Test Application**
- Verify login works
- Test new features
- Check for errors in logs

### Required Migrations for Production

**Must Run:**
- `024_create_user_checklist_items.sql` - New feature (user checklist items)

**May Already Be Applied:**
- All migrations 002-023 (verify in production first)

**Dependencies:**
- Migration 024 requires:
  - `users` table (from schema.sql)
  - `events` table (from schema.sql)

---

## 7. Rollback Procedures

### Rollback Migration 024

**If migration 024 needs to be rolled back:**

```sql
-- Drop table and related objects
DROP TABLE IF EXISTS user_checklist_items CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_user_checklist_item_timestamp() CASCADE;
```

**Verification:**
```sql
-- Verify table is gone
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_checklist_items';
-- Should return 0 rows
```

---

## 8. Recommendations

### Immediate Actions Required

1. **Resolve Duplicate Migration 023**
   - Delete `023_rename_audit_log_to_audit_logs.sql`
   - Keep `023_fix_audit_log_table_name.sql`
   - Update migration README

2. **Add Missing Migrations to Git**
   - Add all 17 missing migration files
   - Verify they are safe for production
   - Commit with descriptive message

3. **Verify Production Schema**
   - Check which migrations have already been applied
   - Document current production state
   - Identify missing migrations

4. **Test Migrations in Sandbox**
   - Run all migrations in sandbox first
   - Verify no errors
   - Test rollback procedures

### Before Production Deployment

1. ✅ All migrations tracked in git
2. ✅ No duplicate migration numbers
3. ✅ All migrations tested in sandbox
4. ✅ Production database backed up
5. ✅ Rollback procedures documented
6. ✅ Migration execution plan ready

---

## 9. Handoff to DevOps Agent

### Migration Status Summary

**Ready for Production:** ⚠️ **NOT READY** - Issues must be resolved first

**Blocking Issues:**
1. Duplicate migration 023 must be resolved
2. Missing migrations must be added to git
3. Production schema verification needed

**Safe Migrations:**
- All migrations are idempotent
- No destructive operations
- Safe to run multiple times

**Next Steps:**
1. Resolve duplicate migration 023
2. Add missing migrations to git
3. Verify production schema state
4. Test migrations in sandbox
5. Execute production migration plan

---

**Report Generated:** November 12, 2025  
**Next Review:** After resolving git tracking issues

