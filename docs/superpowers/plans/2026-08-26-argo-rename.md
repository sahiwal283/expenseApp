# Argo Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the product from "Trade Show App" / "ExpenseApp" to **Argo**, move it to `argo.booute.duckdns.org`, redirect the old hostname, and decommission the abandoned Argo rewrite.

**Architecture:** Cosmetic rename plus a hostname move. Application code changes are string edits only — no logic, no schema. The hostname move is three NPMplus config changes on CT 104 plus two env vars on CT 2220, sequenced so no window exists where both hostnames are broken. The abandoned rewrite is destroyed last, gated on verified backups, because it currently occupies the target hostname.

**Tech Stack:** React/Vite frontend, Express/TypeScript backend, NPMplus (nginx) reverse proxy on Proxmox LXC, Authentik OIDC.

**Spec:** `docs/superpowers/specs/2026-08-26-argo-rename-design.md`

## Global Constraints

**THE CENTRAL DISTINCTION — read this before touching any string.** "Trade Show" appears in this codebase as two different things, and only one of them is being renamed:

- **Product name → becomes `Argo`.** Text naming the application itself: `TradeShow` in the sidebar, "Sign in to TradeShow Expense Manager", "Log out of TradeShow?", `ExpenseApp` in the title/manifest, `name: 'Trade Show Expense Management App'` in the API root.
- **Domain noun → STAYS.** Argo is an app for managing trade show expenses. "Return on trade shows", "Trade Show Event *", "Set up your first trade show", "Category Averages Across Trade Shows" are correct English describing the business domain. Renaming these makes the copy worse and less clear ("Return on shows"?). Leave them.

When a string is ambiguous, ask: *would this sentence still be true if the product were called something else?* If yes, it is domain language — leave it.

**NEVER RENAME — these are cross-system contracts. Renaming any of them causes silent data loss:**

- `sourceApp: 'trade_show'` and the `SOURCE_APP` constants (`backend/src/services/ExpenseMessageScanner.ts`, `backend/src/services/expenseStore/midasExpenseReader.ts`, `backend/src/services/midas/MidasTypes.ts`, `backend/src/scripts/migrateExpensesToMidas.ts`, `backend/src/scripts/probeImportValidation.ts`, `backend/src/scripts/uatLiveBffProbe.ts`) — binds 378 production expenses in Midas to this app, plus both `app_connections.source_app` rows.
- `cf_trade_show` / `ZOHO_EXPENSE_TRADESHOW_FIELD` (`backend/src/services/zohoIntegrationClient.ts:437`) — a **Zoho Books custom field api_name defined in the Zoho org, not by us**. Renaming drops the field from every expense pushed to Zoho.
- `APP_SLUG=trade-show`, `AUTHENTIK_ISSUER`, and the Authentik application **slug** — live SSO plumbing for 6 migrated users. Only the Authentik *display name* changes.
- Systemd unit `trade-show-app-backend`; LXC names; database `expense_app_production`; DB user `trade_show_app_prod`; GitHub repo name. Deferred to Tier C.
- The Dexie database name `ExpenseAppOfflineDB` — renaming orphans its contents.
- TypeScript identifiers `interface TradeShow`, `TradeShowChecklist`, `calculateTradeShowBreakdown`, `tradeShowId` — domain types, not branding.

