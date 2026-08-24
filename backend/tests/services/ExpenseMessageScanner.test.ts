import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/midas', () => ({ getMidasClient: vi.fn() }));
vi.mock('../../src/database/repositories/ExpenseMessageNotificationRepository', () => ({
  // Default: whatever gets recorded was genuinely new. Individual tests that
  // care about the id list (or about a redelivery inserting nothing) override
  // this per-case.
  recordNotifications: vi.fn().mockImplementation(
    async (rows: Array<{ midasMessageId: string }>) => rows.map((r) => r.midasMessageId)
  ),
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

  it('marks a fresh deployment seeded on an empty first run, so the next real batch notifies', async () => {
    // Scan 1: brand-new deployment, no cursor row yet, feed genuinely empty
    // (the normal state right after rollout).
    (getCursor as any).mockResolvedValueOnce(null);
    client.listMessagesSince.mockResolvedValueOnce({ messages: [], nextCursor: null });

    await scanner.scan();

    // Without this, no row is ever written and the next scan would still
    // see cursor === null (indistinguishable from "never scanned") and
    // silently skip the first real batch as backlog.
    expect(setCursor).toHaveBeenCalledWith('trade_show', '');
    expect(recordNotifications).not.toHaveBeenCalled();
    expect(pushService.sendToUser).not.toHaveBeenCalled();

    // Scan 2: a real message arrives. getCursor now returns the empty-string
    // sentinel written above — not null — so seeding must read as false.
    // Restore the default "genuinely inserted" implementation explicitly —
    // an earlier test in this file permanently overrides the module mock to
    // reject, and vi.clearAllMocks() in beforeEach resets call history, not
    // implementations.
    (recordNotifications as any).mockImplementation(
      async (rows: Array<{ midasMessageId: string }>) => rows.map((r) => r.midasMessageId)
    );
    (getCursor as any).mockResolvedValueOnce('');
    client.listMessagesSince.mockResolvedValueOnce({
      messages: [feedMessage()], nextCursor: 'cursor-1',
    });

    await scanner.scan();

    expect(recordNotifications).toHaveBeenCalledOnce();
    expect(pushService.sendToUser).toHaveBeenCalledWith('ts-user-1', expect.objectContaining({
      url: '/#expense=ts-e1',
    }));
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

  it('does not push again when the message was already recorded', async () => {
    // Regression: recordNotifications reporting 0 rows inserted (e.g. this
    // exact window was already recorded on a prior tick, but setCursor never
    // ran last time — insert succeeded, then the process died or the cursor
    // write failed) must not re-fire push for every row in the batch. Only
    // ids recordNotifications actually reports as newly inserted may push.
    (recordNotifications as any).mockResolvedValue([]);
    client.listMessagesSince.mockResolvedValue({ messages: [feedMessage()], nextCursor: 'cursor-1' });

    await scanner.scan();

    expect(recordNotifications).toHaveBeenCalledOnce();
    expect(pushService.sendToUser).not.toHaveBeenCalled();
    // The batch is still durable (recordNotifications resolved, it just
    // reported nothing new) — the watermark must still advance.
    expect(setCursor).toHaveBeenCalledWith('trade_show', 'cursor-1');
  });
});
