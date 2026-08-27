import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryLocationRepository } from '../../src/database/repositories/InventoryLocationRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'loc-1', name: 'Main Warehouse', type: 'company_warehouse',
  address: null, city: 'Tampa', state: 'FL', country: 'US',
  contact_name: null, contact_phone: null, contact_email: null,
  notes: null, is_active: true,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('InventoryLocationRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('search with no filters returns active-ordered list', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.search({});
    expect(result).toEqual([row]);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('FROM inventory_locations');
    expect(sql).toContain('ORDER BY name');
  });

  it('search filters by q, type and isActive with parameterised SQL', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await inventoryLocationRepository.search({ q: 'ware', type: 'storage_unit', isActive: true });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('name ILIKE');
    expect(sql).toContain('type = ');
    expect(sql).toContain('is_active = ');
    expect(params).toEqual(['%ware%', 'storage_unit', true]);
  });

  it('create inserts and returns the row', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.create({ name: 'Main Warehouse', type: 'company_warehouse' });
    expect(result).toEqual(row);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO inventory_locations');
    expect(sql).toContain('RETURNING *');
  });

  it('update throws NotFoundError when the row is missing', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(inventoryLocationRepository.update('missing', { name: 'x' }))
      .rejects.toBeInstanceOf(NotFoundError);
    await expect(inventoryLocationRepository.update('missing', { name: 'x' }))
      .rejects.toThrow(/Location with identifier 'missing' not found/);
  });

  it('update with no fields is a no-op read', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.update('loc-1', {});
    expect(result).toEqual(row);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('SELECT');
    expect(sql).not.toContain('UPDATE');
  });

  it('softDelete sets is_active false rather than deleting', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await inventoryLocationRepository.softDelete('loc-1');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('UPDATE inventory_locations');
    expect(sql).toContain('is_active = false');
    expect(sql).not.toContain('DELETE');
    expect(params).toEqual(['loc-1']);
  });
});
