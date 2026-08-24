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
    expect(inserted).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('reports the ids actually inserted', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [{ midas_message_id: 'm1' }] });
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

    expect(inserted).toEqual(['m1']);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('ON CONFLICT (midas_message_id) DO NOTHING');
    expect(sql).toContain('RETURNING midas_message_id');
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

    expect(inserted).toEqual([]);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('ON CONFLICT (midas_message_id) DO NOTHING');
    expect(sql).toContain('RETURNING midas_message_id');
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
