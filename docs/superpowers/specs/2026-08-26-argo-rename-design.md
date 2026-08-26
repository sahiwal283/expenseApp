# Argo Rename — Design

**Date:** 2026-08-26
**Status:** Approved design, ready for implementation planning
**Scope:** Trade Show App → Argo. User-visible naming, plus a hostname move.

## Problem

The app is called three different things. The sidebar says `TradeShow`, the page
title and PWA manifest say `ExpenseApp - Trade Show Expense Tracker`, and
Authentik lists it as `Trade Show App`. None of them is the name the team uses.

"Argo" was the name of a from-scratch rewrite of this app. That rewrite was
abandoned — the existing app was improved instead — so the name is free, and it
is the name the team means. This change moves the name onto the app that
actually shipped.

## Goals

- A user never sees "Trade Show" or "ExpenseApp" anywhere in the product.
- The app is reachable at `argo.booute.duckdns.org`.
- `expapp.duckdns.org` redirects there, preserving path and query, for a
  transition period.
- Authentik shows the application as `Argo`.
- The abandoned rewrite's containers are decommissioned.

## Non-goals

Deferred deliberately, and recorded in `docs/ARGO_RENAME_DEFERRED.md`:

- The Authentik **slug** (`trade-show`), `AUTHENTIK_ISSUER`, and `APP_SLUG`.
  These are live SSO plumbing for 6 migrated users, not branding.
- Infrastructure identifiers: the systemd unit, LXC container names, the
  database name and user, and the GitHub repository name.
- Renaming the Dexie database `ExpenseAppOfflineDB` (see Decisions).

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Cosmetic + URL only; SSO and infrastructure renames deferred | The deferred tiers rename strings whose only audience is the team, and each is a chance to break auth or deploys. |
| 2 | `Argo` alone — no descriptor, and `ExpenseApp` disappears | One name everywhere. `ExpenseApp` is a separate legacy name that the "no more Trade Show" instruction would not otherwise catch. |
| 3 | Redirect immediately, accepting stranded offline data | The origin change orphans per-origin IndexedDB. The user confirmed nobody is mid-show with an unsynced queue. See Risks. |
| 4 | 302, not 301 | A 301 is cached indefinitely; users who hit it cannot be reached again if the change must be undone. 302 keeps the transition reversible. It becomes a 301, or disappears, when the old hostname is retired. |
| 5 | `sourceApp: 'trade_show'` is never renamed | It binds 378 production expenses in Midas to this app, plus both `app_connections.source_app` rows. Renaming orphans the expense history. |
| 6 | The Dexie database keeps its name | Renaming an IndexedDB database orphans its contents exactly as the origin change does. Doing it twice, for a string no user sees, is gratuitous. |

## Starting state

Established by inspection, not assumption:

- **`argo.booute.duckdns.org` already exists and is live** (HTTP 200), serving
  the abandoned rewrite via NPMplus proxy host `20` → `192.168.1.222:80`
  (CT 5120). Certificate `npm-28` is already issued. **No DNS or certificate
  work is required.**
- `expapp.duckdns.org` is NPMplus proxy host `3`, certificate `npm-5`, with
  three upstreams: root → `192.168.1.139:80` (CT 2120, frontend) and two
  `/api` locations → `192.168.1.201:3000` (CT 2220, backend).
- The old Argo lives in CT 5120 (`argo-app`: nginx + PM2 on :5000) and CT 5220
  (`argo-db`: Postgres, database `argo`). Only proxy host `20` references
  `192.168.1.222`; nothing else depends on them.
- 197 files match `trade.show|tradeshow`, the large majority being comments,
  test fixtures, and docs.

## App changes

The user-visible surface is small and specific:

