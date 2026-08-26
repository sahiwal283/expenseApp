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

## Survivor list (as of the rename)

`grep -ri "trade.show\|tradeshow"` over `src/` and `backend/src/` returns
447 hits. Every one is expected, and falls into exactly one of:

1. The contract constants listed under "Never rename" above.
2. Domain copy — user-visible text about trade shows as events.
3. TypeScript domain identifiers and their imports.
4. Code comments describing the app's relationship to Midas and Zoho.

If a future sweep finds a hit outside these four categories, it is a
product-name string that escaped the rename.
