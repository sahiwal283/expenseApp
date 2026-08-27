/**
 * Booth Repository
 *
 * A booth is the top-level durable asset. Its current_status is a macro state
 * and deliberately does NOT cascade to components — components track their own
 * status because a booth is rarely wholly in one place.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface Booth {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  type: string | null;
  manufacturer: string | null;
  year_acquired: number | null;
  description: string | null;
  notes: string | null;
  current_location_id: string | null;
  current_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoothWithCounts extends Booth {
  container_count: number;
  component_count: number;
  location_name: string | null;
}

export interface BoothFilters {
  q?: string;
  status?: string;
  locationId?: string;
  isActive?: boolean;
}

const WRITABLE = [
  'name', 'brand', 'size', 'type', 'manufacturer', 'year_acquired',
  'description', 'notes', 'current_location_id', 'current_status', 'is_active',
] as const;

const SELECT_WITH_COUNTS = `
  SELECT b.*,
         l.name AS location_name,
         COALESCE(c.cnt, 0) AS container_count,
         COALESCE(k.cnt, 0) AS component_count
    FROM booths b
    LEFT JOIN inventory_locations l ON l.id = b.current_location_id
    LEFT JOIN (SELECT booth_id, COUNT(*)::int AS cnt FROM booth_containers GROUP BY booth_id) c
           ON c.booth_id = b.id
    LEFT JOIN (SELECT booth_id, COUNT(*)::int AS cnt FROM booth_components GROUP BY booth_id) k
           ON k.booth_id = b.id`;

function normalise(row: BoothWithCounts): BoothWithCounts {
  return {
    ...row,
    container_count: Number(row.container_count) || 0,
    component_count: Number(row.component_count) || 0,
  };
}

export class BoothRepository extends BaseRepository<Booth> {
  protected tableName = 'booths';

  async search(filters: BoothFilters): Promise<BoothWithCounts[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`b.name ILIKE $${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`b.current_status = $${params.length}`); }
    if (filters.locationId) { params.push(filters.locationId); where.push(`b.current_location_id = $${params.length}`); }
    if (filters.isActive !== undefined) { params.push(filters.isActive); where.push(`b.is_active = $${params.length}`); }

    const result = await this.executeQuery<BoothWithCounts>(
      `${SELECT_WITH_COUNTS}
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY b.name ASC`,
      params as any[]
    );
    return result.rows.map(normalise);
  }

  async findByIdWithCounts(id: string): Promise<BoothWithCounts | null> {
    const result = await this.executeQuery<BoothWithCounts>(
      `${SELECT_WITH_COUNTS} WHERE b.id = $1`, [id]
    );
    return result.rows[0] ? normalise(result.rows[0]) : null;
  }

  async create(data: Partial<Booth>): Promise<Booth> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<Booth>(
      `INSERT INTO booths (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<Booth>): Promise<Booth> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Booth', id);
      return existing;
    }
    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<Booth>(
      `UPDATE booths SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Booth', id);
    return result.rows[0];
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.executeQuery(
      `UPDATE booths SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Booth', id);
  }
}

export const boothRepository = new BoothRepository();
