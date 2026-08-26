import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../src/config/database';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';

/**
 * BoothInventoryService Integration Test
 *
 * Deliberately does NOT mock '../../src/config/database' — the unit tests in
 * tests/services/boothInventoryService.test.ts mock pg entirely (a stub
 * client with queued responses), which proves the cascade branching logic
 * but nothing about whether the SQL this service builds is actually valid
 * against the real schema (see Task 6's Critical defect, which hid behind an
 * all-mocked suite). This test exercises moveContainer against the real dev
 * database: a real transaction, a real UPDATE, and real booth_movements rows.
 */

const PREFIX = `itest-binv-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
let locationAId: string;
let locationBId: string;
let boothId: string;
let containerId: string;
let componentAId: string;
let componentBId: string;
let looseComponentId: string;
let container2Id: string;
let componentC1Id: string;

beforeAll(async () => {
  const { rows: userRows } = await query(
    `INSERT INTO users (username, password, name, email, role)
     VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
    [`${PREFIX}-user`, `${PREFIX} User`, `${PREFIX}@example.test`]
  );
  userId = userRows[0].id;

  const { rows: locRows } = await query(
    `INSERT INTO inventory_locations (name, type) VALUES ($1, 'storage_unit'), ($2, 'show_site')
     RETURNING id`,
    [`${PREFIX}-loc-a`, `${PREFIX}-loc-b`]
  );
  locationAId = locRows[0].id;
  locationBId = locRows[1].id;

  const { rows: boothRows } = await query(
    `INSERT INTO booths (name, current_location_id) VALUES ($1, $2) RETURNING id`,
    [`${PREFIX}-booth`, locationAId]
  );
  boothId = boothRows[0].id;

  const { rows: containerRows } = await query(
    `INSERT INTO booth_containers (booth_id, name, current_location_id, current_status)
     VALUES ($1, $2, $3, 'in_storage') RETURNING id`,
    [boothId, `${PREFIX}-container-1`, locationAId]
  );
  containerId = containerRows[0].id;

  // Two components packed inside the container — moveContainer must move
  // both. A third component is loose (belongs to the same booth but is NOT
  // in this container) — moveContainer must NEVER touch it, per the
  // "never by booth_id" cascade rule.
  const { rows: compRows } = await query(
    `INSERT INTO booth_components (booth_id, name, current_container_id, current_location_id, current_status)
     VALUES ($1, $2, $3, $4, 'in_storage'), ($1, $5, $3, $4, 'in_storage')
     RETURNING id`,
    [boothId, `${PREFIX}-component-a`, containerId, locationAId, `${PREFIX}-component-b`]
  );
  componentAId = compRows[0].id;
  componentBId = compRows[1].id;

  const { rows: looseRows } = await query(
    `INSERT INTO booth_components (booth_id, name, current_location_id, current_status)
     VALUES ($1, $2, $3, 'in_storage') RETURNING id`,
    [boothId, `${PREFIX}-component-loose`, locationAId]
  );
  looseComponentId = looseRows[0].id;

  // A second, independent container+component pair for the idempotency-replay
  // test, so it doesn't share mutated state with the cascade test above.
  const { rows: container2Rows } = await query(
    `INSERT INTO booth_containers (booth_id, name, current_location_id, current_status)
     VALUES ($1, $2, $3, 'in_storage') RETURNING id`,
    [boothId, `${PREFIX}-container-2`, locationAId]
  );
  container2Id = container2Rows[0].id;

  const { rows: compC1Rows } = await query(
    `INSERT INTO booth_components (booth_id, name, current_container_id, current_location_id, current_status)
     VALUES ($1, $2, $3, $4, 'in_storage') RETURNING id`,
    [boothId, `${PREFIX}-component-c1`, container2Id, locationAId]
  );
  componentC1Id = compC1Rows[0].id;
});

afterAll(async () => {
  // Movements FK to booth/container/component with ON DELETE SET NULL, NOT
  // CASCADE, so delete them explicitly before the catalog rows they
  // reference, then walk FK order down to the fixture user and locations.
  await query(
    `DELETE FROM booth_movements
      WHERE booth_id = $1 OR container_id = ANY($2) OR component_id = ANY($3)`,
    [boothId, [containerId, container2Id], [componentAId, componentBId, looseComponentId, componentC1Id]]
  );
  await query(`DELETE FROM booth_containers WHERE id = ANY($1)`, [[containerId, container2Id]]);
  if (boothId) {
    // booth_components.booth_id IS ON DELETE CASCADE, so this also removes
    // the fixture components.
    await query(`DELETE FROM booths WHERE id = $1`, [boothId]);
  }
  await query(`DELETE FROM inventory_locations WHERE id = ANY($1)`, [[locationAId, locationBId]]);
  if (userId) {
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
  }
  await pool.end();
});

