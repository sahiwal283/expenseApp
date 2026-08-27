import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManifestView } from '../ManifestView';
import { boothApi } from '../../../../../utils/boothApi';
import { offlineDb } from '../../../../../utils/offlineDb';

vi.mock('../../../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: {
      getManifest: vi.fn(), listBooths: vi.fn(), assignBooth: vi.fn(),
      setContainerIncluded: vi.fn(), syncManifestDrift: vi.fn(),
    },
  };
});

// The offline read fallback goes through offlineDb — mocked so tests can
// assert on it directly rather than depending on a real IndexedDB in the
// test environment.
vi.mock('../../../../../utils/offlineDb', () => ({
  offlineDb: { getCachedBoothInventory: vi.fn(), setCachedBoothInventory: vi.fn() },
}));

const manifest = [{
  id: 'asg-1', event_id: 'e1', booth_id: 'b1', booth_name: '20x20 Haute Main',
  status: 'preparing', needed_by_date: '2026-03-04', setup_notes: null, teardown_notes: null,
  containers: [
    { id: 'm1', container_id: 'k1', container_name: 'Crate A', container_type: 'crate',
      asset_tag: null, included: true, is_extra: false,
      packed_weight_value: 142, weight_unit: 'lb', component_count: 12 },
    { id: 'm2', container_id: 'k2', container_name: 'Crate C', container_type: 'crate',
      asset_tag: null, included: false, is_extra: false,
      packed_weight_value: null, weight_unit: 'lb', component_count: 4 },
  ],
  drift: [],
  weight_total: 142, weight_unit: 'lb',
  weighed_container_count: 1, included_container_count: 1,
}];

describe('ManifestView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listBooths).mockResolvedValue([] as any);
    vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(null);
    vi.mocked(offlineDb.setCachedBoothInventory).mockResolvedValue(undefined);
  });

  it('lists the assigned booth and its containers', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText('20x20 Haute Main')).toBeInTheDocument();
    expect(screen.getByText('Crate A')).toBeInTheDocument();
  });

  it('shows the manifest weight total', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/142 lb/)).toBeInTheDocument();
  });

  it('caveats a partial weight total rather than presenting it as complete', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], weight_total: 142, weighed_container_count: 1, included_container_count: 3,
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/1 of 3 containers weighed/i)).toBeInTheDocument();
  });

  it('says so when nothing included has been weighed', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], weight_total: null, weighed_container_count: 0, included_container_count: 2,
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/no weights recorded/i)).toBeInTheDocument();
  });

  it('flags mixed units rather than presenting a null total as "nothing weighed"', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], weight_units_mixed: true, weight_total: null,
      weighed_container_count: 2, included_container_count: 2,
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/mixed units/i)).toBeInTheDocument();
    // Pins the branch order: a reordering that checks weight_total === null
    // first would silently mislabel mixed units as "nothing weighed".
    expect(screen.queryByText(/no weights recorded/i)).not.toBeInTheDocument();
  });

  it('offers to add drifted containers instead of adding them silently', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], drift: [{ container_id: 'k9', container_name: 'Crate D' }],
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/1 container on this booth isn't on this manifest/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add (it|them)/i })).toBeInTheDocument();
  });

  it('toggles a container in or out of the manifest', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    vi.mocked(boothApi.setContainerIncluded).mockResolvedValue({} as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /crate c/i }));

    expect(vi.mocked(boothApi.setContainerIncluded)).toHaveBeenCalledWith('asg-1', 'k2', true);
  });

  it('hides manifest editing from a user who cannot manage', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage={false} onOpenPacking={vi.fn()} />);
    await screen.findByText('20x20 Haute Main');
    expect(screen.queryByRole('button', { name: /assign a booth/i })).not.toBeInTheDocument();
  });

  describe('offline read fallback', () => {
    it('caches a successful load under a key scoped to this event', async () => {
      vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
      render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
      await screen.findByText('20x20 Haute Main');

      expect(offlineDb.setCachedBoothInventory).toHaveBeenCalledWith('manifest:e1', manifest);
    });

    it('falls back to cached data — with the Pack entry point still reachable — when the live fetch fails', async () => {
      vi.mocked(boothApi.getManifest).mockRejectedValue(new Error('offline'));
      vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(manifest);

      render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);

      // This is the exact bug being fixed: offline, with no cache fallback,
      // no container ever rendered and the Pack button was unreachable.
      expect(await screen.findByText('20x20 Haute Main')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /pack/i }).length).toBeGreaterThan(0);
      expect(screen.getByRole('status')).toHaveTextContent(/cached.*captured earlier/i);
    });

    it('shows the plain error when the fetch fails and there is no cache', async () => {
      vi.mocked(boothApi.getManifest).mockRejectedValue(new Error('offline'));
      vi.mocked(offlineDb.getCachedBoothInventory).mockResolvedValue(null);

      render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);

      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load the booth manifest/i);
    });
  });
});