| Surface | File | Now | After |
|---|---|---|---|
| Sidebar brand | `src/components/layout/Sidebar.tsx` | `TradeShow` | `Argo` |
| Page + OG title | `index.html` | `ExpenseApp - Trade Show Expense Management` | `Argo` |
| PWA `name` | `public/manifest.json` | `ExpenseApp - Trade Show Expense Tracker` | `Argo` |
| PWA `short_name` | `public/manifest.json` | `ExpenseApp` | `Argo` |
| Install prompt | `src/components/layout/InstallPrompt.tsx` | `Install ExpenseApp` | `Install Argo` |
| Authentik application | Authentik (CT 111) | `Trade Show App` | `Argo` |

Beyond the table, sweep user-facing copy across components (headings, empty
states, toasts) and any generated output (PDF, email).

**Documentation scope.** Update docs that describe the app as it is now —
`README.md`, `CLAUDE.md`, `docs/MASTER_GUIDE.md`, `docs/ARCHITECTURE.md`, and
deployment/runbook docs. Do **not** rewrite dated design and plan documents
under `docs/superpowers/specs/` and `docs/superpowers/plans/`: those are records
of what was decided at the time, and editing them to say "Argo" makes them lie
about their own history. This spec is the first document that calls the app
Argo; earlier ones correctly call it the Trade Show App.

**Explicitly left alone:** `sourceApp: 'trade_show'` and its constants
(`ExpenseMessageScanner.ts`, `midasExpenseReader.ts`, `MidasTypes.ts`, the
migration and probe scripts); `APP_SLUG`; `AUTHENTIK_ISSUER`; the Authentik
slug; systemd, LXC, database and repo names; `IS_SANDBOX`; brand colours and
the logo mark; and test fixtures where "Trade Show" is *data* (event names,
seed rows) rather than branding.

## URL and proxy

Three NPMplus changes on CT 104.

**1. Repoint proxy host `20` at production.** It currently has one upstream and
a single `location /`. It needs the same three-upstream shape as host `3`:
root → `192.168.1.139:80`, and the two `/api` locations → `192.168.1.201:3000`.

Copy the routing and header blocks from host `3` rather than hand-writing them.
Divergence here is the most likely way to break the app — an API location that
does not match means the frontend loads and every request fails.

**2. Flip `expapp.duckdns.org` to a redirect.** Host `3` becomes a redirection
host targeting `https://argo.booute.duckdns.org$request_uri`, preserving path
and query so deep links survive. **302, per Decision 4.**

**3. Order.** Host `20` must serve the real app *before* host `3` redirects to
it, or both hostnames are broken simultaneously.

### Coupled auth change

Two values on CT 2220 (`/etc/expenseapp/backend.env`) point at the old origin:

```
FRONTEND_URL=https://expapp.duckdns.org
OIDC_REDIRECT_URI=https://expapp.duckdns.org/api/auth/oidc/callback
```

Both move to `argo.booute.duckdns.org`. The new redirect URI must be registered
in Authentik **before** the backend sends it, or login fails with
`redirect_uri_mismatch`.

Add the new URI **alongside** the existing one and leave both valid through the
transition. This also means a user mid-login during cutover completes on either
origin. The old URI is removed when the old hostname is retired.

Update `scripts/authentik/provision-trade-show.sh` to match, so re-running it
stays idempotent instead of reverting the display name — the new redirect URI in
its `redirect_uris` list and `Argo` as the provider/application name. **Keep the
filename**: it is a developer-facing script, and renaming it churns the two
references in `docs/` for no user-visible gain. It moves with Tier C.

## Decommissioning the old Argo

**Sequencing is absolute: repoint the proxy first.** `argo.booute.duckdns.org`
currently serves CT 5120; destroying it first takes down the hostname being
migrated to.

Before destroying anything — `pct destroy` is irreversible:

- `vzdump` both containers (5120, 5220) to the Proxmox backup store. A full
  container image restores completely, not just files.
- Separately `pg_dump` the `argo` database from CT 5220. A plain SQL dump is far
  easier to inspect later than mounting a container backup.

Report backup paths and sizes for confirmation **before** destroying. A backup
nobody verified is not a backup. Then `pct stop` and `pct destroy` both.

