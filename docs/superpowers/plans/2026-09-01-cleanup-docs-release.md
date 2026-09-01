# Argo v2.20.1 Cleanup, Documentation & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Argo's documentation up to reality (README, architecture + DB diagrams, changelog), clean the repo of stale artifacts/docs/dead code, retire the abandoned standalone-Argo containers, and ship it all as v2.20.1 to production.

**Architecture:** No behavior changes. This is a chore release: docs rewritten against the live v2.20.x system (Midas expense backend, Authentik SSO, booth inventory, prod on Proxmox CTs 2120/2220/2320), conservative dead-file removal gated by the full test suite, and the standard production deploy scripts.

**Tech Stack:** React/Vite + Express/TypeScript + PostgreSQL. Mermaid for diagrams. Vitest. Bash deploy scripts over SSH to Proxmox host `root@192.168.1.190`.

**Spec:** `docs/superpowers/specs/2026-09-01-cleanup-docs-release-design.md`

## Global Constraints

- Version: **2.20.1** in BOTH `package.json` and `backend/package.json` (bump happens in Task 11, not before).
- Conservative cleanup only: a file/export/dependency is removed ONLY if grep across the repo shows zero non-test references AND the gates pass afterward. When in doubt, keep it.
- The flag-gated local-Zoho posting path (`backend/src/services/zohoIntegrationClient.ts`, `backend/src/services/zoho/`, `EXPENSE_BACKEND=local` support) MUST NOT be removed.
- No git history rewrite. No sandbox (CT 2600) deploy.
- Gates (run before AND after code-touching tasks): `npm run lint`, `npm run build` (repo root), `cd backend && npm test`, `cd backend && npm run build`.
- Prod facts: backend CT 2220 listens on port **3000**; live hostname is `https://argo.booute.duckdns.org`; prod DB is `expense_app_production` on CT 2320; authoritative backend env is `/etc/expenseapp/backend.env` (not `backend/.env`). Prod runs `EXPENSE_BACKEND=midas`, `MIDAS_MODE=live` — Midas owns picklists and Zoho posting.
- All server work goes through `ssh root@192.168.1.190` (Proxmox host `pve`), using `pct exec <CTID> -- ...` for containers.
- Commit after every task with a conventional-commit message.

---

### Task 0: Baseline green gate

**Files:** none modified.

**Interfaces:**
- Produces: a recorded green baseline (lint/tests/builds pass on `main` before any change). Later tasks compare against this.

- [ ] **Step 1: Verify clean tree on main**

