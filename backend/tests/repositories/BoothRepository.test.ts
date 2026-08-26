import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothRepository } from '../../src/database/repositories/BoothRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'booth-1', name: '20x20 Haute Main', brand: 'Haute Brands',
  size: '20x20', type: 'island', manufacturer: null, year_acquired: 2024,
  description: null, notes: null, current_location_id: 'loc-1',
  current_status: 'in_storage', is_active: true,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
  container_count: 3, component_count: 42, location_name: 'Main Warehouse',
};

describe('BoothRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('search joins location name and aggregates counts', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothRepository.search({});
    expect(result[0].container_count).toBe(3);
    expect(result[0].component_count).toBe(42);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('LEFT JOIN inventory_locations');
    expect(sql).toContain('booth_containers');
    expect(sql).toContain('booth_components');
  });

  it('search filters by q, status, locationId and isActive', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await boothRepository.search({ q: 'haute', status: 'at_show', locationId: 'loc-1', isActive: true });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('b.name ILIKE');
    expect(sql).toContain('b.current_status =');
    expect(sql).toContain('b.current_location_id =');
    expect(sql).toContain('b.is_active =');
    expect(params).toEqual(['%haute%', 'at_show', 'loc-1', true]);
  });

  it('counts are numbers, not pg count strings', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...row, container_count: '3', component_count: '42' }], rowCount: 1,
    } as any);
    const result = await boothRepository.search({});
    expect(result[0].container_count).toBe(3);
    expect(typeof result[0].component_count).toBe('number');
  });

  it('findByIdWithCounts returns null when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    expect(await boothRepository.findByIdWithCounts('nope')).toBeNull();
  });

  it('create inserts and returns the row', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothRepository.create({ name: '20x20 Haute Main' });
    expect(result.name).toBe('20x20 Haute Main');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).toContain('INSERT INTO booths');
  });

  it('update throws NotFoundError when missing', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothRepository.update('missing', { name: 'x' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('softDelete sets is_active false', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothRepository.softDelete('booth-1');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('is_active = false');
    expect(sql).not.toContain('DELETE');
  });

  it('softDelete throws NotFoundError when missing', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothRepository.softDelete('missing'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
