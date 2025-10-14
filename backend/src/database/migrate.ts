import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Step 1: Run base schema
    console.log('Applying base schema.sql...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
    console.log('✓ Base schema applied successfully');
    
    // Step 2: Run all migration files in migrations/ folder
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Run in alphabetical order
      
      if (migrationFiles.length > 0) {
        console.log(`\nFound ${migrationFiles.length} migration file(s) to apply:`);
        
        for (const file of migrationFiles) {
          console.log(`  Applying migration: ${file}...`);
          try {
            const migrationSQL = fs.readFileSync(
              path.join(migrationsDir, file),
              'utf-8'
            );
            await pool.query(migrationSQL);
            console.log(`  ✓ Applied: ${file}`);
          } catch (migrationError: any) {
            // Some migrations might fail if already applied (e.g., constraint already exists)
            // Log warning but continue with other migrations
            if (migrationError.code === '42710' || migrationError.code === '42P07') {
              console.log(`  ⚠ Already applied (skipped): ${file}`);
            } else {
              console.error(`  ✗ Failed to apply ${file}:`, migrationError.message);
              throw migrationError;
            }
          }
        }
      } else {
        console.log('No migration files found in migrations/ folder');
      }
    } else {
      console.log('Migrations folder does not exist, skipping individual migrations');
    }
    
    console.log('\n✓ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
