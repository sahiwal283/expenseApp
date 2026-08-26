/**
 * Booth Component Repository
 *
 * Hybrid granularity: a row is EITHER a counted pool (quantity 6, asset_tag
 * null) OR one tagged physical object (asset_tag set, quantity 1). The DB
 * constraint booth_components_instance_qty enforces it.
 *
 * Three independent "where" columns, because they answer different questions:
 *   current_location_id  — the physical place
 *   current_container_id — which crate it is in right now (null when loose)
 *   default_container_id — which crate it BELONGS in
 * The last pair is the whole packing checklist (see BoothPackingService).
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export const COMPONENT_CATEGORIES = [
  'frame', 'frame_part', 'fabric', 'shelf', 'table_top', 'banner', 'light',
  'hardware', 'tool', 'case', 'side_piece', 'setup_accessory', 'other',
];
export const COMPONENT_STATUSES = [
  'in_storage', 'in_transit', 'at_show', 'missing', 'damaged', 'retired',
];
export const COMPONENT_CONDITIONS = ['good', 'fair', 'damaged', 'retired'];

export interface BoothComponent {
  id: string;
  booth_id: string;
  parent_component_id: string | null;
  name: string;
  category: string;
  quantity: number;
  asset_tag: string | null;
  condition: string;
  current_status: string;
  current_location_id: string | null;
  default_container_id: string | null;
  current_container_id: string | null;
  last_verified_at: string | null;
  last_verified_by: string | null;
  weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  weight_notes: string | null;
  weight_updated_at: string | null;
  weight_updated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentFilters {
  q?: string;
  category?: string;
  status?: string;
  containerId?: string;
  condition?: string;
}

const WRITABLE = [
  'booth_id', 'parent_component_id', 'name', 'category', 'quantity', 'asset_tag',
  'condition', 'current_status', 'current_location_id',
  'default_container_id', 'current_container_id',
  'weight_value', 'weight_unit', 'weight_source', 'weight_notes', 'notes',
] as const;

const WEIGHT_FIELDS = ['weight_value', 'weight_unit', 'weight_source', 'weight_notes'] as const;

function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function normalise(row: BoothComponent): BoothComponent {
  return { ...row, weight_value: num(row.weight_value), quantity: Number(row.quantity) };
}

export class BoothComponentRepository extends BaseRepository<BoothComponent> {
  protected tableName = 'booth_components';

  async findByBooth(boothId: string, filters: ComponentFilters): Promise<BoothComponent[]> {
    const params: unknown[] = [boothId];
    const where = ['booth_id = $1'];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`name ILIKE $${params.length}`); }
    if (filters.category) { params.push(filters.category); where.push(`category = $${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`current_status = $${params.length}`); }
    if (filters.containerId) { params.push(filters.containerId); where.push(`current_container_id = $${params.length}`); }
    if (filters.condition) { params.push(filters.condition); where.push(`condition = $${params.length}`); }

    // Parents first, then their children, so the UI can indent one level
    // without a second query or a client-side tree build.
    const result = await this.executeQuery<BoothComponent>(
      `SELECT * FROM booth_components
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(parent_component_id, id), parent_component_id NULLS FIRST, name ASC`,
      params as any[]
    );
    return result.rows.map(normalise);
  }

  async findByIdOrThrow(id: string): Promise<BoothComponent> {
    const result = await this.executeQuery<BoothComponent>(
      `SELECT * FROM booth_components WHERE id = $1`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Component', id);
    return normalise(result.rows[0]);
  }

  async create(data: Partial<BoothComponent>): Promise<BoothComponent> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<BoothComponent>(
      `INSERT INTO booth_components (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return normalise(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<BoothComponent>,
    userId: string
  ): Promise<BoothComponent> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) return this.findByIdOrThrow(id);

    const params: unknown[] = cols.map((c) => data[c]);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);

    if (cols.some((c) => (WEIGHT_FIELDS as readonly string[]).includes(c))) {
      params.push(userId);
      sets.push('weight_updated_at = CURRENT_TIMESTAMP');
      sets.push(`weight_updated_by = $${params.length}`);
    }

    params.push(id);
    const result = await this.executeQuery<BoothComponent>(
      `UPDATE booth_components SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Component', id);
    return normalise(result.rows[0]);
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM booth_components WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Component', id);
  }
}

export const boothComponentRepository = new BoothComponentRepository();
