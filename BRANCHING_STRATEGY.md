# Branching Strategy & Naming Conventions

**Last Updated:** October 8, 2025  
**Current Version:** 0.19.0

---

## Branch Naming Convention

### Sandbox Feature Branches

**Format:** `sandbox-v{MAJOR}.{MINOR}.{PATCH}`

**Examples:**
- `sandbox-v0.7.1`
- `sandbox-v0.19.0`
- `sandbox-v0.20.0`

**Purpose:** Sandbox branches are used for developing and testing new features in the sandbox environment before promoting to production.

### Branch Lifecycle

```
1. Create sandbox branch:     sandbox-v0.19.0
2. Develop & test in sandbox
3. Create Pull Request:        sandbox-v0.19.0 → main
4. Review & approve
5. Merge to main
6. Deploy to production
```

---

## Current Branch Structure

### Main Branches

| Branch | Purpose | Environment | Status |
|--------|---------|-------------|--------|
| `main` | Production code | Production (containers 201, 202) | ✅ Stable |

### Sandbox Branches

| Branch | Version | Purpose | Status |
|--------|---------|---------|--------|
| `sandbox-v0.7.1` | 0.7.1 | Previous sandbox version | Archived |
| `sandbox-v0.19.0` | 0.19.0 | Inline column filtering feature | ✅ Active |

---

## Naming Rules

### DO ✅

- **Use version numbers:** `sandbox-v0.19.0`
- **Match version in package.json:** Branch version should match the version in `package.json`
- **Be descriptive in commits:** Use conventional commit messages
- **Update CHANGELOG.md:** Document all changes

### DON'T ❌

- **Don't use feature/ prefix for sandbox:** Use `sandbox-v{VERSION}` instead
- **Don't reuse branch names:** Each version should have its own branch
- **Don't merge without testing:** Always test in sandbox first
- **Don't skip version bumps:** Update version number with each release

---

## Version Numbering

