import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../src/config/database';
import { boothManifestService } from '../../src/services/booth/BoothManifestService';

/**
 * Booth Manifest Integration Test
 *
 * BoothManifestService.assignBooth materialises the manifest with
 * `INSERT ... SELECT $1, unnest($2::uuid[]) ...` inside a real transaction,
 * getForEvent does real weight arithmetic over NUMERIC columns that pg
 * returns as strings, and syncDrift is an additive-only INSERT ... ON
 * CONFLICT. None of that is provable by mocking pg (see
 * tests/services/boothManifestService.test.ts for the mock-only unit
 * coverage) — this test exercises the real SQL against the dev database, per
 * the lesson from Task 6 where a mock-only suite let a Critical SQL defect
 * ship.
 */

const PREFIX = `itest-manifest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
const eventIds: string[] = [];
const boothIds: string[] = [];
const containerIds: string[] = [];
const assignmentIds: string[] = [];

async function makeEvent(name: string): Promise<string> {
  const { rows } = await query(
    `INSERT INTO events (
       name, venue, city, state, start_date, end_date,
       show_start_date, show_end_date, travel_start_date, travel_end_date, coordinator_id
     )
     VALUES ($1, 'Test Venue', 'Test City', 'TS', '2026-09-01', '2026-09-03',
             '2026-09-01', '2026-09-03', '2026-09-01', '2026-09-03', $2)
     RETURNING id`,
    [name, userId]
  );
  eventIds.push(rows[0].id);
  return rows[0].id;
}

async function makeBooth(name: string): Promise<string> {
  const { rows } = await query(`INSERT INTO booths (name) VALUES ($1) RETURNING id`, [name]);
  boothIds.push(rows[0].id);
  return rows[0].id;
}

async function makeContainer(
  boothId: string,
  name: string,
  packedWeight: number | null = null,
  weightUnit: 'lb' | 'kg' = 'lb'
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO booth_containers (booth_id, name, packed_weight_value, weight_unit)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [boothId, name, packedWeight, weightUnit]
  );
  containerIds.push(rows[0].id);
  return rows[0].id;
}

beforeAll(async () => {
  const { rows } = await query(
    `INSERT INTO users (username, password, name, email, role)
     VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
    [`${PREFIX}-user`, `${PREFIX} User`, `${PREFIX}@example.test`]
  );
  userId = rows[0].id;
});

