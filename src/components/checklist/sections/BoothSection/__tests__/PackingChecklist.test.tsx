import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingChecklist } from '../PackingChecklist';
import { boothApi } from '../../../../../utils/boothApi';
import { offlineDb } from '../../../../../utils/offlineDb';
import { syncManager } from '../../../../../utils/syncManager';

vi.mock('../../../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../utils/boothApi')>();
  return { ...actual, boothApi: { getPacking: vi.fn(), pack: vi.fn(), unpack: vi.fn() } };
});

// The offline read fallback and the online-failure queue path both go
// through offlineDb/syncManager — mocked so tests can assert on them
// directly rather than depending on a real IndexedDB in the test environment.
vi.mock('../../../../../utils/offlineDb', () => ({
  offlineDb: { getCachedBoothInventory: vi.fn(), setCachedBoothInventory: vi.fn() },
}));
vi.mock('../../../../../utils/syncManager', () => ({
  syncManager: {
    queueAction: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ pendingCount: 0 }),
    addEventListener: vi.fn(() => () => {}),
  },
}));

const checklist = {
  container_id: 'k1', container_name: 'Crate A',
  expected_count: 3, packed_count: 1, stray_count: 1, complete: false,
  items: [
    { component_id: 'c1', name: 'Frame pole', asset_tag: null, quantity: 6,
      category: 'frame_part', condition: 'good', current_status: 'in_storage',
      expected: true, packed: true, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c2', name: 'Fabric', asset_tag: 'FAB-01', quantity: 1,
      category: 'fabric', condition: 'good', current_status: 'at_show',
      expected: true, packed: false, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c3', name: 'LED bar', asset_tag: null, quantity: 2,
      category: 'light', condition: 'good', current_status: 'at_show',
      expected: true, packed: false, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c9', name: 'Spare monitor', asset_tag: 'MON-02', quantity: 1,
      category: 'other', condition: 'good', current_status: 'at_show',
      expected: false, packed: false, stray: true,
      expected_container_id: 'k2', expected_container_name: 'Crate B' },
  ],
};

describe('PackingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.getPacking).mockResolvedValue(checklist as any);
    vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(null);
    vi.mocked(offlineDb.setCachedBoothInventory).mockResolvedValue(undefined);
    vi.mocked(syncManager.getStatus).mockResolvedValue({ pendingCount: 0 } as any);
    vi.mocked(syncManager.addEventListener).mockReturnValue(() => {});
    vi.mocked(syncManager.queueAction).mockResolvedValue('q1');
  });

  it('shows packed progress out of the expected count', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText('1/3 packed')).toBeInTheDocument();
  });

  it('checks the box for an item already packed', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByRole('checkbox', { name: /frame pole/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /fabric/i })).not.toBeChecked();
  });

  it('warns about a stray piece that belongs in another crate', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText(/belongs in crate b/i)).toBeInTheDocument();
  });

  it('packs an item when its box is ticked', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.pack)).toHaveBeenCalledWith('k1',
        expect.objectContaining({ component_ids: ['c2'], event_id: 'e1' }));
    });
  });

  it('sends an idempotency key with every pack call', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

    await waitFor(() => {
      const arg = vi.mocked(boothApi.pack).mock.calls[0][1] as any;
      expect(arg.idempotency_key).toEqual(expect.any(String));
      expect(arg.idempotency_key.length).toBeGreaterThan(0);
    });
  });

  it('unpacks an item when its box is unticked', async () => {
    vi.mocked(boothApi.unpack).mockResolvedValue({ unpacked: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /frame pole/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.unpack)).toHaveBeenCalledWith('k1',
        expect.objectContaining({ component_ids: ['c1'] }));
    });
  });

  it('celebrates a complete crate', async () => {
    vi.mocked(boothApi.getPacking).mockResolvedValue({
      ...checklist, packed_count: 3, stray_count: 0, complete: true,
      items: checklist.items.filter((i) => i.expected).map((i) => ({ ...i, packed: true })),
    } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText(/crate is fully packed/i)).toBeInTheDocument();
  });

  describe('offline read fallback', () => {
    it('caches a successful load under a key scoped to this container', async () => {
      render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
      await screen.findByText('1/3 packed');

      await waitFor(() => {
        expect(offlineDb.setCachedBoothInventory).toHaveBeenCalledWith('packing:k1', checklist);
      });
    });

    it('falls back to cached data, clearly marked as cached, when the live fetch fails', async () => {
      vi.mocked(boothApi.getPacking).mockRejectedValue(new Error('offline'));
      vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(checklist);

      render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

      // Renders the cached checklist rather than getting stuck on "Loading…"
      // or falling through to the plain error.
      expect(await screen.findByText('1/3 packed')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/cached.*captured earlier/i);
    });

    it('shows the error (never an infinite spinner) when the fetch fails and there is no cache', async () => {
      vi.mocked(boothApi.getPacking).mockRejectedValue(new Error('offline'));
      vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(null);

      render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load the packing list/i);
      expect(screen.queryByText(/loading packing list/i)).not.toBeInTheDocument();
    });
  });

  describe('online-failure queueing (never a false "queued" promise)', () => {
    it('actually queues the pack when the online pack call fails, rather than just claiming it will sync', async () => {
      vi.mocked(boothApi.pack).mockRejectedValue(new Error('server exploded'));
      render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

      await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

      await waitFor(() => {
        expect(syncManager.queueAction).toHaveBeenCalledWith('CREATE', 'booth_movement',
          expect.objectContaining({ op: 'pack', containerId: 'k1', componentIds: ['c2'], eventId: 'e1' }));
      });
      expect(await screen.findByText(/queued and will sync/i)).toBeInTheDocument();
    });

    it('shows an honest error, not a false "queued" claim, when queueing itself fails', async () => {
      vi.mocked(boothApi.pack).mockRejectedValue(new Error('server exploded'));
      vi.mocked(syncManager.queueAction).mockRejectedValue(new Error('Dexie unavailable'));
      render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

      await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

      expect(await screen.findByText(/was not saved/i)).toBeInTheDocument();
      expect(screen.queryByText(/queued and will sync/i)).not.toBeInTheDocument();
    });
  });
});
