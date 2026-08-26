import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

vi.mock('../../src/services/booth/BoothMovementService', async () => {
  const actual = await vi.importActual<any>('../../src/services/booth/BoothMovementService');
  return {
    ...actual,
    boothMovementService: {
      derivedKey: actual.boothMovementService.derivedKey.bind(actual.boothMovementService),
      record: vi.fn(),
      recordMany: vi.fn(),
      withTransaction: vi.fn(),
    },
  };
});

function clientWith(component: Record<string, unknown>) {
  const query = vi.fn()
    .mockResolvedValueOnce({ rows: [component] })
    .mockResolvedValue({ rows: [] });
  return { query, release: vi.fn() };
}

const base = {
  id: 'comp-1', booth_id: 'booth-1', condition: 'good',
  current_status: 'at_show', current_location_id: 'loc-2',
};

describe('damage / missing / verification reports', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('missing sets status missing and leaves condition alone', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', { kind: 'missing', performedBy: 'u1' });

    const [sql, params] = client.query.mock.calls[1];
    expect(sql).toContain('current_status');
    expect(params).toContain('missing');
    expect(params).not.toContain('damaged');

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('missing_report');
  });

  it('damage sets condition damaged and status damaged', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', {
      kind: 'damage', notes: 'torn corner', performedBy: 'u1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('damage_report');
    expect(entry.fromCondition).toBe('good');
    expect(entry.toCondition).toBe('damaged');
    expect(entry.toStatus).toBe('damaged');
    expect(entry.notes).toBe('torn corner');
  });

  it('damage on an already-missing component does not un-miss it', async () => {
    const client = clientWith({ ...base, current_status: 'missing' });
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', { kind: 'damage', performedBy: 'u1' });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toStatus).toBe('missing');
    expect(entry.toCondition).toBe('damaged');
  });

  it('damage honours an explicit condition such as fair', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', {
      kind: 'damage', condition: 'fair', performedBy: 'u1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toCondition).toBe('fair');
  });

  it('verify stamps last_verified_at/by and logs a verification', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-2' } as any);

    await boothInventoryService.verifyComponent('comp-1', { performedBy: 'u1' });

    const [sql, params] = client.query.mock.calls[1];
    expect(sql).toContain('last_verified_at = CURRENT_TIMESTAMP');
    expect(sql).toContain('last_verified_by');
    expect(params).toContain('u1');

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('verification');
  });

  it('listExceptions returns damaged and missing pieces for an event', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ component_id: 'comp-1', component_name: 'Fabric', condition: 'damaged' }],
      rowCount: 1,
    } as any);

    const rows = await boothInventoryService.listExceptions('event-1');
    expect(rows).toHaveLength(1);
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('damage_report');
    expect(sql).toContain('missing_report');
    expect(params).toEqual(['event-1']);
  });
});