afterAll(async () => {
  // FK order: manifest rows cascade off assignments, assignments cascade off
  // booths/events, but booth_containers only SET NULL on booth delete, so it
  // needs an explicit delete. Clean up defensively by collected id, not by
  // cascade alone, so a test that throws mid-run doesn't leak fixtures.
  if (assignmentIds.length) {
    await query(`DELETE FROM event_booth_manifest_containers WHERE assignment_id = ANY($1)`, [assignmentIds]);
    await query(`DELETE FROM event_booth_assignments WHERE id = ANY($1)`, [assignmentIds]);
  }
  if (containerIds.length) {
    await query(`DELETE FROM booth_containers WHERE id = ANY($1)`, [containerIds]);
  }
  if (boothIds.length) {
    await query(`DELETE FROM booths WHERE id = ANY($1)`, [boothIds]);
  }
  if (eventIds.length) {
    await query(`DELETE FROM events WHERE id = ANY($1)`, [eventIds]);
  }
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

describe('BoothManifestService.assignBooth (real database)', () => {
  it('materialises one manifest row per container the booth owns, via the real unnest() insert', async () => {
    const eventId = await makeEvent(`${PREFIX}-assign-event`);
    const boothId = await makeBooth(`${PREFIX}-assign-booth`);
    const c1 = await makeContainer(boothId, `${PREFIX}-assign-c1`);
    const c2 = await makeContainer(boothId, `${PREFIX}-assign-c2`);

    const result = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(result.id);

    expect(result.containers).toHaveLength(2);
    expect(result.containers.map((c) => c.container_id).sort()).toEqual([c1, c2].sort());

    const { rows } = await query(
      `SELECT container_id FROM event_booth_manifest_containers WHERE assignment_id = $1`,
      [result.id]
    );
    expect(rows.map((r: any) => r.container_id).sort()).toEqual([c1, c2].sort());
  });

  it('assigning the same booth to the same event twice surfaces a clean ConflictError, not a 500', async () => {
    const eventId = await makeEvent(`${PREFIX}-dup-event`);
    const boothId = await makeBooth(`${PREFIX}-dup-booth`);

    const first = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(first.id);

    await expect(boothManifestService.assignBooth(eventId, boothId, {}, userId)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('BoothManifestService.getForEvent weight arithmetic (real database)', () => {
  it('sums packed_weight_value of included containers only, coercing NUMERIC strings to numbers', async () => {
    const eventId = await makeEvent(`${PREFIX}-weight-event`);
    const boothId = await makeBooth(`${PREFIX}-weight-booth`);
    const included1 = await makeContainer(boothId, `${PREFIX}-weight-included-1`, 142);
    const included2Unweighed = await makeContainer(boothId, `${PREFIX}-weight-included-2-unweighed`, null);
    const excludedHeavy = await makeContainer(boothId, `${PREFIX}-weight-excluded`, 200);

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    await boothManifestService.setContainerIncluded(assigned.id, excludedHeavy, false);

    const [result] = await boothManifestService.getForEvent(eventId);
    expect(result.included_container_count).toBe(2); // included1 + included2Unweighed
    expect(result.weighed_container_count).toBe(1); // only included1 has a weight
    expect(result.weight_total).toBe(142);
    expect(typeof result.weight_total).toBe('number');
    expect(result.weight_units_mixed).toBe(false);

    // The excluded, heavier container must never contribute to the total.
    const excludedRow = result.containers.find((c) => c.container_id === excludedHeavy);
    expect(excludedRow?.included).toBe(false);
    expect(result.weight_total).not.toBe(342);

    void included2Unweighed;
  });

  it('returns a null weight_total when no included container has a recorded weight', async () => {
    const eventId = await makeEvent(`${PREFIX}-nullweight-event`);
    const boothId = await makeBooth(`${PREFIX}-nullweight-booth`);
    await makeContainer(boothId, `${PREFIX}-nullweight-c1`, null);
    await makeContainer(boothId, `${PREFIX}-nullweight-c2`, null);

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    const [result] = await boothManifestService.getForEvent(eventId);
    expect(result.weight_total).toBeNull();
    expect(result.included_container_count).toBe(2);
    expect(result.weighed_container_count).toBe(0);
    expect(result.weight_units_mixed).toBe(false);
  });

  it('detects mixed units across two included, weighed containers and refuses to total — does not guess or convert', async () => {
    const eventId = await makeEvent(`${PREFIX}-mixedunits-event`);
    const boothId = await makeBooth(`${PREFIX}-mixedunits-booth`);
    await makeContainer(boothId, `${PREFIX}-mixedunits-lb`, 142, 'lb');
    await makeContainer(boothId, `${PREFIX}-mixedunits-kg`, 40, 'kg');

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    const [result] = await boothManifestService.getForEvent(eventId);
    expect(result.weight_units_mixed).toBe(true);
    expect(result.weight_total).toBeNull();
    expect(result.weighed_container_count).toBe(2);
    expect(result.included_container_count).toBe(2);
  });

  it('does not flag mixed units when the differently-unit container is unweighed — only weighed units are compared', async () => {
    const eventId = await makeEvent(`${PREFIX}-unweighedunit-event`);
    const boothId = await makeBooth(`${PREFIX}-unweighedunit-booth`);
    const lbWeighed = await makeContainer(boothId, `${PREFIX}-unweighedunit-lb`, 142, 'lb');
    await makeContainer(boothId, `${PREFIX}-unweighedunit-kg-unweighed`, null, 'kg');

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    const [result] = await boothManifestService.getForEvent(eventId);
    // The unweighed kg container contributes no unit to the comparison, so
    // this must NOT be flagged as mixed — regression case for computing the
    // unit set over all included containers instead of only the weighed ones.
    expect(result.weight_units_mixed).toBe(false);
    expect(result.weight_total).toBe(142);
    expect(result.weighed_container_count).toBe(1);
    expect(result.included_container_count).toBe(2);
    void lbWeighed;
  });

  it('does not flag mixed units when the differently-unit container is excluded — excluded containers are not part of the shipment', async () => {
    const eventId = await makeEvent(`${PREFIX}-excludedunit-event`);
    const boothId = await makeBooth(`${PREFIX}-excludedunit-booth`);
    await makeContainer(boothId, `${PREFIX}-excludedunit-lb-1`, 142, 'lb');
    await makeContainer(boothId, `${PREFIX}-excludedunit-lb-2`, 88, 'lb');
    const excludedKg = await makeContainer(boothId, `${PREFIX}-excludedunit-kg`, 40, 'kg');

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    await boothManifestService.setContainerIncluded(assigned.id, excludedKg, false);

    const [result] = await boothManifestService.getForEvent(eventId);
    expect(result.weight_units_mixed).toBe(false);
    expect(result.weight_total).toBe(230);
    expect(result.weighed_container_count).toBe(2);
    expect(result.included_container_count).toBe(2);
  });
});

describe('BoothManifestService drift and syncDrift (real database)', () => {
  it('lists containers added to the booth AFTER assignment as drift, and omits containers present at assignment time', async () => {
    const eventId = await makeEvent(`${PREFIX}-drift-event`);
    const boothId = await makeBooth(`${PREFIX}-drift-booth`);
    const original = await makeContainer(boothId, `${PREFIX}-drift-original`);

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    // Added to the booth after the manifest was materialised — this is drift.
    const lateAddition = await makeContainer(boothId, `${PREFIX}-drift-late`);

    const [result] = await boothManifestService.getForEvent(eventId);
    expect(result.drift).toEqual([{ container_id: lateAddition, container_name: `${PREFIX}-drift-late` }]);
    expect(result.containers.map((c) => c.container_id)).toEqual([original]);
    expect(result.containers.map((c) => c.container_id)).not.toContain(lateAddition);
  });

  it('syncDrift adds exactly the missing rows and removes nothing — an excluded container stays excluded', async () => {
    const eventId = await makeEvent(`${PREFIX}-sync-event`);
    const boothId = await makeBooth(`${PREFIX}-sync-booth`);
    const original = await makeContainer(boothId, `${PREFIX}-sync-original`);

    const assigned = await boothManifestService.assignBooth(eventId, boothId, {}, userId);
    assignmentIds.push(assigned.id);

    // Explicitly exclude the original container from the manifest — this must
    // survive syncDrift untouched, since syncDrift only inserts, never updates
    // or deletes existing rows.
    await boothManifestService.setContainerIncluded(assigned.id, original, false);

    const lateA = await makeContainer(boothId, `${PREFIX}-sync-late-a`);
    const lateB = await makeContainer(boothId, `${PREFIX}-sync-late-b`);

    const beforeRows = await query(
      `SELECT container_id FROM event_booth_manifest_containers WHERE assignment_id = $1`,
      [assigned.id]
    );
    expect(beforeRows.rows).toHaveLength(1); // only `original`, still present

    const syncResult = await boothManifestService.syncDrift(assigned.id);
    expect(syncResult.added).toBe(2); // lateA + lateB

    const afterRows = await query(
      `SELECT container_id, included FROM event_booth_manifest_containers WHERE assignment_id = $1`,
      [assigned.id]
    );
    expect(afterRows.rows).toHaveLength(3); // nothing removed, two rows added

    const byContainer = Object.fromEntries(afterRows.rows.map((r: any) => [r.container_id, r]));
    expect(byContainer[original]).toBeDefined();
    expect(byContainer[original].included).toBe(false); // untouched by syncDrift
    expect(byContainer[lateA]).toBeDefined();
    expect(byContainer[lateB]).toBeDefined();

    // Calling syncDrift again must be a genuine no-op (ON CONFLICT DO NOTHING).
    const second = await boothManifestService.syncDrift(assigned.id);
    expect(second.added).toBe(0);
    const finalRows = await query(
      `SELECT container_id FROM event_booth_manifest_containers WHERE assignment_id = $1`,
      [assigned.id]
    );
    expect(finalRows.rows).toHaveLength(3);
  });
});
