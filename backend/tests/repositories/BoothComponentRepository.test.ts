import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothComponentRepository } from '../../src/database/repositories/BoothComponentRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const pool = {
  id: 'comp-1', booth_id: 'booth-1', parent_component_id: null,
  name: 'Frame pole', category: 'frame_part', quantity: 6, asset_tag: null,
  condition: 'good', current_status: 'in_storage', current_location_id: 'loc-1',
  default_container_id: 'cont-1', current_container_id: 'cont-1',
  last_verified_at: null, last_verified_by: null,
  weight_value: '2.50', weight_unit: 'lb', weight_source: 'measured',
  weight_notes: null, weight_updated_at: null, weight_updated_by: null,
  notes: null, created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('BoothComponentRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByBooth applies category, status, container and q filters', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.findByBooth('booth-1', {
      q: 'pole', category: 'frame_part', status: 'in_storage', containerId: 'cont-1',
    });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('booth_id = $1');
    expect(sql).toContain('name ILIKE');
    expect(sql).toContain('category =');
    expect(sql).toContain('current_status =');
    expect(sql).toContain('current_container_id =');
    expect(params).toEqual(['booth-1', '%pole%', 'frame_part', 'in_storage', 'cont-1']);
  });

  it('orders parents before their children so the UI can indent one level', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.findByBooth('booth-1', {});
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('ORDER BY');
    expect(sql).toContain('parent_component_id');
  });

  it('coerces numeric weight to a number and leaves null alone', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    const [c] = await boothComponentRepository.findByBooth('booth-1', {});
    expect(c.weight_value).toBe(2.5);

    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...pool, weight_value: null }], rowCount: 1,
    } as any);
    const [d] = await boothComponentRepository.findByBooth('booth-1', {});
    expect(d.weight_value).toBeNull();
  });

  it('stamps weight provenance only when a weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.update('comp-1', { weight_value: 3 }, 'user-9');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).toContain('weight_updated_by =');

    vi.clearAllMocks();
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.update('comp-1', { name: 'Pole' }, 'user-9');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).not.toContain('weight_updated_by');
  });

  it('findByIdOrThrow throws NotFoundError when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothComponentRepository.findByIdOrThrow('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('findByIdOrThrow error message identifies resource and id', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothComponentRepository.findByIdOrThrow('nope'))
      .rejects.toThrow("Component with identifier 'nope' not found");
  });

  it('remove throws NotFoundError with correct message when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothComponentRepository.remove('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
    await expect(boothComponentRepository.remove('nope'))
      .rejects.toThrow("Component with identifier 'nope' not found");
  });
});
