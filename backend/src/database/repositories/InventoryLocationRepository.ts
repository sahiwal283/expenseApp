/**
 * Inventory Location Repository
 *
 * Physical places booth assets can be: warehouses, storage units, convention
 * centres, carriers, partner sites. Named inventory_locations (not locations)
 * because events already carries venue/city/state.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface InventoryLocation {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationFilters {
  q?: string;
  type?: string;
  isActive?: boolean;
}

const WRITABLE = [
  'name', 'type', 'address', 'city', 'state', 'country',
  'contact_name', 'contact_phone', 'contact_email', 'notes', 'is_active',
] as const;

export class InventoryLocationRepository extends BaseRepository<InventoryLocation> {
  protected tableName = 'inventory_locations';

  async search(filters: LocationFilters): Promise<InventoryLocation[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`name ILIKE $${params.length}`); }
    if (filters.type) { params.push(filters.type); where.push(`type = $${params.length}`); }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive); where.push(`is_active = $${params.length}`);
    }

    const result = await this.executeQuery<InventoryLocation>(
      `SELECT * FROM inventory_locations
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY name ASC`,
      params as any[]
    );
    return result.rows;
  }

  async create(data: Partial<InventoryLocation>): Promise<InventoryLocation> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const params = cols.map((c) => data[c]);
    const result = await this.executeQuery<InventoryLocation>(
      `INSERT INTO inventory_locations (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      params as any[]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<InventoryLocation>): Promise<InventoryLocation> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);

    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Location', id);
      return existing;
    }

    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<InventoryLocation>(
      `UPDATE inventory_locations
          SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length}
        RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Location', id);
    return result.rows[0];
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.executeQuery(
      `UPDATE inventory_locations
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Location', id);
  }
}

export const inventoryLocationRepository = new InventoryLocationRepository();
