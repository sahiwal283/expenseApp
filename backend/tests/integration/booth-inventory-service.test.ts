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

describe('BoothInventoryService.moveBooth (real database)', () => {
  const MB_PREFIX = `itest-binv-mb-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let mbUserId: string;
  let mbLocationAId: string;
  let mbLocationBId: string;
  let boothAId: string;
  let boothBId: string;
  let containerA1Id: string;
  let containerB1Id: string;
  let c1Id: string; // belongs to A, packed inside A1
  let c2Id: string; // belongs to A, loose
  let c3Id: string; // belongs to A, but packed inside B1 (lent out)
  let c4Id: string; // belongs to B, but packed inside A1 (borrowed)

  beforeAll(async () => {
    const { rows: userRows } = await query(
      `INSERT INTO users (username, password, name, email, role)
       VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
      [`${MB_PREFIX}-user`, `${MB_PREFIX} User`, `${MB_PREFIX}@example.test`]
    );
    mbUserId = userRows[0].id;

    const { rows: locRows } = await query(
      `INSERT INTO inventory_locations (name, type) VALUES ($1, 'storage_unit'), ($2, 'show_site')
       RETURNING id`,
      [`${MB_PREFIX}-loc-a`, `${MB_PREFIX}-loc-b`]
    );
    mbLocationAId = locRows[0].id;
    mbLocationBId = locRows[1].id;

    // Two booths, so a container/component can belong to one while
    // physically sitting with the other — the exact "borrowed crate" /
    // "lent-out piece" scenarios the cascade rule has to get right.
    const { rows: boothRows } = await query(
      `INSERT INTO booths (name, current_location_id) VALUES ($1, $3), ($2, $3) RETURNING id`,
      [`${MB_PREFIX}-booth-a`, `${MB_PREFIX}-booth-b`, mbLocationAId]
    );
    boothAId = boothRows[0].id;
    boothBId = boothRows[1].id;

    const { rows: containerRows } = await query(
      `INSERT INTO booth_containers (booth_id, name, current_location_id, current_status)
       VALUES ($1, $3, $4, 'in_storage'), ($2, $5, $4, 'in_storage') RETURNING id`,
      [boothAId, boothBId, `${MB_PREFIX}-container-a1`, mbLocationAId, `${MB_PREFIX}-container-b1`]
    );
    containerA1Id = containerRows[0].id;
    containerB1Id = containerRows[1].id;

    // C1: belongs to A, packed inside A1 — inside one of A's own containers.
    const { rows: c1Rows } = await query(
      `INSERT INTO booth_components (booth_id, name, current_container_id, current_location_id, current_status)
       VALUES ($1, $2, $3, $4, 'in_storage') RETURNING id`,
      [boothAId, `${MB_PREFIX}-c1`, containerA1Id, mbLocationAId]
    );
    c1Id = c1Rows[0].id;

    // C2: belongs to A, loose (current_container_id IS NULL).
    const { rows: c2Rows } = await query(
      `INSERT INTO booth_components (booth_id, name, current_location_id, current_status)
       VALUES ($1, $2, $3, 'in_storage') RETURNING id`,
      [boothAId, `${MB_PREFIX}-c2`, mbLocationAId]
    );
    c2Id = c2Rows[0].id;

    // C3: belongs to A, but currently packed inside B1 (booth B's crate) —
    // a piece of A's booth lent out and sitting in someone else's container.
    const { rows: c3Rows } = await query(
      `INSERT INTO booth_components (booth_id, name, current_container_id, current_location_id, current_status)
       VALUES ($1, $2, $3, $4, 'in_storage') RETURNING id`,
      [boothAId, `${MB_PREFIX}-c3`, containerB1Id, mbLocationAId]
    );
    c3Id = c3Rows[0].id;

    // C4: belongs to B, but currently packed inside A1 (booth A's crate) —
    // a borrowed piece sitting in A's crate.
    const { rows: c4Rows } = await query(
      `INSERT INTO booth_components (booth_id, name, current_container_id, current_location_id, current_status)
       VALUES ($1, $2, $3, $4, 'in_storage') RETURNING id`,
      [boothBId, `${MB_PREFIX}-c4`, containerA1Id, mbLocationAId]
    );
    c4Id = c4Rows[0].id;
  });

  afterAll(async () => {
    await query(
      `DELETE FROM booth_movements
        WHERE booth_id = ANY($1) OR container_id = ANY($2) OR component_id = ANY($3)`,
      [[boothAId, boothBId], [containerA1Id, containerB1Id], [c1Id, c2Id, c3Id, c4Id]]
    );
    await query(`DELETE FROM booth_containers WHERE id = ANY($1)`, [[containerA1Id, containerB1Id]]);
    // booth_components.booth_id IS ON DELETE CASCADE, so deleting both
    // booths also removes all four fixture components.
    await query(`DELETE FROM booths WHERE id = ANY($1)`, [[boothAId, boothBId]]);
    await query(`DELETE FROM inventory_locations WHERE id = ANY($1)`, [[mbLocationAId, mbLocationBId]]);
    if (mbUserId) {
      await query(`DELETE FROM users WHERE id = $1`, [mbUserId]);
    }
  });

  it("cascades to in-container and loose components of the moving booth, follows a borrowed piece via its container, and skips a lent-out piece sitting in another booth's container", async () => {
    const result = await boothInventoryService.moveBooth(boothAId, {
      toLocationId: mbLocationBId,
      toStatus: 'at_show',
      performedBy: mbUserId,
      idempotencyKey: `${MB_PREFIX}-move`,
    });

    expect(result.movedBooths).toBe(1);
    expect(result.movedContainers).toBe(1); // only A1, never B1
    expect(result.movedComponents).toBe(3); // C1, C2, C4 — NOT C3
    expect(result.movementIds).toHaveLength(4); // A1 + C1 + C2 + C4

    const { rows: boothARows } = await query(
      `SELECT current_location_id, current_status FROM booths WHERE id = $1`,
      [boothAId]
    );
    expect(boothARows[0].current_location_id).toBe(mbLocationBId);
    expect(boothARows[0].current_status).toBe('at_show');

    const { rows: boothBRows } = await query(
      `SELECT current_location_id, current_status FROM booths WHERE id = $1`,
      [boothBId]
    );
    expect(boothBRows[0].current_location_id).toBe(mbLocationAId);
    expect(boothBRows[0].current_status).toBe('in_storage');

    const { rows: a1Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_containers WHERE id = $1`,
      [containerA1Id]
    );
    expect(a1Rows[0].current_location_id).toBe(mbLocationBId);
    expect(a1Rows[0].current_status).toBe('at_show');

    const { rows: b1Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_containers WHERE id = $1`,
      [containerB1Id]
    );
    expect(b1Rows[0].current_location_id).toBe(mbLocationAId);
    expect(b1Rows[0].current_status).toBe('in_storage');

    // C1 — packed inside A's own container: moves.
    const { rows: c1Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_components WHERE id = $1`,
      [c1Id]
    );
    expect(c1Rows[0].current_location_id).toBe(mbLocationBId);
    expect(c1Rows[0].current_status).toBe('at_show');

    // C2 — loose, belongs to A: moves.
    const { rows: c2Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_components WHERE id = $1`,
      [c2Id]
    );
    expect(c2Rows[0].current_location_id).toBe(mbLocationBId);
    expect(c2Rows[0].current_status).toBe('at_show');

    // C3 — belongs to A, but physically sits inside B's container (B1),
    // which is not moving. The cascade only follows containers owned by the
    // moving booth, plus loose components owned by it; a component that is
    // both foreign-container-packed AND not loose falls into neither
    // branch. So C3 must NOT move with booth A, even though its booth_id
    // is A. See the report for why this is worth a design sanity check.
    const { rows: c3Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_components WHERE id = $1`,
      [c3Id]
    );
    expect(c3Rows[0].current_location_id).toBe(mbLocationAId);
    expect(c3Rows[0].current_status).toBe('in_storage');

    // C4 — belongs to B, but is physically packed inside A1, which IS
    // moving. The cascade follows the CONTAINER, not the component's
    // recorded owner, so C4 moves along with the crate it's sitting in.
    const { rows: c4Rows } = await query(
      `SELECT current_location_id, current_status FROM booth_components WHERE id = $1`,
      [c4Id]
    );
    expect(c4Rows[0].current_location_id).toBe(mbLocationBId);
    expect(c4Rows[0].current_status).toBe('at_show');

    // Movement rows: exactly one per entity that actually moved, none for
    // entities that did not.
    const { rows: a1Movements } = await query(
      `SELECT * FROM booth_movements WHERE container_id = $1`, [containerA1Id]
    );
    expect(a1Movements).toHaveLength(1);
    expect(a1Movements[0].booth_id).toBe(boothAId);

    const { rows: b1Movements } = await query(
      `SELECT * FROM booth_movements WHERE container_id = $1`, [containerB1Id]
    );
    expect(b1Movements).toHaveLength(0);

    const { rows: c1Movements } = await query(
      `SELECT * FROM booth_movements WHERE component_id = $1`, [c1Id]
    );
    expect(c1Movements).toHaveLength(1);
    expect(c1Movements[0].booth_id).toBe(boothAId);

    const { rows: c2Movements } = await query(
      `SELECT * FROM booth_movements WHERE component_id = $1`, [c2Id]
    );
    expect(c2Movements).toHaveLength(1);
    expect(c2Movements[0].booth_id).toBe(boothAId);

    const { rows: c3Movements } = await query(
      `SELECT * FROM booth_movements WHERE component_id = $1`, [c3Id]
    );
    expect(c3Movements).toHaveLength(0);

    // C4's movement row must be attributed to ITS OWN booth (B), not A's —
    // the review fix: the cascade picks C4 up via the container it happens
    // to be sitting in, but the audit trail must not claim it as booth A's
    // history.
    const { rows: c4Movements } = await query(
      `SELECT * FROM booth_movements WHERE component_id = $1`, [c4Id]
    );
    expect(c4Movements).toHaveLength(1);
    expect(c4Movements[0].booth_id).toBe(boothBId);
  });
});