**Other constraints:**
- Redirect is **302, never 301** (a 301 is cached indefinitely and cannot be undone for users who already hit it).
- Do NOT rewrite dated documents under `docs/superpowers/specs/` or `docs/superpowers/plans/` — they are historical records.
- Do NOT rename the Midas user `Argo Admin (Trade Show App)` — out of scope, explicit instruction only.
- Do NOT run the full `npm test` in `backend/` — parts need a live Postgres and hang. Use targeted suites.
- Lint baseline is ~174 pre-existing errors repo-wide. Add none.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `index.html` | **Modify.** Page title, OG title, apple/author meta. |
| `public/manifest.json` | **Modify.** PWA `name`, `short_name`, `description`. |
| `src/components/layout/Sidebar.tsx` | **Modify.** Sidebar brand mark. |
| `src/components/layout/Header.tsx` | **Modify.** Logout confirm copy. |
| `src/components/layout/InstallPrompt.tsx` | **Modify.** Install prompt copy. |
| `src/components/auth/LoginForm.tsx` | **Modify.** Sign-in subtitle. |
| `src/components/auth/RegistrationForm.tsx` | **Modify.** Register subtitle. |
| `backend/src/server.ts` | **Modify.** API root `name` metadata. |
| `backend/src/services/ReportExportService.ts` | **Modify.** PDF footer product name only. |
| `docs/ARGO_RENAME_DEFERRED.md` | **Create.** Tier B/C backlog, never-rename list, survivor list. |
| `scripts/authentik/provision-trade-show.sh` | **Modify.** Display name + new redirect URI. Filename unchanged. |
| NPMplus host `20` (CT 104) | **Modify.** Repoint at production. |
| NPMplus host `3` (CT 104) | **Modify.** Convert to 302 redirect. |
| `/etc/expenseapp/backend.env` (CT 2220) | **Modify.** `FRONTEND_URL`, `OIDC_REDIRECT_URI`. |

---

## Task 1: Rename the product in the app

**Files:**
- Modify: `index.html`, `public/manifest.json`
- Modify: `src/components/layout/Sidebar.tsx:158`, `src/components/layout/Header.tsx:262`, `src/components/layout/InstallPrompt.tsx:104`
- Modify: `src/components/auth/LoginForm.tsx:153`, `src/components/auth/RegistrationForm.tsx:183`
- Modify: `backend/src/server.ts:152`, `backend/src/services/ReportExportService.ts:75`

**Interfaces:**
- Produces: nothing consumed by later tasks. This task is self-contained string edits.

- [ ] **Step 1: Edit the frontend product-name strings**

`index.html` — four lines:

```html
<meta name="apple-mobile-web-app-title" content="Argo" />
<meta name="author" content="Argo" />
<meta property="og:title" content="Argo" />
<title>Argo</title>
```

`public/manifest.json` — first three fields. Note the `description` keeps the
domain noun, because it describes what the app is for:

```json
{
  "name": "Argo",
  "short_name": "Argo",
  "description": "Professional expense tracking and management for trade shows and events",
```

`src/components/layout/Sidebar.tsx:158`:

```tsx
      <span className="font-display font-bold tracking-tight text-stone-900">Argo</span>
```

`src/components/layout/Header.tsx:262`:

```tsx
              if (window.confirm('Log out of Argo?')) onLogout();
```

`src/components/layout/InstallPrompt.tsx:104`:

```tsx
            <p className="text-sm font-semibold text-stone-900">Install Argo</p>
```

`src/components/auth/LoginForm.tsx:153`:

```tsx
            <p className="text-sm text-stone-500 mt-2">Sign in to Argo</p>
```

`src/components/auth/RegistrationForm.tsx:183`:

```tsx
            <p className="text-stone-600 mt-2">Register for Argo</p>
```

- [ ] **Step 2: Edit the backend product-name strings**

`backend/src/server.ts:152` — the API root metadata:

```ts
    name: 'Argo',
```

`backend/src/services/ReportExportService.ts:75` — the PDF footer. Only
`ExpenseApp 2.0` changes; the surrounding template is untouched:

```ts
      .text(`Years ${years.join(' · ')}   |   Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}   |   Argo`, 48, 60)
```

**Leave `'Trade Show Investment Report'` alone** (lines 73 and 200). That is the
report's subject — a report about trade shows — not the product's name.

- [ ] **Step 3: Verify no product-name strings remain**

Run:

```bash
cd ~/Work/trade-show-app
grep -rn "ExpenseApp" index.html public/ src/ backend/src/ 2>/dev/null | grep -v node_modules
```

