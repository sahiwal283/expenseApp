# Expense Messaging — Midas Threads in Trade Show

**Date:** 2026-08-24
**Status:** Approved design, ready for implementation planning
**Scope:** Two repos — `~/Work/midas` (Ext API) and `~/Work/trade-show-app` (BFF + PWA)

## Problem

Midas has a working expense messaging system: an accountant reviewing an expense can
ask a question, attach it to the expense, and put the expense into `awaiting_info`.
The submitter is expected to answer, which resolves the request and sends the expense
back for review.

Trade Show users never see any of it. Their expenses live in Midas
(`EXPENSE_BACKEND=midas`), so an accountant's question is attached to *their* expense —
but the Midas Ext API exposes no messaging endpoints, so the Trade Show PWA cannot read
or write threads. The user's only signal today is an email from Midas and an expense
that silently reads "Needs Further Review" with no stated reason.

There is a second, narrower gap: a Trade Show admin or accountant can already set an
expense to "Needs Further Review" from the Trade Show modal, which maps to Midas
`awaiting_info` — with no message attached at all. The submitter gets a status change
and zero explanation.

## Goals

- Trade Show users read accountant messages about their expenses inside the app.
- Trade Show users are notified when a new message arrives.
- Trade Show users reply from within the app, which resolves the request and returns
  the expense to review.
- Trade Show accountants can attach a message when they request more information,
  closing the silent-status-change gap.

## Non-goals

- Internal accountant-only notes in Trade Show. They stay a Midas-UI feature; mirroring
  them adds a leak risk (`internalNote` reaching a submitter) for a use case not asked for.
- Queued offline replies. Deferred deliberately (see Decisions).
- Notifying Trade Show accountants when a user replies. Two mechanisms already cover it:
  the reply auto-transitions the expense to `pending`, which the existing Trade Show
  approver bell surfaces, and as of Midas PR #5 `postToThread` notifies the claiming
  reviewer in Midas via `resolveMessageRecipient`. A third channel would be noise.
- Fixing `GET /ext/expenses/:id`'s missing `sourceApp` scoping. Real, pre-existing, unrelated.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Implement both sides in one effort | Both repos are owned locally; a written-contract handoff adds a round-trip for no benefit. |
| 2 | Polling scanner, not webhooks | Midas has zero outbound-webhook infrastructure (no signing, retry, dead-letter, or endpoint registration). Trade Show already has the `setInterval` scanner pattern in `TravelReminderService`. A webhook would still need a reconciliation poll, which is this design anyway. |
| 3 | Bidirectional: owners reply, Trade Show accountants can also send with `requestType` | The Ext endpoint needs actor resolution and privilege checks regardless, so accepting `requestType` is a small increment that closes the silent-status-change gap. |
| 4 | Trade Show owns read state; add a real notification store | Trade Show users work in the PWA, not Midas web, so cross-app read sync buys little against a Midas migration plus per-badge round-trip. Local state is also offline-friendly. |
| 5 | Offline read, online reply | Reading from cache has no failure mode. A queued reply can fail on replay (expense deleted, closed period, 409) *silently* — the user believes they answered, the expense stays parked in `awaiting_info`, and reimbursement stalls. A disabled composer is honest about the same constraint. |

## Architecture

Midas owns the entire messaging domain — the table, the thread semantics, the
`awaiting_info` state machine, the accountant's authoring UI. Trade Show owns none of
it. Trade Show is a **read-through client with a local delivery layer**, holding local
state only for the one thing Midas cannot know: whether a *Trade Show* user has seen a
message.

Four moving parts:

1. **Midas Ext API** — three endpoints, two new scopes, over shared thread logic.
2. **Trade Show BFF** — client methods, `ExpenseMessageService`, routes.
3. **Trade Show scanner** — polls, records notifications, fires push.
4. **Trade Show frontend** — thread panel, bell section, Dexie cache.

### Identity mechanic

`midasDtoToTsExpense` (`backend/src/services/expenseStore/midasAdapter.ts`) sets the
public expense `id` to `sourceRefId || e.id` — a *Trade Show* UUID — and carries the
real Midas id separately as `midasExpenseId`. Threads are keyed by Midas expense id.

The BFF resolves Trade Show id to Midas id server-side; the frontend never handles a
Midas id, and routes stay in Trade Show's own id space like every other expense route.

### Data flow — accountant to user

```
Accountant (Midas web) → PATCH /accountant/expenses/:id/review {action: request_info}
  → expense_messages row + status=awaiting_info + notifyUser (Midas email)
        ↓  (≤ scan interval)
Trade Show scanner → GET /ext/messages?sourceApp=trade_show&since=<cursor>
  → externalUserId → Trade Show user
  → insert expense_message_notifications row (unread)
  → PushService.sendToUser → web push → PWA
```

