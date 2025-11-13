/**
 * One-Time Script: Mark Existing Migrations as Applied
 * 
 * Purpose: Mark all migrations 002-024 as already applied in schema_migrations table.
 * This prevents re-running old migrations on existing databases.
 * 
 * Usage:
 *   ts-node src/database/scripts/mark-existing-migrations.ts
 * 
 * Note: This script should only be run once on existing databases after migration 025 is applied.
 */

import { pool } from '../../config/database';

const EXISTING_MIGRATIONS = [
  '002_add_temporary_role.sql',
  '003_create_roles_table.sql',
  '004_create_audit_log.sql',
  '006_create_ocr_corrections_table.sql',
  '007_enhance_ocr_corrections_for_cross_environment.sql',
  '008_create_user_sessions_table.sql',
  '009_create_api_requests_table.sql',
  '010_add_developer_role.sql',
  '011_add_offline_sync_support.sql',
  '012_add_pending_role.sql',
  '013_add_pending_user_role.sql',
  '014_add_zoho_expense_id.sql',
  '015_fix_needs_further_review_status.sql',
  '016_add_show_and_travel_dates.sql',
  '017_add_event_checklist.sql',
  '018_add_custom_checklist_items.sql',
  '019_add_checklist_templates.sql',
  '020_add_metadata_to_api_requests.sql',
  '021_add_booth_map.sql',
  '022_add_car_rental_assignment.sql',
  '023_fix_audit_log_table_name.sql',
  '024_create_user_checklist_items.sql'
];

async function markExistingMigrations() {
  try {
    console.log('Marking existing migrations as applied...\n');
    
    // Check if schema_migrations table exists
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )`
    );
    
    if (!tableExists.rows[0].exists) {
      console.error('❌ schema_migrations table does not exist!');
      console.error('   Please run migration 025 first to create the tracking table.');
      process.exit(1);
    }
    
    // Get already recorded migrations
    const existing = await pool.query('SELECT version FROM schema_migrations');
    const existingVersions = new Set(existing.rows.map((row: any) => row.version));
    
    console.log(`Found ${existingVersions.size} migrations already recorded in tracking table.\n`);
    
    // Mark each migration as applied
    let added = 0;
    let skipped = 0;
    
    for (const migration of EXISTING_MIGRATIONS) {
      if (existingVersions.has(migration)) {
        console.log(`  ⊘ Already recorded: ${migration}`);
        skipped++;
      } else {
        try {
          await pool.query(
            'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, CURRENT_TIMESTAMP)',
            [migration]
          );
          console.log(`  ✓ Marked as applied: ${migration}`);
          added++;
        } catch (error: any) {
          if (error.code === '23505') {
            // Unique constraint violation - already exists
            console.log(`  ⊘ Already recorded: ${migration}`);
            skipped++;
          } else {
            console.error(`  ✗ Failed to mark ${migration}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log(`\n✓ Completed!`);
    console.log(`  Added: ${added} migrations`);
    console.log(`  Skipped: ${skipped} migrations (already recorded)`);
    console.log(`  Total: ${EXISTING_MIGRATIONS.length} migrations`);
    
    // Verify final count
    const final = await pool.query('SELECT COUNT(*) as count FROM schema_migrations');
    console.log(`\n  Total migrations in tracking table: ${final.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Failed to mark existing migrations:', error);
    process.exit(1);
  }
}

markExistingMigrations();