Following [Semantic Versioning](https://semver.org/):

**Format:** `MAJOR.MINOR.PATCH`

**⚠️ IMPORTANT: Increment version for EVERY change, no matter how small!**

- **MAJOR (0.x.x):** Breaking changes, major feature overhauls
  - Currently in `0.x` (pre-1.0 development phase)
  - Example: `0.19.1` → `1.0.0` (production ready)
  
- **MINOR (x.X.x):** New features, backward-compatible changes
  - Example: `0.18.0` → `0.19.0` (added inline filtering)
  - Use for: New components, new pages, new API endpoints, feature additions
  
- **PATCH (x.x.X):** Bug fixes, minor improvements, small changes
  - Example: `0.19.0` → `0.19.1` (fix expense update validation)
  - Use for: Bug fixes, typo corrections, small UI tweaks, logging improvements
  - **Always increment for bug fixes!**

### Current Versioning Strategy

- **v0.1.0 - v0.18.0:** Historical versions
- **v0.19.0:** Inline column filtering feature (MINOR - new feature)
- **v0.19.1:** Expense update validation fix (PATCH - bug fix)
- **v1.0.0:** Target for production-ready release

### Version Increment Examples

| Change Type | Example | Version Change |
|-------------|---------|----------------|
| **New Feature** | Add user notifications | 0.19.1 → 0.20.0 |
| **Bug Fix** | Fix broken button | 0.19.1 → 0.19.2 |
| **UI Tweak** | Update color scheme | 0.19.1 → 0.19.2 |
| **Typo Fix** | Fix spelling in UI | 0.19.1 → 0.19.2 |
| **Logging** | Add debug logs | 0.19.1 → 0.19.2 |
| **Breaking Change** | Remove old API | 0.19.1 → 1.0.0 |

**Rule of Thumb:** If you commit and push code, increment the version!

---

## Workflow Examples

### Creating a New Feature

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Bump version in package.json (e.g., 0.19.0 → 0.20.0)
# Edit package.json: "version": "0.20.0"

# 3. Create sandbox branch
git checkout -b sandbox-v0.20.0

# 4. Develop your feature
# ... make changes ...

# 5. Update CHANGELOG.md
# Add entry for v0.20.0

# 6. Commit
git add .
git commit -m "feat: Add new feature (v0.20.0)"

# 7. Push to GitHub
git push origin sandbox-v0.20.0

# 8. Deploy to sandbox for testing
# (see deployment instructions)
```

### Deploying to Sandbox

```bash
# SSH to Proxmox
ssh root@192.168.1.190

# Access sandbox container
pct exec 203 -- bash

# Navigate to app
cd /opt/expenseapp

# Fetch and checkout
git fetch origin
git checkout sandbox-v0.20.0
git pull origin sandbox-v0.20.0

# Build and deploy
npm install
npm run build
cp -r dist/* /var/www/html/
systemctl reload nginx

# Exit
exit
```

### Promoting to Production

```bash
# 1. After thorough sandbox testing, create PR on GitHub
# From: sandbox-v0.20.0
# To: main

# 2. Get approval and merge

# 3. Deploy to production
ssh root@192.168.1.190

# Deploy backend (container 201)
pct exec 201 -- bash
cd /opt/expenseApp
git pull origin main
cd backend && npm install && npm run build
cp src/database/schema.sql dist/database/
systemctl restart expenseapp-backend
exit

# Deploy frontend (container 202)
# (follow production deployment process)

# 4. Verify and monitor
```

---

## Branch Protection

### Main Branch Rules

- ✅ Requires pull request before merging
- ✅ Requires review before merging
- ✅ Must pass all tests
- ✅ Must update CHANGELOG.md
- ✅ Must bump version number

### Sandbox Branch Rules

- ✅ Can push directly for development
- ✅ Should test thoroughly before PR
- ✅ Must document changes
- ✅ Must not affect production

---

## Commit Message Convention

Following [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, no logic change)
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Build process or auxiliary tool changes

### Examples

```bash
# Feature commit
git commit -m "feat: Add inline column filtering to Expense Management table (v0.19.0)

- Implement inline filter inputs for all columns
- Reorder columns for better UX
- Add Clear Filters button
- Version bump to 0.19.0"

# Bug fix commit
git commit -m "fix: Correct receipt URL display in expense table

Fixes issue where receipt URLs were not showing properly
after the recent column reordering update."

# Documentation commit
git commit -m "docs: Update branch name to sandbox-v0.19.0

- Rename feature/expense-table-column-filtering to sandbox-v0.19.0
- Follow naming convention: sandbox-v{VERSION}
- Update all documentation references"
```

---

## Environment Mapping

### Development Flow

```
Local Development
       ↓
   (commit)
       ↓
sandbox-v{VERSION} branch
       ↓
   (push to GitHub)
       ↓
Sandbox Environment (192.168.1.144)
       ↓
   (test & validate)
       ↓
Pull Request to main
       ↓
   (review & approve)
       ↓
main branch
       ↓
   (deploy)
       ↓
Production Environment (192.168.1.201, 192.168.1.139)
```

---

## Version History

| Version | Branch | Date | Type | Description |
|---------|--------|------|------|-------------|
| 0.7.1 | sandbox-v0.7.1 | Earlier | PATCH | Previous sandbox version |
| 0.19.0 | sandbox-v0.19.0 | Oct 8, 2025 | MINOR | Inline column filtering (new feature) |
| 0.19.1 | sandbox-v0.19.0 | Oct 8, 2025 | PATCH | Expense update validation fix (bug fix) |
| 0.20.0 | sandbox-v0.20.0 | TBD | MINOR | Next feature |

**Note:** Branch names stay the same (sandbox-v0.19.0) while version increments within it (0.19.0 → 0.19.1).  
Create a new branch (sandbox-v0.20.0) only when adding a new MINOR feature.

---

## Best Practices

### DO ✅

1. **Always test in sandbox first**
   - Never deploy untested code to production
   
2. **Use semantic versioning**
   - Increment version numbers appropriately
   
3. **Document everything**
   - Update CHANGELOG.md with every release
   - Create feature documentation for major changes
   
4. **Use conventional commits**
   - Clear, standardized commit messages
   
5. **Keep branches focused**
   - One feature per sandbox branch
   
6. **Clean up old branches**
   - Archive or delete after merging to main

### DON'T ❌

1. **Don't push directly to main**
   - Always use Pull Requests
   
2. **Don't skip version bumps**
   - Every release needs a version number
   
3. **Don't mix features**
   - Keep each sandbox branch focused on one feature
   
4. **Don't merge without approval**
   - Always get code review before production
   
5. **Don't forget documentation**
   - Update docs with every significant change

---

## Emergency Rollback

If issues are found after deployment:

### Sandbox Rollback

```bash
ssh root@192.168.1.190
pct exec 203 -- bash
cd /opt/expenseapp
git checkout main  # or previous working branch
npm run build
cp -r dist/* /var/www/html/
systemctl reload nginx
exit
```

### Production Rollback

```bash
# 1. Identify last working version
git log --oneline -10

# 2. Revert to last working commit
git revert <commit-hash>
# or
git reset --hard <commit-hash>

# 3. Deploy (follow production deployment process)
```

---

## Questions?

For questions about branching strategy or deployment process:
- Review: `EXPENSE_TABLE_FILTERING_v0.19.0.md` (deployment guide)
- Review: `INFRASTRUCTURE_AUDIT_v0.19.0.md` (infrastructure details)
- Check: `docs/CHANGELOG.md` (version history)

---

**Remember:** Always follow the `sandbox-v{VERSION}` naming convention for consistency and clarity! 🎯