Expected: exactly one hit — `src/utils/offlineDb.ts`, the Dexie database name
`ExpenseAppOfflineDB`, which must NOT change (renaming it orphans offline data).

Then:

```bash
grep -rn "TradeShow" src/ --include="*.tsx" | grep -vE "import |interface |: TradeShow|TradeShow\[\]|<TradeShow|TradeShowChecklist|useState<"
```

Expected: no hits. Any remaining hit is a product-name string that was missed.

- [ ] **Step 4: Build, lint, and run the backend suites**

```bash
cd ~/Work/trade-show-app && npm run lint && npm run build
cd backend && npm run build
npx vitest run tests/repositories/ExpenseMessageNotificationRepository.test.ts \
  tests/services/ExpenseMessageService.test.ts \
  tests/services/ExpenseMessageScanner.test.ts \
  tests/unit/midas/midasMessages.test.ts
```

Expected: lint at the ~174-error baseline with no new errors; both builds
succeed; 37/37 tests pass.

Do NOT run the full `npm test` in `backend/` — parts of it require a live
Postgres and hang indefinitely.

- [ ] **Step 5: Commit**

```bash
cd ~/Work/trade-show-app
git add index.html public/manifest.json src/components backend/src/server.ts backend/src/services/ReportExportService.ts
git commit -m "feat(brand): rename the product to Argo

Product-name strings only. Domain copy about trade shows stays: Argo is
an app for managing trade show expenses, and renaming the noun would
make the copy less clear."
```

---

## Task 2: Deferred-work note and survivor list

**Files:**
- Create: `docs/ARGO_RENAME_DEFERRED.md`
- Modify: `README.md`, `CLAUDE.md` (product name references only)

**Interfaces:**
- Consumes: the string state produced by Task 1.
- Produces: `docs/ARGO_RENAME_DEFERRED.md`, referenced by Task 8's completion notes.

- [ ] **Step 1: Generate the survivor list**

```bash
cd ~/Work/trade-show-app
grep -rn "trade.show\|tradeshow" --include="*.ts" --include="*.tsx" -i src/ backend/src/ \
  | grep -v node_modules | wc -l
```

Record the number. Then capture the contract survivors specifically:

```bash
grep -rn "'trade_show'\|cf_trade_show\|ZOHO_EXPENSE_TRADESHOW_FIELD" --include="*.ts" backend/src/
```

- [ ] **Step 2: Write the deferred note**

Create `docs/ARGO_RENAME_DEFERRED.md`:

```markdown
# Argo Rename — Deferred Work

The 2026-08-26 rename (`docs/superpowers/specs/2026-08-26-argo-rename-design.md`)
changed the product name and the hostname. It deliberately left three
categories alone. This file records what and why.

## Never rename — cross-system contracts

Renaming any of these causes silent data loss. They are not branding.

- **`sourceApp: 'trade_show'`** and the `SOURCE_APP` constants. This is the key
  binding 378 production expenses in Midas to this app, plus both
  `app_connections.source_app` rows in the Midas database. Renaming it orphans
  the entire expense history — the expenses are not deleted, merely unreachable.
- **`cf_trade_show`** (`ZOHO_EXPENSE_TRADESHOW_FIELD`, default in
  `backend/src/services/zohoIntegrationClient.ts`). This is a **Zoho Books
  custom field api_name defined in the Zoho organisation**, not by this code.
  Zoho generated it from the field label "Trade Show". Renaming it here silently
  drops the field from every expense pushed to Zoho — no error, the data just
  stops arriving.
- **The Dexie database `ExpenseAppOfflineDB`**. Renaming an IndexedDB database
  orphans its contents, stranding any queued offline expenses.
- **TypeScript domain identifiers** — `interface TradeShow`,
  `TradeShowChecklist`, `calculateTradeShowBreakdown`, `tradeShowId`. These
  describe trade show events, which is what the app manages. They are correct.

## Tier B — SSO (deferred)

Rename the Authentik application **slug** `trade-show` → `argo`. This changes:

- `AUTHENTIK_ISSUER` (`https://auth.booute.duckdns.org/application/o/<slug>/`)
- `APP_SLUG` on CT 2220

