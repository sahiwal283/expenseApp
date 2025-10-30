# Database Migrations Index

**Execution Order:** Alphabetical (based on filename prefix)

## Migration History

| ID | Filename | Description | Status |
|----|----------|-------------|--------|
| 001 | *missing* | Initial schema (in schema.sql) | ✅ Applied |
| 002 | `002_add_temporary_role.sql` | Add temporary user role | ✅ Applied |
| 003 | `003_create_roles_table.sql` | Create roles table for dynamic role management | ✅ Applied |
| 004 | `004_create_audit_log.sql` | Create audit_log table for tracking changes | ✅ Applied |
| 005 | *missing* | *(skipped sequence number)* | - |
| 006 | `006_create_ocr_corrections_table.sql` | Create OCR corrections table for ML feedback | ✅ Applied |
| 007 | `007_enhance_ocr_corrections_for_cross_environment.sql` | Add cross-environment sync for OCR training | ✅ Applied |
| 008 | `008_create_user_sessions_table.sql` | Create user_sessions table for session tracking | ✅ Applied |
| 009 | `009_create_api_requests_table.sql` | Create api_requests table for API analytics | ✅ Applied |
| 010 | `010_add_developer_role.sql` | Add developer role for DevDashboard access | ✅ Applied |
| 011 | `011_add_offline_sync_support.sql` | Add offline sync columns to expenses table | ✅ Applied |
| 012 | `012_add_pending_role.sql` | Add pending role for new user registrations | ✅ Applied |
| 013 | `013_add_pending_user_role.sql` | Update pending user role constraints | ✅ Applied |
| 014 | `014_add_zoho_expense_id.sql` | Add zoho_expense_id column for Zoho integration | ✅ Applied |
| 015 | `015_fix_needs_further_review_status.sql` | Fix expense status for needs_further_review | ✅ Applied |

## Notes

- **Missing 001:** Base schema is in `schema.sql`, not a separate migration
- **Missing 005:** Sequence number was skipped (unknown reason)
- **Migration Safety:** All migrations use `IF NOT EXISTS` or similar checks to be idempotent
- **Rollback:** Migrations do not have automatic rollback. Manual SQL required for reversions.

## Adding New Migrations

1. **Filename Format:** `NNN_descriptive_name.sql` (e.g., `016_add_new_feature.sql`)
2. **Sequential Numbering:** Use next available number (currently 016)
3. **Idempotency:** Always use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF NOT EXISTS`, etc.
4. **Testing:** Test on sandbox database before production
5. **Documentation:** Update this README with description

## Migration Execution

Migrations are executed by `backend/src/database/migrate.ts`:

```bash
# Run all pending migrations
cd backend && npm run migrate

# Or manually
ts-node src/database/migrate.ts
```

**Last Updated:** October 27, 2025 (Refactor Phase 1)

