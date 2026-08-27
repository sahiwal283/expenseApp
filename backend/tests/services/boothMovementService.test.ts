import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery, pool } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

const movement = {
  id: 'mv-1', component_id: 'comp-1', container_id: null, booth_id: 'booth-1',
  event_type: 'location_change', from_location_id: 'loc-1', to_location_id: 'loc-2',
  from_container_id: null, to_container_id: null,
  from_status: null, to_status: null, from_condition: null, to_condition: null,
  event_id: null, performed_by: 'user-1', notes: null,
  idempotency_key: 'key-1', created_at: '2026-08-26T00:00:00Z',
};

describe('BoothMovementService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts a movement and returns it', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [movement], rowCount: 1 } as any);
    const result = await boothMovementService.record({
      componentId: 'comp-1', boothId: 'booth-1', eventType: 'location_change',
      fromLocationId: 'loc-1', toLocationId: 'loc-2', performedBy: 'user-1',
    });
    expect(result.id).toBe('mv-1');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO booth_movements');
    expect(sql).toContain('ON CONFLICT');
  });

  it('returns the existing row instead of duplicating on idempotency conflict', async () => {
    // Insert returns no row because ON CONFLICT DO NOTHING fired...
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      // ...so the service looks the original up by key.
      .mockResolvedValueOnce({ rows: [movement], rowCount: 1 } as any);

    const result = await boothMovementService.record({
      componentId: 'comp-1', eventType: 'location_change',
      performedBy: 'user-1', idempotencyKey: 'key-1',
    });

    expect(result.id).toBe('mv-1');
    expect(vi.mocked(dbQuery)).toHaveBeenCalledTimes(2);
    const [lookupSql, lookupParams] = vi.mocked(dbQuery).mock.calls[1];
    expect(lookupSql).toContain('WHERE idempotency_key = $1');
    expect(lookupParams).toEqual(['key-1']);
  });

  it('derives per-entity keys so a replayed bulk move is idempotent row by row', () => {
    expect(boothMovementService.derivedKey('abc', 'component', 'comp-1'))
      .toBe('abc:component:comp-1');
    expect(boothMovementService.derivedKey('abc', 'container', 'cont-1'))
      .toBe('abc:container:cont-1');
  });

  it('derivedKey returns null when no base key was supplied', () => {
    expect(boothMovementService.derivedKey(null, 'component', 'comp-1')).toBeNull();
    expect(boothMovementService.derivedKey(undefined, 'component', 'comp-1')).toBeNull();
  });

  it('rejects an entry that targets neither a component nor a container', async () => {
    await expect(
      boothMovementService.record({ eventType: 'status_change', performedBy: 'user-1' })
    ).rejects.toThrow(/component or a container/i);
  });

  it('withTransaction commits and releases the client', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: vi.fn() };
    vi.mocked(pool.connect).mockResolvedValue(client as any);

    const result = await boothMovementService.withTransaction(async () => 'done');

    expect(result).toBe('done');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('withTransaction rolls back and still releases on failure', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: vi.fn() };
    vi.mocked(pool.connect).mockResolvedValue(client as any);

    await expect(
      boothMovementService.withTransaction(async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