Must be sequenced with the backend env in one window or SSO breaks. Affects the
6 users migrated to SSO. Purely cosmetic — the slug appears only inside an OIDC
URL that no user reads.

## Tier C — Infrastructure (deferred)

- systemd unit `trade-show-app-backend` (15 references across `scripts/`)
- LXC containers `trade-show-frontend` (2120), `trade-show-backend` (2220),
  `trade-show-db-prod` (2320), `trade-show-sandbox` (2600)
- database `expense_app_production`; DB user `trade_show_app_prod`
- GitHub repository `trade-show-app`
- `scripts/authentik/provision-trade-show.sh` filename

## Transition cleanup — when `expapp.duckdns.org` is retired

- Delete NPMplus redirection host `3` and its certificate `npm-5`.
- Remove `https://expapp.duckdns.org/api/auth/oidc/callback` from the Authentik
  provider's `redirect_uris` (it was kept alongside the new URI during the
  transition).
- Change nothing else — the app already lives on the new hostname.
```

- [ ] **Step 3: Append the survivor list**

Add a final section to the same file, filling in the counts and paths from
Step 1 rather than copying these numbers:

```markdown
## Survivor list (as of the rename)

`grep -ri "trade.show\|tradeshow"` over `src/` and `backend/src/` returns
<N> hits. Every one is expected, and falls into exactly one of:

1. The contract constants listed under "Never rename" above.
2. Domain copy — user-visible text about trade shows as events.
3. TypeScript domain identifiers and their imports.
4. Code comments describing the app's relationship to Midas and Zoho.

If a future sweep finds a hit outside these four categories, it is a
product-name string that escaped the rename.
```

- [ ] **Step 4: Update README and CLAUDE.md product references**

In `README.md` and `CLAUDE.md`, change text naming the *product* to Argo (for
example a title line "Trade Show Expense Management PWA" becomes "Argo —
Expense Management PWA"). Leave descriptions of what it does for trade shows,
and leave every path, command, container name, and identifier untouched.

- [ ] **Step 5: Commit**

```bash
cd ~/Work/trade-show-app
git add docs/ARGO_RENAME_DEFERRED.md README.md CLAUDE.md
git commit -m "docs(brand): record deferred rename tiers and never-rename contracts"
```

---

## Task 3: Authentik — display name and second redirect URI

**Files:**
- Modify: `scripts/authentik/provision-trade-show.sh`

**Interfaces:**
- Produces: an Authentik provider that accepts BOTH `expapp` and `argo` callback
  URLs. Task 6 depends on the `argo` URL already being registered.

**This task must complete before Task 6.** Switching the backend's
`OIDC_REDIRECT_URI` before Authentik knows the new URL fails login with
`redirect_uri_mismatch`.

- [ ] **Step 1: Read the current provisioning script**

```bash
cd ~/Work/trade-show-app && sed -n '50,90p' scripts/authentik/provision-trade-show.sh
```

Note the exact JSON shape of `redirect_uris` — it is a list of
`{matching_mode, url}` objects, not bare strings (the script's own header
comment says so). Match that shape exactly.

- [ ] **Step 2: Update the script**

Change the provider and application display name from `Trade Show App` to
`Argo`, and add the new callback **alongside** the existing one:

```json
    "name": "Argo",
    "redirect_uris": [
      { "matching_mode": "strict", "url": "https://expapp.duckdns.org/api/auth/oidc/callback" },
      { "matching_mode": "strict", "url": "https://argo.booute.duckdns.org/api/auth/oidc/callback" }
    ]
