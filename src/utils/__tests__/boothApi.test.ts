import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothApi } from '../boothApi';
import { apiClient } from '../apiClient';

// Mock apiClient methods — this test only cares about the URL/path built by
// boothApi's internal qs() helper, not real network behaviour.
vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

describe('boothApi query-string building (qs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps is_active: false in the query string instead of dropping it', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await boothApi.listLocations({ is_active: false });

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations?is_active=false');
  });

  it('keeps is_active: true in the query string', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await boothApi.listLocations({ is_active: true });

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations?is_active=true');
  });

  it('drops undefined and empty-string filters entirely', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await boothApi.listBooths({ q: undefined, status: '', location_id: 'loc-1' });

    expect(apiClient.get).toHaveBeenCalledWith('/booths?location_id=loc-1');
  });

  it('listBooths accepts an is_active filter and keeps false rather than dropping it', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await boothApi.listBooths({ is_active: false });

    expect(apiClient.get).toHaveBeenCalledWith('/booths?is_active=false');
  });
});
