/**
 * Booth Packing Service
 *
 * The packing checklist is DERIVED, never stored:
 *   expected = default_container_id === thisContainer
 *   packed   = current_container_id === thisContainer
 *   stray    = packed && !expected   (here, but belongs in another crate)
 *
 * Because there is no session table, a half-finished teardown cannot go stale
 * and ticking an item IS the container change — the checkbox and the truth
 * cannot disagree.
 */

import { query as dbQuery } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { boothMovementService } from './BoothMovementService';

export interface PackingItem {
  component_id: string;
  name: string;
  asset_tag: string | null;
  quantity: number;
  category: string;
  condition: string;
  current_status: string;
  expected: boolean;
  packed: boolean;
  stray: boolean;
  expected_container_id: string | null;
  expected_container_name: string | null;
}

export interface PackingChecklist {
  container_id: string;
  container_name: string;
  items: PackingItem[];
  expected_count: number;
  packed_count: number;
  stray_count: number;
  complete: boolean;
}

export interface PackOptions {
  toLocationId?: string | null;
  eventId?: string | null;
  idempotencyKey?: string | null;
  performedBy: string;
}

export class BoothPackingService {
  async getChecklist(containerId: string): Promise<PackingChecklist> {
    const containerResult = await dbQuery(
      `SELECT id, name, booth_id FROM booth_containers WHERE id = $1`,
      [containerId]
    );
    if (!containerResult.rows[0]) throw new NotFoundError('Container', containerId);
    const container = containerResult.rows[0];

    // Everything that BELONGS here plus everything that IS here — the union is
    // what a person standing over the open crate needs to see.
    const result = await dbQuery(
      `SELECT c.id AS component_id, c.name, c.asset_tag, c.quantity, c.category,
              c.condition, c.current_status,
              c.default_container_id, c.current_container_id,
              dc.name AS expected_container_name
         FROM booth_components c
         LEFT JOIN booth_containers dc ON dc.id = c.default_container_id
        WHERE c.default_container_id = $1 OR c.current_container_id = $1
        ORDER BY c.category ASC, c.name ASC`,
      [containerId]
    );

    const items: PackingItem[] = result.rows.map((r: any) => {
      const expected = r.default_container_id === containerId;
      const packed = r.current_container_id === containerId;
      return {
        component_id: r.component_id,
        name: r.name,
        asset_tag: r.asset_tag,
        quantity: Number(r.quantity),
        category: r.category,
        condition: r.condition,
        current_status: r.current_status,
        expected,
        packed: expected ? packed : false,
        stray: packed && !expected,
        expected_container_id: r.default_container_id,
        expected_container_name: r.expected_container_name,
      };
    });

    const expected_count = items.filter((i) => i.expected).length;
    const packed_count = items.filter((i) => i.expected && i.packed).length;
    const stray_count = items.filter((i) => i.stray).length;

    return {
      container_id: containerId,
      container_name: container.name,
      items,
      expected_count,
      packed_count,
      stray_count,
      // A crate holding a foreign piece is not correctly packed, even if
      // everything expected is present.
      complete: packed_count === expected_count && stray_count === 0,
    };
  }

  private async move(
    containerId: string,
    componentIds: string[],
    opts: PackOptions,
    target: 'in' | 'out'
  ): Promise<{ count: number; movementIds: string[] }> {
    if (!componentIds.length) return { count: 0, movementIds: [] };

    return boothMovementService.withTransaction(async (client) => {
      const { rows: containers } = await client.query(
        `SELECT id, booth_id FROM booth_containers WHERE id = $1`,
        [containerId]
      );
      if (!containers[0]) throw new NotFoundError('Container', containerId);

      const { rows: components } = await client.query(
        `SELECT id, booth_id, current_container_id, current_location_id, current_status
           FROM booth_components WHERE id = ANY($1) FOR UPDATE`,
        [componentIds]
      );

      const nextContainer = target === 'in' ? containerId : null;
      const movementIds: string[] = [];
      let count = 0;

      for (const component of components) {
        if (component.current_container_id === nextContainer) continue;

        const nextLocation = opts.toLocationId ?? component.current_location_id;
        await client.query(
          `UPDATE booth_components
              SET current_container_id = $1, current_location_id = $2,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
          [nextContainer, nextLocation, component.id]
        );

        const movement = await boothMovementService.record({
          componentId: component.id,
          containerId,
          boothId: component.booth_id,
          eventType: 'container_change',
          fromContainerId: component.current_container_id,
          toContainerId: nextContainer,
          fromLocationId: component.current_location_id,
          toLocationId: nextLocation,
          fromStatus: component.current_status,
          toStatus: component.current_status,
          eventId: opts.eventId ?? null,
          performedBy: opts.performedBy,
          idempotencyKey: boothMovementService.derivedKey(
            opts.idempotencyKey, target === 'in' ? 'pack' : 'unpack', component.id
          ),
        }, client);

        movementIds.push(movement.id);
        count += 1;
      }

      return { count, movementIds };
    });
  }

  async pack(containerId: string, componentIds: string[], opts: PackOptions) {
    const { count, movementIds } = await this.move(containerId, componentIds, opts, 'in');
    return { packed: count, movementIds };
  }

  async unpack(containerId: string, componentIds: string[], opts: PackOptions) {
    const { count, movementIds } = await this.move(containerId, componentIds, opts, 'out');
    return { unpacked: count, movementIds };
  }
}

export const boothPackingService = new BoothPackingService();
