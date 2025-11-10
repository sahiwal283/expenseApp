# 🗄️ Database Schema Integration Testing

## Overview

Automated integration tests that verify the database schema matches code expectations. These tests run before each deployment to catch schema drift and prevent production issues.

---

## 🎯 Purpose

### What We Test
- ✅ **Table Existence**: All required tables exist
- ✅ **Column Structure**: Names, data types, and constraints match expectations
- ✅ **Foreign Keys**: Relationships and cascade rules are correct
- ✅ **Check Constraints**: Enum-like constraints (e.g., `rental_type IN ('group', 'individual')`)
- ✅ **Indexes**: Performance indexes exist on foreign keys
- ✅ **Default Values**: Boolean defaults, timestamps, etc.
- ✅ **Schema Drift**: Detects unexpected columns or tables

### Why This Matters
- 🚫 **Prevents deployment failures** when code expects columns that don't exist
- 🔍 **Detects schema drift** from manual database changes
- 📊 **Documents expected schema** as executable tests
- 🛡️ **Guards against migration issues** (missed migrations, incorrect rollbacks)

---

## 📂 Test Files

### Main Test Suite
**File**: `backend/tests/integration/database-schema.test.ts`

**Test Groups**:
1. **Core Tables Existence** (5 tests)
   - Verifies all checklist tables exist
   
2. **event_checklists Schema** (10 tests)
   - Columns, data types, constraints, unique key
   
3. **checklist_hotels Schema** (8 tests)
   - Hotel reservation structure
   
4. **checklist_car_rentals Schema** (7 tests)
   - Car rental structure with CHECK constraint
   
5. **checklist_booth_shipping Schema** (3 tests)
   - Shipping method CHECK constraint
   
6. **Foreign Key Constraints** (4 tests)
   - CASCADE and SET NULL behavior
   
7. **Performance Indexes** (4 tests)
   - Indexes on foreign keys
   
8. **Schema Drift Detection** (4 tests)
   - Alerts on unexpected columns

**Total Tests**: 45

---

## 🚀 Running the Tests

### Local Development

```bash
# Run all integration tests
cd backend
npm run test:integration

# Run only schema tests
npm run test:integration:schema

# Run with coverage
npm run test:coverage
```

### Pre-Deployment Validation

```bash
# Run automated pre-deployment check (sandbox)
./backend/scripts/pre-deploy-schema-check.sh

# Run for production environment
./backend/scripts/pre-deploy-schema-check.sh production
```

The pre-deployment script:
- ✅ Loads environment variables
- ✅ Tests database connection
- ✅ Runs all schema tests
- ✅ Provides colored output and exit codes
- ✅ Alerts on schema drift
- ✅ Blocks deployment if tests fail

---

## 📋 Test Output Examples

### ✅ Successful Run

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PRE-DEPLOYMENT SCHEMA VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: sandbox
Backend Dir: /path/to/backend

📂 Loading environment from: .env
🔌 Testing database connection...
✅ Database connection successful

🧪 Running database schema integration tests...

 ✓ Core Tables Existence (5 tests) 23ms
 ✓ event_checklists Table Schema (10 tests) 45ms
 ✓ checklist_hotels Table Schema (8 tests) 32ms
 ✓ Foreign Key Constraints (4 tests) 28ms
 ✓ Performance Indexes (4 tests) 19ms
 ✓ Schema Drift Detection (4 tests) 21ms

Test Files  1 passed (1)
     Tests  45 passed (45)
  Duration  1.2s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS: All schema tests passed!
   Database schema matches code expectations.
   Safe to proceed with deployment.
```

### ❌ Failed Run (Schema Mismatch)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PRE-DEPLOYMENT SCHEMA VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Running database schema integration tests...

 ✓ Core Tables Existence (5 tests)
 ❌ checklist_hotels Table Schema (8 tests)
   ❌ should have check_in_date column (DATE)
      Expected column check_in_date to have data type 'date'
      Received: column not found

Test Files  1 failed (1)
     Tests  1 failed | 44 passed (45)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ FAILED: Schema tests failed!
   Database schema does not match code expectations.
   DO NOT DEPLOY until schema issues are resolved.

Possible causes:
  1. Missing database migrations
  2. Schema drift (manual changes to database)
  3. Code expects columns/tables that don't exist
  4. Mismatched data types or constraints

Suggested actions:
  1. Review test output above
  2. Run pending migrations: npm run migrate
  3. Check for manual database changes
  4. Update code to match actual schema
```

### ⚠️ Warning (Schema Drift Detected)

```
 ✓ Schema Drift Detection (4 tests)
   ⚠️  SCHEMA DRIFT DETECTED: Unexpected columns found: ['temp_field', 'debug_flag']
   
⚠️  WARNING: Schema drift detected (see above)
   Review unexpected columns before deploying.
```

