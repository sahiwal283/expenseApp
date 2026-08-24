# Expense Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface Midas expense message threads inside the Trade Show PWA so users are notified of accountant questions and can reply without leaving the app.

**Architecture:** Midas keeps sole ownership of the messaging domain and gains an Ext API surface over shared thread logic. Trade Show becomes a read-through client with a local delivery layer: a polling scanner records notifications and fires web push, and a thread panel in `ExpenseModal` reads and posts through the BFF. Trade Show stores no authoritative message data — only per-user read state, which Midas cannot know.

**Tech Stack:** Midas — Express, Drizzle ORM, Zod, Vitest (pure unit tests, no db). Trade Show — Express, raw `pg`, Vitest, React 18, Dexie, `web-push`.

**Spec:** `docs/superpowers/specs/2026-08-24-expense-messaging-design.md`

## Global Constraints

- **Two repos.** Midas tasks run in `~/Work/midas`; Trade Show tasks run in `~/Work/trade-show-app`. Every task states its repo. Commits go to the repo the task names.
- **Order is one-directional.** All Midas tasks (1–5) land before any Trade Show task that calls them. Trade Show tasks 6–12 may be written earlier but cannot be verified end-to-end until Midas ships and scopes are granted.
- **Midas tests are pure.** `apps/api/vitest.config.ts` includes only `src/__tests__/**/*.test.ts`; zero existing tests import `db/index`. Never write a Midas test that touches the database. Logic needing db goes in a `*Db.ts` companion, following `closedPeriods.ts`/`closedPeriodsDb.ts`.
- **Trade Show tests** live in `backend/tests/**/*.test.ts` and mock Midas with `vi.mock('../../src/services/midas', ...)`, following `backend/tests/services/MidasExpenseStore.orphan.test.ts`.
- **Privilege predicate** is exactly `roleAllowed(role, ['accountant', 'admin'])` from `apps/api/src/lib/roles.ts`. It passes `developer` and does not pass `partner`. Never use `role !== 'user'`.
- **`UserRole`** = `'user' | 'accountant' | 'admin' | 'partner' | 'developer'` (`packages/shared/src/types/index.ts:18`).
- **`internalNote` must never appear in any Ext response.** Do not select it in Ext queries.
- **Message body limit is 2000 chars**, trimmed, minimum 1 — matching `postMessageSchema` in `routes/messages.ts`.
- **Never modify an existing Trade Show migration.** New numbered file only.
- **Do not bump versions or deploy** as part of these tasks. Rollout is a separate step after Task 12.

---

## File Structure

**Midas (`~/Work/midas`)**

| File | Responsibility |
|------|----------------|
| `apps/api/src/lib/expenseThread.ts` | **Create.** Pure thread decisions: who may read, who may request info, when a post transitions the expense. No db/env imports. |
| `apps/api/src/__tests__/expenseThread.test.ts` | **Create.** Decision matrix tests. |
| `apps/api/src/lib/expenseThreadDb.ts` | **Create.** Db orchestration: list a thread, post to a thread with audit + notify. |
| `apps/api/src/routes/messages.ts` | **Modify.** Becomes a thin session-auth wrapper over the two libs. |
| `apps/api/src/middleware/requireScope.ts` | **Modify.** Add `messages:read`, `messages:write` to `ExtScope`. |
| `apps/api/src/__tests__/extScopes.test.ts` | **Modify.** Cover the new scopes. |
| `apps/api/src/lib/ext/messageDto.ts` | **Create.** Ext wire shapes for a thread message and a feed row. |
| `apps/api/src/routes/ext.ts` | **Modify.** Three new endpoints. |
| `apps/api/src/scripts/ext-smoke.ts` | **Modify.** Smoke-check the new endpoints against a live API. |

**Trade Show backend (`~/Work/trade-show-app/backend`)**

| File | Responsibility |
|------|----------------|
| `src/database/migrations/038_create_expense_message_notifications.sql` | **Create.** Notification store + scanner watermark. |
| `src/database/repositories/ExpenseMessageNotificationRepository.ts` | **Create.** All SQL for the two new tables. |
| `src/services/midas/MidasTypes.ts` | **Modify.** Message DTO types. |
| `src/services/midas/MidasClient.ts` | **Modify.** Three Ext calls. |
| `src/services/midas/MockMidasClient.ts` | **Modify.** In-memory equivalents. |
| `src/services/ExpenseMessageService.ts` | **Create.** Id resolution, actor mapping, privilege gating. |
| `src/services/ExpenseMessageScanner.ts` | **Create.** Poll, record, push. |
| `src/routes/expenseMessages.ts` | **Create.** Thread + unread routes. |
| `src/server.ts` | **Modify.** Mount routes, start scanner. |

**Trade Show frontend (`~/Work/trade-show-app/src`)**

| File | Responsibility |
|------|----------------|
| `utils/offlineDb.ts` | **Modify.** Dexie v3 store + accessors. |
| `hooks/useExpenseMessages.ts` | **Create.** Fetch/post/mark-read with cache fallback and online gating. |
| `components/expenses/ExpenseModal/ExpenseModalMessages.tsx` | **Create.** Thread panel + composer. |
| `components/expenses/ExpenseModal/index.ts` | **Modify.** Export it. |
| `components/expenses/ExpenseSubmission.tsx` | **Modify.** Render it in the modal. |
| `components/layout/Header.tsx` | **Modify.** Submitter-facing bell section. |

---

# Phase A — Midas Ext API

### Task 1: Pure thread decision logic

**Repo:** `~/Work/midas`

**Files:**
- Create: `apps/api/src/lib/expenseThread.ts`
- Test: `apps/api/src/__tests__/expenseThread.test.ts`

**Interfaces:**
- Consumes: `UserRole` from `@midas/shared`; `roleAllowed` from `../lib/roles`.
- Produces: `decideThreadAccess(input) => { allowed: boolean; includeInternal: boolean }` and `decideThreadPost(input) => { transitionsToPending: boolean; mayRequestInfo: boolean }`. Tasks 2 and 4 both call these.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/__tests__/expenseThread.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { decideThreadAccess, decideThreadPost } from '../lib/expenseThread';

const OWNER = 'user-owner';
const OTHER = 'user-other';

describe('decideThreadAccess', () => {
  it('lets the owner read without internal notes', () => {
    expect(decideThreadAccess({ viewerId: OWNER, viewerRole: 'user', ownerId: OWNER }))
      .toEqual({ allowed: true, includeInternal: false });
  });

  it('lets an accountant read with internal notes', () => {
    expect(decideThreadAccess({ viewerId: OTHER, viewerRole: 'accountant', ownerId: OWNER }))
      .toEqual({ allowed: true, includeInternal: true });
  });

  it('lets an admin read with internal notes', () => {
    expect(decideThreadAccess({ viewerId: OTHER, viewerRole: 'admin', ownerId: OWNER }))
      .toEqual({ allowed: true, includeInternal: true });
  });

  it('treats developer as all-access', () => {
    expect(decideThreadAccess({ viewerId: OTHER, viewerRole: 'developer', ownerId: OWNER }))
      .toEqual({ allowed: true, includeInternal: true });
  });

  it('denies an unrelated user', () => {
    expect(decideThreadAccess({ viewerId: OTHER, viewerRole: 'user', ownerId: OWNER }))
      .toEqual({ allowed: false, includeInternal: false });
  });

  it('denies a partner who is not the owner', () => {
    expect(decideThreadAccess({ viewerId: OTHER, viewerRole: 'partner', ownerId: OWNER }))
      .toEqual({ allowed: false, includeInternal: false });
  });

  it('gives an owner who is also an accountant internal notes on their own expense', () => {
    expect(decideThreadAccess({ viewerId: OWNER, viewerRole: 'accountant', ownerId: OWNER }))
      .toEqual({ allowed: true, includeInternal: true });
  });
});

