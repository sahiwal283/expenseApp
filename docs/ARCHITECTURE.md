# Argo — Architecture

**Last verified:** 2026-09-01

## 1. Overview

Argo is a trade show expense management PWA: OCR receipt capture, event and booth-inventory logistics, automated expense approval, and an offline-first frontend backed by a background sync queue. The backend is Express/TypeScript over PostgreSQL (raw SQL, repository pattern, no ORM); the frontend is React/Vite. In production, expense data and Zoho Books posting are owned by an external system called Midas — Argo's own local expense store and Zoho client remain as a flag-gated fallback. Users authenticate via Authentik SSO (OIDC) or local password login.

## 2. Production topology

```mermaid
flowchart LR
    Browser["Browser / PWA"]

    subgraph Proxy["CT 104 — 192.168.1.160"]
        NPMplus["NPMplus reverse proxy<br/>argo.booute.duckdns.org<br/>(expapp.duckdns.org 302-redirects here)"]
    end

    subgraph FE["CT 2120 — 192.168.1.139:80"]
        Nginx["nginx<br/>serves /var/www/trade-show-app/current"]
    end

    subgraph BE["CT 2220 — 192.168.1.201:3000"]
        Backend["node backend<br/>systemd: trade-show-app-backend<br/>env: /etc/expenseapp/backend.env"]
    end

    subgraph DB["CT 2320"]
        Postgres[("PostgreSQL<br/>expense_app_production")]
    end

    Browser -->|HTTPS| NPMplus
    NPMplus -->|"/"| Nginx
    NPMplus -->|"/api"| Backend
    Backend --> Postgres

    Backend --> Midas["Midas<br/>expense SoT, picklists,<br/>Zoho posting<br/>EXPENSE_BACKEND=midas / MIDAS_MODE=live"]
    Backend --> Authentik["Authentik SSO<br/>CT 111 — OIDC"]
    Backend -.->|"optional"| Ollama["Ollama<br/>CT 103 — OCR enhancement"]
    Backend -.->|"flag-gated fallback"| Zoho["Zoho Books<br/>(reached via Midas in prod;<br/>direct client only under EXPENSE_BACKEND=local)"]
```

Sandbox is a single all-in-one container, CT 2600, running the same stack (frontend, backend, and PostgreSQL together) rather than the split topology above.

## 3. Backend architecture

Requests flow **routes → services → repositories → raw `pg` queries**. Route handlers stay thin; business logic and authorization live in services; data access is isolated behind the repository layer (`backend/src/database/repositories/`).

Key service boundaries (`backend/src/services/`):

- **`zohoIntegrationClient.ts`** — all Zoho Books OAuth and sync logic lives here; it is the only module that talks to Zoho directly.
- **`ocr/`** — Tesseract.js OCR → optional Ollama LLM enhancement (triggered when confidence < 0.70) → correction tracking (`UserCorrectionService.ts`).
- **`ExpenseService.ts`** — owns expense status transitions via 3-rule automated approval logic (regression detection back to "needs further review", auto-approve on entity assignment or reimbursement decision, no-op otherwise).
- **`EventParticipantService.ts`** — event-user relationship management.
- **`services/midas/`** (`MidasClient.ts`, `MockMidasClient.ts`, `statusMaps.ts`, `paymentMethodMap.ts`) — typed client for the external Midas API, plus the `EXPENSE_BACKEND` / `MIDAS_MODE` / `PICKLIST_SOURCE` env resolution used across the rest of the backend.
- **`services/expenseStore/`** — `ExpenseStore` is the interface that lets the rest of the backend read/write expenses without knowing which system of record is active; `LocalExpenseStore` and `MidasExpenseStore` implement it, `DualExpenseStore` fans out to both during migration, and `getExpenseStore()` picks one per `EXPENSE_BACKEND`. The local `expenses` table is frozen (no longer written) once a deployment cuts over to Midas.
- **`services/picklists/PicklistService.ts`** — resolves category/card/entity picklists; `PICKLIST_SOURCE` (`auto` | `midas` | `settings`) decides the source, where `auto` means "Midas iff `EXPENSE_BACKEND=midas`".
- **`ExpenseMessageScanner.ts`** — a pull-based poller, because Midas has no outbound webhook infrastructure. It polls for new expense messages and turns them into in-app notifications; delivery is at-least-once, collapsed to effectively-once by a unique constraint on the Midas message id.
- **`AuthentikOidcService.ts`** — OIDC login against Authentik; env-gated (dormant unless all four `AUTHENTIK_*`/`OIDC_REDIRECT_URI` vars are set), which doubles as the rollback switch.
- **`services/booth/`** (`BoothInventoryService.ts`, `BoothManifestService.ts`, `BoothMovementService.ts`, `BoothPackingService.ts`) — booth catalog, storage/manifest tracking, and the packing checklist, including idempotent replay of movement events keyed by a derived idempotency key.
- **`PushService.ts`** — Web Push notifications (VAPID); reports disabled and no-ops silently when VAPID keys are absent, so push is optional infrastructure everywhere it's called.