---

## 🔧 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Pre-Deployment Schema Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  schema-validation:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: expense_app
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run migrations
        run: |
          cd backend
          npm run migrate
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: expense_app
          DB_USER: postgres
          DB_PASSWORD: password
      
      - name: Run schema tests
        run: |
          cd backend
          npm run test:integration:schema
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: expense_app
          DB_USER: postgres
          DB_PASSWORD: password
```

### Deployment Script Integration

```bash
#!/bin/bash
# deploy.sh

echo "Running pre-deployment checks..."

# Run schema validation
./backend/scripts/pre-deploy-schema-check.sh production

if [ $? -ne 0 ]; then
    echo "❌ Deployment aborted: Schema validation failed"
    exit 1
fi

echo "✅ Schema validation passed, proceeding with deployment..."
# ... rest of deployment ...
```

---

## 🐛 Troubleshooting

### Test Fails: "Cannot connect to database"

**Cause**: Database connection parameters are incorrect or database is not running.

**Fix**:
```bash
# Check environment variables
cat backend/.env

# Test connection manually
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Start database (if using Docker)
docker-compose up -d postgres
```

### Test Fails: "Table does not exist"

**Cause**: Migrations have not been run.

**Fix**:
```bash
cd backend
npm run migrate
```

### Test Fails: "Column data type mismatch"

**Cause**: 
- Database migration changed a column type
- Code expectations are outdated
- Manual database change

**Fix**:
1. Review migration files in `backend/src/database/migrations/`
2. Check if column type changed in a recent migration
3. Update test expectations if migration is correct
4. Create new migration if database needs to change

### Test Warns: "Schema drift detected"

**Cause**: Extra columns exist in the database that aren't in the expected schema.

**Fix**:
1. Review the unexpected columns
2. If they're intentional (from a new migration), update the test's expected columns
3. If they're unintentional, investigate and remove them

---

## 📝 Adding New Schema Tests

When adding new tables or columns, update the tests:

### Example: Adding a New Table

```typescript
describe('checklist_custom_items Table Schema', () => {
  it('should have checklist_custom_items table', async () => {
    const result = await testPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'checklist_custom_items'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have title column (VARCHAR 255 NOT NULL)', async () => {
    const result = await testPool.query<ColumnInfo>(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'checklist_custom_items'
      AND column_name = 'title';
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].data_type).toBe('character varying');
    expect(result.rows[0].character_maximum_length).toBe(255);
    expect(result.rows[0].is_nullable).toBe('NO');
  });
});
```

### Example: Testing a CHECK Constraint

```typescript
it('should have CHECK constraint on status column', async () => {
  const result = await testPool.query(`
    SELECT con.conname, pg_get_constraintdef(con.oid) as constraint_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'my_table'
    AND con.contype = 'c';
  `);

  const statusCheck = result.rows.find(c => 
    c.constraint_def.includes('status') &&
    c.constraint_def.includes('pending') &&
    c.constraint_def.includes('completed')
  );

  expect(statusCheck).toBeDefined();
});
```

---

## 🎯 Best Practices

### 1. Run Tests Locally Before Committing
```bash
cd backend
npm run test:integration:schema
```

### 2. Update Tests When Changing Schema
- ✅ Create migration file
- ✅ Update schema tests
- ✅ Run tests to verify
- ✅ Commit migration + test changes together

### 3. Keep Expected Columns List Updated
When adding columns, update the "Schema Drift Detection" expected columns:

```typescript
const expectedColumns = [
  'id', 'event_id', 'booth_ordered', /* ... existing ... */,
  'new_column_name' // ← Add new column here
];
```

### 4. Test in CI/CD Pipeline
Ensure schema tests run automatically before deployment.

### 5. Document Schema Changes
Update migration file comments and this documentation when making schema changes.

---

## 📊 Coverage

Current schema test coverage:

| Component | Tests | Status |
|-----------|-------|--------|
| Core Tables | 5 | ✅ |
| event_checklists | 10 | ✅ |
| checklist_hotels | 8 | ✅ |
| checklist_car_rentals | 7 | ✅ |
| checklist_booth_shipping | 3 | ✅ |
| Foreign Keys | 4 | ✅ |
| Indexes | 4 | ✅ |
| Schema Drift | 4 | ✅ |
| **Total** | **45** | **✅** |

---

## 🔗 Related Documentation

- [Testing & Validation Guide](./TESTING_VALIDATION_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Database Migrations](../backend/src/database/migrations/README.md)
- [Master Guide](./MASTER_GUIDE.md)

---

**Last Updated**: November 10, 2025  
**Version**: 1.0.0  
**Maintained By**: Testing Agent

