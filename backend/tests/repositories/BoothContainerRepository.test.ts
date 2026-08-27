import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothContainerRepository } from '../../src/database/repositories/BoothContainerRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'cont-1', booth_id: 'booth-1', name: 'Crate A', label: 'CR-A',
  description: null, type: 'crate', asset_tag: null,
  dimensions: '48x40x40', weight_capacity: '500 lb',
  current_location_id: 'loc-1', current_status: 'in_storage',
  empty_weight_value: '35.00', packed_weight_value: '142.00',
  weight_unit: 'lb', weight_source: 'measured', weight_notes: null,
  weight_updated_at: null, weight_updated_by: null, notes: null,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('BoothContainerRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByBooth filters by booth and orders by name', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothContainerRepository.findByBooth('booth-1');
    expect(result).toHaveLength(1);
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('WHERE booth_id = $1');
    expect(sql).toContain('ORDER BY name');
    expect(params).toEqual(['booth-1']);
  });

  it('findByIdOrThrow throws NotFoundError when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothContainerRepository.findByIdOrThrow('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('findByIdOrThrow error message identifies resource and id, not a doubled "not found"', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothContainerRepository.findByIdOrThrow('nope'))
      .rejects.toThrow("Container with identifier 'nope' not found");
  });

  it('stamps weight_updated_at/by when a weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothContainerRepository.update('cont-1', { packed_weight_value: 150 }, 'user-9');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('weight_updated_at = CURRENT_TIMESTAMP');
    expect(sql).toContain('weight_updated_by =');
    expect(params).toContain('user-9');
  });

  it('does NOT stamp weight metadata when no weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothContainerRepository.update('cont-1', { name: 'Crate A2' }, 'user-9');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).not.toContain('weight_updated_at');
  });

  it('coerces numeric weight strings to numbers on read', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const [c] = await boothContainerRepository.findByBooth('booth-1');
    expect(c.empty_weight_value).toBe(35);
    expect(c.packed_weight_value).toBe(142);
  });

  it('returns null weights untouched rather than coercing to 0', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...row, empty_weight_value: null, packed_weight_value: null }], rowCount: 1,
    } as any);
    const [c] = await boothContainerRepository.findByBooth('booth-1');
    expect(c.empty_weight_value).toBeNull();
    expect(c.packed_weight_value).toBeNull();
  });

  it('remove throws NotFoundError with correct message when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothContainerRepository.remove('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
    await expect(boothContainerRepository.remove('nope'))
      .rejects.toThrow("Container with identifier 'nope' not found");
  });
});