```

**Do not change** the `slug`, the issuer URL, or the client id — those are
Tier B. Only the human-readable name and the URI list change.

- [ ] **Step 3: Run the script against Authentik**

```bash
cd ~/Work/trade-show-app && ./scripts/authentik/provision-trade-show.sh
```

Expected: completes without error. The script is idempotent — it looks objects
up by slug and updates them rather than duplicating.

- [ ] **Step 4: Verify both URIs are registered and the name changed**

Confirm in the Authentik admin UI (or via the API call the script already uses)
that the application now displays as **Argo** and the provider lists **both**
callback URLs. Both must be present — the old one is what keeps users working
until Task 7.

- [ ] **Step 5: Verify SSO still works on the current URL**

Log in through `https://expapp.duckdns.org` with an SSO account.

Expected: login succeeds exactly as before. Nothing user-facing has moved yet;
this proves the Authentik edit did not break the working path.

- [ ] **Step 6: Commit**

```bash
cd ~/Work/trade-show-app
git add scripts/authentik/provision-trade-show.sh
git commit -m "chore(sso): display name Argo; register argo callback alongside expapp"
```

---

## Task 4: Deploy the renamed app

**Files:** none modified — this task deploys what Tasks 1–3 committed.

**Interfaces:**
- Consumes: commits from Tasks 1–2.
- Produces: production running the renamed build, still on the old hostname.

- [ ] **Step 1: Bump the version**

The deploy scripts read the version from `package.json` and verify it against
the health endpoint, so this is required, not cosmetic. Set both to `2.19.0`:

```bash
cd ~/Work/trade-show-app
sed -i '' 's/"version": "2.18.0"/"version": "2.19.0"/' package.json backend/package.json
grep -h '"version"' package.json backend/package.json
```

Add a `CHANGELOG.md` entry under a new `## [2.19.0]` heading describing the
rename, following the file's existing Keep-a-Changelog format.

- [ ] **Step 2: Commit the release**

```bash
cd ~/Work/trade-show-app
git add package.json backend/package.json CHANGELOG.md
git commit -m "chore(release): v2.19.0 — Argo rename"
```

- [ ] **Step 3: Deploy backend**

```bash
cd ~/Work/trade-show-app && ./scripts/deploy-production-backend.sh
```

Expected: ends with `✅ Backend deployed. Version: 2.19.0`.

- [ ] **Step 4: Deploy frontend**

```bash
cd ~/Work/trade-show-app && ./scripts/deploy-production-frontend.sh
```

Expected: ends with `✅ Production frontend v2.19.0 deployed!`. The script
restarts NPMplus itself to bust the cache.

- [ ] **Step 5: Verify the rename is live on the old URL**

Open `https://expapp.duckdns.org`.

Expected: the browser tab reads **Argo**, the sidebar reads **Argo**, and the
login screen says **Sign in to Argo**. The hostname has not moved yet — this
confirms the build is correct before any proxy change.

- [ ] **Step 6: Push**

```bash
cd ~/Work/trade-show-app && git push origin main
```

---

## Task 5: Repoint `argo.booute.duckdns.org` at production

**Files:** NPMplus proxy host `20` on CT 104 (`/data/nginx/proxy_host/20.conf`
inside the `npmplus` container).

**Interfaces:**
- Produces: the app served at `https://argo.booute.duckdns.org`. Tasks 6 and 7
  both depend on this working.

**Context the implementer needs:** `argo.booute.duckdns.org` already exists,
already has certificate `npm-28`, and currently serves the **abandoned rewrite**
at `192.168.1.222:80` (CT 5120). There is no DNS or certificate work. This task
changes where it points.

Host `3` (`expapp.duckdns.org`) is the model. It has three upstreams:

| Upstream | Target | Purpose |
|---|---|---|
| `upstream_3` | `192.168.1.139:80` | CT 2120, frontend |
| `upstream_3_location_0` | `192.168.1.201:3000` | CT 2220, backend API |
| `upstream_3_location_1` | `192.168.1.201:3000` | CT 2220, backend API |