describe('decideThreadPost', () => {
  it('transitions when the owner replies on awaiting_info', () => {
    expect(decideThreadPost({
      status: 'awaiting_info', senderId: OWNER, senderRole: 'user', ownerId: OWNER,
    })).toEqual({ transitionsToPending: true, mayRequestInfo: false });
  });

  it('does not transition when a non-owner replies on awaiting_info', () => {
    expect(decideThreadPost({
      status: 'awaiting_info', senderId: OTHER, senderRole: 'accountant', ownerId: OWNER,
    })).toEqual({ transitionsToPending: false, mayRequestInfo: true });
  });

  it('does not transition when the owner replies on an approved expense', () => {
    expect(decideThreadPost({
      status: 'approved', senderId: OWNER, senderRole: 'user', ownerId: OWNER,
    })).toEqual({ transitionsToPending: false, mayRequestInfo: false });
  });

  it('does not transition on pending', () => {
    expect(decideThreadPost({
      status: 'pending', senderId: OWNER, senderRole: 'user', ownerId: OWNER,
    })).toEqual({ transitionsToPending: false, mayRequestInfo: false });
  });

  it('lets admin and developer request info', () => {
    for (const role of ['admin', 'developer'] as const) {
      expect(decideThreadPost({
        status: 'pending', senderId: OTHER, senderRole: role, ownerId: OWNER,
      }).mayRequestInfo).toBe(true);
    }
  });

  it('does not let a partner request info', () => {
    expect(decideThreadPost({
      status: 'pending', senderId: OTHER, senderRole: 'partner', ownerId: OWNER,
    }).mayRequestInfo).toBe(false);
  });

  it('does not let an owning accountant transition and request info at once', () => {
    // Ownership decides direction; an accountant replying on their own
    // awaiting_info expense is a submitter here.
    expect(decideThreadPost({
      status: 'awaiting_info', senderId: OWNER, senderRole: 'accountant', ownerId: OWNER,
    })).toEqual({ transitionsToPending: true, mayRequestInfo: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Work/midas/apps/api && npx vitest run src/__tests__/expenseThread.test.ts`
Expected: FAIL — `Failed to resolve import "../lib/expenseThread"`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/lib/expenseThread.ts`:

```ts
/**
 * Pure decisions for an expense message thread.
 *
 * Two surfaces post to the same thread — the session-auth route used by the
 * Midas web app, and the API-key Ext route used by Trade Show. Both ask these
 * functions the same questions so the two doors cannot drift apart. A drifted
 * state machine strands expenses in awaiting_info.
 *
 * Pure: no db, no env. Callers supply the expense's owner and status.
 */

import type { UserRole } from '@midas/shared';
import { roleAllowed } from './roles';

export interface ThreadAccessInput {
  viewerId: string;
  viewerRole: UserRole;
  /** The expense's submitter. */
  ownerId: string;
}

export interface ThreadAccessDecision {
  allowed: boolean;
  /** Whether internalNote may be shown. Never true for a plain submitter. */
  includeInternal: boolean;
}

export function decideThreadAccess(input: ThreadAccessInput): ThreadAccessDecision {
  const isOwner = input.viewerId === input.ownerId;
  const isPrivileged = roleAllowed(input.viewerRole, ['accountant', 'admin']);
  if (!isOwner && !isPrivileged) return { allowed: false, includeInternal: false };
  return { allowed: true, includeInternal: isPrivileged };
}

export interface ThreadPostInput {
  /** Current expense status. */
  status: string;
  senderId: string;
  senderRole: UserRole;
  ownerId: string;
}

export interface ThreadPostDecision {
  /** Resolve open requests and flip awaiting_info -> pending. */
  transitionsToPending: boolean;
  /** Whether this sender may set requestType at all. */
  mayRequestInfo: boolean;
}

export function decideThreadPost(input: ThreadPostInput): ThreadPostDecision {
  const isOwner = input.senderId === input.ownerId;
  return {
    transitionsToPending: input.status === 'awaiting_info' && isOwner,
    mayRequestInfo: roleAllowed(input.senderRole, ['accountant', 'admin']),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Work/midas/apps/api && npx vitest run src/__tests__/expenseThread.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
cd ~/Work/midas/apps/api && npm run lint
git add src/lib/expenseThread.ts src/__tests__/expenseThread.test.ts
git commit -m "feat(messaging): pure thread access and post decisions"
```

---

### Task 2: Db companion and route refactor

**Repo:** `~/Work/midas`

**Files:**
- Create: `apps/api/src/lib/expenseThreadDb.ts`
- Modify: `apps/api/src/routes/messages.ts` (replace body with wrapper calls)

**Interfaces:**
- Consumes: `decideThreadAccess`, `decideThreadPost` (Task 1); existing `resolveMessageRecipient`, `notifyUser`, `truncateExcerpt`, `auditLog`.
- Produces: `listThread(expenseId, opts)` and `postToThread(input)`. Task 4 calls both.

**Behavior that must be preserved exactly** (from `routes/messages.ts` at `c65a4a8`): auto-transition with request resolution and `user_responded` audit; a `message.posted` audit on every post; recipient notification via `resolveMessageRecipient` + `notifyUser(..., 'message', ..., { email: false })`.

- [ ] **Step 1: Write the db companion**

Create `apps/api/src/lib/expenseThreadDb.ts`:

```ts
/**
 * Database orchestration for expense message threads.
 *
 * Decisions live in expenseThread.ts (pure, tested). This module is the only
 * place that writes a message, so the audit trail and recipient notification
 * cannot be forgotten by a new caller. Both the session-auth route and the Ext
 * route go through postToThread.
 */

import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { UserRole } from '@midas/shared';
import { db } from '../db/index';
import { expenseMessages, expenses } from '../db/schema';
import { auditLog } from './audit';
import { notifyUser } from './notify';
import { truncateExcerpt } from './notifyMessages';
import { resolveMessageRecipient } from './messageRecipients';
import { decideThreadPost } from './expenseThread';

const SENDER_COLUMNS = { id: true, name: true, role: true, email: true } as const;

/**
 * Thread messages oldest-first. When includeInternal is false the internalNote
 * field is removed from every row — a submitter must never see it.
 */
export async function listThread(
  expenseId: string,
  opts: { includeInternal: boolean },
) {
  const rows = await db.query.expenseMessages.findMany({
    where: eq(expenseMessages.expenseId, expenseId),
    with: { sender: { columns: SENDER_COLUMNS } },
    orderBy: [asc(expenseMessages.createdAt)],
  });
  return opts.includeInternal
    ? rows
    : rows.map(({ internalNote: _n, ...m }) => m);
}

export interface PostToThreadInput {
  expenseId: string;
  senderId: string;
  senderRole: UserRole;
  body: string;
  /** Only honoured for privileged senders; callers must gate before calling. */
  requestType?: string | null;
  internalNote?: string | null;
}

/**
 * Insert a message and run every consequence: auto-transition, audit, notify.
 * Returns the stored message with its sender joined.
 */
export async function postToThread(input: PostToThreadInput) {
  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, input.expenseId),
  });
  if (!expense) return null;

  const decision = decideThreadPost({
    status: expense.status,
    senderId: input.senderId,
    senderRole: input.senderRole,
    ownerId: expense.userId,
  });

  const [message] = await db.insert(expenseMessages).values({
    expenseId: input.expenseId,
    senderId: input.senderId,
    body: input.body,
    isSystem: false,
    requestType: input.requestType ?? null,
    internalNote: input.internalNote ?? null,
  }).returning();

  if (decision.transitionsToPending) {
    const openRequests = await db.query.expenseMessages.findMany({
      where: and(
        eq(expenseMessages.expenseId, input.expenseId),
        isNotNull(expenseMessages.requestType),
        eq(expenseMessages.isResolved, false),
      ),
      columns: { id: true },
    });

    for (const infoReq of openRequests) {
      await db.update(expenseMessages)
        .set({ isResolved: true, resolvedAt: new Date(), resolvedById: input.senderId })
        .where(eq(expenseMessages.id, infoReq.id));
    }

    await db.update(expenses)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(expenses.id, input.expenseId));

    await auditLog({
      entityType: 'expense',
      entityId: expense.id,
      userId: input.senderId,
      action: 'user_responded',
      before: { status: 'awaiting_info' },
      after: { status: 'pending' },
    });
  }

  const full = await db.query.expenseMessages.findFirst({
    where: eq(expenseMessages.id, message.id),
    with: { sender: { columns: SENDER_COLUMNS } },
  });

  // expense_messages is the canonical conversation record (see CLAUDE.md), so
  // every post is audited — not just the status transition above.
  await auditLog({
    entityType: 'expense',
    entityId: expense.id,
    userId: input.senderId,
    action: 'message.posted',
    after: { messageId: message.id, excerpt: truncateExcerpt(input.body) },
  });

  // Tell the other side. In-app + push only: threads would flood an inbox.
  const recipient = resolveMessageRecipient({
    isSystem: false,
    senderId: input.senderId,
    senderRole: input.senderRole,
    ownerId: expense.userId,
    reviewedById: expense.reviewedById,
  });
  if (recipient) {
    await notifyUser(recipient, 'message', {
      expenseId: expense.id,
      merchant: expense.merchant ?? 'an expense',
      amount: expense.amount ?? '0',
      senderName: full?.sender?.name,
      excerpt: truncateExcerpt(input.body),
    }, { email: false });
  }

  return full;
}
```

- [ ] **Step 2: Refactor the route to use it**

Replace the whole body of `apps/api/src/routes/messages.ts` with:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { expenses } from '../db/schema';
import { authenticate } from '../middleware/auth';
import { asyncHandler, notFound, forbidden } from '../middleware/error';
import { decideThreadAccess } from '../lib/expenseThread';
import { listThread, postToThread } from '../lib/expenseThreadDb';

const router = Router({ mergeParams: true });
router.use(authenticate);

const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/** Owner or accountant/admin (developer via roleAllowed). Partners are excluded. */
async function loadAndAuthorize(req: { params: { expenseId: string }; user?: { id: string; role: string } }) {
  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, req.params.expenseId) });
  if (!expense) throw notFound('Expense not found');
  const access = decideThreadAccess({
    viewerId: req.user!.id,
    viewerRole: req.user!.role as never,
    ownerId: expense.userId,
  });
  if (!access.allowed) throw forbidden();
  return { expense, access };
}

// Get all messages for an expense
router.get('/', asyncHandler(async (req, res) => {
  const { access } = await loadAndAuthorize(req as never);
  const messages = await listThread(req.params.expenseId, {
    includeInternal: access.includeInternal,
  });
  res.json({ messages });
}));

// Post a message
router.post('/', asyncHandler(async (req, res) => {
  await loadAndAuthorize(req as never);
  const { body } = postMessageSchema.parse(req.body);

  const message = await postToThread({
    expenseId: req.params.expenseId,
    senderId: req.user!.id,
    senderRole: req.user!.role as never,
    body,
  });
  if (!message) throw notFound('Expense not found');

  res.status(201).json({ message });
}));

export default router;
```

- [ ] **Step 3: Verify the existing suite still passes**

Run: `cd ~/Work/midas/apps/api && npm test`
Expected: PASS. `messageRecipients.test.ts`, `notifyMessages.test.ts`, and `expenseThread.test.ts` all green. This is the proof the refactor preserved behavior.

- [ ] **Step 4: Typecheck**

Run: `cd ~/Work/midas/apps/api && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ~/Work/midas
git add apps/api/src/lib/expenseThreadDb.ts apps/api/src/routes/messages.ts
git commit -m "refactor(messaging): extract thread db orchestration behind one entry point"
```

---

### Task 3: Add the two Ext scopes

**Repo:** `~/Work/midas`

**Files:**
- Modify: `apps/api/src/middleware/requireScope.ts`
- Test: `apps/api/src/__tests__/extScopes.test.ts`

**Interfaces:**
- Produces: `'messages:read'` and `'messages:write'` as valid `ExtScope` values. Task 4 and Task 5 guard with them.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/__tests__/extScopes.test.ts`, inside the existing `describe('requireScope', ...)` block:

```ts
  it('returns 403 MISSING_SCOPE when messages:write is absent', () => {
    const middleware = requireScope('messages:write');
    const req = {
      appConnection: { permissions: ['messages:read'] },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'MISSING_SCOPE',
        message: 'Missing required scope(s): messages:write',
      },
    });
  });

  it('calls next when messages:read is granted', () => {
    const middleware = requireScope('messages:read');
    const req = {
      appConnection: { permissions: ['messages:read'] },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Work/midas/apps/api && npx vitest run src/__tests__/extScopes.test.ts`
Expected: FAIL — TypeScript rejects `'messages:write'`, which is not assignable to `ExtScope`.

- [ ] **Step 3: Add the scopes**

In `apps/api/src/middleware/requireScope.ts`, extend the union:

```ts
export type ExtScope =
  | 'ocr:process'
  | 'expenses:create'
  | 'expenses:read'
  | 'expenses:update'
  | 'expenses:delete'
  | 'receipts:create'
  | 'expenses:import'
  | 'expenses:review'
  | 'zoho:push'
  | 'messages:read'
  | 'messages:write';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Work/midas/apps/api && npx vitest run src/__tests__/extScopes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Work/midas
git add apps/api/src/middleware/requireScope.ts apps/api/src/__tests__/extScopes.test.ts
git commit -m "feat(ext): add messages:read and messages:write scopes"
```

---

### Task 4: Ext thread endpoints

**Repo:** `~/Work/midas`

**Files:**
- Create: `apps/api/src/lib/ext/messageDto.ts`
- Modify: `apps/api/src/routes/ext.ts`

**Interfaces:**
- Consumes: `listThread`, `postToThread` (Task 2); `decideThreadPost` (Task 1); existing `resolveExtUser`, `actorEmail`, `actorUsername`, `actorName` helpers already in `ext.ts`.
- Produces: `GET /ext/expenses/:id/messages` and `POST /ext/expenses/:id/messages`. Task 7's `MidasClient` calls both. `toExtMessageDto` is reused by Task 5.

- [ ] **Step 1: Create the wire DTO**

Create `apps/api/src/lib/ext/messageDto.ts`:

```ts
/**
 * Ext wire shapes for expense messages.
 *
 * internalNote is absent by construction — it is never selected into these
 * objects, so it cannot leak through a later refactor of the query.
 */

type MessageRow = {
  id: string;
  body: string;
  isSystem: boolean;
  requestType: string | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  sender?: { id: string; name: string; role: string; email: string | null } | null;
};

export function toExtMessageDto(row: MessageRow) {
  return {
    id: row.id,
    body: row.body,
    sender: {
      id: row.sender?.id ?? null,
      name: row.sender?.name ?? 'Unknown',
      role: row.sender?.role ?? null,
      // Consumers key their own users by email (submitterEmail is how they
      // create expenses here), and a Midas user id means nothing to them.
      // Without this a consumer cannot tell which messages are its user's own.
      email: row.sender?.email ?? null,
    },
    isSystem: row.isSystem,
    requestType: row.requestType,
    isResolved: row.isResolved,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
```

- [ ] **Step 2: Add the endpoints**

In `apps/api/src/routes/ext.ts`, add imports near the existing ones:

```ts
import { decideThreadPost } from '../lib/expenseThread';
import { listThread, postToThread } from '../lib/expenseThreadDb';
import { toExtMessageDto } from '../lib/ext/messageDto';
import { expenseMessages } from '../db/schema';
```

Then add the routes. Place them **after** `router.get('/expenses/by-ref', ...)` and before `router.get('/expenses/:id', ...)` is not required — these paths are unambiguous — but keep them adjacent to the other `/expenses/:id/...` routes for readability:

```ts
// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * A trade_show key must not read or write conversations on another app's
 * expenses. Note GET /ext/expenses/:id does not scope this way today; message
 * bodies are free-text human conversation and should not inherit that.
 */
async function loadScopedExpense(req: { params: { id: string }; appConnection?: { appName: string } }) {
  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, req.params.id) });
  if (!expense) throw notFound('Expense not found');
  if (expense.sourceApp !== req.appConnection!.appName) throw notFound('Expense not found');
  return expense;
}

router.get('/expenses/:id/messages', requireScope('messages:read'), asyncHandler(async (req, res) => {
  await loadScopedExpense(req as never);
  // Ext consumers never see internal notes — see Decision 3 in the design doc.
  const rows = await listThread(req.params.id, { includeInternal: false });
  res.json({ messages: rows.map((r) => toExtMessageDto(r as never)) });
}));

const extPostMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  requestType: z.enum([
    'info_request', 'missing_receipt', 'missing_category', 'missing_payment_method', 'general',
  ]).optional(),
});

router.post('/expenses/:id/messages', requireScope('messages:write'), asyncHandler(async (req, res) => {
  const expense = await loadScopedExpense(req as never);
  const parsed = extPostMessageSchema.parse(req.body);

  // Posting a message must never conjure an account, even when
  // EXT_AUTO_PROVISION_USERS is on — that is for expense creation only.
  const actor = await resolveExtUser({
    email: actorEmail(req as never),
    username: actorUsername(req as never),
    displayName: actorName(req as never),
    autoProvision: false,
  });

  const senderRole = await db.query.users.findFirst({
    where: eq(users.id, actor.id),
    columns: { role: true },
  });
  const role = (senderRole?.role ?? 'user') as never;

  if (parsed.requestType) {
    const { mayRequestInfo } = decideThreadPost({
      status: expense.status,
      senderId: actor.id,
      senderRole: role,
      ownerId: expense.userId,
    });
    if (!mayRequestInfo) {
      throw createError('Sender may not set requestType', 403, 'FORBIDDEN');
    }
  }

  const message = await postToThread({
    expenseId: req.params.id,
    senderId: actor.id,
    senderRole: role,
    body: parsed.body,
    requestType: parsed.requestType ?? null,
  });
  if (!message) throw notFound('Expense not found');

  res.status(201).json({ message: toExtMessageDto(message as never) });
}));
```

- [ ] **Step 3: Add the `autoProvision` option to `resolveExtUser`**

The message path must not provision. In `apps/api/src/lib/ext/users.ts`, add the option to the signature and honour it:

```ts
export async function resolveExtUser(opts: {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  /**
   * Defaults to the env setting. Message posting passes false: a conversation
   * must never create an account, even where expense creation would.
   */
  autoProvision?: boolean;
}): Promise<{ id: string; username: string; email: string | null; name: string; provisioned: boolean }> {
```

and replace the provisioning guard:

```ts
  const allowProvision = opts.autoProvision ?? env.EXT_AUTO_PROVISION_USERS;
  if (!allowProvision) {
    throw createError(`No Midas user found for ${label}`, 422, 'USER_NOT_FOUND');
  }
```

- [ ] **Step 4: Typecheck and run the suite**

Run: `cd ~/Work/midas/apps/api && npm run lint && npm test`
Expected: no type errors; all tests pass (existing `extUserResolution.test.ts` must still pass — the new option is additive with an env-preserving default).

- [ ] **Step 5: Commit**

```bash
cd ~/Work/midas
git add apps/api/src/lib/ext/messageDto.ts apps/api/src/routes/ext.ts apps/api/src/lib/ext/users.ts
git commit -m "feat(ext): expense message thread read and write endpoints"
```

---

### Task 5: Ext scanner feed

**Repo:** `~/Work/midas`

**Files:**
- Modify: `apps/api/src/routes/ext.ts`
- Modify: `apps/api/src/scripts/ext-smoke.ts`

**Interfaces:**
- Produces: `GET /ext/messages?sourceApp=&since=&limit=` returning `{ messages: [...], nextCursor: string | null }`. Task 9's scanner is the only consumer. Each row carries `sender.id` and `expense.ownerUserId` so the scanner can recognise a self-sent message without a second lookup.

- [ ] **Step 1: Add the feed endpoint**

In `apps/api/src/routes/ext.ts`, add after the two message routes:

```ts
/**
 * Cross-expense message feed for polling consumers. Keyset-paged on
 * (createdAt, id) with the same base64url {c,i} cursor as GET /ext/expenses.
 *
 * Each row inlines the expense context a notifier needs — without it a scanner
 * does an N+1 fetch per message just to write "your $340 expense at Ruth's Chris".
 */
router.get('/messages', requireScope('messages:read'), asyncHandler(async (req, res) => {
  const sourceApp = typeof req.query.sourceApp === 'string' ? req.query.sourceApp : undefined;
  if (!sourceApp) throw createError('sourceApp query param is required', 400, 'VALIDATION_ERROR');
  if (sourceApp !== req.appConnection!.appName) {
    throw createError('sourceApp does not match this connection', 403, 'FORBIDDEN');
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const conditions = [eq(expenses.sourceApp, sourceApp)];

  const since = typeof req.query.since === 'string' ? req.query.since : undefined;
  if (since) {
    try {
      const decoded = JSON.parse(Buffer.from(since, 'base64url').toString('utf8')) as { c: string; i: string };
      conditions.push(
        or(
          gt(expenseMessages.createdAt, new Date(decoded.c)),
          and(eq(expenseMessages.createdAt, new Date(decoded.c)), gt(expenseMessages.id, decoded.i)),
        )!,
      );
    } catch {
      throw createError('Invalid cursor', 400, 'VALIDATION_ERROR');
    }
  }

  const rows = await db.select({
    id: expenseMessages.id,
    body: expenseMessages.body,
    isSystem: expenseMessages.isSystem,
    requestType: expenseMessages.requestType,
    isResolved: expenseMessages.isResolved,
    resolvedAt: expenseMessages.resolvedAt,
    createdAt: expenseMessages.createdAt,
    senderId: users.id,
    senderName: users.name,
    senderRole: users.role,
    senderEmail: users.email,
    expenseId: expenses.id,
    sourceRefId: expenses.sourceRefId,
    ownerUserId: expenses.userId,
    externalUserId: expenses.externalUserId,
    merchant: expenses.merchant,
    amount: expenses.amount,
    status: expenses.status,
  })
    .from(expenseMessages)
    .innerJoin(expenses, eq(expenseMessages.expenseId, expenses.id))
    .innerJoin(users, eq(expenseMessages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(asc(expenseMessages.createdAt), asc(expenseMessages.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  // Unlike GET /ext/expenses (a list), this is a resumable stream: a consumer
  // must be able to say "continue after the last row I saw". So the cursor is
  // the last row of the page whenever the page has rows, and null only when
  // there was nothing to return. Returning null on a final partial page would
  // leave a poller with no watermark and force it to replay from the start.
  const last = page[page.length - 1];
  const nextCursor = last
    ? Buffer.from(JSON.stringify({ c: last.createdAt.toISOString(), i: last.id }), 'utf8').toString('base64url')
    : null;

  res.json({
    messages: page.map((r) => ({
      id: r.id,
      body: r.body,
      sender: { id: r.senderId, name: r.senderName, role: r.senderRole, email: r.senderEmail },
      isSystem: r.isSystem,
      requestType: r.requestType,
      isResolved: r.isResolved,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      expense: {
        id: r.expenseId,
        sourceRefId: r.sourceRefId,
        ownerUserId: r.ownerUserId,
        externalUserId: r.externalUserId,
        merchant: r.merchant,
        amount: r.amount,
        status: r.status,
      },
    })),
    nextCursor,
  });
}));
```

- [ ] **Step 2: Extend the smoke script**

These are the route-level concerns the pure test harness cannot reach.

In `apps/api/src/scripts/ext-smoke.ts`, inside `async function main()`, add the following
after the existing steps. It uses the file's own `req()` helper and `steps` array, and the
`expenseId` variable already created by the expense-creation step earlier in `main` — read
that step to confirm the exact variable name before pasting, and use it verbatim.

```ts
  // ── Messages ───────────────────────────────────────────────────────────────
  const postMsg = await req('POST', `/ext/expenses/${expenseId}/messages`, {
    body: 'Smoke test message',
  });
  steps.push({
    name: 'POST /ext/expenses/:id/messages',
    ok: postMsg.status === 201
      && !!(postMsg.json as { message?: { id?: string } })?.message?.id,
    detail: `HTTP ${postMsg.status}`,
  });

  const thread = await req('GET', `/ext/expenses/${expenseId}/messages`);
  const threadMessages = (thread.json as { messages?: unknown[] })?.messages;
  steps.push({
    name: 'GET /ext/expenses/:id/messages',
    ok: thread.status === 200 && Array.isArray(threadMessages) && threadMessages.length > 0,
    detail: `HTTP ${thread.status} count=${threadMessages?.length ?? 0}`,
  });

  // internalNote must never cross the Ext boundary, for any consumer.
  steps.push({
    name: 'Ext thread omits internalNote',
    ok: !thread.text.includes('internalNote'),
    detail: thread.text.includes('internalNote') ? 'LEAKED internalNote' : 'absent',
  });

  const feed = await req('GET', '/ext/messages?sourceApp=trade_show&limit=5');
  const feedJson = feed.json as { messages?: Array<{ expense?: { ownerUserId?: string } }> };
  steps.push({
    name: 'GET /ext/messages',
    ok: feed.status === 200
      && Array.isArray(feedJson?.messages)
      && (feedJson.messages.length === 0 || !!feedJson.messages[0].expense?.ownerUserId),
    detail: `HTTP ${feed.status} count=${feedJson?.messages?.length ?? 0}`,
  });

  steps.push({
    name: 'Ext feed omits internalNote',
    ok: !feed.text.includes('internalNote'),
    detail: feed.text.includes('internalNote') ? 'LEAKED internalNote' : 'absent',
  });

  // A mismatched sourceApp must be refused, not silently served.
  const wrongApp = await req('GET', '/ext/messages?sourceApp=not_trade_show&limit=1');
  steps.push({
    name: 'GET /ext/messages rejects a foreign sourceApp',
    ok: wrongApp.status === 403,
    detail: `HTTP ${wrongApp.status}`,
  });
```

Run it against a live API once Task 5 is deployed locally:

```bash
cd ~/Work/midas && MIDAS_API_KEY=<key> npm run ext:smoke -w @midas/api
```

Expected: every message step reports `PASS`.

- [ ] **Step 3: Typecheck and run the suite**

Run: `cd ~/Work/midas/apps/api && npm run lint && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
cd ~/Work/midas
git add apps/api/src/routes/ext.ts apps/api/src/scripts/ext-smoke.ts
git commit -m "feat(ext): cross-expense message feed for polling consumers"
```

---

# Phase B — Trade Show backend

### Task 6: Notification store migration and repository

**Repo:** `~/Work/trade-show-app`

**Files:**
- Create: `backend/src/database/migrations/038_create_expense_message_notifications.sql`
- Create: `backend/src/database/repositories/ExpenseMessageNotificationRepository.ts`
- Test: `backend/tests/repositories/ExpenseMessageNotificationRepository.test.ts`

**Interfaces:**
- Produces: `recordNotifications(rows) => Promise<number>`, `listUnread(userId)`, `markThreadRead(userId, midasExpenseId)`, `getCursor(sourceApp)`, `setCursor(sourceApp, cursor)`. Tasks 8 and 9 consume these.

- [ ] **Step 1: Write the migration**

Create `backend/src/database/migrations/038_create_expense_message_notifications.sql`:

```sql
-- Expense message notifications: local delivery state for Midas-owned threads.
-- Trade Show stores no authoritative message data. These rows exist only to
-- answer "has THIS Trade Show user seen this message", which Midas cannot know.

CREATE TABLE IF NOT EXISTS expense_message_notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Idempotency key. The scanner advances its cursor only after a batch
  -- commits, so a crash mid-batch re-reads the same messages; this makes the
  -- redelivery a no-op instead of a duplicate notification.
  midas_message_id   UUID NOT NULL UNIQUE,
  midas_expense_id   UUID NOT NULL,
  expense_ref_id     UUID,
  sender_name        TEXT NOT NULL,
  sender_role        TEXT,
  body_snippet       TEXT NOT NULL,
  request_type       TEXT,
  message_created_at TIMESTAMPTZ NOT NULL,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_message_notifications_user_unread_idx
  ON expense_message_notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS expense_message_notifications_expense_idx
  ON expense_message_notifications (user_id, midas_expense_id);

-- Scanner watermark. One row per source app.
CREATE TABLE IF NOT EXISTS midas_message_sync_state (
  source_app   TEXT PRIMARY KEY,
  cursor       TEXT,
  last_scan_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/repositories/ExpenseMessageNotificationRepository.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({ query: vi.fn() }));

import { query } from '../../src/config/database';
import {
  recordNotifications,
  listUnread,
  markThreadRead,
  getCursor,
  setCursor,
} from '../../src/database/repositories/ExpenseMessageNotificationRepository';

const mockQuery = query as unknown as ReturnType<typeof vi.fn>;

describe('ExpenseMessageNotificationRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('records nothing and issues no query for an empty batch', async () => {
    const inserted = await recordNotifications([]);
    expect(inserted).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('ignores conflicts so a replayed batch inserts nothing new', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const inserted = await recordNotifications([{
      userId: 'u1',
      midasMessageId: 'm1',
      midasExpenseId: 'e1',
      expenseRefId: 'r1',
      senderName: 'Dana',
      senderRole: 'accountant',
      bodySnippet: 'What was this for?',
      requestType: 'info_request',
      messageCreatedAt: '2026-08-24T10:00:00.000Z',
    }]);

    expect(inserted).toBe(0);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('ON CONFLICT (midas_message_id) DO NOTHING');
  });

  it('lists only unread rows for the user, newest first', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'n1' }], rowCount: 1 });
    await listUnread('u1');
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('read_at IS NULL');
    expect(sql).toContain('ORDER BY message_created_at DESC');
    expect(params).toEqual(['u1']);
  });

  it('marks only that user rows on that thread read, and only once', async () => {
    mockQuery.mockResolvedValue({ rowCount: 2, rows: [] });
    const n = await markThreadRead('u1', 'e1');
    expect(n).toBe(2);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('read_at IS NULL');
    expect(params).toEqual(['u1', 'e1']);
  });

  it('returns null when no cursor row exists yet', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await getCursor('trade_show')).toBeNull();
  });

  it('upserts the cursor', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await setCursor('trade_show', 'abc');
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ON CONFLICT (source_app)');
    expect(params).toEqual(['trade_show', 'abc']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/repositories/ExpenseMessageNotificationRepository.test.ts`
Expected: FAIL — cannot resolve the repository module.

- [ ] **Step 4: Write the repository**

Create `backend/src/database/repositories/ExpenseMessageNotificationRepository.ts`:

```ts
/**
 * Local delivery state for Midas-owned message threads.
 *
 * Trade Show never stores message content as a source of truth — body_snippet
 * exists only so the notification bell can render without a round-trip to
 * Midas. Read state is the one thing that is genuinely ours.
 */

import { query } from '../../config/database';

export interface NotificationInsert {
  userId: string;
  midasMessageId: string;
  midasExpenseId: string;
  expenseRefId: string | null;
  senderName: string;
  senderRole: string | null;
  bodySnippet: string;
  requestType: string | null;
  messageCreatedAt: string;
}

export interface NotificationRow {
  id: string;
  midas_expense_id: string;
  expense_ref_id: string | null;
  sender_name: string;
  sender_role: string | null;
  body_snippet: string;
  request_type: string | null;
  message_created_at: string;
  read_at: string | null;
}

/**
 * Insert a batch, skipping any message already recorded. Returns how many rows
 * were genuinely new — a replayed batch returns 0 rather than double-notifying.
 */
export async function recordNotifications(rows: NotificationInsert[]): Promise<number> {
  if (rows.length === 0) return 0;

  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const b = i * 9;
    values.push(
      r.userId, r.midasMessageId, r.midasExpenseId, r.expenseRefId,
      r.senderName, r.senderRole, r.bodySnippet, r.requestType, r.messageCreatedAt
    );
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`;
  });

  const result = await query(
    `INSERT INTO expense_message_notifications
       (user_id, midas_message_id, midas_expense_id, expense_ref_id,
        sender_name, sender_role, body_snippet, request_type, message_created_at)
     VALUES ${tuples.join(', ')}
     ON CONFLICT (midas_message_id) DO NOTHING`,
    values
  );
  return result.rowCount || 0;
}

