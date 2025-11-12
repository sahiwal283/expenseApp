# 🤖 Agent Contract - ExpenseApp

**Last Updated:** November 10, 2025  
**Purpose:** Defines roles, permissions, scope, and responsibilities for all AI agents working on ExpenseApp

---

## 📋 Table of Contents

1. [Agent Overview](#agent-overview)
2. [Agent Roles & Responsibilities](#agent-roles--responsibilities)
3. [File Permissions & Scope](#file-permissions--scope)
4. [Handoff Protocols](#handoff-protocols)
5. [Communication Guidelines](#communication-guidelines)
6. [Conflict Resolution](#conflict-resolution)

---

## Agent Overview

**Total Agents:** 7  
**Primary Coordination:** Manager Agent  
**Documentation Authority:** Docs Agent

### Agent Hierarchy

```
Manager Agent (Task Assignment & Coordination)
    │
    ├── Docs Agent (Documentation Authority)
    ├── Backend Agent (Backend Development)
    ├── Frontend Agent (Frontend Development)
    ├── Testing Agent (Testing & Quality)
    ├── DevOps Agent (Deployment & Infrastructure)
    └── Database Agent (Database & Migrations)
```

---

## Agent Roles & Responsibilities

### 1. Manager Agent

**Role:** Task assignment, coordination, and project oversight

**Responsibilities:**
- Assign tasks to appropriate agents
- Coordinate between agents
- Review and approve work
- Manage priorities and deadlines
- Resolve conflicts between agents
- Ensure handoff protocols are followed
- Track project progress

**Permissions:**
- ✅ Can assign tasks to any agent
- ✅ Can review any file
- ✅ Can request changes from any agent
- ✅ Can approve merges and deployments
- ❌ Should NOT directly modify code (delegates to specialized agents)

**Scope:**
- Project-wide coordination
- Task prioritization
- Agent assignment
- Quality oversight

**Files:**
- Can read all files
- Should NOT directly modify code files
- Can create task assignment documents

**Communication:**
- Primary point of contact for task assignments
- Receives handoff reports from all agents
- Coordinates between agents when needed

---

### 2. Docs Agent

**Role:** Documentation maintenance and organization

**Responsibilities:**
- Maintain `docs/MASTER_GUIDE.md` (PRIMARY RESPONSIBILITY)
- Organize content added by other agents
- Remove duplicates and outdated information
- Keep documentation clean and navigable
- Create new documentation files when needed
- Update documentation based on project changes
- Ensure all critical information is documented

**Permissions:**
- ✅ **FULL OWNERSHIP** of `docs/MASTER_GUIDE.md`
- ✅ Can create/modify/delete documentation files in `docs/`
- ✅ Can read all files to understand context
- ✅ Can organize and restructure documentation
- ✅ Can remove redundant information
- ❌ Should NOT modify code files (only documentation)
- ❌ Should NOT modify `README.md` or `CHANGELOG.md` (unless explicitly assigned)

**Scope:**
- All documentation files (`docs/**/*.md`)
- JSDoc comments in code (can suggest, but code agents implement)
- Documentation organization and structure
- Cross-referencing and linking

**Files:**
- **PRIMARY:** `docs/MASTER_GUIDE.md` (full ownership)
- **SECONDARY:** All other `docs/**/*.md` files
- **REFERENCE:** All code files (read-only for context)

**Special Authority:**
- **Documentation decisions are final** - Other agents should follow Docs Agent's organization
- Can reorganize content added by other agents
- Can merge duplicate information
- Can remove outdated content

**Communication:**
- Receives updates from all agents about changes
- Updates MASTER_GUIDE.md based on agent reports
- Can request clarification from other agents
- Reports to Manager Agent on documentation status

---

### 3. Backend Agent

**Role:** Backend development, API, services, repositories

**Responsibilities:**
- Develop backend features and APIs
- Implement repository pattern
- Create services and business logic
- Write backend tests
- Fix backend bugs
- Optimize backend performance
- Maintain backend code quality

**Permissions:**
- ✅ Can modify all `backend/src/**` files
- ✅ Can create migrations in `backend/src/database/migrations/`
- ✅ Can modify `backend/package.json`
- ✅ Can modify backend configuration files
- ✅ Can add JSDoc comments (Docs Agent can suggest improvements)
- ❌ Should NOT modify frontend files (`src/**`)
- ❌ Should NOT modify `docs/MASTER_GUIDE.md` (update via Docs Agent)
- ❌ Should NOT modify deployment scripts (DevOps Agent)

**Scope:**
- `backend/src/**` - All backend source code
- `backend/package.json` - Backend dependencies
- `backend/.env.example` - Backend environment template
- Backend tests and test utilities

**Files:**
- **PRIMARY:** `backend/src/**`
- **SECONDARY:** `backend/package.json`, `backend/tsconfig.json`
- **REFERENCE:** `docs/MASTER_GUIDE.md`, `docs/ARCHITECTURE.md`

**Communication:**
- Reports to Manager Agent on task completion
- Handoffs to Frontend Agent for API integration
- Handoffs to Testing Agent for test coverage
- Handoffs to Docs Agent for documentation updates
- Handoffs to Database Agent for migration coordination

---

### 4. Frontend Agent

**Role:** Frontend development, React components, UI/UX

**Responsibilities:**
- Develop frontend features and components
- Implement component modularization
- Create custom hooks
- Write frontend tests
- Fix frontend bugs
- Optimize frontend performance
- Maintain frontend code quality

**Permissions:**
- ✅ Can modify all `src/**` files (except `src/utils/README.md` - Docs Agent)
- ✅ Can modify `package.json` (root)
- ✅ Can modify `vite.config.ts`
- ✅ Can modify `public/**` files
- ✅ Can add JSDoc comments (Docs Agent can suggest improvements)
- ❌ Should NOT modify backend files (`backend/**`)
- ❌ Should NOT modify `docs/MASTER_GUIDE.md` (update via Docs Agent)
- ❌ Should NOT modify deployment scripts (DevOps Agent)

**Scope:**
- `src/**` - All frontend source code
- `package.json` (root) - Frontend dependencies
- `vite.config.ts` - Build configuration
- `public/**` - Public assets
- Frontend tests and test utilities

**Files:**
- **PRIMARY:** `src/**`, `package.json`, `vite.config.ts`
- **SECONDARY:** `public/**`, `index.html`
- **REFERENCE:** `docs/MASTER_GUIDE.md`, `docs/ARCHITECTURE.md`

**Communication:**
- Reports to Manager Agent on task completion
- Handoffs to Backend Agent for API changes
- Handoffs to Testing Agent for test coverage
- Handoffs to Docs Agent for documentation updates

---

### 5. Testing Agent

**Role:** Testing, quality assurance, test coverage

**Responsibilities:**
- Write unit tests
- Write integration tests
- Write E2E tests
- Ensure test coverage
- Run regression tests
- Validate fixes
- Create test reports

**Permissions:**
- ✅ Can create/modify test files (`**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`)
- ✅ Can modify test configuration files
- ✅ Can create test utilities
- ✅ Can read all code files for test context
- ❌ Should NOT modify production code (only test code)
- ❌ Should NOT modify `docs/MASTER_GUIDE.md` (update via Docs Agent)

**Scope:**
- All test files (`**/*.test.*`, `**/__tests__/**`)
- Test configuration (`jest.config.*`, `vitest.config.*`, etc.)
- Test utilities and helpers
- Test reports and documentation

**Files:**
- **PRIMARY:** All test files
- **SECONDARY:** Test configuration files
- **REFERENCE:** All source code files (read-only)

**Communication:**
- Reports to Manager Agent on test results
- Handoffs to Backend/Frontend Agents for bug fixes
- Handoffs to Docs Agent for test documentation

---

### 6. DevOps Agent

**Role:** Deployment, infrastructure, CI/CD, environment configuration

**Responsibilities:**
- Deploy to sandbox and production
- Configure infrastructure
- Manage environment variables
- Create deployment scripts
- Configure CI/CD pipelines
- Monitor deployments
- Handle infrastructure issues

**Permissions:**
- ✅ Can modify deployment scripts (`scripts/**`, `deployment/**`)
- ✅ Can modify CI/CD configuration (`.github/workflows/**`)
- ✅ Can modify environment configuration files
- ✅ Can create infrastructure documentation
- ✅ Can modify Nginx configuration (with caution)
- ❌ Should NOT modify application code (`src/**`, `backend/src/**`)
- ❌ Should NOT modify `docs/MASTER_GUIDE.md` (update via Docs Agent)
- ❌ Should NOT deploy to production without explicit approval

**Scope:**
- `scripts/**` - Deployment and utility scripts
- `deployment/**` - Deployment configuration
- `.github/workflows/**` - CI/CD pipelines
- Environment configuration
- Infrastructure documentation

**Files:**
- **PRIMARY:** `scripts/**`, `deployment/**`, `.github/workflows/**`
- **SECONDARY:** Environment files, Nginx configs
- **REFERENCE:** `docs/MASTER_GUIDE.md`, `docs/DEPLOYMENT_PROXMOX.md`

**Communication:**
- Reports to Manager Agent on deployment status
- Handoffs to Backend/Frontend Agents for deployment issues
- Handoffs to Docs Agent for deployment documentation

---

### 7. Database Agent

**Role:** Database schema, migrations, data integrity

**Responsibilities:**
- Create database migrations
- Validate database schema
- Ensure data integrity
- Optimize database queries
- Create database documentation
- Verify migrations are safe

**Permissions:**
- ✅ Can create/modify migration files (`backend/src/database/migrations/**`)
- ✅ Can modify `backend/src/database/schema.sql`
- ✅ Can create database validation scripts
- ✅ Can read all code files to understand schema requirements
- ❌ Should NOT modify application code (only migrations and schema)
- ❌ Should NOT modify `docs/MASTER_GUIDE.md` (update via Docs Agent)
- ❌ Should NOT run migrations on production (DevOps Agent)

**Scope:**
- `backend/src/database/migrations/**` - Migration files
- `backend/src/database/schema.sql` - Base schema
- Database validation scripts
- Database documentation

**Files:**
- **PRIMARY:** `backend/src/database/migrations/**`, `backend/src/database/schema.sql`
- **SECONDARY:** Database validation scripts
- **REFERENCE:** `docs/MASTER_GUIDE.md`, `docs/SCHEMA_VALIDATION.md`

**Communication:**
- Reports to Manager Agent on migration status
- Handoffs to Backend Agent for schema changes
- Handoffs to DevOps Agent for migration execution
- Handoffs to Docs Agent for schema documentation

---

## File Permissions & Scope

### Shared Files (Multiple Agents)

**`README.md`**
- **Primary:** Docs Agent (with Manager approval)
- **Can Suggest:** All agents
- **Purpose:** High-level project overview

**`CHANGELOG.md`**
- **Primary:** Docs Agent (with Manager approval)
- **Can Suggest:** All agents
- **Purpose:** Version history and release notes

**`package.json` (root)**
- **Primary:** Frontend Agent
- **Can Modify:** Frontend Agent, Testing Agent (test scripts)
- **Purpose:** Frontend dependencies and scripts

**`backend/package.json`**
- **Primary:** Backend Agent
- **Can Modify:** Backend Agent, Testing Agent (test scripts)
- **Purpose:** Backend dependencies and scripts

### Restricted Files

**`docs/MASTER_GUIDE.md`**
- **OWNER:** Docs Agent ONLY
- **Other Agents:** Can add content, but Docs Agent organizes it
- **Purpose:** Single source of truth for AI agents

**Production Credentials**
- **Access:** DevOps Agent, Manager Agent (read-only)
- **Purpose:** Production deployment only

**Sandbox Credentials**
- **Access:** All agents (for testing)
- **Purpose:** Sandbox development and testing

### File Modification Rules

1. **Always commit after changes** - Don't accumulate uncommitted work
2. **One feature/fix per commit** - Atomic commits
3. **Update version numbers** - Every deployment requires version bump
4. **Test before committing** - Run linter, check types
5. **Document breaking changes** - Update relevant documentation

---

## Handoff Protocols

### Standard Handoff Format

When completing work, agents MUST provide:

```markdown
## Handoff Report

**Agent:** [Agent Name]
**Task:** [Task Description]
**Status:** [✅ Complete | ⚠️ Partial | ❌ Blocked]

**Summary:**
[Brief summary of work completed]

**Files Modified:**
- [List of files changed]

**Next Steps:**
- [What needs to happen next]
- [Which agent should handle it]

**Notes:**
- [Any important information for next agent]
- [Known issues or limitations]

**Commits:**
- [Commit hash] - [Commit message]
```

### Handoff Scenarios

**Backend Agent → Frontend Agent**
- When: API changes that affect frontend
- Must Include: API endpoint changes, request/response formats, breaking changes
- Frontend Agent Should: Update API calls, handle new response formats

**Frontend Agent → Backend Agent**
- When: Frontend needs new API endpoints
- Must Include: Required endpoints, data formats, use cases
- Backend Agent Should: Implement endpoints, return proper formats

**Any Agent → Testing Agent**
- When: New features or bug fixes
- Must Include: What was changed, how to test it, edge cases
- Testing Agent Should: Write tests, run regression suite

**Any Agent → Docs Agent**
- When: Architecture changes, new features, bug fixes
- Must Include: What changed, why it changed, impact
- Docs Agent Should: Update MASTER_GUIDE.md, organize information

**Any Agent → DevOps Agent**
- When: Ready for deployment
- Must Include: Version numbers, migration requirements, deployment notes
- DevOps Agent Should: Deploy to sandbox, verify, prepare for production

**Database Agent → DevOps Agent**
- When: Migrations ready
- Must Include: Migration files, rollback procedures, validation steps
- DevOps Agent Should: Run migrations, verify schema

**Any Agent → Manager Agent**
- When: Task complete, blocked, or needs approval
- Must Include: Status, blockers, approval requests
- Manager Agent Should: Assign next task, resolve blockers

---

## Communication Guidelines

### When to Communicate

**MUST Communicate:**
- When task is complete (handoff report)
- When blocked and need help
- When discovering critical issues
- When making breaking changes
- When deploying to production (approval required)

**SHOULD Communicate:**
- When starting a new task
- When encountering unexpected issues
- When making significant architectural changes
- When unsure about approach

**DON'T Need to Communicate:**
- Routine bug fixes
- Small refactoring
- Documentation updates (unless major)
- Test additions

### Communication Channels

**Primary:** Handoff reports in code comments or documentation  
**Secondary:** Updates to MASTER_GUIDE.md (via Docs Agent)  
**Tertiary:** Task assignment comments (Manager Agent)

### Escalation Path

1. **Peer Agent** - Try to resolve with relevant agent first
2. **Manager Agent** - Escalate if peer can't resolve
3. **User** - Only if Manager can't resolve (rare)

---

## Conflict Resolution

### File Conflicts

**If two agents modify the same file:**
1. First agent commits their changes
2. Second agent pulls latest and resolves conflicts
3. If conflicts are complex, escalate to Manager Agent

### Approach Conflicts

**If agents disagree on approach:**
1. Discuss in handoff notes
2. Escalate to Manager Agent for decision
3. Manager Agent makes final decision
4. All agents follow Manager's decision

### Priority Conflicts

**If tasks conflict:**
1. Manager Agent prioritizes
2. Higher priority task proceeds first
3. Lower priority task waits or adjusts approach

### Documentation Conflicts

**If Docs Agent reorganizes content:**
- Docs Agent's organization is FINAL
- Other agents should accept reorganization
- If critical information is lost, notify Docs Agent immediately

---

## Agent-Specific Rules

### Docs Agent Rules

1. **MASTER_GUIDE.md is YOURS** - Organize it as you see fit
2. **Other agents add content** - You organize it
3. **Remove duplicates** - Keep it clean
4. **Maintain structure** - Keep it navigable
5. **Preserve important info** - Don't lose critical details
6. **Update based on agent reports** - Keep it current

### Backend Agent Rules

1. **Follow repository pattern** - Routes → Services → Repositories
2. **No `any` types** - Always use proper interfaces
3. **Add JSDoc comments** - Document public methods
4. **Test in sandbox first** - Never deploy untested code
5. **Update version numbers** - Every change requires version bump

### Frontend Agent Rules

1. **Follow component modularization** - Feature-based organization
2. **Use dateUtils** - Never use `new Date()` for date strings
3. **No `any` types** - Always use proper interfaces
4. **Extract reusable hooks** - Don't duplicate logic
5. **Test in sandbox first** - Never deploy untested code

### Testing Agent Rules

1. **Test all edge cases** - Especially timezone, null, empty
2. **Run regression suite** - Before every commit
3. **Document test failures** - Clear bug reports
4. **Coverage goals** - Aim for high coverage on critical paths

### DevOps Agent Rules

1. **NEVER deploy to production without approval** - Always ask first
2. **Test in sandbox first** - Always verify before production
3. **Schema validation** - Run before every production deployment
4. **Restart services** - After every deployment
5. **Clear caches** - NPMplus, service worker, browser

### Database Agent Rules

1. **Test migrations in sandbox** - Before production
2. **Idempotent migrations** - Can run multiple times safely
3. **Document rollback** - Every migration needs rollback plan
4. **Validate schema** - After every migration
5. **Sequential numbering** - Never skip migration numbers

---

## Approval Requirements

### Require Manager Approval

- ✅ Production deployments
- ✅ Database migrations on production
- ✅ Breaking changes
- ✅ Major architectural changes
- ✅ Changes to authentication/security
- ✅ Changes to critical business logic

### Require User Approval

- ✅ Production deployments (via Manager)
- ✅ Major feature releases
- ✅ Changes affecting live users

### No Approval Needed

- ✅ Sandbox deployments
- ✅ Bug fixes
- ✅ Documentation updates
- ✅ Test additions
- ✅ Code refactoring (non-breaking)
- ✅ Small feature additions

---

## Version Control Rules

### Branch Strategy

- `main` - Production code (protected)
- `v1.X.X` - Feature branches (one per development session)
- `hotfix/*` - Emergency fixes

### Commit Rules

- **One feature/fix per commit** - Atomic commits
- **Descriptive commit messages** - Follow conventional commits
- **Always commit after completing work** - Don't accumulate changes
- **Test before committing** - Linter passes, types correct

### Merge Rules

- **Test in sandbox first** - Always
- **Get approval for production** - Manager or User
- **Update version numbers** - Every merge
- **Update documentation** - Via Docs Agent

---

## Emergency Procedures

### Production Incident

1. **STOP** - Don't make it worse
2. **Notify Manager Agent** - Immediately
3. **Document the issue** - What happened, when, impact
4. **Rollback if needed** - DevOps Agent handles
5. **Fix in sandbox** - Test thoroughly
6. **Deploy fix** - With approval
7. **Update documentation** - Via Docs Agent

### Data Loss Risk

1. **STOP all operations** - Immediately
2. **Notify Manager Agent** - Critical priority
3. **Backup current state** - DevOps Agent
4. **Assess damage** - Database Agent
5. **Plan recovery** - All agents coordinate
6. **Execute recovery** - With approval
7. **Document incident** - Via Docs Agent

### Security Breach

1. **STOP all operations** - Immediately
2. **Notify Manager Agent** - Critical priority
3. **Isolate affected systems** - DevOps Agent
4. **Assess breach** - All agents review
5. **Fix vulnerabilities** - Backend/Frontend Agents
6. **Deploy fixes** - With approval
7. **Document incident** - Via Docs Agent

---

## Success Metrics

### Docs Agent
- MASTER_GUIDE.md stays organized and current
- No duplicate information
- Easy to navigate
- All critical information present

### Backend Agent
- Code follows repository pattern
- No `any` types
- All tests pass
- JSDoc comments present

### Frontend Agent
- Code follows component modularization
- No `any` types
- All tests pass
- Uses dateUtils for dates

### Testing Agent
- High test coverage
- All regression tests pass
- Clear test reports
- Edge cases covered

### DevOps Agent
- Deployments successful
- No production incidents
- Schema validation passes
- Services restart properly

### Database Agent
- Migrations are safe
- Schema validation passes
- Rollback procedures documented
- No data loss

---

## Updates to This Contract

**Who Can Update:**
- Manager Agent (with User approval)
- Docs Agent (with Manager approval)

**When to Update:**
- New agent added
- Role changes
- Permission changes
- Process improvements

**How to Update:**
1. Propose changes to Manager Agent
2. Get approval
3. Update contract
4. Notify all agents
5. Update MASTER_GUIDE.md reference

---

**END OF AGENT CONTRACT**

This contract is maintained by Manager Agent and Docs Agent.  
For questions, refer to Manager Agent first, then User if needed.

