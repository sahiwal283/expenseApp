import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pool, query } from '../../src/config/database';
import { boothPackingService } from '../../src/services/booth/BoothPackingService';

/**
 * Booth Packing Integration Test
 *
 * BoothPackingService.getChecklist runs a UNION-style query
 * (WHERE default_container_id = $1 OR current_container_id = $1) and derives
 * expected/packed/stray flags from the two returned columns. None of that can
 * be verified by mocking pg — a mock only proves the JS ran, not that the SQL
 * actually returns the union of "belongs here" and "is here" rows. This test
 * exercises the real query and the real pack/unpack UPDATE + movement-log
 * writes against the dev database, per the lesson from Task 6 where a
 * mock-only suite let a Critical SQL defect ship.
 */

const PREFIX = `itest-pack-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
let boothId: string;
let containerAId: string; // "Crate A" — the container under test
let containerBId: string; // "Crate B" — where the stray actually belongs

beforeAll(async () => {
  const { rows: userRows } = await query(
    `INSERT INTO users (username, password, name, email, role)
     VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
    [`${PREFIX}-user`, `${PREFIX} User`, `${PREFIX}@example.test`]
  );
  userId = userRows[0].id;

  const { rows: boothRows } = await query(
    `INSERT INTO booths (name) VALUES ($1) RETURNING id`,
    [`${PREFIX}-booth`]
  );
  boothId = boothRows[0].id;

  const { rows: containerRows } = await query(
    `INSERT INTO booth_containers (booth_id, name) VALUES ($1, $2), ($1, $3) RETURNING id, name`,
    [boothId, `${PREFIX}-Crate-A`, `${PREFIX}-Crate-B`]
  );
  containerAId = containerRows.find((r: any) => r.name === `${PREFIX}-Crate-A`).id;
  containerBId = containerRows.find((r: any) => r.name === `${PREFIX}-Crate-B`).id;
});

