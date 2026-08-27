/**
 * Booth Container Repository
 *
 * Containers (bag/box/crate/case/pallet) are first-class: the same crate moves
 * between locations independently of the booth it belongs to, and needs its own
 * movement history for packing and shipping.
 *
 * Weight: empty (tare) and packed are tracked separately. Packed weight is
 * NEVER auto-summed from components — packing material and arrangement make a
 * sum wrong — so it is manual, and any weight edit stamps who/when.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export const WEIGHT_SOURCES = ['estimated', 'measured', 'carrier', 'manufacturer', 'unknown'];
export const CONTAINER_TYPES = ['bag', 'box', 'crate', 'case', 'pallet', 'other'];
export const CONTAINER_STATUSES = ['in_storage', 'in_transit', 'at_show', 'missing'];

export interface BoothContainer {
  id: string;
  booth_id: string | null;
  name: string;
  label: string | null;
  description: string | null;
  type: string;
  asset_tag: string | null;
  dimensions: string | null;
  weight_capacity: string | null;
  current_location_id: string | null;
  current_status: string;
  empty_weight_value: number | null;
  packed_weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  weight_notes: string | null;
  weight_updated_at: string | null;
  weight_updated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const WRITABLE = [
  'booth_id', 'name', 'label', 'description', 'type', 'asset_tag',
  'dimensions', 'weight_capacity', 'current_location_id', 'current_status',
  'empty_weight_value', 'packed_weight_value', 'weight_unit',
  'weight_source', 'weight_notes', 'notes',
] as const;

const WEIGHT_FIELDS = [
  'empty_weight_value', 'packed_weight_value', 'weight_unit',
  'weight_source', 'weight_notes',
] as const;

/** pg returns NUMERIC as a string; keep null as null rather than coercing to 0. */
function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function normalise(row: BoothContainer): BoothContainer {
  return {
    ...row,
    empty_weight_value: num(row.empty_weight_value),
    packed_weight_value: num(row.packed_weight_value),
  };
}

export class BoothContainerRepository extends BaseRepository<BoothContainer> {
  protected tableName = 'booth_containers';

  async findByBooth(boothId: string): Promise<BoothContainer[]> {
    const result = await this.executeQuery<BoothContainer>(
      `SELECT * FROM booth_containers WHERE booth_id = $1 ORDER BY name ASC`,
      [boothId]
    );
    return result.rows.map(normalise);
  }

  async findByIdOrThrow(id: string): Promise<BoothContainer> {
    const result = await this.executeQuery<BoothContainer>(
      `SELECT * FROM booth_containers WHERE id = $1`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Container', id);
    return normalise(result.rows[0]);
  }

  async create(data: Partial<BoothContainer>): Promise<BoothContainer> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<BoothContainer>(
      `INSERT INTO booth_containers (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return normalise(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<BoothContainer>,
    userId: string
  ): Promise<BoothContainer> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) return this.findByIdOrThrow(id);

    const params: unknown[] = cols.map((c) => data[c]);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);

    // Any weight edit stamps provenance so a measured value is traceable.
    const touchesWeight = cols.some((c) => (WEIGHT_FIELDS as readonly string[]).includes(c));
    if (touchesWeight) {
      params.push(userId);
      sets.push('weight_updated_at = CURRENT_TIMESTAMP');
      sets.push(`weight_updated_by = $${params.length}`);
    }

    params.push(id);
    const result = await this.executeQuery<BoothContainer>(
      `UPDATE booth_containers SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Container', id);
    return normalise(result.rows[0]);
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM booth_containers WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Container', id);
  }
}

export const boothContainerRepository = new BoothContainerRepository();
