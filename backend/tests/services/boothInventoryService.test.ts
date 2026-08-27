import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';

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

/** A stub client whose responses are queued in call order. */
function stubClient(responses: Array<{ rows: any[] }>) {
  const query = vi.fn();
  responses.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue({ rows: [] });
  return { query, release: vi.fn() };
}

describe('BoothInventoryService.moveContainer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('moves the container and only components currently inside it', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [
        { id: 'comp-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        { id: 'comp-2', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' },
      ] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(
      async (fn: any) => fn(client)
    );
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    const result = await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', toStatus: 'at_show', performedBy: 'user-1',
    });

    expect(result.movedContainers).toBe(1);
    expect(result.movedComponents).toBe(2);
    expect(result.movedBooths).toBe(0);

    const selectSql = client.query.mock.calls[1][0];
    expect(selectSql).toContain('current_container_id = $1');
    // booth_id may appear in the SELECT list (needed to attribute each
    // component's movement to its OWN booth, not the container's — see
    // BoothInventoryService review fix round 1), but the cascade must never
    // FILTER by booth_id: a borrowed crate can hold another booth's pieces.
    const whereClause = selectSql.split(/WHERE/i)[1];
    expect(whereClause).not.toContain('booth_id');
  });

  it('records one movement per affected entity', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [{ id: 'comp-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1',
    });

    // 1 container + 1 component
    expect(vi.mocked(boothMovementService.record)).toHaveBeenCalledTimes(2);
  });

  it('derives a distinct idempotency key per entity from one base key', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [{ id: 'comp-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1', idempotencyKey: 'base-1',
    });

    const keys = vi.mocked(boothMovementService.record).mock.calls
      .map((c: any[]) => c[0].idempotencyKey);
    expect(keys).toContain('base-1:container:cont-1');
    expect(keys).toContain('base-1:component:comp-1');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('records a location_change when only the location changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('location_change');
    expect(entry.fromLocationId).toBe('loc-1');
    expect(entry.toLocationId).toBe('loc-2');
  });

  it('records a status_change when only the status changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toStatus: 'in_transit', performedBy: 'user-1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('status_change');
    expect(entry.fromStatus).toBe('in_storage');
    expect(entry.toStatus).toBe('in_transit');
  });

  it('is a no-op when neither location nor status actually changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));

    const result = await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-1', toStatus: 'in_storage', performedBy: 'user-1',
    });

    expect(vi.mocked(boothMovementService.record)).not.toHaveBeenCalled();
    expect(result.movedContainers).toBe(0);
  });
});