Run: `git status --porcelain && git branch --show-current`
Expected: no output except possible untracked clutter (tarballs, old MDs — these are Task 1's targets); branch `main`.

- [ ] **Step 2: Run all gates**

```bash
npm run lint
npm run build
cd backend && npm test && npm run build && cd ..
```
Expected: all pass. If the baseline is already red, STOP and report — do not proceed to cleanup on a red baseline.

- [ ] **Step 3: Record baseline**

Note the backend test count (e.g. "N passed") for comparison in Task 4. No commit (nothing changed).

---

### Task 1: Purge untracked root clutter

**Files:**
- Delete (all untracked/ignored): `frontend-*.tar.gz` (58 files, repo root), `.DS_Store`, `coverage/`, and the untracked stale root MDs: `CHECKLIST_ENV_REVIEW_v1.28.0.md`, `CODE_REVIEW_v1.28.0.md`, `CORS_API_REVIEW_v1.28.0.md`, `FINAL_CODE_REVIEW_v1.27.15.md` (empty file), `FINAL_REVIEW_v1.28.0.md`, `PERMISSIONS_TEST_REVIEW_v1.28.0.md`, `REFACTOR_REVIEW_v1.28.0.md`, `TESTING_COMPLETE_v1.28.0.md`, `PRODUCTION_ERROR_RESOLUTION_v1.29.1.md`, plus untracked `docs/PRODUCTION_DEPLOYMENT_v1.29.3.md` and `docs/PRODUCTION_ERROR_RESOLUTION_v1.29.2.md`.

**Interfaces:**
- Consumes: nothing. These files are all untracked (verify per step 1).
- Produces: clean repo root.

- [ ] **Step 1: Verify every deletion target is untracked**

```bash
for f in frontend-*.tar.gz .DS_Store *_v1.2[789]*.md *_v1.3*.md docs/PRODUCTION_DEPLOYMENT_v1.29.3.md docs/PRODUCTION_ERROR_RESOLUTION_v1.29.2.md; do git ls-files --error-unmatch "$f" 2>/dev/null && echo "TRACKED — DO NOT DELETE: $f"; done
```
Expected: no `TRACKED` lines. Any file that prints as tracked is out of scope for this task — leave it and note it.

- [ ] **Step 2: Delete**

```bash
rm -f frontend-*.tar.gz .DS_Store
rm -rf coverage
rm -f CHECKLIST_ENV_REVIEW_v1.28.0.md CODE_REVIEW_v1.28.0.md CORS_API_REVIEW_v1.28.0.md \
      FINAL_CODE_REVIEW_v1.27.15.md FINAL_REVIEW_v1.28.0.md PERMISSIONS_TEST_REVIEW_v1.28.0.md \
      REFACTOR_REVIEW_v1.28.0.md TESTING_COMPLETE_v1.28.0.md PRODUCTION_ERROR_RESOLUTION_v1.29.1.md \
      docs/PRODUCTION_DEPLOYMENT_v1.29.3.md docs/PRODUCTION_ERROR_RESOLUTION_v1.29.2.md
```
NOTE: `PRE_PRODUCTION_CHECKLIST.md` is **tracked** and is deliberately NOT in this command — it is archived in Task 3.

- [ ] **Step 3: Verify**

Run: `ls frontend-*.tar.gz 2>/dev/null; git status --porcelain`
Expected: no tarballs; `git status` shows no deletions of tracked files. No commit needed (untracked files only) — if `git status` shows nothing changed, skip commit.

---

### Task 2: Untrack credentials + rotation report

**Files:**
- Untrack (keep on disk): `credentials/CREDENTIALS_TEMPLATE.md`, `credentials/README.md`, `credentials/SANDBOX_CREDENTIALS.md`

**Interfaces:**
- Produces: `credentials/` fully untracked; a rotation notice in the final report. `.gitignore` already contains `credentials/` and `*CREDENTIALS.md` — no gitignore change needed.

- [ ] **Step 1: Untrack**

```bash
git rm --cached credentials/CREDENTIALS_TEMPLATE.md credentials/README.md credentials/SANDBOX_CREDENTIALS.md
```

- [ ] **Step 2: Verify files remain on disk and are now ignored**

Run: `ls credentials/ && git status --porcelain credentials/ && git check-ignore credentials/SANDBOX_CREDENTIALS.md && echo IGNORED`
Expected: three files listed on disk; status shows staged deletions only; `IGNORED` printed.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(security): untrack credentials directory (files remain local-only)"
```

- [ ] **Step 4: Record rotation notice for final report**

The following Zoho **sandbox** secrets were exposed in git history (no rewrite performed) and must be rotated by the user in the Zoho developer console: Client ID `1000.PWO6LIXJ34P6SL4AULI2EJR4EGPHAA`, its client secret, and the refresh token in `credentials/SANDBOX_CREDENTIALS.md`. Include this verbatim in the final summary to the user.

---

### Task 3: Archive stale tracked docs, delete deploy-sandbox.sh

**Files:**
- Create: `docs/archive/README.md`
- Move (git mv → `docs/archive/`): `PRE_PRODUCTION_CHECKLIST.md`, `DEPLOYMENT_README.md`, `LOCAL_DEPLOYMENT_QUICK_REF.md`, `docs/DATABASE_VERIFICATION_REPORT.md`, `docs/MIGRATION_RESOLUTION_REPORT.md`, `docs/MIGRATION_TRACKING_IMPLEMENTATION.md`, `docs/PRODUCTION_DEPLOYMENT_COMPLETE_v1.29.0.md`, `docs/PRODUCTION_MIGRATION_GUIDE_v1.18.0.md`, `docs/PRODUCTION_MIGRATION_PLAN.md`, `docs/rename-db-notes.md`, `docs/rename-external-urls.md`, `docs/FRONTEND_API_INVESTIGATION.md`, `docs/midas-integration-reply.md`, `docs/midas-integration-requests.md`
- Delete: `deploy-sandbox.sh`
- Keep in place: `docs/superpowers/**`, `docs/ARGO_RENAME_DEFERRED.md`, all other `docs/*.md` (living docs; Task 9 handles staleness).

**Interfaces:**
- Produces: `docs/archive/` with the historical one-offs; root has only README/CHANGELOG/CLAUDE.md as MDs.

- [ ] **Step 1: Create archive dir with explanatory README**

```bash
mkdir -p docs/archive
cat > docs/archive/README.md << 'EOF'
# Archive

Historical one-off documents — deployment postmortems, migration reports,
review checklists, and integration correspondence from earlier releases.
Kept for reference; nothing in here describes the current system.
For current documentation see [`docs/`](../) and the repo [README](../../README.md).
EOF
```

- [ ] **Step 2: Move the files**

```bash
git mv PRE_PRODUCTION_CHECKLIST.md DEPLOYMENT_README.md LOCAL_DEPLOYMENT_QUICK_REF.md docs/archive/
git mv docs/DATABASE_VERIFICATION_REPORT.md docs/MIGRATION_RESOLUTION_REPORT.md \
       docs/MIGRATION_TRACKING_IMPLEMENTATION.md docs/PRODUCTION_DEPLOYMENT_COMPLETE_v1.29.0.md \
       docs/PRODUCTION_MIGRATION_GUIDE_v1.18.0.md docs/PRODUCTION_MIGRATION_PLAN.md \
       docs/rename-db-notes.md docs/rename-external-urls.md docs/FRONTEND_API_INVESTIGATION.md \
       docs/midas-integration-reply.md docs/midas-integration-requests.md docs/archive/
```
(If `git mv` refuses the two gitignored `*_v1*` files, use `git mv -f`.)

- [ ] **Step 3: Delete the trap script**

```bash
git rm deploy-sandbox.sh
```
Rationale (put in commit body): its variables say SANDBOX but it targets production CTs 2220/2120; `deploy-sandbox-2600.sh` is the real sandbox deploy.

- [ ] **Step 4: Fix references to moved/deleted files**

```bash
grep -rn "DEPLOYMENT_README\|LOCAL_DEPLOYMENT_QUICK_REF\|PRE_PRODUCTION_CHECKLIST\|deploy-sandbox\.sh" \
  --include='*.md' --include='*.sh' --include='*.json' . | grep -v node_modules | grep -v docs/archive | grep -v superpowers
```
Update any live-doc links to point at `docs/archive/<name>` (or drop the link if the sentence is itself stale). References inside `docs/archive/**` and `docs/superpowers/**` stay as-is.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(docs): archive historical one-off docs; remove misleading deploy-sandbox.sh"
```

---

### Task 4: Dead code and unused dependency removal (conservative)

**Files:**
- Modify/Delete: discovered at runtime — candidates come from tooling, every removal is grep-verified. `package.json`/`backend/package.json` dependency lists may shrink.

**Interfaces:**
- Consumes: Task 0's green baseline.
- Produces: a repo where every tracked source file is reachable; gates still green; test count not lower than baseline (except tests deleted together with their dead subject).

**Hard rules for this task:**
- NEVER remove: `backend/src/services/zohoIntegrationClient.ts`, anything under `backend/src/services/zoho/`, `EXPENSE_BACKEND` branching, migrations (`backend/src/database/migrations/**` — ALL stay, applied or not), seed scripts, service-worker files, anything referenced from `package.json` scripts or deploy scripts.
- A frontend component referenced only via lazy `import()` or string-keyed view maps in `App.tsx` counts as referenced — check `App.tsx` view strings before deleting any component.

- [ ] **Step 1: Generate candidates**

```bash
npx knip 2>/dev/null || true                 # repo root (frontend)
npx depcheck . 2>/dev/null || true
cd backend && npx depcheck . 2>/dev/null || true; cd ..
```
Collect: unused files, unused exports, unused dependencies. Tooling output is a CANDIDATE list, not a verdict.

- [ ] **Step 2: Verify each candidate manually**

For each candidate file `X`: `grep -rn "$(basename X .ts)" src backend/src public scripts index.html vite.config.ts --include='*' -l | grep -v node_modules`. Delete only on zero hits outside the file itself and its own test. For each candidate dependency `D`: `grep -rn "from ['\"]D\|require(['\"]D" src backend/src | head`. Remove from package.json only on zero hits (also check vite/tailwind/postcss/eslint configs — plugins are referenced there, not imported).

- [ ] **Step 3: Remove verified-dead files/exports/deps**

Use `git rm` for files; edit package.json + run `npm install` (root and/or backend) so lockfiles update. If NOTHING survives verification, that is a valid outcome — skip to Step 5 and report "no safe removals found".

- [ ] **Step 4: Run all gates**

```bash
npm run lint && npm run build
cd backend && npm test && npm run build && cd ..
```
Expected: all pass; backend test count ≥ baseline minus tests removed alongside their dead subjects. Any failure → revert the specific removal that caused it (`git checkout -- <file>` / restore dep) and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead files and unused dependencies (grep-verified, gates green)"
```
List every removed file/dep in the commit body.

---

### Task 5: CHANGELOG — retroactive 2.20.0 entry

**Files:**
- Modify: `CHANGELOG.md` (insert between `## [Unreleased]` and `## [2.19.0]`)

**Interfaces:**
- Produces: complete version history through 2.20.0. Task 11 adds 2.20.1 above it.

- [ ] **Step 1: Confirm 2.20.0 is missing and gather facts**

Run: `grep -n '## \[2\.\(19\|20\)' CHANGELOG.md && git log --oneline cf264bc~25..e7335b8 | head -30`
Expected: only 2.19.0 present. Skim the booth-inventory commits for accuracy of the entry below.

- [ ] **Step 2: Insert the 2.20.0 entry**

Insert after the `## [Unreleased]` block, matching house style (prose bullets explaining the why, not commit-log dumps):

```markdown
## [2.20.0] - 2026-08-27 - Booth inventory and tracking

### Added
- Booth inventory: a catalog of booths and their components (weights, photos, attachments), locations, and containers, managed from a new Booths page with detail tabs and move/weight/photo modals.
- Packing checklist per event with an offline-capable flow: reads work offline and queued check-offs replay idempotently on reconnect, so double-taps and retries can't double-apply.
- Manifest panel on the event checklist showing what ships in which container, with exception reporting (ReportIssueModal) including photos.
- Migration 039 (`039_create_booth_inventory.sql`): booths, components, containers, locations, manifests, and attachment tables.

### Changed
- Temporary role gains read + field-ops access to inventory so on-site staff can work the packing list without full accounts.

### Fixed
- Postgres constraint violations on booth endpoints now map to actionable 4xx errors instead of opaque 500s.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md && git commit -m "docs(changelog): add missing 2.20.0 booth inventory entry"
```

---

### Task 6: README rewrite

**Files:**
- Rewrite: `README.md`

**Interfaces:**
- Consumes: Task 3's final doc locations (link only to files that still exist at their new paths).
- Produces: the repo's front door. Other docs link to it; it links to `docs/ARCHITECTURE.md`, `docs/DATABASE.md` (created in Task 8 — the link is written now and validated in Task 8), `CHANGELOG.md`, `CLAUDE.md`.

**Content requirements — the README must contain exactly these sections, no version numbers anywhere (versions live in CHANGELOG):**

1. **Title + one-paragraph description:** Argo — trade show expense management PWA. OCR receipt scanning (Tesseract + optional Ollama enhancement), offline-first architecture, expense approval workflows, booth inventory & packing checklists, Authentik SSO, expense data via the Midas backend (`EXPENSE_BACKEND=midas` in production) with Zoho Books posting owned by Midas.
2. **Feature list:** expenses (submission, OCR, approval, messaging threads, push notifications), events & checklists, booth inventory, CRM leads, reports/show summaries, dynamic role system (admin/accountant/coordinator/salesperson/developer/temporary/pending + custom), dev dashboard.
3. **Quick start (local):** prerequisites (Node 20+, PostgreSQL), then `cp env.example .env` + configure, `npm install` in root and `backend/`, `cd backend && npm run migrate && npm run seed`, `npm run start:all`; URLs localhost:5173 / localhost:5000; demo login `admin`/`password123`. State that `./scripts/local-deploy.sh` automates this.
4. **Commands table:** dev/build/test/lint commands copied from CLAUDE.md's Commands section (they are current).
5. **Architecture in one screen:** monorepo layout tree (src/, backend/src/, public/, scripts/, docs/) + one short mermaid context diagram (browser → nginx/NPMplus → frontend + backend API → PostgreSQL, Midas, Authentik, Ollama, Zoho) — the detailed diagrams live in ARCHITECTURE.md.
6. **Documentation index:** links to docs/ARCHITECTURE.md, docs/DATABASE.md, CHANGELOG.md, docs/TROUBLESHOOTING.md, docs/DEPLOYMENT_PROXMOX.md, docs/TESTING_STRATEGY.md, docs/archive/ (one line: historical documents).
7. **Deployment (brief):** production deploys via `scripts/deploy-production-backend.sh` + `scripts/deploy-production-frontend.sh`; sandbox via `deploy-sandbox-2600.sh`; version must be bumped in both package.json files first; see docs/DEPLOYMENT_PROXMOX.md.

- [ ] **Step 1: Rewrite README.md** per the content requirements above. Plain professional tone; drop the emoji-status-line style of the old file.

- [ ] **Step 2: Verify all links resolve**

```bash
grep -o '(\(docs\|\.\)[^)]*\.md)' README.md | tr -d '()' | while read f; do [ -f "$f" ] || echo "BROKEN: $f"; done
```
Expected: only `docs/DATABASE.md` may print BROKEN (created in Task 8; re-check there).

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs(readme): rewrite for current system (Midas, SSO, booth inventory)"
```

---

### Task 7: ARCHITECTURE.md rewrite with mermaid diagrams

**Files:**
- Rewrite: `docs/ARCHITECTURE.md`

**Interfaces:**
- Produces: the authoritative architecture doc. Must agree with README (Task 6) and DATABASE.md (Task 8).

**Content requirements — sections in order:**

1. **Overview** — one paragraph; no version numbers; date the doc "Last verified: 2026-09-01".
2. **Production topology (mermaid `graph TD` or `flowchart LR`)** — exactly this reality: Browser/PWA → NPMplus reverse proxy (CT 104, 192.168.1.160, hostname `argo.booute.duckdns.org`; `expapp.duckdns.org` 302-redirects) → `/` to frontend nginx CT 2120 (192.168.1.139:80, serves `/var/www/trade-show-app/current`) and `/api` to backend node CT 2220 (192.168.1.201:**3000**, systemd `trade-show-app-backend`, env from `/etc/expenseapp/backend.env`) → PostgreSQL CT 2320 (`expense_app_production`). External systems: Midas (expense SoT + picklists + Zoho posting, `EXPENSE_BACKEND=midas`/`MIDAS_MODE=live`), Authentik SSO (CT 111, OIDC), Ollama (CT 103, optional OCR enhancement), Zoho Books (reached via Midas in prod; direct client is the flag-gated local fallback). Sandbox: CT 2600 all-in-one.
3. **Backend architecture** — routes → services → repositories → raw pg; list the service boundaries verbatim from CLAUDE.md (zohoIntegrationClient boundary, ocr pipeline, ExpenseService 3-rule approval, EventParticipantService) plus the newer ones: `services/midas/` + `services/expenseStore/` (ExpenseStore swaps local vs Midas SoT via `EXPENSE_BACKEND`; local `expenses` table frozen at cutover), `services/picklists/PicklistService` (`PICKLIST_SOURCE` auto/midas/settings), `ExpenseMessageScanner` (pull-based poller because Midas has no webhooks), `AuthentikOidcService`, booth services, `PushService`. One mermaid `sequenceDiagram` for the expense submission flow under Midas (submit → OCR → ExpenseStore(midas) → accountant review in Midas → message thread + push back to submitter).
4. **Frontend architecture** — App.tsx string-based view state (not React Router), role-based rendering, hooks (`useAuth`/`useApi`/`useDataFetching`), `apiClient` JWT injection, feature component folders including `booths/`.
5. **Offline-first (mermaid flowchart)** — service worker caching; Dexie/IndexedDB queue; `syncManager` replay on reconnect; idempotent booth-checklist replay.
6. **AuthN/AuthZ** — JWT in localStorage + Authentik OIDC login; session tracker middleware (`last_activity`); dynamic DB-driven roles.
7. **Environments & config** — table: local / sandbox CT 2600 / prod CTs; key env vars incl. `EXPENSE_BACKEND`, `MIDAS_MODE`, `PICKLIST_SOURCE`, `OIDC_*`, `ZOHO_*` (fallback only); note the `/etc/expenseapp/backend.env` authority and the migrate-on-startup behavior (with the 42501 silent-skip caveat → verify `schema_migrations` after deploys that ship migrations).

- [ ] **Step 1: Rewrite `docs/ARCHITECTURE.md`** per the requirements. Verify claims against code as you write (e.g. `grep -n "view" src/App.tsx | head`, `ls backend/src/services`) — every named file must exist.

- [ ] **Step 2: Validate mermaid syntax**

```bash
npx -y @mermaid-js/mermaid-cli@latest -i docs/ARCHITECTURE.md -o /tmp/arch-check.md 2>&1 | tail -5 || echo "mmdc unavailable — paste each block into https://mermaid.live check manually"
```
Expected: no parse errors (mmdc extracts and renders fenced mermaid blocks).

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md && git commit -m "docs(architecture): rewrite with mermaid diagrams reflecting Midas-era production topology"
```

---

### Task 8: DATABASE.md — schema doc from live prod

**Files:**
- Create: `docs/DATABASE.md`

**Interfaces:**
- Consumes: live schema on CT 2320 (ground truth).
- Produces: ER diagrams + table inventory. README's `docs/DATABASE.md` link (Task 6) becomes valid.

- [ ] **Step 1: Introspect live prod schema**

```bash
ssh root@192.168.1.190 "pct exec 2320 -- su - postgres -c \"psql -d expense_app_production -Atc \\\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1\\\"\"" > /tmp/argo-tables.txt
ssh root@192.168.1.190 "pct exec 2320 -- su - postgres -c \"psql -d expense_app_production -Atc \\\"SELECT tc.table_name||'|'||kcu.column_name||'|'||ccu.table_name||'|'||ccu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name WHERE tc.constraint_type='FOREIGN KEY'\\\"\"" > /tmp/argo-fks.txt
ssh root@192.168.1.190 "pct exec 2320 -- su - postgres -c \"psql -d expense_app_production -c '\\\\d+' \"" > /tmp/argo-schema-full.txt 2>/dev/null || true
```
For column detail per table: `psql -d expense_app_production -Atc "SELECT table_name||'|'||column_name||'|'||data_type||'|'||is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position"`. Also fetch applied migrations: `SELECT version FROM schema_migrations ORDER BY 1` and cross-check against `ls backend/src/database/migrations/*.sql` — report any gaps in the doc's "Migrations" section (known history: some 017–024/029 may have been skipped historically; report what you actually find, don't editorialize).

- [ ] **Step 2: Write `docs/DATABASE.md`**

Structure:
1. Header: "Generated from live production schema (`expense_app_production`, CT 2320) on 2026-09-01." Note: raw SQL + parameterized queries, no ORM; migrations in `backend/src/database/migrations/` auto-run at startup.
2. **Domain-grouped mermaid `erDiagram`s** (one per domain, NOT one giant diagram): Users & auth (users, roles, sessions/notifications, push subscriptions); Events & checklist (events, event_participants, checklist tables, show summaries); Expenses (expenses [mark FROZEN — SoT moved to Midas at cutover], expense audit log, expense message notifications); Booth inventory (migration 039 tables); CRM (crm_leads + conversion); OCR/training (corrections, training tables). Include PK/FK columns and relationships from `/tmp/argo-fks.txt`; omit trivial columns from diagrams to keep them readable.
3. **Table inventory:** one table listing every table (from `/tmp/argo-tables.txt`) with a one-line purpose — no table left out.
4. **Migrations section:** how migrations work + applied-vs-present cross-check results.

- [ ] **Step 3: Validate mermaid + links**

```bash
npx -y @mermaid-js/mermaid-cli@latest -i docs/DATABASE.md -o /tmp/db-check.md 2>&1 | tail -3
grep -c 'erDiagram' docs/DATABASE.md
comm -23 <(sort /tmp/argo-tables.txt) <(grep -oE '^\| *`?[a-z_]+' docs/DATABASE.md | tr -d '|` ' | sort -u) | head
```
Expected: mermaid parses; every live table appears in the inventory (comm prints nothing).

- [ ] **Step 4: Commit**

```bash
git add docs/DATABASE.md && git commit -m "docs(database): add schema documentation with ER diagrams from live prod"
```

---

### Task 9: Living-docs staleness pass

**Files:**
- Modify (light touch): `docs/MASTER_GUIDE.md`, `docs/ENVIRONMENT_SEPARATION.md`, `docs/LOCAL_DEPLOYMENT.md`, `docs/QUICKSTART.md`, `docs/USER_GUIDE_BOOKED_STATUS.md`, and any other remaining `docs/*.md` that names a version or dead topology.

**Interfaces:**
- Consumes: facts fixed in Tasks 6–8.
- Produces: no living doc contradicts README/ARCHITECTURE.

- [ ] **Step 1: Find stale claims**

```bash
grep -rn 'v1\.[0-9]\|v2\.1[0-9]\|localhost:5000/api/health\|192\.168\.1\.144\|Container 20[123]\|expapp\.duckdns' docs/*.md | grep -v archive | grep -v superpowers
```

- [ ] **Step 2: Fix each hit** — three allowed moves only: (a) delete the stale sentence/header if it's a status line; (b) replace hardcoded versions/hosts with the current fact (`argo.booute.duckdns.org`, CTs 2120/2220/2320, port 3000) or a pointer to CHANGELOG/ARCHITECTURE; (c) if a whole doc turns out to be a dead one-off missed in Task 3, `git mv` it to `docs/archive/`. No rewrites beyond that in this task.

- [ ] **Step 3: Re-run the grep from Step 1** — expected: zero hits outside archive/superpowers (old versions may legitimately appear in CHANGELOG only).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: fix stale versions and topology in living docs"
```

---

### Task 10: Branch pruning

**Files:** none (git refs only).

**Interfaces:**
- Produces: local + remote branch lists containing only `main` and unmerged work.

- [ ] **Step 1: Confirm default branch is main**

Run: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name || git remote show origin | grep 'HEAD branch'`
Expected: `main`. If it says `master`, STOP this task and report — do not delete anything.

- [ ] **Step 2: List merged branches (the deletion set)**

```bash
git branch --merged main | grep -v '^\*\|main'
git branch -r --merged main | grep -v 'origin/main\|origin/HEAD'
```
Anything NOT in these lists is not merged and MUST NOT be deleted. Record both lists in the task output.

- [ ] **Step 3: Delete merged local branches**

```bash
git branch --merged main | grep -v '^\*\|main' | xargs -n1 git branch -d
```
(`-d` not `-D` — git itself refuses unmerged deletions, a second safety net.)

- [ ] **Step 4: Delete merged remote branches**

```bash
git branch -r --merged main | grep -v 'origin/main\|origin/HEAD' | sed 's| *origin/||' | xargs -n1 git push origin --delete
```

- [ ] **Step 5: Verify + report**

Run: `git branch -a`
Expected: `main` plus only unmerged branches. List survivors in the report (expected survivors include unmerged ones like `rollback-feb-26` or old sandbox branches with unmerged commits — leave them).

---

### Task 11: Version bump 2.20.1, changelog entry, push

**Files:**
- Modify: `package.json`, `backend/package.json` (version → `2.20.1`), `CHANGELOG.md` (2.20.1 entry above 2.20.0)

**Interfaces:**
- Consumes: all prior tasks committed.
- Produces: released commit on `main`, pushed to GitHub. Task 13 deploys exactly this.

- [ ] **Step 1: Bump versions**

```bash
npm version 2.20.1 --no-git-tag-version
cd backend && npm version 2.20.1 --no-git-tag-version && cd ..
grep '"version"' package.json backend/package.json
```
Expected: both `2.20.1`.

- [ ] **Step 2: Add CHANGELOG entry** (insert between `## [Unreleased]` and `## [2.20.0]`):

```markdown
## [2.20.1] - 2026-09-01 - Documentation and repo cleanup

### Changed
- README and docs/ARCHITECTURE.md rewritten to describe the current system (Midas expense backend, Authentik SSO, booth inventory, real production topology) with mermaid diagrams; new docs/DATABASE.md documents the live schema with ER diagrams.
- Historical one-off documents moved to docs/archive/; stale version references removed from living docs.

### Removed
- deploy-sandbox.sh (misnamed — it targeted production containers; deploy-sandbox-2600.sh is the sandbox deploy).
- Tracked credentials files (now local-only), dead files, and unused dependencies. Merged git branches pruned.

### Requires
- No migration, no env changes.
```
If Task 4 removed nothing, drop the "dead files and unused dependencies" clause to keep the entry honest.

- [ ] **Step 3: Final full gate**

```bash
npm run lint && npm run build
cd backend && npm test && npm run build && cd ..
```
Expected: all green.

- [ ] **Step 4: Commit and push**

```bash
git add package.json package-lock.json backend/package.json backend/package-lock.json CHANGELOG.md
git commit -m "chore(release): v2.20.1 — documentation overhaul and repo cleanup"
git push origin main
```
Expected: push succeeds; `git status` clean.

---

### Task 12: Retire abandoned standalone-Argo containers (CT 5120, 5220)

**Files:** none (server-side only). Host: `ssh root@192.168.1.190`.

**Interfaces:**
- Produces: CTs 5120/5220 destroyed; vzdump backups retained on the host.

**Safety:** These are DESTRUCTIVE host operations, pre-approved in the spec. Scope is EXACTLY CTs 5120 and 5220 — nothing else. The live app's CTs (2120/2220/2320/104/2600) must not be touched.

- [ ] **Step 1: Verify backups exist and are non-trivial**

```bash
ssh root@192.168.1.190 'ls -lh /var/lib/vz/dump/vzdump-lxc-5120-* /var/lib/vz/dump/vzdump-lxc-5220-* && zstd -t /var/lib/vz/dump/vzdump-lxc-5120-2026_08_26-13_08_29.tar.zst /var/lib/vz/dump/vzdump-lxc-5220-2026_08_26-13_08_58.tar.zst && echo BACKUPS_OK'
```
Expected: both `.tar.zst` files present with plausible sizes (>100MB-ish) and `BACKUPS_OK`. If zstd test fails, take a fresh backup first: `vzdump 5120 5220 --compress zstd --dumpdir /var/lib/vz/dump` — only then proceed.

- [ ] **Step 2: Confirm nothing references them** (re-verify at execution time)

```bash
ssh root@192.168.1.190 'pct exec 104 -- grep -rl "192.168.1.222\|192.168.1.224" /opt/npmplus/nginx/ 2>/dev/null; echo "refs-check-done"'
```
Expected: only `refs-check-done`. Any hit → STOP and report.

- [ ] **Step 3: Stop and destroy**

```bash
ssh root@192.168.1.190 'pct stop 5120; pct stop 5220; sleep 2; pct destroy 5120 && pct destroy 5220 && echo DESTROYED'
```
Expected: `DESTROYED`.

- [ ] **Step 4: Verify**

```bash
ssh root@192.168.1.190 'pct list | grep -E "5120|5220" || echo GONE; pct list | grep -cE "2120|2220|2320|2600" '
```
Expected: `GONE` and `4` (all live-app CTs still present and untouched).

---

### Task 13: Deploy v2.20.1 to production and verify

**Files:** none modified. Uses `scripts/deploy-production-backend.sh` and `scripts/deploy-production-frontend.sh` (both read the repo's package.json versions; frontend script restarts NPMplus itself).

**Interfaces:**
- Consumes: Task 11's pushed release commit checked out on `main`, clean tree.

- [ ] **Step 1: Pre-flight**

Run: `git status --porcelain && git log --oneline -1`
Expected: clean tree, HEAD is the v2.20.1 release commit.

- [ ] **Step 2: Deploy backend**

Run: `./scripts/deploy-production-backend.sh`
Expected: script's own health check prints `✅ Backend deployed. Version: 2.20.1` (it curls `http://localhost:3000/api/health` inside CT 2220). On version-mismatch failure, the script exits 1 — investigate before retrying, do not loop deploys.

- [ ] **Step 3: Deploy frontend**

Run: `./scripts/deploy-production-frontend.sh`
Expected: `✅ Production frontend v2.20.1 deployed!` and NPMplus restarted by the script (it stops/starts CT 104).

- [ ] **Step 4: Independent smoke tests**

```bash
ssh root@192.168.1.190 "pct exec 2220 -- curl -s http://localhost:3000/api/health"           # expect JSON containing "version":"2.20.1"
curl -sk -o /dev/null -w '%{http_code}\n' https://argo.booute.duckdns.org/                    # expect 200
curl -sk https://argo.booute.duckdns.org/ | grep -o 'assets/index-[^"]*\.js' | head -1        # note new asset hash
curl -sk -o /dev/null -w '%{http_code}\n' https://argo.booute.duckdns.org/api/health          # expect 200
```
Remember: verify the public surface from OUTSIDE the LAN semantics — hit the real hostname, never 192.168.1.160 with a Host header (NPMplus SNI hairpin serves the default page and looks like an outage).

- [ ] **Step 5: Clean up deploy tarballs**

```bash
rm -f frontend-v2.20.1-*.tar.gz backend/backend-v2.20.1-*.tar.gz
```

- [ ] **Step 6: Final report to user**

Must include: version deployed + verification outputs; the credentials rotation notice from Task 2 Step 4 (verbatim); list of removed dead files/deps (or "none"); branch lists deleted/kept; confirmation CT 5120/5220 destroyed with backup filenames; any stale-doc decisions worth knowing.
