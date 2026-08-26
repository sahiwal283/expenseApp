/**
 * Booth Manifest Service
 *
 * Assigning a booth to an event MATERIALISES one manifest row per container
 * the booth currently owns. The manifest is therefore a snapshot of what was
 * decided for that show — editing the booth later does not silently rewrite
 * a past decision.
 *
 * The cost of that choice is drift: containers added to the booth after
 * assignment are not on the manifest. Drift is SURFACED (see `drift`) and
 * resolved only by an explicit, additive syncDrift(). Nothing here ever
 * removes a manifest row on the user's behalf.
 */

import { query as dbQuery } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { boothMovementService } from './BoothMovementService';

export interface ManifestContainer {
  id: string;
  container_id: string;
  container_name: string;
  container_type: string;
  asset_tag: string | null;
  included: boolean;
  is_extra: boolean;
  packed_weight_value: number | null;
  weight_unit: string;
  component_count: number;
}

export interface ManifestAssignment {
  id: string;
  event_id: string;
  booth_id: string;
  booth_name: string;
  status: string;
  needed_by_date: string | null;
  setup_notes: string | null;
  teardown_notes: string | null;
  containers: ManifestContainer[];
  drift: Array<{ container_id: string; container_name: string }>;
  weight_total: number | null;
  weight_unit: string;
  weighed_container_count: number;
  included_container_count: number;
}

export class BoothManifestService {
  async getForEvent(eventId: string): Promise<ManifestAssignment[]> {
    const { rows: assignments } = await dbQuery(
      `SELECT a.*, b.name AS booth_name
         FROM event_booth_assignments a
         JOIN booths b ON b.id = a.booth_id
        WHERE a.event_id = $1
        ORDER BY b.name ASC`,
      [eventId]
    );

    const out: ManifestAssignment[] = [];

    for (const assignment of assignments) {
      const { rows: containers } = await dbQuery(
        `SELECT m.id, m.container_id, m.included, m.is_extra,
                k.name AS container_name, k.type AS container_type, k.asset_tag,
                k.packed_weight_value, k.weight_unit,
                COALESCE(cc.cnt, 0) AS component_count
           FROM event_booth_manifest_containers m
           JOIN booth_containers k ON k.id = m.container_id
           LEFT JOIN (SELECT current_container_id, COUNT(*)::int AS cnt
                        FROM booth_components GROUP BY current_container_id) cc
                  ON cc.current_container_id = m.container_id
          WHERE m.assignment_id = $1
          ORDER BY m.is_extra ASC, k.name ASC`,
        [assignment.id]
      );

      // Containers the booth owns that never made it onto this manifest.
      const { rows: drift } = await dbQuery(
        `SELECT k.id AS container_id, k.name AS container_name
           FROM booth_containers k
          WHERE k.booth_id = $1
            AND k.id NOT IN (
              SELECT container_id FROM event_booth_manifest_containers
               WHERE assignment_id = $2)
          ORDER BY k.name ASC`,
        [assignment.booth_id, assignment.id]
      );

      const mapped: ManifestContainer[] = containers.map((c: any) => ({
        id: c.id,
        container_id: c.container_id,
        container_name: c.container_name,
        container_type: c.container_type,
        asset_tag: c.asset_tag,
        included: c.included,
        is_extra: c.is_extra,
        packed_weight_value: c.packed_weight_value === null ? null : Number(c.packed_weight_value),
        weight_unit: c.weight_unit,
        component_count: Number(c.component_count),
      }));

      const included = mapped.filter((c) => c.included);
      const weighed = included.filter((c) => c.packed_weight_value !== null);
      const weightTotal = weighed.length
        ? weighed.reduce((sum, c) => sum + (c.packed_weight_value as number), 0)
        : null;

      out.push({
        id: assignment.id,
        event_id: assignment.event_id,
        booth_id: assignment.booth_id,
        booth_name: assignment.booth_name,
        status: assignment.status,
        needed_by_date: assignment.needed_by_date,
        setup_notes: assignment.setup_notes,
        teardown_notes: assignment.teardown_notes,
        containers: mapped,
        drift,
        weight_total: weightTotal,
        weight_unit: included[0]?.weight_unit ?? 'lb',
        weighed_container_count: weighed.length,
        included_container_count: included.length,
      });
    }

    return out;
  }

  async assignBooth(
    eventId: string,
    boothId: string,
    data: { needed_by_date?: string | null; setup_notes?: string | null; status?: string },
    userId: string
  ): Promise<ManifestAssignment> {
    const assignmentId = await boothMovementService.withTransaction(async (client) => {
      let inserted;
      try {
        inserted = await client.query(
          `INSERT INTO event_booth_assignments
             (event_id, booth_id, status, needed_by_date, setup_notes, created_by)
           VALUES ($1, $2, COALESCE($3, 'planned'), $4, $5, $6)
           RETURNING id`,
          [eventId, boothId, data.status ?? null, data.needed_by_date ?? null,
           data.setup_notes ?? null, userId]
        );
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new ConflictError('That booth is already assigned to this event');
        }
        throw error;
      }

      const id = inserted.rows[0].id;

      // Materialise the manifest: one row per container the booth owns today.
      const { rows: containers } = await client.query(
        `SELECT id FROM booth_containers WHERE booth_id = $1`, [boothId]
      );
      if (containers.length) {
        await client.query(
          `INSERT INTO event_booth_manifest_containers (assignment_id, container_id)
           SELECT $1, unnest($2::uuid[])
           ON CONFLICT (assignment_id, container_id) DO NOTHING`,
          [id, containers.map((c: any) => c.id)]
        );
      }
      return id;
    });

    const all = await this.getForEvent(eventId);
    const created = all.find((a) => a.id === assignmentId);
    if (!created) throw new NotFoundError('Assignment', assignmentId);
    return created;
  }

  async setContainerIncluded(
    assignmentId: string, containerId: string, included: boolean
  ): Promise<void> {
    const result = await dbQuery(
      `UPDATE event_booth_manifest_containers
          SET included = $1, updated_at = CURRENT_TIMESTAMP
        WHERE assignment_id = $2 AND container_id = $3
        RETURNING id`,
      [included, assignmentId, containerId]
    );
    if (!result.rows[0]) throw new NotFoundError('Manifest container', containerId);
  }

  async addExtraContainer(assignmentId: string, containerId: string): Promise<void> {
    await dbQuery(
      `INSERT INTO event_booth_manifest_containers
         (assignment_id, container_id, included, is_extra)
       VALUES ($1, $2, true, true)
       ON CONFLICT (assignment_id, container_id)
       DO UPDATE SET included = true, updated_at = CURRENT_TIMESTAMP`,
      [assignmentId, containerId]
    );
  }

  /** Additive only. Never removes a manifest row — that is always a human call. */
  async syncDrift(assignmentId: string): Promise<{ added: number }> {
    const result = await dbQuery(
      `INSERT INTO event_booth_manifest_containers (assignment_id, container_id)
       SELECT a.id, k.id
         FROM event_booth_assignments a
         JOIN booth_containers k ON k.booth_id = a.booth_id
        WHERE a.id = $1
       ON CONFLICT (assignment_id, container_id) DO NOTHING
       RETURNING id`,
      [assignmentId]
    );
    return { added: result.rows.length };
  }
}

export const boothManifestService = new BoothManifestService();
