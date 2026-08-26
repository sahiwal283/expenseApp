import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothManifestService } from '../../src/services/booth/BoothManifestService';
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
    boothMovementService: { ...actual.boothMovementService, withTransaction: vi.fn() },
  };
});

const assignment = {
  id: 'asg-1', event_id: 'ev-1', booth_id: 'booth-1', booth_name: '20x20 Haute',
  status: 'planned', needed_by_date: '2026-03-04',
  setup_notes: null, teardown_notes: null,
};

describe('BoothManifestService.getForEvent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sums packed weight of included containers only', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '142.00', weight_unit: 'lb', component_count: 12 },
        { id: 'm2', container_id: 'c2', container_name: 'Crate B', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '88.00', weight_unit: 'lb', component_count: 5 },
        { id: 'm3', container_id: 'c3', container_name: 'Crate C', container_type: 'crate',
          asset_tag: null, included: false, is_extra: false,
          packed_weight_value: '200.00', weight_unit: 'lb', component_count: 4 },
      ], rowCount: 3 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBe(230);
    expect(result.included_container_count).toBe(2);
    expect(result.weighed_container_count).toBe(2);
  });

  it('reports a partial weight count when some included containers are unweighed', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '142.00', weight_unit: 'lb', component_count: 12 },
        { id: 'm2', container_id: 'c2', container_name: 'Crate B', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: null, weight_unit: 'lb', component_count: 5 },
      ], rowCount: 2 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBe(142);
    expect(result.included_container_count).toBe(2);
    expect(result.weighed_container_count).toBe(1);
  });

  it('returns a null weight total when nothing included is weighed', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: null, weight_unit: 'lb', component_count: 12 },
      ], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBeNull();
  });

  it('surfaces drift — booth containers absent from the manifest', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [
        { container_id: 'c9', container_name: 'Crate D' },
      ], rowCount: 1 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.drift).toEqual([{ container_id: 'c9', container_name: 'Crate D' }]);
  });
});

describe('BoothManifestService.assignBooth', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('materialises one manifest row per container the booth owns', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'asg-1' }] })   // insert assignment
        .mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] })  // booth containers
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await boothManifestService.assignBooth('ev-1', 'booth-1', {}, 'user-1');

    const insertCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('event_booth_manifest_containers')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![0]).toContain('INSERT INTO event_booth_manifest_containers');
    expect(insertCall![1]).toEqual(['asg-1', ['c1', 'c2']]);
  });
});

describe('BoothManifestService.syncDrift', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('adds missing rows and never removes existing ones', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [{ id: 'x' }, { id: 'y' }], rowCount: 2 } as any);

    const result = await boothManifestService.syncDrift('asg-1');

    expect(result.added).toBe(2);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO event_booth_manifest_containers');
    expect(sql).toContain('ON CONFLICT');
    expect(sql).not.toContain('DELETE');
  });
});
