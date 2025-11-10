# 🤖 GitHub Actions - Schema Validation

**Version:** 1.27.15  
**Last Updated:** November 6, 2025  
**Workflow:** `.github/workflows/schema-validation.yml`

---

## 📋 Overview

Automated schema validation that runs on every Pull Request to ensure database schema consistency before merging code changes.

---

## 🚀 Features

### Automatic PR Validation

✅ **Triggers automatically** on PRs affecting:
- Migration files (`backend/src/database/migrations/**`)
- Database schema (`backend/src/database/schema.sql`)
- Backend TypeScript files (`backend/src/**/*.ts`)

✅ **Creates test database** (PostgreSQL 16)  
✅ **Runs all migrations** against test database  
✅ **Validates schema** matches migration definitions  
✅ **Posts PR comments** with results  
✅ **Blocks merge** if validation fails  
✅ **Uploads reports** as artifacts (30-day retention)

---

## 🎯 What It Validates

1. **All expected tables exist** in database
2. **No extra/undocumented tables** present
3. **Column counts match** expectations
4. **Table structures** are consistent
5. **Migrations apply cleanly** without errors

---

## 📊 Workflow Behavior

### On Success ✅

```
✅ Schema Validation Passed

Database schema matches migration files. All tables and columns 
are correctly defined.

Validation Summary:
- ✅ All expected tables exist
- ✅ No extra tables found
- ✅ Column counts match expectations
- ✅ Schema is consistent with migrations

Safe to merge from a schema validation perspective.
```

**Result:** PR can be merged (green checkmark)

### On Failure ❌

```
❌ Schema Validation Failed

The database schema does not match the migration files. This PR 
cannot be merged until the schema issues are resolved.

What This Means:
- 🔴 Missing tables: Tables defined in migrations are missing
- 🔴 Extra tables: Tables exist in database but not in migrations
- 🔴 Column mismatches: Tables have incorrect number of columns

How to Fix:
1. Review the validation report below
2. Ensure all migrations are included in your PR
3. Run migrations locally: cd backend && npm run migrate
4. Test locally: ./scripts/validate-schema.sh local
5. Push fixes and re-run the workflow

[Detailed validation report shown here]
```

**Result:** PR blocked until fixed (red X)

---

## 🔧 Manual Trigger

You can manually trigger the workflow to validate remote environments:

### Via GitHub UI

1. Go to **Actions** tab
2. Select **Schema Validation** workflow
3. Click **Run workflow**
4. Choose environment:
   - `production` - Validate production database
   - `sandbox` - Validate sandbox database
   - `local` - Use test database

### Via GitHub CLI

```bash
# Validate sandbox
gh workflow run schema-validation.yml \
  -f environment=sandbox

# Validate production
gh workflow run schema-validation.yml \
  -f environment=production
```

**Note:** Remote validation requires database access (VPN or runner with network access)

---

## 🛠️ Setup Requirements

### Repository Secrets (For Remote Validation)

If using manual trigger for remote environments, configure these secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `DB_HOST` | Database server hostname | `192.168.1.138` |
| `DB_PASSWORD` | Database password | `<secure_password>` |

**To add secrets:**
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add name and value
4. Click **Add secret**

### Branch Protection Rules

To enforce schema validation before merging:

1. Go to repository **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable: **Require status checks to pass before merging**
4. Search for and select: **Validate Database Schema**
5. Save changes

Now PRs cannot be merged if schema validation fails!

---

## 📁 Workflow Structure

```yaml
name: Schema Validation

on:
  pull_request:  # Auto-trigger on PRs
  workflow_dispatch:  # Manual trigger

jobs:
  validate-schema:
    runs-on: ubuntu-latest
    services:
      postgres:  # PostgreSQL 16 test database
    steps:
      - Checkout code
      - Setup Node.js
      - Install PostgreSQL client
      - Install dependencies
      - Create test environment
      - Run migrations
      - Validate schema
      - Upload report
      - Post PR comment
      - Fail if validation failed
```

---

## 🧪 Testing Locally Before PR

Always test before creating a PR:

```bash
# 1. Run migrations
cd backend
npm run migrate
cd ..

# 2. Validate schema
./scripts/validate-schema.sh local

# 3. If passed, create PR
git add .
git commit -m "feat: add new migration"
git push origin feature-branch

# 4. Create PR on GitHub
# The workflow will run automatically
```

