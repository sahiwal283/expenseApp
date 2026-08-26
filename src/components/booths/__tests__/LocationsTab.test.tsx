import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationsTab } from '../LocationsTab';
import { boothApi } from '../../../utils/boothApi';

// Partial mock: only boothApi's network calls are replaced. humanise() and the
// other named exports must stay real — LocationsTab imports humanise directly
// from this module, and a full-object mock would leave it undefined.
vi.mock('../../../utils/boothApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/boothApi')>();
  return {
    ...actual,
    boothApi: {
      listLocations: vi.fn(),
      createLocation: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
    },
  };
});

const locations = [
  { id: 'l1', name: 'Main Warehouse', type: 'company_warehouse', city: 'Tampa',
    state: 'FL', is_active: true },
  { id: 'l2', name: 'Vegas Convention Center', type: 'convention_center',
    city: 'Las Vegas', state: 'NV', is_active: true },
];

describe('LocationsTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists locations returned by the API', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Vegas Convention Center')).toBeInTheDocument();
  });

  it('renders the human-readable location type, not the raw enum', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText('Company warehouse')).toBeInTheDocument();
    expect(screen.queryByText('company_warehouse')).not.toBeInTheDocument();
  });

  it('filters as the user types', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    await screen.findByText('Main Warehouse');

    await userEvent.type(screen.getByPlaceholderText(/search locations/i), 'vegas');

    await waitFor(() => {
      expect(vi.mocked(boothApi.listLocations)).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'vegas' })
      );
    });
  });

  it('hides the add button for a user who cannot manage the catalog', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage={false} />);
    await screen.findByText('Main Warehouse');
    expect(screen.queryByRole('button', { name: /add location/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no locations', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue([] as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText(/no locations yet/i)).toBeInTheDocument();
  });

  it('surfaces a load failure instead of rendering an empty list silently', async () => {
    vi.mocked(boothApi.listLocations).mockRejectedValue(new Error('network down'));
    render(<LocationsTab canManage />);
    expect(await screen.findByText(/couldn't load locations/i)).toBeInTheDocument();
  });
});
