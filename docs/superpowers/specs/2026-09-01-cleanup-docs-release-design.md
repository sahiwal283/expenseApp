# Argo v2.20.1 — Documentation, Cleanup & Release

**Date:** 2026-09-01
**Status:** Approved
**Type:** Chore release — docs, repo hygiene, infra retirement. No user-facing behavior changes.

## Goal

Get Argo to a stable, well-documented state that needs no attention for a while:
accurate docs with diagrams, a repo free of stale artifacts and dead files, the
abandoned standalone-Argo containers retired, version bumped, pushed, deployed.

## 1. Version & release

- **v2.20.1** (patch — no behavior/API change). Bump `package.json` + `backend/package.json`.
- Push to GitHub `main`, deploy to production.

## 2. Documentation

- **README.md** — rewrite. Remove stale version headers (README claims v1.4.13/v1.28.0
  from Nov 2025; actual is v2.20.x). Describe current app: Midas expense backend
  (`EXPENSE_BACKEND=midas`), Authentik SSO, booth inventory, offline-first PWA, OCR.
  Current quick start, commands, doc links. No version numbers in README — versions
  live in CHANGELOG only.
- **docs/ARCHITECTURE.md** — rewrite with mermaid diagrams:
  - System topology: browser → NPMplus (CT 104) → frontend CT 2120 (nginx) /
    backend CT 2220 (node, **port 3000**) → Postgres CT 2320 (`expense_app_production`);
    external: Midas, Authentik (CT 111), Ollama (CT 103), Zoho.
  - Backend service boundaries; offline sync flow; expense lifecycle under Midas.
  - Live hostname `argo.booute.duckdns.org`.
- **docs/DATABASE.md** — new. Mermaid ER diagram + table summaries, introspected from
  live prod schema on CT 2320 (ground truth after 39 migrations). Note the frozen
  `expenses` table (Midas cutover).
- **CHANGELOG.md** — add missing **2.20.0** entry (booth inventory) and **2.20.1**
  entry for this release. Keep-a-Changelog format unchanged.

## 3. Repo cleanup (conservative)

- **Untracked clutter:** delete 58 `frontend-*.tar.gz` (~20MB), `.DS_Store`, stale `coverage/`.
- **Secrets:** `git rm --cached` the three tracked `credentials/` files (files stay on
  disk; `.gitignore` already excludes the dir). Report exposed Zoho sandbox secrets
  (client secret, refresh token) for rotation. **No history rewrite.**
- **Stale docs → `docs/archive/`:** the ~10 root-level `*_v1.28/v1.29*` review MDs
  (delete the empty `FINAL_CODE_REVIEW_v1.27.15.md`), one-off reports in `docs/`
  (migration resolution/verification reports, v1.29 deployment postmortems, rename
  scratch notes, Midas handoff/status specs from 2026-08-03). Superpowers specs/plans
  stay in place. Living docs stay, with a staleness pass.
- **Dead code:** only verified-unreferenced files/exports (knip/ts-prune + manual
  verification; ambiguous cases stay). Unused npm deps removed only if provably
  unimported. **The flag-gated local-Zoho path stays** (Midas rollback escape hatch).
- **Delete `deploy-sandbox.sh`** — misnamed trap that targets production containers.
  `deploy-sandbox-2600.sh` remains the real sandbox deploy.
- **Branch pruning:** delete local + remote branches fully merged into `main`;
  show list before deleting.
- **Gate:** lint + backend test suite + frontend build pass before and after cleanup.

## 4. Retire abandoned standalone Argo (Proxmox host 192.168.1.190)

- Verify existing vzdump backups (2026-08-26) for CT 5120 (argo-app) and CT 5220
  (argo-db) are intact, then `pct destroy 5120` and `pct destroy 5220`.
- Frees 35GB LVM + 4GB RAM. Nothing in NPMplus or DNS references them;
  `argo.booute.duckdns.org` is this app and is untouched.

## 5. Deploy & verify

- `scripts/deploy-production-backend.sh` + `scripts/deploy-production-frontend.sh`
  → CT 2220 / 2120.
- Clear NPMplus cache (CT 104). Smoke test backend on **port 3000** inside CT 2220.
  Verify public surface from outside against `argo.booute.duckdns.org`. Confirm
  version endpoints report 2.20.1.
- No new migrations this release, so no `schema_migrations` verification needed.

## Out of scope

- Removing the local-Zoho posting path (kept as rollback fallback).
- Git history rewrite for leaked credentials.
- Any sandbox (CT 2600) deploy.
- Renaming repo/hostnames.