Host `20` currently has one upstream and a single `location /`.

- [ ] **Step 1: Back up both host configs**

```bash
ssh root@192.168.1.190 "pct exec 104 -- docker exec npmplus sh -c 'cp /data/nginx/proxy_host/20.conf /data/nginx/proxy_host/20.conf.bak-argo-rename && cp /data/nginx/proxy_host/3.conf /data/nginx/proxy_host/3.conf.bak-argo-rename && ls -la /data/nginx/proxy_host/*.bak-argo-rename'"
```

Expected: both `.bak-argo-rename` files listed. This is the rollback path for
Tasks 5 and 7.

- [ ] **Step 2: Read host 3 in full, then host 20**

```bash
ssh root@192.168.1.190 "pct exec 104 -- docker exec npmplus cat /data/nginx/proxy_host/3.conf"
ssh root@192.168.1.190 "pct exec 104 -- docker exec npmplus cat /data/nginx/proxy_host/20.conf"
```

Read both before editing. Host 20 must end up with host 3's upstream and
`location` structure, but keep **its own** `server_name`
(`argo.booute.duckdns.org`) and **its own** certificate paths (`npm-28`, not
`npm-5`). Copying the certificate lines from host 3 serves the wrong cert and
breaks TLS.

- [ ] **Step 3: Make the change through the NPMplus UI if available**

The config header says `DO NOT EDIT THIS FILE DIRECTLY, CHANGES WILL BE LOST
WHEN UPDATING`. Prefer the NPMplus admin UI at `https://npm.booute.duckdns.org`:
edit the `argo.booute.duckdns.org` proxy host so its forward target is
`192.168.1.139:80` and it carries the same two `/api` custom locations host 3
has, each forwarding to `192.168.1.201:3000`.

If the UI is unavailable, edit `20.conf` directly to mirror host 3's structure,
then reload nginx:

```bash
ssh root@192.168.1.190 "pct exec 104 -- docker exec npmplus nginx -t && pct exec 104 -- docker exec npmplus nginx -s reload"
```

`nginx -t` must pass before reloading. A reload with a bad config leaves the
previous config running, but a restart would not.

- [ ] **Step 4: Verify the frontend serves**

```bash
curl -s -m 10 -o /dev/null -w "argo=%{http_code}\n" https://argo.booute.duckdns.org
curl -s -m 10 https://argo.booute.duckdns.org | grep -o "<title>[^<]*</title>"
```

Expected: `argo=200` and `<title>Argo</title>`. A title of anything else means
it is still serving the old rewrite.

- [ ] **Step 5: Verify the API routes through**

```bash
curl -s -m 10 https://argo.booute.duckdns.org/api/health
```

Expected: JSON with `"version":"2.19.0"` and `"database":"connected"`. This is
the check that catches a missing `/api` location — the frontend can load
perfectly while every API call 404s.

- [ ] **Step 6: Verify the old URL still works**

```bash
curl -s -m 10 -o /dev/null -w "expapp=%{http_code}\n" https://expapp.duckdns.org
```

Expected: `expapp=200`. Both hostnames serve the app right now; the redirect
comes in Task 7.

---

## Task 6: Point the backend at the new origin

**Files:** `/etc/expenseapp/backend.env` on CT 2220.

**Interfaces:**
- Consumes: Task 3 (the argo callback registered in Authentik) and Task 5 (the
  hostname serving the app). Both must be done, or login breaks.

- [ ] **Step 1: Back up the env file**

```bash
ssh root@192.168.1.190 "pct exec 2220 -- cp /etc/expenseapp/backend.env /etc/expenseapp/backend.env.bak-argo-rename && pct exec 2220 -- ls -la /etc/expenseapp/backend.env.bak-argo-rename"
```

- [ ] **Step 2: Confirm the current values**

