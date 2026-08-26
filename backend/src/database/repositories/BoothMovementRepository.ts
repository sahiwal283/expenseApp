/**
 * Booth Movement Repository — READ SIDE ONLY.
 *
 * booth_movements is an immutable event log: rows are inserted by
 * BoothMovementService and never updated or deleted. This repository only
 * reads. Do not add write methods here.
 */

import { BaseRepository } from './BaseRepository';

export interface BoothMovement {
  id: string;
  component_id: string | null;
  container_id: string | null;
  booth_id: string | null;
  event_type: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_container_id: string | null;
  to_container_id: string | null;
  from_status: string | null;
  to_status: string | null;
  from_condition: string | null;
  to_condition: string | null;
  event_id: string | null;
  performed_by: string;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface MovementQueryOptions {
  limit?: number;
  eventId?: string;
}

/** Enriched with the names the timeline UI needs, so it renders in one query. */
const SELECT_ENRICHED = `
  SELECT m.*,
         u.name  AS performed_by_name,
         cf.name AS from_location_name,
         ct.name AS to_location_name,
         kf.name AS from_container_name,
         kt.name AS to_container_name,
         comp.name AS component_name,
         cont.name AS container_name
    FROM booth_movements m
    LEFT JOIN users u                ON u.id = m.performed_by
    LEFT JOIN inventory_locations cf ON cf.id = m.from_location_id
    LEFT JOIN inventory_locations ct ON ct.id = m.to_location_id
    LEFT JOIN booth_containers kf    ON kf.id = m.from_container_id
    LEFT JOIN booth_containers kt    ON kt.id = m.to_container_id
    LEFT JOIN booth_components comp  ON comp.id = m.component_id
    LEFT JOIN booth_containers cont  ON cont.id = m.container_id`;

export class BoothMovementRepository extends BaseRepository<BoothMovement> {
  protected tableName = 'booth_movements';

  private async byColumn(
    column: 'booth_id' | 'component_id' | 'container_id',
    id: string,
    opts: MovementQueryOptions
  ): Promise<BoothMovement[]> {
    const params: unknown[] = [id];
    const where = [`m.${column} = $1`];
    if (opts.eventId) { params.push(opts.eventId); where.push(`m.event_id = $${params.length}`); }
    params.push(Math.min(opts.limit ?? 100, 500));

    const result = await this.executeQuery<BoothMovement>(
      `${SELECT_ENRICHED}
        WHERE ${where.join(' AND ')}
        ORDER BY m.created_at DESC
        LIMIT $${params.length}`,
      params as any[]
    );
    return result.rows;
  }

  findByBooth(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('booth_id', id, opts); }
  findByComponent(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('component_id', id, opts); }
  findByContainer(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('container_id', id, opts); }

  async findByIdempotencyKey(key: string): Promise<BoothMovement | null> {
    const result = await this.executeQuery<BoothMovement>(
      `SELECT * FROM booth_movements WHERE idempotency_key = $1`, [key]
    );
    return result.rows[0] || null;
  }
}

export const boothMovementRepository = new BoothMovementRepository();