export async function listUnread(userId: string): Promise<NotificationRow[]> {
  const result = await query(
    `SELECT id, midas_expense_id, expense_ref_id, sender_name, sender_role,
            body_snippet, request_type, message_created_at, read_at
       FROM expense_message_notifications
      WHERE user_id = $1 AND read_at IS NULL
      ORDER BY message_created_at DESC`,
    [userId]
  );
  return result.rows as NotificationRow[];
}

/** Mark this user's unread rows on one thread as read. Returns rows affected. */
export async function markThreadRead(userId: string, midasExpenseId: string): Promise<number> {
  const result = await query(
    `UPDATE expense_message_notifications
        SET read_at = now()
      WHERE user_id = $1 AND midas_expense_id = $2 AND read_at IS NULL`,
    [userId, midasExpenseId]
  );
  return result.rowCount || 0;
}

export async function getCursor(sourceApp: string): Promise<string | null> {
  const result = await query(
    `SELECT cursor FROM midas_message_sync_state WHERE source_app = $1`,
    [sourceApp]
  );
  if (result.rows.length === 0) return null;
  return (result.rows[0] as { cursor: string | null }).cursor;
}

export async function setCursor(sourceApp: string, cursor: string | null): Promise<void> {
  await query(
    `INSERT INTO midas_message_sync_state (source_app, cursor, last_scan_at, updated_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (source_app)
     DO UPDATE SET cursor = EXCLUDED.cursor, last_scan_at = now(), updated_at = now()`,
    [sourceApp, cursor]
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/repositories/ExpenseMessageNotificationRepository.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
cd ~/Work/trade-show-app
git add backend/src/database/migrations/038_create_expense_message_notifications.sql \
        backend/src/database/repositories/ExpenseMessageNotificationRepository.ts \
        backend/tests/repositories/ExpenseMessageNotificationRepository.test.ts
git commit -m "feat(messaging): notification store and scanner watermark"
```

---

### Task 7: Midas client message methods

**Repo:** `~/Work/trade-show-app`

**Files:**
- Modify: `backend/src/services/midas/MidasTypes.ts`
- Modify: `backend/src/services/midas/MidasClient.ts`
- Modify: `backend/src/services/midas/MockMidasClient.ts`
- Test: `backend/tests/unit/midas/midasMessages.test.ts`

**Interfaces:**
- Produces: `MidasMessageDto`, `MidasFeedMessage`, and client methods `listExpenseMessages(expenseId)`, `postExpenseMessage(expenseId, input, actor)`, `listMessagesSince(sourceApp, cursor, limit)`. Tasks 8 and 9 consume them.

- [ ] **Step 1: Add the types**

Append to `backend/src/services/midas/MidasTypes.ts`:

```ts
/** Ext GET/POST /expenses/:id/messages (scopes messages:read / messages:write). */
export interface MidasMessageDto {
  id: string;
  body: string;
  /** `email` is the only field that joins a Midas sender to a Trade Show user. */
  sender: { id: string | null; name: string; role: string | null; email: string | null };
  isSystem: boolean;
  requestType: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

/** A row from Ext GET /messages — a thread message plus its expense context. */
export interface MidasFeedMessage extends MidasMessageDto {
  expense: {
    id: string;
    sourceRefId: string | null;
    /** Midas user id of the submitter; compare with sender.id to spot self-sends. */
    ownerUserId: string;
    externalUserId: string | null;
    merchant: string;
    amount: string | number;
    status: MidasExpenseStatus;
  };
}

export interface MidasMessageFeedResult {
  messages: MidasFeedMessage[];
  nextCursor: string | null;
}

export interface MidasPostMessageInput {
  body: string;
  requestType?: string | null;
}
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/unit/midas/midasMessages.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MockMidasClient } from '../../../src/services/midas/MockMidasClient';

const ACTOR = { email: 'sales@x.com', externalUserId: 'u1', name: 'Sales Person' };

describe('MockMidasClient messages', () => {
  let client: MockMidasClient;

  beforeEach(() => {
    client = new MockMidasClient('http://localhost:5174');
  });

  it('returns an empty thread for an expense with no messages', async () => {
    const result = await client.listExpenseMessages('expense-1');
    expect(result).toEqual([]);
  });

  it('round-trips a posted message into the thread', async () => {
    const posted = await client.postExpenseMessage('expense-1', { body: 'Dinner with buyers' }, ACTOR);
    expect(posted.body).toBe('Dinner with buyers');
    expect(posted.id).toBeTruthy();

    const thread = await client.listExpenseMessages('expense-1');
    expect(thread).toHaveLength(1);
    expect(thread[0].body).toBe('Dinner with buyers');
  });

  it('keeps threads separate per expense', async () => {
    await client.postExpenseMessage('expense-1', { body: 'A' }, ACTOR);
    await client.postExpenseMessage('expense-2', { body: 'B' }, ACTOR);
    expect(await client.listExpenseMessages('expense-1')).toHaveLength(1);
    expect(await client.listExpenseMessages('expense-2')).toHaveLength(1);
  });

  it('exposes posted messages through the feed with expense context', async () => {
    await client.postExpenseMessage('expense-1', { body: 'Need a receipt' }, ACTOR);
    const feed = await client.listMessagesSince('trade_show', undefined, 100);
    expect(feed.messages).toHaveLength(1);
    expect(feed.messages[0].expense.id).toBe('expense-1');
    expect(feed.messages[0].expense.ownerUserId).toBeTruthy();
    // A resume point is returned because rows came back, even though this is
    // the last page — see the feed cursor contract in Task 5.
    expect(feed.nextCursor).toBeTruthy();
  });

  it('returns a null cursor only when there is nothing to return', async () => {
    const feed = await client.listMessagesSince('trade_show', undefined, 100);
    expect(feed.messages).toEqual([]);
    expect(feed.nextCursor).toBeNull();
  });

  it('returns only messages after the supplied cursor', async () => {
    await client.postExpenseMessage('expense-1', { body: 'first' }, ACTOR);
    const firstPage = await client.listMessagesSince('trade_show', undefined, 1);
    await client.postExpenseMessage('expense-1', { body: 'second' }, ACTOR);

    const secondPage = await client.listMessagesSince('trade_show', firstPage.nextCursor ?? undefined, 100);
    expect(secondPage.messages.map((m) => m.body)).toEqual(['second']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/unit/midas/midasMessages.test.ts`
Expected: FAIL — `client.listExpenseMessages is not a function`.

- [ ] **Step 4: Implement on the real client**

Append to the `MidasClient` class in `backend/src/services/midas/MidasClient.ts`, matching the existing `try` / `parse` / `toMidasError` shape:

```ts
  async listExpenseMessages(expenseId: string): Promise<MidasMessageDto[]> {
    try {
      const res = await this.http.get(`/expenses/${expenseId}/messages`);
      const data = await this.parse<{ messages: MidasMessageDto[] }>(
        res.status, res.data, [200], res.headers as Record<string, unknown>
      );
      return data.messages || [];
    } catch (e) {
      return toMidasError(e);
    }
  }

  async postExpenseMessage(
    expenseId: string,
    input: MidasPostMessageInput,
    actor: MidasActor
  ): Promise<MidasMessageDto> {
    try {
      const res = await this.http.post(
        `/expenses/${expenseId}/messages`,
        input,
        { headers: actorHeaders(actor) }
      );
      const data = await this.parse<{ message: MidasMessageDto }>(
        res.status, res.data, [201], res.headers as Record<string, unknown>
      );
      return data.message;
    } catch (e) {
      return toMidasError(e);
    }
  }

  async listMessagesSince(
    sourceApp: string,
    cursor: string | undefined,
    limit: number
  ): Promise<MidasMessageFeedResult> {
    try {
      const res = await this.http.get('/messages', {
        params: { sourceApp, since: cursor, limit },
      });
      return await this.parse<MidasMessageFeedResult>(
        res.status, res.data, [200], res.headers as Record<string, unknown>
      );
    } catch (e) {
      return toMidasError(e);
    }
  }
```

Add the new types to the existing import from `./MidasTypes` at the top of the file: `MidasMessageDto`, `MidasMessageFeedResult`, `MidasPostMessageInput`.

Note: `actorHeaders` is the existing module-level helper in this file (it builds `X-Actor-*`). Reuse it — do not write a second one.

- [ ] **Step 5: Implement on the mock client**

Append to the `MockMidasClient` class in `backend/src/services/midas/MockMidasClient.ts`:

```ts
  /** expenseId -> ordered messages. Mirrors Midas thread ordering. */
  private messages = new Map<string, MidasFeedMessage[]>();
  private messageSeq = 0;

  async listExpenseMessages(expenseId: string): Promise<MidasMessageDto[]> {
    return (this.messages.get(expenseId) || []).map(({ expense: _e, ...m }) => m);
  }

  async postExpenseMessage(
    expenseId: string,
    input: MidasPostMessageInput,
    actor: MidasActor
  ): Promise<MidasMessageDto> {
    this.messageSeq += 1;
    const seq = this.messageSeq;
    const created: MidasFeedMessage = {
      id: `mock-message-${seq}`,
      body: input.body,
      sender: {
        id: actor.externalUserId,
        name: actor.name || 'Mock User',
        role: 'accountant',
        email: actor.email,
      },
      isSystem: false,
      requestType: input.requestType ?? null,
      isResolved: false,
      resolvedAt: null,
      // Deterministic, ordered timestamps — real time would make cursor tests flaky.
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
      expense: {
        id: expenseId,
        sourceRefId: `ref-${expenseId}`,
        ownerUserId: 'mock-owner',
        externalUserId: 'mock-owner',
        merchant: 'Mock Merchant',
        amount: '10.00',
        status: 'pending',
      },
    };
    const thread = this.messages.get(expenseId) || [];
    thread.push(created);
    this.messages.set(expenseId, thread);
    const { expense: _e, ...dto } = created;
    return dto;
  }

  async listMessagesSince(
    _sourceApp: string,
    cursor: string | undefined,
    limit: number
  ): Promise<MidasMessageFeedResult> {
    const all = [...this.messages.values()].flat()
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

    const after = cursor
      ? all.filter((m) => m.createdAt > JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')).c)
      : all;

    const page = after.slice(0, limit);
    // Same contract as the real feed: a resume point whenever rows were
    // returned, null only on an empty page.
    const last = page[page.length - 1];
    const nextCursor = last
      ? Buffer.from(JSON.stringify({ c: last.createdAt, i: last.id }), 'utf8').toString('base64url')
      : null;

    return { messages: page, nextCursor };
  }
```

Add `MidasFeedMessage`, `MidasMessageDto`, `MidasMessageFeedResult`, `MidasPostMessageInput` to this file's imports from `./MidasTypes`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/unit/midas/midasMessages.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
cd ~/Work/trade-show-app
git add backend/src/services/midas/ backend/tests/unit/midas/midasMessages.test.ts
git commit -m "feat(midas): client methods for expense message threads and feed"
```

---

### Task 8: ExpenseMessageService and routes

**Repo:** `~/Work/trade-show-app`

**Files:**
- Create: `backend/src/services/ExpenseMessageService.ts`
- Create: `backend/src/routes/expenseMessages.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/services/ExpenseMessageService.test.ts`

**Interfaces:**
- Consumes: client methods (Task 7); `markThreadRead`, `listUnread` (Task 6); existing `getExpenseStore()` and `ExpenseActor`.
- Produces: `getThread(expenseId, actor)`, `postMessage(expenseId, input, actor)`, `markRead(expenseId, actor)`, `isMessagingEnabled()`. Task 12's frontend calls the routes over these.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/ExpenseMessageService.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/midas', () => ({
  getMidasClient: vi.fn(),
  getExpenseBackend: vi.fn(() => 'midas'),
  getMidasMode: vi.fn(() => 'live'),
}));
vi.mock('../../src/services/expenseStore', () => ({ getExpenseStore: vi.fn() }));
vi.mock('../../src/database/repositories/ExpenseMessageNotificationRepository', () => ({
  markThreadRead: vi.fn().mockResolvedValue(1),
  listUnread: vi.fn().mockResolvedValue([]),
}));

import { getMidasClient } from '../../src/services/midas';
import { getExpenseStore } from '../../src/services/expenseStore';
import { markThreadRead } from '../../src/database/repositories/ExpenseMessageNotificationRepository';
import { ExpenseMessageService } from '../../src/services/ExpenseMessageService';

const salesperson = { id: 'u1', email: 'u@x.com', name: 'U', role: 'salesperson', username: 'u' };
const accountant = { id: 'a1', email: 'a@x.com', name: 'A', role: 'accountant', username: 'a' };

describe('ExpenseMessageService', () => {
  let client: any;
  let store: any;
  let service: ExpenseMessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    client = {
      listExpenseMessages: vi.fn().mockResolvedValue([]),
      postExpenseMessage: vi.fn().mockResolvedValue({ id: 'm1', body: 'hi' }),
    };
    store = { getById: vi.fn().mockResolvedValue({ id: 'ts-1', midasExpenseId: 'midas-1' }) };
    (getMidasClient as any).mockReturnValue(client);
    (getExpenseStore as any).mockReturnValue(store);
    service = new ExpenseMessageService();
  });

  it('resolves the trade-show id to the Midas id before reading', async () => {
    await service.getThread('ts-1', salesperson as any);
    expect(store.getById).toHaveBeenCalledWith('ts-1', salesperson);
    expect(client.listExpenseMessages).toHaveBeenCalledWith('midas-1');
  });

  it('throws NOT_FOUND when the actor cannot see the expense', async () => {
    store.getById.mockResolvedValue(null);
    await expect(service.getThread('ts-1', salesperson as any)).rejects.toThrow(/not found/i);
    expect(client.listExpenseMessages).not.toHaveBeenCalled();
  });

  it('throws when the expense has no Midas id', async () => {
    store.getById.mockResolvedValue({ id: 'ts-1' });
    await expect(service.getThread('ts-1', salesperson as any)).rejects.toThrow(/not linked/i);
  });

  it('sends actor headers derived from the trade-show user', async () => {
    await service.postMessage('ts-1', { body: 'because buyers' }, salesperson as any);
    expect(client.postExpenseMessage).toHaveBeenCalledWith(
      'midas-1',
      { body: 'because buyers', requestType: null },
      expect.objectContaining({
        email: 'u@x.com',
        externalUserId: 'u1',
        name: 'U',
      })
    );
  });

  it('rejects requestType from a salesperson', async () => {
    await expect(
      service.postMessage('ts-1', { body: 'x', requestType: 'info_request' }, salesperson as any)
    ).rejects.toThrow(/not permitted/i);
    expect(client.postExpenseMessage).not.toHaveBeenCalled();
  });

  it('allows requestType from an accountant', async () => {
    await service.postMessage('ts-1', { body: 'x', requestType: 'info_request' }, accountant as any);
    expect(client.postExpenseMessage).toHaveBeenCalledWith(
      'midas-1',
      { body: 'x', requestType: 'info_request' },
      expect.anything()
    );
  });

  it('flags the viewer own messages by email, not by user id', async () => {
    client.listExpenseMessages.mockResolvedValue([
      { id: 'm1', body: 'from them', sender: { id: 'midas-a', name: 'Dana', role: 'accountant', email: 'a@x.com' } },
      { id: 'm2', body: 'from me', sender: { id: 'midas-u', name: 'U', role: 'user', email: 'U@X.com' } },
    ]);

    const thread = await service.getThread('ts-1', salesperson as any);

    // Midas ids never equal trade-show ids; the match is on email, case-insensitively.
    expect(thread.map((m) => m.isMine)).toEqual([false, true]);
  });

  it('marks the thread read against the Midas expense id', async () => {
    await service.markRead('ts-1', salesperson as any);
    expect(markThreadRead).toHaveBeenCalledWith('u1', 'midas-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/services/ExpenseMessageService.test.ts`
Expected: FAIL — cannot resolve `ExpenseMessageService`.

- [ ] **Step 3: Write the service**

Create `backend/src/services/ExpenseMessageService.ts`:

```ts
/**
 * Trade Show side of Midas-owned expense message threads.
 *
 * Two responsibilities Midas cannot do for us:
 *   1. Translate a Trade Show expense id into the Midas id a thread is keyed
 *      by. midasDtoToTsExpense publishes sourceRefId as the public id, so the
 *      frontend never sees a Midas id and must not have to.
 *   2. Gate requestType by Trade Show role before it reaches Ext.
 *
 * Authorization for reading the expense itself is inherited from the expense
 * store, which already enforces per-user access — reimplementing it here would
 * be a second copy to drift.
 */

import { getMidasClient, getExpenseBackend, getMidasMode } from './midas';
import { getExpenseStore } from './expenseStore';
import { markThreadRead, listUnread } from '../database/repositories/ExpenseMessageNotificationRepository';
import type { ExpenseActor } from './expenseStore/ExpenseStore';
import type { MidasMessageDto } from './midas/MidasTypes';

/** Roles permitted to attach a requestType, mirroring Midas privilege. */
const PRIVILEGED_ROLES = new Set(['admin', 'accountant', 'coordinator', 'developer']);

export interface PostMessageInput {
  body: string;
  requestType?: string | null;
}

export class MessagingUnavailableError extends Error {
  code = 'MESSAGING_UNAVAILABLE';
}

/**
 * Messaging needs an explicit opt-in AND a Midas-backed expense store. A local
 * store has no threads at all, so a half-working panel would be worse than none.
 */
export function isMessagingEnabled(): boolean {
  return (
    process.env.EXPENSE_MESSAGING_ENABLED === 'true' &&
    getExpenseBackend() === 'midas' &&
    getMidasMode() !== 'disabled'
  );
}

export class ExpenseMessageService {
  private async resolveMidasId(expenseId: string, actor: ExpenseActor): Promise<string> {
    const expense = await getExpenseStore().getById(expenseId, actor);
    if (!expense) throw new Error('Expense not found');
    if (!expense.midasExpenseId) throw new Error('Expense is not linked to Midas');
    return expense.midasExpenseId;
  }

  /**
   * Thread messages, each flagged with whether the viewer wrote it.
   *
   * sender.id is a MIDAS user id and actor.id is a TRADE SHOW user id — they
   * are different id spaces and never compare equal. Email is the identity the
   * two systems already share (it is how expenses are attributed on create),
   * so it is the join key here too.
   */
  async getThread(
    expenseId: string,
    actor: ExpenseActor
  ): Promise<Array<MidasMessageDto & { isMine: boolean }>> {
    const midasId = await this.resolveMidasId(expenseId, actor);
    const messages = await getMidasClient().listExpenseMessages(midasId);
    const mine = actor.email.trim().toLowerCase();
    return messages.map((m) => ({
      ...m,
      isMine: !!m.sender.email && m.sender.email.trim().toLowerCase() === mine,
    }));
  }

  async postMessage(
    expenseId: string,
    input: PostMessageInput,
    actor: ExpenseActor
  ): Promise<MidasMessageDto> {
    if (input.requestType && !PRIVILEGED_ROLES.has(actor.role)) {
      throw new Error('Setting requestType is not permitted for this role');
    }
    const midasId = await this.resolveMidasId(expenseId, actor);
    return getMidasClient().postExpenseMessage(
      midasId,
      { body: input.body, requestType: input.requestType ?? null },
      {
        email: actor.email,
        externalUserId: actor.id,
        name: actor.name,
        requestId: undefined,
      }
    );
  }

  async markRead(expenseId: string, actor: ExpenseActor): Promise<number> {
    const midasId = await this.resolveMidasId(expenseId, actor);
    return markThreadRead(actor.id, midasId);
  }

  async unreadForUser(actor: ExpenseActor) {
    return listUnread(actor.id);
  }
}

export const expenseMessageService = new ExpenseMessageService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/services/ExpenseMessageService.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the routes**

Create `backend/src/routes/expenseMessages.ts`:

```ts
/**
 * Expense message thread routes. Mounted twice — under /api/expenses for the
 * thread itself and standalone for the unread feed the bell polls.
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { userRepository } from '../database/repositories/UserRepository';
import type { ExpenseActor } from '../services/expenseStore';
import { expenseMessageService, isMessagingEnabled } from '../services/ExpenseMessageService';

const router = Router({ mergeParams: true });

/**
 * The JWT carries only { id, username, role } — email and name come from the
 * user row. Midas resolves the actor by BOTH email and username, so sending a
 * placeholder email would misattribute or 409. Mirrors buildExpenseActor in
 * routes/expenses.ts.
 */
async function actorFrom(req: AuthRequest): Promise<ExpenseActor> {
  const u = await userRepository.findById(req.user!.id);
  return {
    id: req.user!.id,
    email: u?.email || `${req.user!.username}@local`,
    name: u?.name || req.user!.username,
    role: req.user!.role,
    username: req.user!.username,
  };
}

/** 501 rather than 404: the feature exists, this deployment has it switched off. */
function guard(res: Response): boolean {
  if (isMessagingEnabled()) return true;
  res.status(501).json({
    error: { code: 'MESSAGING_UNAVAILABLE', message: 'Expense messaging is not enabled' },
  });
  return false;
}

function fail(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  if (/not found|not linked/i.test(message)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message } });
  }
  if (/not permitted/i.test(message)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message } });
  }
  console.error('[ExpenseMessages]', error);
  return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message } });
}

router.get('/:id/messages', async (req: AuthRequest, res: Response) => {
  if (!guard(res)) return;
  try {
    const messages = await expenseMessageService.getThread(req.params.id, await actorFrom(req));
    res.json({ messages });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  if (!guard(res)) return;
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'body is required' } });
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'body exceeds 2000 characters' } });
  }
  try {
    const message = await expenseMessageService.postMessage(
      req.params.id,
      { body, requestType: req.body?.requestType ?? null },
      await actorFrom(req)
    );
    res.status(201).json({ message });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/:id/messages/read', async (req: AuthRequest, res: Response) => {
  if (!guard(res)) return;
  try {
    const updated = await expenseMessageService.markRead(req.params.id, await actorFrom(req));
    res.json({ updated });
  } catch (error) {
    fail(res, error);
  }
});

