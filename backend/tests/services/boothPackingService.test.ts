import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothPackingService } from '../../src/services/booth/BoothPackingService';
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
      withTransaction: vi.fn(),
    },
  };
});

const container = { id: 'cont-1', name: 'Crate A', booth_id: 'booth-1' };

function rowsFor(items: any[]) {
  vi.mocked(dbQuery)
    .mockResolvedValueOnce({ rows: [container], rowCount: 1 } as any)
    .mockResolvedValueOnce({ rows: items, rowCount: items.length } as any);
}

describe('BoothPackingService.getChecklist', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('marks an expected component in the container as packed', async () => {
    rowsFor([{
      component_id: 'c1', name: 'Frame pole', asset_tag: null, quantity: 6,
      category: 'frame_part', condition: 'good', current_status: 'in_storage',
      default_container_id: 'cont-1', current_container_id: 'cont-1',
      expected_container_name: 'Crate A',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].expected).toBe(true);
    expect(result.items[0].packed).toBe(true);
    expect(result.items[0].stray).toBe(false);
    expect(result.packed_count).toBe(1);
    expect(result.expected_count).toBe(1);
    expect(result.complete).toBe(true);
  });

  it('marks an expected component that is elsewhere as not packed', async () => {
    rowsFor([{
      component_id: 'c1', name: 'Fabric', asset_tag: 'FAB-01', quantity: 1,
      category: 'fabric', condition: 'good', current_status: 'at_show',
      default_container_id: 'cont-1', current_container_id: null,
      expected_container_name: 'Crate A',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].expected).toBe(true);
    expect(result.items[0].packed).toBe(false);
    expect(result.packed_count).toBe(0);
    expect(result.complete).toBe(false);
  });

  it('flags a component that is here but belongs in another crate as a stray', async () => {
    rowsFor([{
      component_id: 'c9', name: 'Spare light', asset_tag: null, quantity: 2,
      category: 'light', condition: 'good', current_status: 'in_storage',
      default_container_id: 'cont-2', current_container_id: 'cont-1',
      expected_container_name: 'Crate B',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].stray).toBe(true);
    expect(result.items[0].expected).toBe(false);
    expect(result.stray_count).toBe(1);
    expect(result.expected_count).toBe(0);
  });

  it('is not complete when everything expected is packed but a stray is present', async () => {
    rowsFor([
      { component_id: 'c1', name: 'Pole', asset_tag: null, quantity: 6, category: 'frame_part',
        condition: 'good', current_status: 'in_storage',
        default_container_id: 'cont-1', current_container_id: 'cont-1', expected_container_name: 'Crate A' },
      { component_id: 'c9', name: 'Spare light', asset_tag: null, quantity: 2, category: 'light',
        condition: 'good', current_status: 'in_storage',
        default_container_id: 'cont-2', current_container_id: 'cont-1', expected_container_name: 'Crate B' },
    ]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.packed_count).toBe(1);
    expect(result.expected_count).toBe(1);
    expect(result.stray_count).toBe(1);
    expect(result.complete).toBe(false);
  });
});

describe('BoothPackingService.pack / unpack', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pack sets current_container_id and logs container_change per component', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    const result = await boothPackingService.pack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.packed).toBe(1);
    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('container_change');
    expect(entry.toContainerId).toBe('cont-1');
    expect(entry.fromContainerId).toBeNull();
  });

  it('pack skips a component already in the container', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: 'cont-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));

    const result = await boothPackingService.pack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.packed).toBe(0);
    expect(vi.mocked(boothMovementService.record)).not.toHaveBeenCalled();
  });

  it('unpack nulls the container and logs the change', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: 'cont-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-2' } as any);

    const result = await boothPackingService.unpack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.unpacked).toBe(1);
    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toContainerId).toBeNull();
    expect(entry.fromContainerId).toBe('cont-1');
  });

  it('derives one idempotency key per component so replay is safe', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
          { id: 'c2', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothPackingService.pack('cont-1', ['c1', 'c2'], {
      performedBy: 'u1', idempotencyKey: 'pack-1',
    });

    const keys = vi.mocked(boothMovementService.record).mock.calls.map((c: any[]) => c[0].idempotencyKey);
    expect(keys).toEqual(['pack-1:pack:c1', 'pack-1:pack:c2']);
  });
});