Nothing else needs cleanup: `/opt/argo`, the PM2 process, and CT 5120's
internals disappear with the container.

**Open, awaiting the user:** the Midas user `Argo Admin (Trade Show App)`
(`admin@company.com`) carries the old name. It is a service account and the
display name is cosmetic, not an identifier, so renaming to `Argo Admin` is
safe — but it lives in the Midas repo and database, a different system from this
rename. Do it only on explicit instruction.

## Risks

**Stranded offline data (accepted, Decision 3).** `expapp.duckdns.org` and
`argo.booute.duckdns.org` are different origins. The JWT in `localStorage` does
not carry over, so every user is logged out once — minor. The offline mutation
queue in IndexedDB does not carry over either: a user holding unsynced expenses
has them on the old origin, and after the redirect their browser lands on the
new origin with an empty database. The rows are not deleted, merely unreachable
behind a URL they will not visit again. No error surfaces; the expenses simply
never arrive. The user confirmed nobody is currently mid-show with a queue.

**Installed PWAs keep the old name and icon** until reinstalled. The manifest is
read at install time. Not a blocker.

## Testing

A rename has little to unit-test; verification lives at the boundaries.

**Static:**
- After the edits, `grep -ri "trade.show\|tradeshow\|expenseapp"` over `src/`,
  `index.html`, and `public/` must return only the deliberate survivors —
  the `sourceApp: 'trade_show'` constants, their explanatory comments, and test
  fixtures where the phrase is data. Record that survivor list in
  `docs/ARGO_RENAME_DEFERRED.md` so it is reviewable; otherwise a stray "Trade
  Show" in a toast hides among 197 hits.
- Backend targeted suites pass; `npm run build` succeeds both sides.

**Live, after cutover, in order:**
1. `argo.booute.duckdns.org` serves the app.
2. `/api/health` returns 2.18.0 through the new host.
3. A real SSO login completes end to end on the new host.
4. `expapp.duckdns.org` returns 302 with path and query preserved.
5. Expense messaging still works through the new origin.

## Rollout

Each step verified before the next.

1. App string changes → build → deploy frontend and backend. Still on the old
   URL; nothing user-visible breaks.
2. Add the new redirect URI to Authentik (keeping the old); rename the
   application display name to `Argo`.
3. Repoint NPMplus host `20`; verify app and API on `argo.booute.duckdns.org`.
4. Switch `FRONTEND_URL` and `OIDC_REDIRECT_URI` on CT 2220; restart backend;
   verify SSO login on the new host.
5. Flip `expapp.duckdns.org` to a 302 redirect; verify.
6. `vzdump` + `pg_dump` the old Argo containers, confirm backups, then destroy.

Steps 1–2 are independently reversible. Step 3 is the first user-visible change.
Step 5 is the point of no easy return for anyone holding a bookmark — hence 302.

**Rollback:** steps 3–5 are NPMplus config plus two env vars. Reverting means
repointing host `20` at `192.168.1.222` and restoring the expapp proxy host.
That remains true until step 6 destroys the containers, which is why step 6 is
last and gated on verified backups.

## Deferred-work note

Write `docs/ARGO_RENAME_DEFERRED.md` covering:

- **Tier B (SSO):** Authentik slug `trade-show` → `argo`, changing
  `AUTHENTIK_ISSUER` and `APP_SLUG`. Must be sequenced with the backend env or
  SSO breaks; affects 6 migrated users.
- **Tier C (infrastructure):** systemd unit `trade-show-app-backend`; LXC names
  `trade-show-frontend` / `-backend` / `-db-prod` / `-sandbox`; database
  `expense_app_production`; DB user `trade_show_app_prod`; GitHub repo
  `trade-show-app`; and the 15 deploy-script references to the unit name.
- **Never rename:** `sourceApp: 'trade_show'` and `app_connections.source_app`,
  with the reason stated plainly — so a future reader does not "finish the job"
  and orphan 378 expenses.
- Retiring `expapp.duckdns.org` and removing its Authentik redirect URI when the
  transition ends.