```bash
ssh root@192.168.1.190 "pct exec 2220 -- grep -E '^FRONTEND_URL|^OIDC_REDIRECT_URI' /etc/expenseapp/backend.env"
```

Expected:

```
FRONTEND_URL=https://expapp.duckdns.org
OIDC_REDIRECT_URI=https://expapp.duckdns.org/api/auth/oidc/callback
```

- [ ] **Step 3: Update both values**

```bash
ssh root@192.168.1.190 "pct exec 2220 -- sed -i 's#https://expapp.duckdns.org#https://argo.booute.duckdns.org#g' /etc/expenseapp/backend.env && pct exec 2220 -- grep -E '^FRONTEND_URL|^OIDC_REDIRECT_URI' /etc/expenseapp/backend.env"
```

Expected: both now read `https://argo.booute.duckdns.org`.

Note the `sed` is scoped to that exact hostname, so it cannot touch
`auth.booute.duckdns.org` or any Midas URL in the same file. Verify the output
shows exactly the two expected lines and nothing else changed:

```bash
ssh root@192.168.1.190 "pct exec 2220 -- grep -c 'expapp.duckdns.org' /etc/expenseapp/backend.env"
```

Expected: `0`.

- [ ] **Step 4: Restart and confirm health**

```bash
ssh root@192.168.1.190 "pct exec 2220 -- systemctl restart trade-show-app-backend && sleep 5 && pct exec 2220 -- systemctl is-active trade-show-app-backend"
curl -s -m 10 https://argo.booute.duckdns.org/api/health
```

Expected: `active`, and health JSON reporting `2.19.0`.

- [ ] **Step 5: Verify SSO end to end on the new hostname**

In a browser, go to `https://argo.booute.duckdns.org` and complete a full SSO
login.

Expected: the Authentik redirect returns to `argo.booute.duckdns.org` and the
session works. A `redirect_uri_mismatch` here means Task 3 did not register the
new URI — fix that before continuing, do not proceed to Task 7.

- [ ] **Step 6: Verify expense messaging still works**

Open an expense with a message thread on the new hostname and confirm the
Messages panel loads.

Expected: the thread renders. This exercises the `/api` routing added in Task 5
against a feature that talks to Midas.

---

## Task 7: Redirect the old hostname

**Files:** NPMplus proxy host `3` on CT 104.

**Interfaces:**
- Consumes: Task 5 and Task 6 both verified. This is the first irreversible-ish
  user-visible step.

**302, not 301.** A 301 is cached indefinitely by browsers; if this must be
undone, users who already hit it keep going to the new host no matter what the
server says.

- [ ] **Step 1: Convert host 3 to a redirect**

In the NPMplus UI, delete the `expapp.duckdns.org` **proxy host** and create a
**redirection host** with:

- Domain: `expapp.duckdns.org`
- Forward to: `https://argo.booute.duckdns.org`
- HTTP code: **302** (Found / temporary)
- Preserve path: **enabled**
- SSL: the existing `npm-5` certificate, force SSL on

Preserve-path is what makes `expapp.duckdns.org/expenses?foo=1` land on
`argo.booute.duckdns.org/expenses?foo=1` instead of the bare root.

- [ ] **Step 2: Verify the redirect status and target**

```bash
curl -s -m 10 -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://expapp.duckdns.org
```

Expected: `302 -> https://argo.booute.duckdns.org/`

A `301` here is wrong — go back and change the code.

- [ ] **Step 3: Verify path and query survive**

```bash
curl -s -m 10 -o /dev/null -w "%{redirect_url}\n" "https://expapp.duckdns.org/expenses?status=pending"
```

Expected: `https://argo.booute.duckdns.org/expenses?status=pending`

- [ ] **Step 4: Verify the destination still serves**

```bash
curl -sL -m 15 -o /dev/null -w "final=%{http_code} url=%{url_effective}\n" https://expapp.duckdns.org
```

Expected: `final=200` at `https://argo.booute.duckdns.org/`.