### Data flow — user to accountant

```
User opens thread → GET /api/expenses/:id/messages
  → BFF resolves midasExpenseId → GET /ext/expenses/:mid/messages
User replies → POST /api/expenses/:id/messages {body}
  → BFF sends actor headers → POST /ext/expenses/:mid/messages
  → Midas: insert; if awaiting_info && isOwner →
      resolve open requests, status → pending, audit 'user_responded'
```

Because `statusMaps.ts` already maps `awaiting_info` ↔ `"needs further review"`, the
user's expense visibly leaves "Needs Further Review" with **no new status-sync code**.

## Midas Ext surface

### Extraction (do this first)

> **Baseline note.** This section was revised against Midas `c65a4a8` (PR #5,
> `feat/expense-messaging-notifications`), which landed after the first draft of this
> spec. `routes/messages.ts` now also audits every post and notifies the other party.
> The extraction must carry that behavior, not just the auto-transition.

Midas's test harness runs **pure unit tests only** — `vitest.config.ts` includes
`src/__tests__/**`, coverage targets `src/lib/**`, and zero tests import `db/index`. The
codebase's answer to "logic that needs the database" is an established split: a pure
decision module plus a `*Db.ts` companion (`closedPeriods.ts`/`closedPeriodsDb.ts`,
`pendingCompletion.ts`/`pendingCompletionDb.ts`, `categorySyncPlan.ts`/`categorySyncDb.ts`).

Follow it. Two files:

**`apps/api/src/lib/expenseThread.ts` — pure, no db/env imports.**

```ts
export interface ThreadPostDecision {
  /** Resolve open requests + flip awaiting_info → pending. */
  transitionsToPending: boolean;
  /** Whether this sender may set requestType at all. */
  mayRequestInfo: boolean;
}

export function decideThreadPost(input: {
  status: string;
  senderId: string;
  senderRole: UserRole;
  ownerId: string;
}): ThreadPostDecision;

/** Whether this viewer may read the thread, and whether internal notes are visible. */
export function decideThreadAccess(input: {
  viewerId: string;
  viewerRole: UserRole;
  ownerId: string;
}): { allowed: boolean; includeInternal: boolean };
```

**`apps/api/src/lib/expenseThreadDb.ts` — db orchestration over those decisions.**

- `listThread(expenseId, { includeInternal })` — ordered messages with sender
  `{id, name, role}`.
- `postToThread({ expenseId, senderId, senderRole, body, requestType })` — inserts the
  message, then, in this order:
  1. if `decideThreadPost(...).transitionsToPending`, resolve all open `requestType`
     messages, set status `pending`, write the `user_responded` audit entry;
  2. write the `message.posted` audit entry with `truncateExcerpt(body)` —
     `expense_messages` is the canonical conversation record, so every post is audited;
  3. resolve the recipient via the existing `resolveMessageRecipient` and call
     `notifyUser(recipient, 'message', {...}, { email: false })`.

`routes/messages.ts` becomes a thin session-auth wrapper; the Ext routes become a thin
API-key wrapper. **One state machine, two doors.** Duplicating this would let the surfaces
drift, and a drifted state machine means expenses silently stuck in `awaiting_info` — or,
now, an Ext reply that never notifies the reviewer waiting on it.

This is a pure refactor with no behavior change. The existing `routes/messages.ts` and
`messageRecipients` tests must pass unchanged — that is the proof.

### Scopes

Add `messages:read` and `messages:write` to the `ExtScope` union in
`apps/api/src/middleware/requireScope.ts`. Grant to the `trade_show` connection via the
existing `create-ext-connection.ts` rotation script. Existing connections do not receive
them by default; an un-migrated key gets `403 MISSING_SCOPE`, which is the correct failure.

### `GET /ext/expenses/:id/messages` — scope `messages:read`

```json
{ "messages": [ {
    "id": "...", "body": "What was this dinner for?",
    "sender": { "id": "<midas-user>", "name": "Dana Reyes", "role": "accountant" },
    "isSystem": false, "requestType": "info_request",
    "isResolved": false, "resolvedAt": null, "createdAt": "..."
} ] }
```

`internalNote` is **never selected** in the Ext query — not fetched then stripped, simply
absent from the projection. It has no Ext consumer, and a field that never enters the
response object cannot leak through a future refactor.

### `POST /ext/expenses/:id/messages` — scope `messages:write`