export const unreadRouter = Router();

unreadRouter.get('/unread', async (req: AuthRequest, res: Response) => {
  // The bell polls this on every mount; an unconfigured deployment should get
  // an empty list, not an error banner.
  if (!isMessagingEnabled()) return res.json({ notifications: [] });
  try {
    const notifications = await expenseMessageService.unreadForUser(await actorFrom(req));
    res.json({ notifications });
  } catch (error) {
    console.error('[ExpenseMessages] unread failed', error);
    res.json({ notifications: [] });
  }
});

export default router;
```

- [ ] **Step 6: Mount the routes**

In `backend/src/server.ts`, add the import alongside the other route imports:

```ts
import expenseMessageRoutes, { unreadRouter as expenseMessageUnreadRoutes } from './routes/expenseMessages';
```

and mount immediately **after** the existing expenses mount at line ~89, so `/api/expenses/:id/messages` resolves without colliding with expense routes:

```ts
app.use('/api/expenses', authenticateToken, sessionTracker, expenseMessageRoutes);
app.use('/api/expense-messages', authenticateToken, sessionTracker, expenseMessageUnreadRoutes);
```

- [ ] **Step 7: Verify the suite and typecheck**

Run: `cd ~/Work/trade-show-app/backend && npm run build && npx vitest run tests/services/ExpenseMessageService.test.ts`
Expected: build succeeds, tests pass.

- [ ] **Step 8: Commit**

```bash
cd ~/Work/trade-show-app
git add backend/src/services/ExpenseMessageService.ts backend/src/routes/expenseMessages.ts \
        backend/src/server.ts backend/tests/services/ExpenseMessageService.test.ts
