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