Body: `{ body: string (1..2000), requestType?: enum }`. Actor via the existing
`X-Actor-Email` / `X-Actor-Username` / `X-Actor-Name` headers, resolved through
`resolveExtUser` — the same function the create path uses, so a username/email mismatch
yields `409 SUBMITTER_AMBIGUOUS` rather than misattributing a message to the wrong human.

Ownership is derived server-side (`expense.userId === resolvedActor.id`); the caller
cannot assert it.

Two guards:

- **`requestType` requires a privileged sender.** Privilege is
  `roleAllowed(role, ['accountant', 'admin'])` — the predicate `routes/messages.ts` now
  uses, which also passes `developer` and, deliberately, does **not** pass every non-`user`
  role (partners must not reach into other people's conversations). A sender failing it
  who supplies `requestType` is rejected `403`. Otherwise a salesperson could mark their
  own expense as needing info.
- **Auto-provisioning is disabled on this path.** `resolveExtUser` creates a Midas user
  when `EXT_AUTO_PROVISION_USERS` is on — right for expense creation, wrong here. Posting
  a message must never conjure an account. Unknown actor → `422 USER_NOT_FOUND`.

### `GET /ext/messages?sourceApp=&since=&limit=` — scope `messages:read`

The scanner feed. Cross-expense, keyset-paged on `(createdAt, id)` using the same
base64url `{c, i}` cursor convention as `GET /ext/expenses`. Each row carries inline
expense context:

```json
{ "messages": [ {
    "id": "...", "body": "...", "createdAt": "...",
    "sender": { "id": "<midas-user>", "name": "Dana Reyes", "role": "accountant" },
    "requestType": "info_request",
    "expense": { "id": "<midas>", "sourceRefId": "<trade-show>",
                 "ownerUserId": "<midas-user>", "externalUserId": "...",
                 "merchant": "Ruth's Chris", "amount": "340.00",
                 "status": "awaiting_info" }
} ], "nextCursor": null }
```

The inline `expense` block is deliberate: without it the scanner does an N+1 fetch per
message just to write "Your $340 expense at Ruth's Chris". `ownerUserId` and `sender.id`
are both Midas user ids, present so the scanner can recognise a self-sent message without
a second lookup; `MidasExpenseDto` already exposes `user.id`, so this leaks nothing new.

### Scoping

All three endpoints filter to `appConnection.appName === expense.sourceApp`, returning
`404` otherwise. (`appConnections.appName` is `'trade_show'`, matching
`expenses.sourceApp`.) Note that `GET /ext/expenses/:id` does **not** do this today —
any key with `expenses:read` can read any expense by id. Out of scope to fix, but message
bodies are free-text human conversation and should not inherit that looseness.

## Trade Show BFF

### Migration `038_create_expense_message_notifications.sql`

```sql
CREATE TABLE expense_message_notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  midas_message_id   UUID NOT NULL UNIQUE,          -- idempotency key
  midas_expense_id   UUID NOT NULL,
  expense_ref_id     UUID,                          -- Trade Show id, for deep links
  sender_name        TEXT NOT NULL,
  sender_role        TEXT,
  body_snippet       TEXT NOT NULL,
  request_type       TEXT,
  message_created_at TIMESTAMPTZ NOT NULL,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON expense_message_notifications (user_id, read_at);

CREATE TABLE midas_message_sync_state (
  source_app   TEXT PRIMARY KEY,
  cursor       TEXT,
  last_scan_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`midas_message_id UNIQUE` is the load-bearing constraint. The scanner advances its cursor
**only after** the batch commits, so a crash mid-batch re-reads the same messages, and
`ON CONFLICT (midas_message_id) DO NOTHING` makes redelivery a silent no-op. At-least-once
polling plus a unique key gives effectively-once notification without distributed
transactions.

### `ExpenseMessageScanner`

Modeled on `TravelReminderService` (startup delay, `setInterval`, `.catch()` on every
tick), with two deliberate divergences:

1. **Does not bail when push is disabled.** `TravelReminderService` returns early without
   VAPID, correct for a push-only service. Here the notification rows drive the in-app
   bell, which works without VAPID. Push is the optional half.
2. **First run seeds the watermark to the current head and notifies nothing.** Otherwise
   enabling the feature would push every historical message at every user at once.

Per scan: fetch a page → resolve each `expense.externalUserId` to a Trade Show user
(`externalUserId` *is* the Trade Show user id on the create path, so this is a direct
lookup) → **skip when `sender.id === expense.ownerUserId`**, mirroring Midas's "never
notify the actor about their own action" → insert rows → `PushService.sendToUser` →
persist cursor. A null `externalUserId`, or one matching no Trade Show user: log and skip,
never throw. The cursor still advances past skipped messages — they are decided, not
deferred.

Notification target is the expense owner only. Trade Show accountants are not notified on
replies — the reply auto-transitions the expense to `pending`, which the existing approver
bell already surfaces.

### `MidasClient` additions

`listExpenseMessages(midasExpenseId)`, `postExpenseMessage(midasExpenseId, body, actor)`,
`listMessagesSince(cursor, limit)` — following the existing `parse<T>()` + `MidasApiError`
conventions. `MockMidasClient` gets in-memory equivalents so tests run without Midas.

### `ExpenseMessageService`

Owns the Trade Show rules: resolve Trade Show expense id to `midasExpenseId` via the
existing store `getById` (which already enforces per-user access, so authorization is
inherited rather than reimplemented), map `ExpenseActor` to actor headers, and gate
`requestType` to admin/accountant/coordinator.

### Routes

- `GET  /api/expenses/:id/messages` — thread for one expense
- `POST /api/expenses/:id/messages` — send; `{ body, requestType? }`
- `POST /api/expenses/:id/messages/read` — mark this thread's notifications read
- `GET  /api/expense-messages/unread` — bell feed

The separate `/read` endpoint rather than marking read inside `GET` is a correctness
requirement, not HTTP fastidiousness: the frontend fills its Dexie cache in the
background, and a read-marking `GET` would silently clear the badge for messages the user
never saw.

**Gating:** these routes are active only under the conditions in Configuration below.
Otherwise they return `501 MESSAGING_UNAVAILABLE` and the frontend hides the UI rather
than showing a half-working panel over a local store that has no messages.

## Trade Show frontend

### `ExpenseModalMessages`

A new sibling in `src/components/expenses/ExpenseModal/`, rendered between
`ExpenseModalStatusManagement` and `ExpenseModalAuditTrail`. The modal is a stacked
vertical layout, not tabs, so a thread section fits without restructuring.

- Accountant messages left-aligned with sender name and role; the user's own
  right-aligned. `isSystem` messages render as a muted centered line — they are status
  annotations, not conversation.
- An unresolved `requestType` message gets amber "Needs your response" treatment, matching
  how `StatusBadge` renders `needs_further_review`. Once `isResolved` is true it drops
  back to normal weight, so visual urgency tracks the actual state machine.
- Composer is a textarea with a 2000-char limit mirroring Midas's Zod schema, so
  over-length fails client-side rather than as an opaque 400.
- `requestType` selection appears only for admin/accountant/coordinator.

**Required copy:** when the expense is in "Needs Further Review" and the viewer is the
owner, the composer reads *"Replying will send this back for review."* The auto-transition
is a real state change the user is triggering; discovering it after the fact is worse than
a one-line warning before.

### `useExpenseMessages(expenseId)`

Fetches through `apiClient`, writes each thread to Dexie, and on fetch failure falls back
to the cached copy with a "showing saved messages" marker. Subscribes to
`src/utils/networkDetection.ts`; when status is `offline` (not `degraded` — degraded still
round-trips, just slowly) the composer is disabled with a "reply when you reconnect"
state. `POST /read` fires when the panel renders with messages, never on a background
cache fill.

### Dexie v3

Adds one store, `cachedExpenseMessages: 'expenseId'`, following the `cachedPicklists`
precedent — new store declared alone, v1/v2 carried forward, cache-write failures logged
rather than thrown so a full IndexedDB never breaks a working online session.

### Bell

`Header.tsx` gains a submitter-facing section above the existing pending-expense list, fed
by `GET /api/expense-messages/unread`. The approver section is **not** rewritten — it
works, and folding both into one abstraction is scope creep.

The badge condition changes: today `hasUnreadNotifications` is ephemeral in-memory state
that resets on remount and is approver-only. Message rows have real `read_at` persistence,
so the badge becomes
`unreadMessages.length > 0 || (pendingApprovals && !hasViewedNotifications)`.

Clicking a message row closes the panel and opens that expense's modal scrolled to the
thread. This also means salespeople see the bell light up for the first time — currently
it is dead UI for them.

### Service worker

`PushService` already sends `{title, body, url}` and the existing worker handles
notification clicks; the message payload sets `url` to the expense deep link. Confirm the
click handler routes it; if not, that is a small addition rather than new infrastructure.

## Configuration

New Trade Show backend env vars (add to `env.example`):

| Var | Default | Meaning |
|-----|---------|---------|
| `EXPENSE_MESSAGING_ENABLED` | `false` | Master switch. When false, the scanner does not start and the message routes return `501 MESSAGING_UNAVAILABLE`. This is the rollback lever. |
| `MIDAS_MESSAGE_SCAN_INTERVAL_MS` | `120000` | Scanner tick. Two minutes balances "your accountant has a question" latency against Midas request volume; the reader already targets under ~10 req/s. |
| `MIDAS_MESSAGE_SCAN_PAGE_SIZE` | `100` | Rows per `GET /ext/messages` page. The scanner follows `nextCursor` to exhaustion within a tick. |

Messaging is active only when **all** of the following hold, which keeps a half-working
panel from ever appearing: `EXPENSE_MESSAGING_ENABLED=true`, `EXPENSE_BACKEND=midas`, and
`MIDAS_MODE != disabled`. Prod and sandbox already satisfy the latter two.

Midas needs no new env vars — only the two granted scopes.

## Error handling

Governing rule: **a messaging failure must never break expense review.**

- **Scanner** never throws. A failed scan logs and leaves the cursor unadvanced, so the
  next tick retries the same window; the unique constraint makes that safe. Midas
  unreachable degrades to "notifications are late," not "notifications are lost."
- **Read paths** fall back to the Dexie cache on thread-fetch failure. A failed
  unread-count fetch renders the bell without the message section rather than blanking it.
- **Write path** is the only one that surfaces errors directly, because a silently dropped
  reply is exactly the failure mode Decision 5 rejects. `409 SUBMITTER_AMBIGUOUS`,
  `403 MISSING_SCOPE`, and `422 USER_NOT_FOUND` get distinct copy — they have different
  fixes, and collapsing them into "something went wrong" makes the ambiguous-submitter
  case undebuggable.

## Testing

Both repos use Vitest.

**Midas** — the extraction is the risk, so it carries the weight. Tests are pure by
convention (no db imports), so the decision logic is what gets tested directly:

- `decideThreadPost` matrix in `src/__tests__/expenseThread.test.ts`: owner replies on
  `awaiting_info` → `transitionsToPending`; non-owner replies on `awaiting_info` → not;
  owner replies on `approved` → not; accountant/admin/developer → `mayRequestInfo`; `user`
  and `partner` → not.
- `decideThreadAccess`: owner allowed without internal notes; accountant/admin/developer
  allowed with them; unrelated `user` denied; partner denied.
- `requireScope` coverage for the two new scopes, extending the existing
  `extScopes.test.ts` pattern.
- Existing `routes/messages.ts` and `messageRecipients` tests pass unchanged.

Route-level concerns that the pure harness cannot reach — cross-`sourceApp` 404, no
auto-provisioning on the message path, and `internalNote` absent from Ext responses — are
verified by extending `src/scripts/ext-smoke.ts`, the repo's existing live-API smoke
script, rather than by inventing a db-backed test harness this codebase does not have.

**Trade Show:**

- Scanner against `MockMidasClient`: idempotency on replayed batches, cursor advances only
  after commit, first run seeds without notifying, self-sent messages skipped, unknown user
  skipped without throwing.
- Service: id resolution, `requestType` role gating.
- Component: thread panel offline state, reply-sends-back-for-review warning.

## Rollout

Order is one-directional:

1. **Midas first.** Extract the lib, add endpoints and scopes, deploy. Trade Show is not
   calling them yet, so this is inert.
2. **Grant the scopes** to the `trade_show` connection via the rotation script. Until this
   runs, every call returns `403 MISSING_SCOPE` — a hard prerequisite, not a follow-up.
3. **Trade Show to sandbox** via `deploy-sandbox-2600.sh`, **not** `deploy-sandbox.sh`,
   which points at production containers.
4. **Verify the migration actually applied.** `migrate.ts` silently skips on Postgres
   error `42501` (permission denied), so a clean startup does not prove
   `expense_message_notifications` exists. Confirm both tables are present before trusting
   a clean scan. Check `/etc/expenseapp/backend.env`, the authoritative env file, rather
   than a local `.env`.
5. **Production** after sandbox E2E: accountant asks a question in Midas → push arrives on
   the PWA → user replies → expense leaves "Needs Further Review".

Version bumps in both `package.json` and `backend/package.json` per the deploy checklist.
Restart NPMplus proxy after the frontend deploy to bust cache.

**Rollback is env-only.** Setting `EXPENSE_MESSAGING_ENABLED=false` and restarting stops
the scanner and closes the routes; revoking the two Ext scopes disables the surface entirely. No data migration to unwind — the
notification tables are derived state that rebuilds from Midas on re-enable.