afterAll(async () => {
  // FKs are ON DELETE SET NULL, not CASCADE, for movements and containers —
  // clean up explicitly in FK order, same pattern as booth-movements.test.ts.
  await query(
    `DELETE FROM booth_movements WHERE booth_id = $1 OR container_id = ANY($2)`,
    [boothId, [containerAId, containerBId]]
  );
  await query(`DELETE FROM booth_containers WHERE id = ANY($1)`, [[containerAId, containerBId]]);
  await query(`DELETE FROM booths WHERE id = $1`, [boothId]); // cascades components
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

/** Component ids created within a single test, cleaned up in afterEach. */
let componentIds: string[] = [];

async function makeComponent(fields: {
  name: string;
  default_container_id?: string | null;
  current_container_id?: string | null;
}): Promise<string> {
  const { rows } = await query(
    `INSERT INTO booth_components (booth_id, name, default_container_id, current_container_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [boothId, fields.name, fields.default_container_id ?? null, fields.current_container_id ?? null]
  );
  componentIds.push(rows[0].id);
  return rows[0].id;
}

beforeEach(() => {
  componentIds = [];
});

async function cleanupComponents() {
  if (componentIds.length) {
    await query(`DELETE FROM booth_movements WHERE component_id = ANY($1)`, [componentIds]);
    await query(`DELETE FROM booth_components WHERE id = ANY($1)`, [componentIds]);
  }
}

describe('BoothPackingService.getChecklist (real database)', () => {
  afterEach(cleanupComponents);

  it('derives expected/packed/stray from real rows, with the three flags and counts', async () => {
    const expectedPacked = await makeComponent({
      name: `${PREFIX}-expected-packed`,
      default_container_id: containerAId,
      current_container_id: containerAId,
    });
    const expectedNotPacked = await makeComponent({
      name: `${PREFIX}-expected-not-packed`,
      default_container_id: containerAId,
      current_container_id: null,
    });
    const stray = await makeComponent({
      name: `${PREFIX}-stray`,
      default_container_id: containerBId,
      current_container_id: containerAId,
    });

    const checklist = await boothPackingService.getChecklist(containerAId);
    const byId = Object.fromEntries(checklist.items.map((i) => [i.component_id, i]));

    expect(byId[expectedPacked].expected).toBe(true);
    expect(byId[expectedPacked].packed).toBe(true);
    expect(byId[expectedPacked].stray).toBe(false);

    expect(byId[expectedNotPacked].expected).toBe(true);
    expect(byId[expectedNotPacked].packed).toBe(false);
    expect(byId[expectedNotPacked].stray).toBe(false);

    expect(byId[stray].expected).toBe(false);
    expect(byId[stray].packed).toBe(false);
    expect(byId[stray].stray).toBe(true);
    expect(byId[stray].expected_container_id).toBe(containerBId);

    expect(checklist.expected_count).toBe(2);
    expect(checklist.packed_count).toBe(1);
    expect(checklist.stray_count).toBe(1);
    expect(checklist.complete).toBe(false);
  });

  it('is complete when every expected item is packed and there is no stray', async () => {
    await makeComponent({
      name: `${PREFIX}-only-item`,
      default_container_id: containerAId,
      current_container_id: containerAId,
    });

    const checklist = await boothPackingService.getChecklist(containerAId);
    expect(checklist.expected_count).toBe(1);
    expect(checklist.packed_count).toBe(1);
    expect(checklist.stray_count).toBe(0);
    expect(checklist.complete).toBe(true);
  });

  it('flips complete back to false when a stray lands in an otherwise fully packed crate', async () => {
    await makeComponent({
      name: `${PREFIX}-fully-packed-item`,
      default_container_id: containerAId,
      current_container_id: containerAId,
    });
    const before = await boothPackingService.getChecklist(containerAId);
    expect(before.complete).toBe(true);

    await makeComponent({
      name: `${PREFIX}-late-stray`,
      default_container_id: containerBId,
      current_container_id: containerAId,
    });
    const after = await boothPackingService.getChecklist(containerAId);
    expect(after.complete).toBe(false);
    expect(after.stray_count).toBe(1);
    // The originally-packed item's own status must not have changed.
    expect(after.packed_count).toBe(before.packed_count);
  });
});

describe('BoothPackingService.pack / unpack (real database)', () => {
  afterEach(cleanupComponents);

  it('pack sets current_container_id and writes exactly one container_change movement row per component', async () => {
    const c1 = await makeComponent({ name: `${PREFIX}-pack-1`, default_container_id: containerAId });
    const c2 = await makeComponent({ name: `${PREFIX}-pack-2`, default_container_id: containerAId });

    const result = await boothPackingService.pack(containerAId, [c1, c2], { performedBy: userId });
    expect(result.packed).toBe(2);

    const { rows: comps } = await query(
      `SELECT id, current_container_id FROM booth_components WHERE id = ANY($1)`,
      [[c1, c2]]
    );
    for (const row of comps) {
      expect(row.current_container_id).toBe(containerAId);
    }

    const { rows: movements } = await query(
      `SELECT component_id, event_type FROM booth_movements
        WHERE component_id = ANY($1) AND event_type = 'container_change'`,
      [[c1, c2]]
    );
    expect(movements.length).toBe(2);
    for (const m of movements) {
      expect(m.event_type).toBe('container_change');
    }
  });

  it('pack on a component already in the container is a genuine no-op', async () => {
    const c1 = await makeComponent({
      name: `${PREFIX}-noop`,
      default_container_id: containerAId,
      current_container_id: containerAId,
    });

    const result = await boothPackingService.pack(containerAId, [c1], { performedBy: userId });
    expect(result.packed).toBe(0);

    const { rows: movements } = await query(
      `SELECT count(*) FROM booth_movements WHERE component_id = $1`,
      [c1]
    );
    expect(Number(movements[0].count)).toBe(0);
  });

  it('unpack nulls current_container_id and logs the change', async () => {
    const c1 = await makeComponent({
      name: `${PREFIX}-unpack`,
      default_container_id: containerAId,
      current_container_id: containerAId,
    });

    const result = await boothPackingService.unpack(containerAId, [c1], { performedBy: userId });
    expect(result.unpacked).toBe(1);

    const { rows: comps } = await query(
      `SELECT current_container_id FROM booth_components WHERE id = $1`,
      [c1]
    );
    expect(comps[0].current_container_id).toBeNull();

    const { rows: movements } = await query(
      `SELECT from_container_id, to_container_id FROM booth_movements WHERE component_id = $1`,
      [c1]
    );
    expect(movements.length).toBe(1);
    expect(movements[0].from_container_id).toBe(containerAId);
    expect(movements[0].to_container_id).toBeNull();
  });

  it('a replayed pack with the same idempotencyKey does not create a second movement row', async () => {
    const c1 = await makeComponent({ name: `${PREFIX}-replay`, default_container_id: containerAId });
    const key = `${PREFIX}-replay-key`;

    const first = await boothPackingService.pack(containerAId, [c1], {
      performedBy: userId,
      idempotencyKey: key,
    });
    expect(first.packed).toBe(1);

    // Simulate the offline client re-sending the same pack action: unpack then
    // replay the identical pack call with the identical base key so the
    // derived per-component key collides exactly as it would on a real retry.
    await boothPackingService.unpack(containerAId, [c1], { performedBy: userId });
    await query(`UPDATE booth_components SET current_container_id = NULL WHERE id = $1`, [c1]);

    const second = await boothPackingService.pack(containerAId, [c1], {
      performedBy: userId,
      idempotencyKey: key,
    });
    // The derived key `${key}:pack:${c1}` already exists from the first pack,
    // so record() resolves it via ON CONFLICT DO NOTHING + a SELECT-back
    // rather than inserting again — count still reflects a state change...
    expect(second.packed).toBe(1);

    const { rows: movements } = await query(
      `SELECT count(*) FROM booth_movements
        WHERE component_id = $1 AND idempotency_key = $2`,
      [c1, `${key}:pack:${c1}`]
    );
    expect(Number(movements[0].count)).toBe(1);
  });
});

