import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncManager } from '../syncManager';
import { offlineDb } from '../offlineDb';
import { boothApi } from '../boothApi';

vi.mock('../offlineDb', () => ({
  offlineDb: {
    addToQueue: vi.fn(),
    updateQueueItem: vi.fn(),
    markQueueItemSynced: vi.fn(),
    markQueueItemFailed: vi.fn(),
    getPendingBoothPhoto: vi.fn(),
    deletePendingBoothPhoto: vi.fn(),
    putPendingBoothPhoto: vi.fn(),
  },
}));

vi.mock('../boothApi', () => ({
  boothApi: {
    pack: vi.fn(), unpack: vi.fn(), moveComponent: vi.fn(),
    reportComponent: vi.fn(), uploadAttachment: vi.fn(),
  },
}));

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1', action: 'CREATE', entity: 'booth_movement',
    timestamp: Date.now(), retryCount: 0, status: 'pending',
    deviceId: 'd1', userId: 'u1', idempotencyKey: 'idem-1',
    data: { op: 'pack', containerId: 'k1', componentIds: ['c1'], eventId: 'e1' },
    ...overrides,
  } as any;
}

describe('syncManager — booth movements', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('replays a queued pack through boothApi with its idempotency key', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    await syncManager.syncItem(item());
    expect(vi.mocked(boothApi.pack)).toHaveBeenCalledWith('k1', {
      component_ids: ['c1'], event_id: 'e1', idempotency_key: 'idem-1',
    });
  });

  it('replays a queued unpack', async () => {
    vi.mocked(boothApi.unpack).mockResolvedValue({ unpacked: 1 } as any);
    await syncManager.syncItem(item({ data: {
      op: 'unpack', containerId: 'k1', componentIds: ['c2'], eventId: 'e1',
    } }));
    expect(vi.mocked(boothApi.unpack)).toHaveBeenCalledWith('k1', expect.objectContaining({
      component_ids: ['c2'], idempotency_key: 'idem-1',
    }));
  });

  it('replays a queued damage report', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue({ id: 'mv-1' } as any);
    await syncManager.syncItem(item({ data: {
      op: 'report', componentId: 'c3', kind: 'damage', notes: 'torn', eventId: 'e1',
    } }));
    expect(vi.mocked(boothApi.reportComponent)).toHaveBeenCalledWith('c3', expect.objectContaining({
      kind: 'damage', notes: 'torn', idempotency_key: 'idem-1',
    }));
  });

  it('marks a replayed duplicate as synced rather than failed', async () => {
    // The server returns 200 with the original movement on an idempotency hit.
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 0 } as any);
    await syncManager.syncItem(item());
    expect(vi.mocked(offlineDb.markQueueItemSynced)).toHaveBeenCalledWith('q1', undefined);
    expect(vi.mocked(offlineDb.markQueueItemFailed)).not.toHaveBeenCalled();
  });

  it('uploads a queued photo blob and clears it from the store', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue({
      id: 'p1', entityType: 'component', entityId: 'c1', blob, createdAt: 1,
    } as any);
    vi.mocked(boothApi.uploadAttachment).mockResolvedValue({ id: 'att-1' } as any);

    await syncManager.syncItem(item({
      id: 'q2', entity: 'booth_photo', data: { photoId: 'p1' },
    }));

    expect(vi.mocked(boothApi.uploadAttachment)).toHaveBeenCalledWith(
      'component', 'c1', blob, undefined
    );
    expect(vi.mocked(offlineDb.deletePendingBoothPhoto)).toHaveBeenCalledWith('p1');
  });

  it('throws (so it retries) when a photo still points at an unsynced movement', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue({
      id: 'p1', entityType: 'movement', entityId: 'pending_movement:idem-9',
      blob, createdAt: 1,
    } as any);

    await syncManager.syncItem(item({
      id: 'q3', entity: 'booth_photo', data: { photoId: 'p1' },
    }));

    // Retried, not dropped: the blob must survive for the next pass.
    expect(vi.mocked(offlineDb.deletePendingBoothPhoto)).not.toHaveBeenCalled();
    expect(vi.mocked(boothApi.uploadAttachment)).not.toHaveBeenCalled();
  });

  it('drops a photo whose blob has vanished instead of retrying forever', async () => {
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue(null as any);
    await syncManager.syncItem(item({
      id: 'q4', entity: 'booth_photo', data: { photoId: 'gone' },
    }));
    expect(vi.mocked(offlineDb.markQueueItemSynced)).toHaveBeenCalledWith('q4', undefined);
  });
});