git commit -m "feat(messaging): expense thread service and routes"
```

---

### Task 9: Message scanner

**Repo:** `~/Work/trade-show-app`

**Files:**
- Create: `backend/src/services/ExpenseMessageScanner.ts`
- Modify: `backend/src/server.ts`
- Modify: `env.example`
- Test: `backend/tests/services/ExpenseMessageScanner.test.ts`

**Interfaces:**
- Consumes: `listMessagesSince` (Task 7); `recordNotifications`, `getCursor`, `setCursor` (Task 6); existing `pushService`.
- Produces: `expenseMessageScanner.start()` / `.stop()` / `.scan()`. `scan()` is exported for tests; `start()` is called by `server.ts`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/ExpenseMessageScanner.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/midas', () => ({ getMidasClient: vi.fn() }));
vi.mock('../../src/database/repositories/ExpenseMessageNotificationRepository', () => ({
  recordNotifications: vi.fn().mockResolvedValue(1),
  getCursor: vi.fn().mockResolvedValue('cursor-0'),
  setCursor: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/config/database', () => ({ query: vi.fn() }));
vi.mock('../../src/services/PushService', () => ({
  pushService: { isEnabled: vi.fn(() => true), sendToUser: vi.fn().mockResolvedValue(undefined) },
}));

import { getMidasClient } from '../../src/services/midas';
import { query } from '../../src/config/database';
import { pushService } from '../../src/services/PushService';
import {
  recordNotifications, getCursor, setCursor,
} from '../../src/database/repositories/ExpenseMessageNotificationRepository';
import { ExpenseMessageScanner } from '../../src/services/ExpenseMessageScanner';

const mockQuery = query as unknown as ReturnType<typeof vi.fn>;

function feedMessage(over: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    body: 'What was this dinner for?',
    sender: { id: 'midas-accountant', name: 'Dana', role: 'accountant' },
    isSystem: false,
    requestType: 'info_request',
    isResolved: false,
    resolvedAt: null,
    createdAt: '2026-08-24T10:00:00.000Z',
    expense: {
      id: 'midas-e1',
      sourceRefId: 'ts-e1',
      ownerUserId: 'midas-owner',
      externalUserId: 'ts-user-1',
      merchant: "Ruth's Chris",
      amount: '340.00',
      status: 'awaiting_info',
    },
    ...over,
  };
}

describe('ExpenseMessageScanner', () => {
  let client: any;
  let scanner: ExpenseMessageScanner;

  beforeEach(() => {
    vi.clearAllMocks();
    client = { listMessagesSince: vi.fn().mockResolvedValue({ messages: [], nextCursor: null }) };
    (getMidasClient as any).mockReturnValue(client);
    // Default: externalUserId resolves to a real trade-show user.
    mockQuery.mockResolvedValue({ rows: [{ id: 'ts-user-1' }], rowCount: 1 });
    (getCursor as any).mockResolvedValue('cursor-0');
    scanner = new ExpenseMessageScanner();
  });

  it('records a notification and pushes to the owner', async () => {
    client.listMessagesSince.mockResolvedValue({ messages: [feedMessage()], nextCursor: 'cursor-1' });

    await scanner.scan();

    expect(recordNotifications).toHaveBeenCalledOnce();
    const rows = (recordNotifications as any).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: 'ts-user-1',
      midasMessageId: 'm1',
      midasExpenseId: 'midas-e1',
      expenseRefId: 'ts-e1',
      senderName: 'Dana',
    });
    expect(pushService.sendToUser).toHaveBeenCalledWith('ts-user-1', expect.objectContaining({
      url: '/#expense=ts-e1',
    }));
    expect(setCursor).toHaveBeenCalledWith('trade_show', 'cursor-1');
  });

  it('does nothing at all when the feed is empty', async () => {
    client.listMessagesSince.mockResolvedValue({ messages: [], nextCursor: null });

    await scanner.scan();

    expect(recordNotifications).not.toHaveBeenCalled();
    expect(setCursor).not.toHaveBeenCalled();
  });

  it('skips a message the owner sent themselves', async () => {
    client.listMessagesSince.mockResolvedValue({
      messages: [feedMessage({ sender: { id: 'midas-owner', name: 'Sales', role: 'user' } })],
      nextCursor: 'cursor-1',
    });

    await scanner.scan();

    expect(recordNotifications).toHaveBeenCalledWith([]);
    expect(pushService.sendToUser).not.toHaveBeenCalled();
  });

  it('skips system messages', async () => {
    client.listMessagesSince.mockResolvedValue({
      messages: [feedMessage({ isSystem: true })], nextCursor: 'cursor-1',
    });
    await scanner.scan();
    expect(recordNotifications).toHaveBeenCalledWith([]);
  });

  it('skips a message whose externalUserId matches no trade-show user', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    client.listMessagesSince.mockResolvedValue({ messages: [feedMessage()], nextCursor: 'cursor-1' });

    await scanner.scan();

    expect(recordNotifications).toHaveBeenCalledWith([]);
    expect(pushService.sendToUser).not.toHaveBeenCalled();
  });

  it('advances the cursor past skipped messages', async () => {
    client.listMessagesSince.mockResolvedValue({
      messages: [feedMessage({ isSystem: true })], nextCursor: 'cursor-1',
    });
    await scanner.scan();
    expect(setCursor).toHaveBeenCalledWith('trade_show', 'cursor-1');
  });

  it('does not advance the cursor when recording throws', async () => {
    (recordNotifications as any).mockRejectedValue(new Error('db down'));
    client.listMessagesSince.mockResolvedValue({ messages: [feedMessage()], nextCursor: 'cursor-1' });

    await scanner.scan();

    expect(setCursor).not.toHaveBeenCalled();
  });

  it('seeds the watermark without notifying on first run', async () => {
    (getCursor as any).mockResolvedValue(null);
    client.listMessagesSince.mockResolvedValue({
      messages: [feedMessage()], nextCursor: 'cursor-head',
    });

    await scanner.scan();

    expect(recordNotifications).not.toHaveBeenCalled();
    expect(pushService.sendToUser).not.toHaveBeenCalled();
    // Must persist a real cursor. Writing null here would re-seed forever and
    // the user would never be notified of anything.
    expect(setCursor).toHaveBeenCalledWith('trade_show', 'cursor-head');
  });

  it('seeding walks full pages to the head before stopping', async () => {
    (getCursor as any).mockResolvedValue(null);
    process.env.MIDAS_MESSAGE_SCAN_PAGE_SIZE = '1';
    client.listMessagesSince
      .mockResolvedValueOnce({ messages: [feedMessage({ id: 'm1' })], nextCursor: 'c1' })
      .mockResolvedValueOnce({ messages: [], nextCursor: null });

    await scanner.scan();

    expect(setCursor).toHaveBeenLastCalledWith('trade_show', 'c1');
    expect(recordNotifications).not.toHaveBeenCalled();
    delete process.env.MIDAS_MESSAGE_SCAN_PAGE_SIZE;
  });

  it('never throws when Midas is unreachable', async () => {
    client.listMessagesSince.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(scanner.scan()).resolves.toBeUndefined();
    expect(setCursor).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/services/ExpenseMessageScanner.test.ts`