describe('BoothInventoryService.moveContainer (real database)', () => {
  it('moves the container and both packed components, leaves a loose sibling untouched, one movement row per affected entity', async () => {
    const result = await boothInventoryService.moveContainer(containerId, {
      toLocationId: locationBId,
      toStatus: 'at_show',
      performedBy: userId,
      idempotencyKey: `${PREFIX}-move-1`,
    });

    expect(result.movedContainers).toBe(1);
    expect(result.movedComponents).toBe(2);
    expect(result.movedBooths).toBe(0);
    expect(result.movementIds).toHaveLength(3);

    const { rows: containerRows } = await query(
      `SELECT current_location_id, current_status FROM booth_containers WHERE id = $1`,
      [containerId]
    );
    expect(containerRows[0].current_location_id).toBe(locationBId);
    expect(containerRows[0].current_status).toBe('at_show');

    const { rows: compRows } = await query(
      `SELECT id, current_location_id, current_status FROM booth_components
        WHERE id = ANY($1) ORDER BY id`,
      [[componentAId, componentBId]]
    );
    for (const row of compRows) {
      expect(row.current_location_id).toBe(locationBId);
      expect(row.current_status).toBe('at_show');
    }

    // The loose component belongs to the same booth but is NOT inside this
    // container — a container-scoped move must leave it exactly as it was.
    const { rows: looseRows } = await query(
      `SELECT current_location_id, current_status FROM booth_components WHERE id = $1`,
      [looseComponentId]
    );
    expect(looseRows[0].current_location_id).toBe(locationAId);
    expect(looseRows[0].current_status).toBe('in_storage');

    const { rows: containerMovements } = await query(
      `SELECT * FROM booth_movements WHERE container_id = $1`,
      [containerId]
    );
    expect(containerMovements).toHaveLength(1);
    expect(containerMovements[0].event_type).toBe('location_change');
    expect(containerMovements[0].idempotency_key).toBe(`${PREFIX}-move-1:container:${containerId}`);

    for (const id of [componentAId, componentBId]) {
      const { rows: movements } = await query(
        `SELECT * FROM booth_movements WHERE component_id = $1`,
        [id]
      );
      expect(movements).toHaveLength(1);
      expect(movements[0].idempotency_key).toBe(`${PREFIX}-move-1:component:${id}`);
    }

    const { rows: looseMovements } = await query(
      `SELECT * FROM booth_movements WHERE component_id = $1`,
      [looseComponentId]
    );
    expect(looseMovements).toHaveLength(0);
  });

  it('replaying a bulk move with the same idempotency key does not duplicate movement rows', async () => {
    const baseKey = `${PREFIX}-move-2`;

    const first = await boothInventoryService.moveContainer(container2Id, {
      toLocationId: locationBId,
      toStatus: 'at_show',
      performedBy: userId,
      idempotencyKey: baseKey,
    });
    expect(first.movementIds).toHaveLength(2); // container + component-c1

    // Simulate an offline client that queued the SAME bulk move again: the
    // request replays with the same base idempotency key. To prove the
    // per-row dedup fires (not just "nothing changed so nothing ran"), push
    // the rows back to their pre-move state via a direct write — as if the
    // move needs to happen again — before replaying.
    await query(
      `UPDATE booth_containers SET current_location_id = $1, current_status = 'in_storage' WHERE id = $2`,
      [locationAId, container2Id]
    );
    await query(
      `UPDATE booth_components SET current_location_id = $1, current_status = 'in_storage' WHERE id = $2`,
      [locationAId, componentC1Id]
    );

    const second = await boothInventoryService.moveContainer(container2Id, {
      toLocationId: locationBId,
      toStatus: 'at_show',
      performedBy: userId,
      idempotencyKey: baseKey,
    });

    // record() hit ON CONFLICT DO NOTHING and returned the original rows.
    expect(second.movementIds.slice().sort()).toEqual(first.movementIds.slice().sort());

    const { rows: containerMovementCount } = await query(
      `SELECT count(*) FROM booth_movements
        WHERE container_id = $1 AND idempotency_key = $2`,
      [container2Id, `${baseKey}:container:${container2Id}`]
    );
    expect(Number(containerMovementCount[0].count)).toBe(1);

    const { rows: componentMovementCount } = await query(
      `SELECT count(*) FROM booth_movements
        WHERE component_id = $1 AND idempotency_key = $2`,
      [componentC1Id, `${baseKey}:component:${componentC1Id}`]
    );
    expect(Number(componentMovementCount[0].count)).toBe(1);
  });
});