### Expense submission under Midas

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant FE as Frontend
    participant API as Backend API
    participant OCR as OCR pipeline
    participant ES as ExpenseStore (Midas)
    participant Midas as Midas
    participant Acct as Accountant (in Midas)
    participant Scan as ExpenseMessageScanner
    participant Push as PushService

    U->>FE: Upload receipt, fill form
    FE->>API: POST /api/ocr/v2/process (receipt)
    API->>OCR: Tesseract, then Ollama if confidence < 0.70
    OCR-->>FE: Extracted fields + confidence
    U->>FE: Review / correct fields, submit
    FE->>API: POST /api/expenses
    API->>ES: getExpenseStore().create(...)
    ES->>Midas: create expense
    Midas-->>ES: Midas expense id
    ES-->>API: normalized expense (Trade Show id)
    API-->>FE: 201 Created

    Acct->>Midas: Review expense, post message to thread
    loop every MIDAS_MESSAGE_SCAN_INTERVAL_MS
        Scan->>Midas: poll for new messages
        Midas-->>Scan: message batch
        Scan->>Scan: persist notifications, advance cursor
        Scan->>Push: notify submitter
    end
    Push-->>U: Web Push notification
    U->>FE: Open message thread, reply
```

## 4. Frontend architecture

`src/App.tsx` is a single-page app that renders by role, not by route: `currentPage` is plain `useState`, not React Router, and each page section is gated by `user.role` checks in JSX (e.g. `events`/`checklist`/`booths` are hidden for `accountant`). Data-access hooks are colocated with the features that use them (e.g. `src/components/expenses/ExpenseSubmission/hooks/`, `src/components/reports/hooks/`), with `src/hooks/useAuth.ts` as the shared authentication/session hook used app-wide and `src/hooks/useExpenseMessages.ts` for the message-thread bell. All API calls go through `src/utils/apiClient.ts`, an Axios instance whose request interceptor injects the JWT `Authorization` header. Feature components live in folders under `src/components/`: `admin/`, `auth/`, `checklist/`, `expenses/`, `events/`, `reports/`, `developer/`, `booths/` (booth inventory and packing), and others.

## 5. Offline-first

```mermaid
flowchart TD
    SW["Service worker<br/>(public/service-worker.js)"] -->|cache-first / network-first| Assets["Static assets + API responses"]
    User["User action while offline"] --> Queue["IndexedDB queue<br/>(src/utils/offlineDb.ts, Dexie)"]
    Queue -->|each item carries an idempotency key| Sync["syncManager<br/>(src/utils/syncManager.ts)"]
    Online["Connection restored"] --> Sync
    Sync -->|replay queued mutations| API["Backend API"]
    API -->|dedupes on idempotency_key,<br/>returns original on replay| Sync
    Checklist["Booth packing checklist<br/>check-offs"] --> Queue
```

The service worker caches static assets and uses a network-first strategy for API calls. Offline writes are queued in IndexedDB via Dexie (`src/utils/offlineDb.ts`); each queued mutation carries an idempotency key. `syncManager` replays the queue automatically on reconnect. Booth movement events and packing checklist check-offs are append-only and keyed so a replayed sync is safe — the backend dedupes on the idempotency key and returns the original result rather than erroring.

## 6. AuthN/AuthZ

Two login paths: local password auth (JWT, stored in `localStorage`, injected by the `apiClient` interceptor) and Authentik SSO via OIDC (`AuthentikOidcService.ts`), which is off by default and enabled only when its env vars are set. The `sessionTracker` middleware (`backend/src/middleware/sessionTracker.ts`) updates `last_activity` on authenticated requests, throttled for coarse freshness. Roles are database-driven (`roles` table, migration `003_create_roles_table.sql`): the system roles are `admin`, `accountant`, `coordinator`, `salesperson`, `developer`, `temporary`, `pending`, and custom roles can be created from the Admin UI. `developer` is the only role with access to `/dev-dashboard`.

## 7. Environments & config

| Environment | Topology | Key vars |
|---|---|---|
| Local | `npm run start:all`, single PostgreSQL DB | `EXPENSE_BACKEND=local` (default), `MIDAS_MODE=disabled` (default) |
| Sandbox | CT 2600, all-in-one (frontend + backend + PostgreSQL) | `EXPENSE_BACKEND`, `MIDAS_MODE`, `PICKLIST_SOURCE` set per current sandbox test scenario |
| Production | CT 2120 (frontend) / CT 2220 (backend) / CT 2320 (PostgreSQL), fronted by NPMplus on CT 104 | `EXPENSE_BACKEND=midas`, `MIDAS_MODE=live`, `PICKLIST_SOURCE=auto` (default; resolves to Midas), `AUTHENTIK_ISSUER`/`AUTHENTIK_CLIENT_ID`/`AUTHENTIK_CLIENT_SECRET`/`OIDC_REDIRECT_URI` (OIDC login), `ZOHO_*` (present only as the disabled fallback path) |

The authoritative env file in every deployed container is `/etc/expenseapp/backend.env` — not the repo's `backend/.env` or `env.example`, which are templates only.

Migrations auto-run at startup (`backend/src/database/migrate.ts`). A Postgres `42501` (insufficient privilege) error during a migration is caught and skipped rather than failing startup, so a deploy can silently ship without a migration actually applying. After any deploy that ships a new migration, verify it landed by checking the `schema_migrations` table on the target database rather than trusting a clean startup log.