- [ ] **Step 5: Browser check**

Visit `https://expapp.duckdns.org` in a browser. Expected: lands on the Argo app
at the new hostname, and login works.

---

## Task 8: Decommission the abandoned Argo

**Files:** Proxmox containers 5120 (`argo-app`) and 5220 (`argo-db`).

**Interfaces:**
- Consumes: Task 5 (the hostname no longer points at CT 5120). Destroying these
  before Task 5 takes down the hostname being migrated to.

**This task destroys data irreversibly. Do not run the destroy steps until the
backups in Steps 1–3 are verified present and non-empty, and the user has seen
them.**

- [ ] **Step 1: Confirm nothing still points at these containers**

```bash
ssh root@192.168.1.190 "pct exec 104 -- docker exec npmplus sh -c \"grep -l '192.168.1.222' /data/nginx/*/*.conf\" 2>/dev/null || echo 'no references'"
```

Expected: `no references`, or only the `.bak-argo-rename` backup file. A live
`.conf` still referencing `192.168.1.222` means Task 5 is incomplete — stop.

- [ ] **Step 2: Dump the argo database**

```bash
ssh root@192.168.1.190 "pct exec 5220 -- su - postgres -c 'pg_dump -d argo -F p -f /tmp/argo-final-20260826.sql' && pct exec 5220 -- ls -la /tmp/argo-final-20260826.sql"
ssh root@192.168.1.190 "pct pull 5220 /tmp/argo-final-20260826.sql /var/lib/vz/dump/argo-final-20260826.sql && ls -la /var/lib/vz/dump/argo-final-20260826.sql"
```

Expected: a non-zero-byte `.sql` file on the Proxmox host. A plain SQL dump is
far easier to inspect later than mounting a container image.

- [ ] **Step 3: Full container backups**

```bash
ssh root@192.168.1.190 "vzdump 5120 5220 --mode stop --compress zstd --storage local"
ssh root@192.168.1.190 "ls -la /var/lib/vz/dump/ | grep -E '5120|5220'"
```

Expected: two `vzdump-lxc-5120-*.tar.zst` and `vzdump-lxc-5220-*.tar.zst`
archives, both non-trivial in size.

- [ ] **Step 4: Report the backups and STOP for confirmation**

Report the file paths and sizes from Steps 2 and 3 to the user and wait for
explicit confirmation before continuing. A backup nobody verified is not a
backup, and the next step cannot be undone.

- [ ] **Step 5: Stop and destroy**

Only after confirmation:

```bash
ssh root@192.168.1.190 "pct stop 5120; pct stop 5220; sleep 5; pct destroy 5120; pct destroy 5220; pct list | awk 'NR==1 || \$1>=5000'"
```

Expected: neither 5120 nor 5220 appears in the listing.

- [ ] **Step 6: Final verification sweep**

```bash
curl -s -m 10 -o /dev/null -w "argo=%{http_code}\n" https://argo.booute.duckdns.org
curl -s -m 10 -o /dev/null -w "expapp=%{http_code}\n" https://expapp.duckdns.org
curl -s -m 10 https://argo.booute.duckdns.org/api/health
```

Expected: `argo=200`, `expapp=302`, and health reporting `2.19.0`. Destroying
the old containers must have changed nothing.

---

## Rollback

| After task | To undo |
|---|---|
| 1–4 | `git revert` the commits and redeploy. |
| 5 | Restore `20.conf` from `20.conf.bak-argo-rename`, reload nginx. |
| 6 | Restore `/etc/expenseapp/backend.env.bak-argo-rename`, restart the backend. |
| 7 | Recreate the `expapp` proxy host from `3.conf.bak-argo-rename`. |
| 8 | Restore from `vzdump` archives (`pct restore`). |

Steps 5–7 are config-only and revert in minutes. Task 8 is the only step whose
undo requires a restore, which is why it runs last and is gated on verified
backups.