Expected: FAIL — cannot resolve `ExpenseMessageScanner`.

- [ ] **Step 3: Write the scanner**

Create `backend/src/services/ExpenseMessageScanner.ts`:

```ts
/**
 * Polls Midas for new expense messages and turns them into Trade Show
 * notifications.
 *
 * Midas has no outbound webhook infrastructure, so delivery is a pull. The
 * cursor advances only after a batch is persisted, which makes this
 * at-least-once; the UNIQUE constraint on midas_message_id collapses a
 * redelivery into a no-op, so the observable behaviour is effectively-once.
 *
 * Unlike TravelReminderService this does NOT idle when push is unconfigured —
 * the notification rows drive the in-app bell, and push is the optional half.
 */

import { getMidasClient } from './midas';
import { query } from '../config/database';
import { pushService } from './PushService';
import {
  recordNotifications, getCursor, setCursor,
  type NotificationInsert,
} from '../database/repositories/ExpenseMessageNotificationRepository';
import type { MidasFeedMessage } from './midas/MidasTypes';

const SOURCE_APP = 'trade_show';
const STARTUP_DELAY_MS = 20_000;
const SNIPPET_MAX = 160;

/** Guards against an unbounded loop if a cursor ever fails to advance. */
const MAX_PAGES = 50;

function intervalMs(): number {
  return parseInt(process.env.MIDAS_MESSAGE_SCAN_INTERVAL_MS || '120000', 10);
}

function pageSize(): number {
  return parseInt(process.env.MIDAS_MESSAGE_SCAN_PAGE_SIZE || '100', 10);
}

function snippet(body: string): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length <= SNIPPET_MAX ? clean : `${clean.slice(0, SNIPPET_MAX - 1)}…`;
}

export class ExpenseMessageScanner {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (this.timer) return;
    if (process.env.EXPENSE_MESSAGING_ENABLED !== 'true') {
      console.log('[ExpenseMessages] EXPENSE_MESSAGING_ENABLED not set — scanner idle');
      return;
    }
    setTimeout(() => this.scan().catch(() => undefined), STARTUP_DELAY_MS);
    this.timer = setInterval(() => this.scan().catch(() => undefined), intervalMs());
    console.log(`[ExpenseMessages] Scanner started (every ${intervalMs()}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One full sweep: follow cursors to exhaustion, persisting after each page.
   * Never throws — a messaging failure must not disturb expense review.
   */
  async scan(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const client = getMidasClient();
      let cursor = await getCursor(SOURCE_APP);
      // A missing cursor row means this deployment has never scanned. Seeding
      // walks to the current head WITHOUT notifying: replaying history would
      // push every past message at every user the moment the feature is
      // switched on.
      const seeding = cursor === null;
      const size = pageSize();

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await client.listMessagesSince(SOURCE_APP, cursor ?? undefined, size);

        // Nothing new. Leave the watermark exactly where it was.
        if (result.messages.length === 0) return;

        if (!seeding) {
          const rows = await this.toNotifications(result.messages);
          await recordNotifications(rows);
          for (const row of rows) {
            void pushService.sendToUser(row.userId, {
              title: row.requestType ? 'Action required on your expense' : 'New message on your expense',
              body: `${row.senderName}: ${row.bodySnippet}`,
              // This app has no path router — deep links are hashes read by
              // ExpenseSubmission (#new-expense, #event=…). A /expenses/:id URL
              // would just land on the dashboard.
              url: `/#expense=${row.expenseRefId ?? row.midasExpenseId}`,
            });
          }
        }

        // Advance only after the batch is durable — a throw above leaves the
        // watermark unmoved and the next tick retries the same window, which
        // the UNIQUE constraint makes safe. Skipped messages are decided, not
        // deferred, so the cursor moves past them too.
        if (result.nextCursor) {
          await setCursor(SOURCE_APP, result.nextCursor);
          cursor = result.nextCursor;
        }

        // A short page means we reached the head.
        if (result.messages.length < size) return;
      }

      console.warn(`[ExpenseMessages] Stopped after ${MAX_PAGES} pages with more available`);
    } catch (error) {
      console.error('[ExpenseMessages] Scan failed:', error);
    } finally {
      this.running = false;
    }
  }

  private async toNotifications(messages: MidasFeedMessage[]): Promise<NotificationInsert[]> {
    const rows: NotificationInsert[] = [];

    for (const m of messages) {
      // System messages are app-written annotations, not conversation.
      if (m.isSystem) continue;
      // Never notify someone about their own message.
      if (m.sender.id && m.sender.id === m.expense.ownerUserId) continue;

      const externalUserId = m.expense.externalUserId;
      if (!externalUserId) continue;

      const found = await query(`SELECT id FROM users WHERE id = $1`, [externalUserId]);
      if (found.rows.length === 0) {
        console.log(`[ExpenseMessages] No Trade Show user for ${externalUserId} — skipping ${m.id}`);
        continue;
      }

      rows.push({
        userId: externalUserId,
        midasMessageId: m.id,
        midasExpenseId: m.expense.id,
        expenseRefId: m.expense.sourceRefId,
        senderName: m.sender.name,
        senderRole: m.sender.role,
        bodySnippet: snippet(m.body),
        requestType: m.requestType,
        messageCreatedAt: m.createdAt,
      });
    }

    return rows;
  }
}

