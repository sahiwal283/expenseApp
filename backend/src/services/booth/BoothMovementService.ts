/**
 * Booth Movement Service
 *
 * The ONLY writer of booth_movements. Every module that changes a component's
 * or container's location, container, status or condition records it here.
 *
 * Idempotency: offline clients replay queued movements after reconnecting, so
 * every write may arrive more than once. Each insert is ON CONFLICT
 * (idempotency_key) DO NOTHING; when the conflict fires we return the row that
 * already exists. A replay is therefore a no-op rather than a duplicate.
 *
 * Bulk moves derive one key per affected entity from the caller's base key
 * (see derivedKey) so a replayed bulk move is idempotent row by row, not just
 * as a whole.
 */

import { PoolClient } from 'pg';
import { pool, query as dbQuery } from '../../config/database';
import { ValidationError } from '../../utils/errors';
import { BoothMovement } from '../../database/repositories/BoothMovementRepository';

export type MovementEventType =
  | 'location_change' | 'container_change' | 'status_change'
  | 'verification' | 'damage_report' | 'missing_report';

export interface MovementEntry {
  componentId?: string | null;
  containerId?: string | null;
  boothId?: string | null;
  eventType: MovementEventType;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  fromContainerId?: string | null;
  toContainerId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromCondition?: string | null;
  toCondition?: string | null;
  eventId?: string | null;
  performedBy: string;
  notes?: string | null;
  idempotencyKey?: string | null;
}

const INSERT_SQL = `
  INSERT INTO booth_movements (
    component_id, container_id, booth_id, event_type,
    from_location_id, to_location_id, from_container_id, to_container_id,
    from_status, to_status, from_condition, to_condition,
    event_id, performed_by, notes, idempotency_key
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING *`;

export class BoothMovementService {
  /**
   * Scope a caller-supplied key to one entity. A bulk booth move touching a
   * booth, 3 containers and 40 components produces 44 distinct keys from one
   * client key, so replaying it cannot double-log any single row.
   */
  derivedKey(
    base: string | null | undefined,
    entityType: string,
    entityId: string
  ): string | null {
    if (!base) return null;
    return `${base}:${entityType}:${entityId}`;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async record(entry: MovementEntry, client?: PoolClient): Promise<BoothMovement> {
    if (!entry.componentId && !entry.containerId) {
      throw new ValidationError('A movement must reference a component or a container');
    }

    const params = [
      entry.componentId ?? null,
      entry.containerId ?? null,
      entry.boothId ?? null,
      entry.eventType,
      entry.fromLocationId ?? null,
      entry.toLocationId ?? null,
      entry.fromContainerId ?? null,
      entry.toContainerId ?? null,
      entry.fromStatus ?? null,
      entry.toStatus ?? null,
      entry.fromCondition ?? null,
      entry.toCondition ?? null,
      entry.eventId ?? null,
      entry.performedBy,
      entry.notes ?? null,
      entry.idempotencyKey ?? null,
    ];

    const run = client
      ? (sql: string, p: unknown[]) => client.query(sql, p as any[])
      : (sql: string, p: unknown[]) => dbQuery(sql, p as any[]);

    const inserted = await run(INSERT_SQL, params);
    if (inserted.rows[0]) return inserted.rows[0] as BoothMovement;

    if (!entry.idempotencyKey) {
      // No key means no conflict was possible — an empty result here is a real
      // failure, not a deduplicated replay.
      throw new Error('Movement insert returned no row and had no idempotency key to recover by');
    }

    // ON CONFLICT DO NOTHING fired: this key was already recorded (an offline
    // replay). Return the original so the caller sees a successful, stable id.
    const existing = await run(
      `SELECT * FROM booth_movements WHERE idempotency_key = $1`,
      [entry.idempotencyKey]
    );
    return existing.rows[0] as BoothMovement;
  }

  async recordMany(entries: MovementEntry[], client?: PoolClient): Promise<BoothMovement[]> {
    const out: BoothMovement[] = [];
    for (const entry of entries) {
      out.push(await this.record(entry, client));
    }
    return out;
  }
}

export const boothMovementService = new BoothMovementService();