---

## 📊 Artifacts

Each workflow run uploads validation reports:

**Artifact Name:** `schema-validation-report`  
**Retention:** 30 days  
**Contents:** Full validation report with detailed analysis

**To download:**
1. Go to workflow run
2. Scroll to **Artifacts** section
3. Click to download `schema-validation-report.zip`
4. Extract and view `schema-validation-*.txt`

---

## 🐛 Troubleshooting

### Workflow Fails with "Migration Error"

**Cause:** Migration file has SQL syntax errors

**Fix:**
```bash
# Test migration locally
cd backend
npm run migrate

# If error, fix SQL in migration file
# Then test again
```

### Workflow Fails with "Schema Mismatch"

**Cause:** Database schema doesn't match migrations

**Fix:**
```bash
# Check what's different
./scripts/validate-schema.sh local

# Review report
cat schema-validation-*.txt

# Fix migrations or add missing ones
```

### PR Comment Not Posted

**Cause:** GitHub token permissions

**Fix:**
1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Save

### Remote Validation Fails

**Cause:** Cannot connect to remote database

**Fix:**
- Ensure `DB_HOST` and `DB_PASSWORD` secrets are set
- Check if runner has network access to database
- Consider using self-hosted runner with VPN access

---

## 🔄 Integration with Other Workflows

### Combine with Deployment

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  validate:
    uses: ./.github/workflows/schema-validation.yml
  
  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: ./DEPLOY_TO_PRODUCTION.sh
```

### Combine with Tests

```yaml
name: CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Run unit tests
      - Run integration tests
  
  validate-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/workflows/schema-validation.yml
```

---

## 📈 Best Practices

### 1. Always Test Locally First

```bash
# Before pushing
./scripts/validate-schema.sh local
```

### 2. Include Migrations in Same PR

If you change database schema:
- ✅ Include migration file in PR
- ✅ Update models/types if needed
- ✅ Test migration locally

### 3. Review Validation Reports

Even if workflow passes:
- Review the validation report
- Check for warnings
- Verify all expected changes present

### 4. Don't Skip Checks

Never:
- Force merge without validation
- Merge with failing checks
- Disable branch protection

### 5. Keep Migrations Small

- One logical change per migration
- Easy to review and rollback
- Faster validation

---

## 🔐 Security Considerations

### Database Credentials

- ✅ **DO** use GitHub Secrets for passwords
- ✅ **DO** use read-only credentials when possible
- ❌ **DON'T** commit credentials to code
- ❌ **DON'T** expose credentials in logs

### Test Database

- Uses isolated PostgreSQL container
- No access to production data
- Destroyed after workflow completes

### Network Access

- PR validation uses local test database (no remote access)
- Manual trigger can access remote (requires VPN/network)

---

## 📚 Related Documentation

- `docs/SCHEMA_VALIDATION.md` - Schema validation guide
- `SCHEMA_VALIDATION_QUICK_REF.md` - Quick reference
- `scripts/validate-schema.sh` - Main validation script
- `scripts/validate-production-schema.sh` - Production-specific validation

---

## 🆘 Getting Help

**Workflow failing?**
1. Check workflow logs in Actions tab
2. Download validation report artifact
3. Test locally: `./scripts/validate-schema.sh local`
4. Review migration files for errors

**PR comment not appearing?**
1. Check workflow permissions (Settings → Actions)
2. Verify workflow completed (not cancelled)
3. Check GitHub API rate limits

**Need to bypass validation temporarily?**
- Not recommended!
- If absolutely necessary, temporarily disable branch protection
- Re-enable immediately after merge

---

## ✅ Checklist for New Migrations

Before creating PR with database changes:

- [ ] Migration file created in `backend/src/database/migrations/`
- [ ] Migration numbered correctly (sequential)
- [ ] SQL syntax valid (test with `psql`)
- [ ] Run locally: `cd backend && npm run migrate`
- [ ] Validate locally: `./scripts/validate-schema.sh local`
- [ ] Commit migration file
- [ ] Push to feature branch
- [ ] Create PR
- [ ] Wait for workflow to complete
- [ ] Review workflow results
- [ ] Fix any issues
- [ ] Merge when green ✅

---

**Last Updated:** November 6, 2025  
**Workflow Version:** 1.27.15  
**Status:** ✅ Production Ready