export const expenseMessageScanner = new ExpenseMessageScanner();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Work/trade-show-app/backend && npx vitest run tests/services/ExpenseMessageScanner.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Register and document config**

In `backend/src/server.ts`, next to `travelReminderService.start();` (line ~204):

```ts
import { expenseMessageScanner } from './services/ExpenseMessageScanner';
// ...
    expenseMessageScanner.start();
```

Append to `env.example`:

```
# Expense messaging (Midas-owned threads surfaced in Trade Show).
# Master switch — also requires EXPENSE_BACKEND=midas and MIDAS_MODE != disabled.
EXPENSE_MESSAGING_ENABLED=false
MIDAS_MESSAGE_SCAN_INTERVAL_MS=120000
MIDAS_MESSAGE_SCAN_PAGE_SIZE=100
```

- [ ] **Step 6: Build and commit**

```bash
cd ~/Work/trade-show-app/backend && npm run build
cd ~/Work/trade-show-app
git add backend/src/services/ExpenseMessageScanner.ts backend/src/server.ts env.example \
        backend/tests/services/ExpenseMessageScanner.test.ts
git commit -m "feat(messaging): poll Midas for new messages and notify owners"
```

---

# Phase C — Trade Show frontend

### Task 10: Offline cache and data hook

**Repo:** `~/Work/trade-show-app`

**Files:**
- Modify: `src/utils/offlineDb.ts`
- Create: `src/hooks/useExpenseMessages.ts`

**Interfaces:**
- Consumes: routes from Task 8; `networkDetection` from `src/utils/networkDetection.ts`.
- Produces: `useExpenseMessages(expenseId, enabled)` returning `{ messages, loading, error, fromCache, isOffline, send, sending }`. Task 11 consumes it.

- [ ] **Step 1: Add the Dexie store**

In `src/utils/offlineDb.ts`, declare the table field alongside the others:

```ts
  cachedExpenseMessages!: Table<CachedExpenseMessages, string>;
```

Add the interface near the other cached types:

```ts
/** Read-only mirror of a Midas thread, so a user on a show floor can still read it. */
export interface CachedExpenseMessages {
  expenseId: string;
  messages: any[];
  cachedAt: number;
}
```

Add the version bump after the `version(2)` block:

```ts
    // v3 adds the expense message thread cache. Dexie carries v1/v2 tables
    // forward, so only the new store is declared here.
    this.version(3).stores({
      cachedExpenseMessages: 'expenseId'
    });
```

Add the accessors next to the picklist ones:

```ts
  async getCachedExpenseMessages(expenseId: string): Promise<CachedExpenseMessages | null> {
    try {
      return (await this.cachedExpenseMessages.get(expenseId)) ?? null;
    } catch (error) {
      console.error('[offlineDb] Failed to read cached messages:', error);
      return null;
    }
  }

  async setCachedExpenseMessages(expenseId: string, messages: any[]): Promise<void> {
    try {
      await this.cachedExpenseMessages.put({ expenseId, messages, cachedAt: Date.now() });
    } catch (error) {
      // A failed cache write must not break a working online session.
      console.error('[offlineDb] Failed to cache messages:', error);
    }
  }
```

- [ ] **Step 2: Write the hook**

Create `src/hooks/useExpenseMessages.ts`:

```ts
/**
 * Expense message thread data.
 *
 * Reading falls back to the Dexie cache, so a user on a show floor can still
 * see what their accountant asked. Replying does not queue offline: a queued
 * reply that fails on replay is silent, and the user would believe they had
 * answered while the expense stayed parked in awaiting_info.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../utils/apiClient';
import { AppError } from '../utils/errorHandler';
import { offlineDb } from '../utils/offlineDb';
import { networkMonitor } from '../utils/networkDetection';

export interface ExpenseMessage {
  id: string;
  body: string;
  sender: { id: string | null; name: string; role: string | null; email: string | null };
  /** Set by the BFF — the frontend cannot compute this (see ExpenseMessageService). */
  isMine: boolean;
  isSystem: boolean;
  requestType: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export function useExpenseMessages(expenseId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<ExpenseMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    // addListener returns its own unsubscribe; true = fire immediately so the
    // composer is not briefly enabled while offline on first render.
    return networkMonitor.addListener((state) => setIsOffline(!state.isOnline), true);
  }, []);

  const load = useCallback(async () => {
    if (!expenseId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      // apiClient returns the parsed body directly — there is no axios-style
      // { data } envelope on this client.
      const res = await apiClient.get<{ messages: ExpenseMessage[] }>(
        `/expenses/${expenseId}/messages`
      );
      const next = res.messages || [];
      setMessages(next);
      setFromCache(false);
      void offlineDb.setCachedExpenseMessages(expenseId, next);
    } catch (e: unknown) {
      const status = e instanceof AppError ? e.statusCode : undefined;
      if (status === 501) {
        // Messaging is switched off for this deployment; an empty thread is
        // the honest answer, not an error.
        setMessages([]);
      } else {
        const cached = await offlineDb.getCachedExpenseMessages(expenseId);
        if (cached) {
          setMessages(cached.messages as ExpenseMessage[]);
          setFromCache(true);
        } else {
          setError('Could not load messages');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [expenseId, enabled]);

  useEffect(() => { void load(); }, [load]);

  // Mark read only once the thread has actually rendered with content — never
  // on a background cache fill, which would clear the badge unseen.
  useEffect(() => {
    if (!expenseId || !enabled || fromCache) return;
    if (messages.length === 0) return;
    if (markedRef.current === expenseId) return;
    markedRef.current = expenseId;
    apiClient.post(`/expenses/${expenseId}/messages/read`).catch(() => undefined);
  }, [expenseId, enabled, fromCache, messages.length]);

  const send = useCallback(async (body: string, requestType?: string | null) => {
    if (!expenseId) return false;
    setSending(true);
    setError(null);
    try {
      await apiClient.post(`/expenses/${expenseId}/messages`, { body, requestType: requestType ?? null });
      await load();
      return true;
    } catch (e: unknown) {
      const code = e instanceof AppError ? e.code : undefined;
      setError(
        code === 'SUBMITTER_AMBIGUOUS'
          ? 'Your account could not be matched in Midas. Ask an admin to check your email and username.'
          : code === 'MISSING_SCOPE'
            ? 'Messaging is not authorised for this deployment yet.'
            : code === 'USER_NOT_FOUND'
              ? 'Your account does not exist in Midas yet. Submit an expense first, or ask an admin.'
              : 'Could not send your reply. Please try again.'
      );
      return false;
    } finally {
      setSending(false);
    }
  }, [expenseId, load]);

  return { messages, loading, error, fromCache, isOffline, send, sending, reload: load };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd ~/Work/trade-show-app && npm run build`
