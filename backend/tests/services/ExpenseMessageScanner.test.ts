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