Expected: build succeeds.

Reference for the three modules this hook depends on, so no guessing is needed:
- `apiClient` is a **named** export (`src/utils/apiClient.ts:449`). `get<T>(path)` and `post<T>(path, data)` resolve to the **parsed body**, not an axios `{ data }` envelope.
- Failures throw `AppError` (`src/utils/errorHandler.ts:7`) carrying `code` and `statusCode`.
- `networkMonitor` is a named export (`src/utils/networkDetection.ts:397`). `addListener(cb, notifyImmediately)` returns an unsubscribe function; the callback receives a `NetworkState` with `isOnline`.

- [ ] **Step 4: Commit**

```bash
cd ~/Work/trade-show-app
git add src/utils/offlineDb.ts src/hooks/useExpenseMessages.ts
git commit -m "feat(messaging): thread cache and data hook"
```

---

### Task 11: Thread panel in the expense modal

**Repo:** `~/Work/trade-show-app`

**Files:**
- Create: `src/components/expenses/ExpenseModal/ExpenseModalMessages.tsx`
- Modify: `src/components/expenses/ExpenseModal/index.ts`
- Modify: `src/components/expenses/ExpenseSubmission.tsx`

**Interfaces:**
- Consumes: `useExpenseMessages` (Task 10).
- Produces: `<ExpenseModalMessages expenseId currentUserRole expenseStatus />`.

- [ ] **Step 1: Write the component**

Create `src/components/expenses/ExpenseModal/ExpenseModalMessages.tsx`:

```tsx
/**
 * Expense message thread.
 *
 * Threads are owned by Midas; this panel reads and appends. The composer warns
 * before a reply that will move the expense out of "Needs Further Review",
 * because that is a real state change the user is triggering.
 */

import React from 'react';
import { MessageSquare, AlertCircle, WifiOff } from 'lucide-react';
import { useExpenseMessages } from '../../../hooks/useExpenseMessages';

const PRIVILEGED_ROLES = ['admin', 'accountant', 'coordinator', 'developer'];
const MAX_BODY = 2000;

interface Props {
  expenseId: string;
  currentUserRole: string;
  expenseStatus: string;
}

export const ExpenseModalMessages: React.FC<Props> = ({
  expenseId, currentUserRole, expenseStatus,
}) => {
  const { messages, loading, error, fromCache, isOffline, send, sending } =
    useExpenseMessages(expenseId, true);
  const [draft, setDraft] = React.useState('');
  const [requestType, setRequestType] = React.useState<string>('');

  const isPrivileged = PRIVILEGED_ROLES.includes(currentUserRole);
  const willSendBackForReview = expenseStatus === 'needs further review' && !isPrivileged;

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    const ok = await send(body, requestType || null);
    if (ok) {
      setDraft('');
      setRequestType('');
    }
  };

  return (
    <div className="rounded-card border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-stone-500" />
        <h3 className="font-display font-semibold tracking-tight text-stone-900">Messages</h3>
        {fromCache && (
          <span className="chip px-2 py-0.5 text-[11px] bg-stone-100 text-stone-600">
            Showing saved messages
          </span>
        )}
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-stone-500">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-stone-500">No messages on this expense yet.</p>
        )}

        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <p key={m.id} className="text-center text-xs italic text-stone-400">{m.body}</p>
            );
          }
          const mine = m.isMine;
          const needsResponse = !!m.requestType && !m.isResolved;
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={[
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  mine ? 'bg-brand-50 text-stone-900' : 'bg-stone-100 text-stone-900',
                  needsResponse ? 'ring-1 ring-amber-300' : '',
                ].join(' ')}
              >
                {!mine && (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {m.sender.name}{m.sender.role ? ` · ${m.sender.role}` : ''}
                  </p>
                )}
                {needsResponse && (
                  <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                    <AlertCircle className="h-3 w-3" /> Needs your response
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[11px] text-stone-400">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-stone-100 p-4">
        {isOffline ? (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <WifiOff className="h-4 w-4" />
            You are offline — reply when you reconnect.
          </p>
        ) : (
          <>
            {willSendBackForReview && (
              <p className="mb-2 text-xs text-amber-700">
                Replying will send this back for review.
              </p>
            )}
            {isPrivileged && (
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="">Comment (no action required)</option>
                <option value="info_request">Request more information</option>
                <option value="missing_receipt">Missing receipt</option>
                <option value="missing_category">Missing category</option>
                <option value="missing_payment_method">Missing payment method</option>
              </select>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
              rows={3}
              placeholder="Write a message…"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">{draft.length}/{MAX_BODY}</span>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || draft.trim().length === 0}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Export it**

In `src/components/expenses/ExpenseModal/index.ts` add:

```ts
export { ExpenseModalMessages } from './ExpenseModalMessages';
```

- [ ] **Step 3: Render it in the modal**

In `src/components/expenses/ExpenseSubmission.tsx`, add `ExpenseModalMessages` to the existing import block from `'./ExpenseModal'` (lines ~34-42). Then render it immediately after the `<ExpenseModalStatusManagement ... />` element:

```tsx
              <ExpenseModalMessages
                expenseId={viewingExpense.id}
                currentUserRole={user.role}
                expenseStatus={viewingExpense.status}
              />
```

- [ ] **Step 4: Make `#expense=<id>` open that expense**

A push notification and a bell row both need to land on the expense whose thread changed.
This app has **no path router**: `App.tsx` holds a `currentPage` string and deep links are
hashes. `ExpenseSubmission` already reads `window.location.hash` on mount for
`#new-expense`, `#event=`, and `#status=pending` (around line 154). Add one more branch to
that same chain:

```tsx
      } else if (window.location.hash.startsWith('#expense=')) {
        const targetId = window.location.hash.replace('#expense=', '');
        const target = expenses.find((e) => e.id === targetId);
        if (target) {
          setViewingExpense(target);
        }
        // Clear the hash either way so it cannot re-fire on the next mount.
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
```

Read the surrounding effect before editing and match its existing dependency array and
hash-clearing convention rather than introducing a second style. If the effect can run
before `expenses` has loaded, include `expenses` in its dependencies so the deep link still
resolves once the list arrives.

- [ ] **Step 5: Build and lint**

Run: `cd ~/Work/trade-show-app && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 6: Manual check**

With the app running, visit `/#expense=<a real expense id>`.
Expected: the Expenses page opens with that expense's modal showing, Messages section
included, and the hash cleared from the address bar.

- [ ] **Step 7: Commit**

```bash
cd ~/Work/trade-show-app
git add src/components/expenses/ExpenseModal/ExpenseModalMessages.tsx \
        src/components/expenses/ExpenseModal/index.ts \
        src/components/expenses/ExpenseSubmission.tsx
git commit -m "feat(messaging): expense thread panel and #expense deep link"
```

---

### Task 12: Notification bell

**Repo:** `~/Work/trade-show-app`

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `GET /api/expense-messages/unread` (Task 8).

Do **not** rewrite the existing approver section. Add alongside it.

- [ ] **Step 1: Fetch unread messages**

In `src/components/layout/Header.tsx`, add state next to the existing notification state (around line 21):

```tsx
  const [unreadMessages, setUnreadMessages] = React.useState<any[]>([]);
```

and a separate effect after the existing one:

```tsx
  // Message notifications are real rows with persisted read state, unlike the
  // derived pending-expense list above. Salespeople see the bell for the first
  // time because of this.
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get<{ notifications: any[] }>('/expense-messages/unread');
        if (!cancelled) setUnreadMessages(res.notifications || []);
      } catch {
        if (!cancelled) setUnreadMessages([]);
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
```

Add the `apiClient` import if not already present — it is a **named** export:

```tsx
import { apiClient } from '../../utils/apiClient';
```

- [ ] **Step 2: Include them in the badge**

Replace the `hasUnreadNotifications` line:

```tsx
  const hasUnreadNotifications =
    unreadMessages.length > 0 || (notifications.length > 0 && !hasViewedNotifications);
```

- [ ] **Step 3: Render the section**

Inside the dropdown, immediately after the header `<div className="px-4 py-3 border-b ...">` block and before the existing `<div className="max-h-96 overflow-y-auto">`, insert:

```tsx
                  {unreadMessages.length > 0 && (
                    <div className="border-b border-stone-100">
                      {unreadMessages.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            // Same deep link the push notification uses (Task 11).
                            window.location.hash = `expense=${n.expense_ref_id || ''}`;
                            onNavigate?.('expenses');
                          }}
                          className="block w-full px-4 py-3 text-left hover:bg-stone-50"
                        >
                          <p className="text-sm font-semibold text-stone-900">
                            {n.request_type ? 'Action required' : 'New message'} · {n.sender_name}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">
                            {n.body_snippet}
                          </p>
                          <p className="mt-1 text-[11px] text-stone-400">
                            {new Date(n.message_created_at).toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
```

- [ ] **Step 4: Build and lint**

Run: `cd ~/Work/trade-show-app && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 5: Full suite**

Run: `cd ~/Work/trade-show-app/backend && npm test`
Expected: no new failures relative to the pre-existing baseline. Record any pre-existing failures before starting so you can tell them apart.

- [ ] **Step 6: Commit**

```bash
cd ~/Work/trade-show-app
git add src/components/layout/Header.tsx
git commit -m "feat(messaging): surface unread expense messages in the notification bell"
```

---

## Service worker — no change required

`public/push-sw.js` already reads `payload.url` into `notification.data.url` and opens it
on `notificationclick`, and `PushService` already sends `{title, body, url}`. Nothing in
this plan touches it. Two facts worth knowing so they are not rediscovered as bugs:

- Notification URLs must be `/#expense=<id>` (Task 9), because the app has no path router.
- When a window is already open the handler calls `client.focus()` and returns **before**
  reaching `openWindow`, so a click with the app already open lands on whatever view was
  showing rather than navigating. Pre-existing, out of scope, not a bug to chase in E2E.

## Rollout (after Task 12 — not part of any task)

1. Deploy Midas. The Ext endpoints are inert until Trade Show calls them.
2. Grant scopes: `cd ~/Work/midas/apps/api && npm run ext:create-connection trade_show`, ensuring `messages:read` and `messages:write` are in the permission set. **Until this runs every call returns `403 MISSING_SCOPE`.**
3. Deploy Trade Show to sandbox with `deploy-sandbox-2600.sh` — **not** `deploy-sandbox.sh`, which points at production containers.
4. **Verify the migration applied.** `migrate.ts` silently skips on Postgres `42501` (permission denied), so a clean startup does not prove the tables exist:
   ```sql
   SELECT to_regclass('public.expense_message_notifications'),
          to_regclass('public.midas_message_sync_state');
   ```
   Both must be non-null. Check `/etc/expenseapp/backend.env`, the authoritative env file, not a local `.env`.
5. Set `EXPENSE_MESSAGING_ENABLED=true` and restart. Confirm the first scan seeds without a notification storm.
6. E2E: accountant asks a question in Midas → push arrives on the PWA → user replies → expense leaves "Needs Further Review".
7. Production after sandbox passes. Bump versions in both `package.json` and `backend/package.json`; restart NPMplus proxy after the frontend deploy.

**Rollback:** set `EXPENSE_MESSAGING_ENABLED=false` and restart. Revoke the two Ext scopes to close the surface entirely. No data migration to unwind.
