import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../src/config/database';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';

/**
 * Booth Reports Integration Test
 *
 * Deliberately does NOT mock '../../src/config/database'. The unit tests in
 * tests/services/boothReports.test.ts mock pg entirely and only prove the JS
 * mapping logic; they cannot exercise the real UPDATE/SELECT statements or,
 * critically, the DISTINCT ON + LEFT JOIN + ORDER BY shape of listExceptions.
 * That shape is exactly the kind of thing a mock-based test cannot catch —
 * see the Task 6 lesson about a Critical SQL defect that shipped because its
 * mocks never ran the statement. This test runs the real SQL against the
 * real dev database.
 */

const PREFIX = `itest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
let eventId: string;
let boothId: string;

async function makeComponent(overrides: Record<string, unknown> = {}): Promise<string> {
  const name = overrides.name ?? `${PREFIX}-component`;
  const condition = overrides.condition ?? 'good';
  const current_status = overrides.current_status ?? 'at_show';
  const { rows } = await query(
    `INSERT INTO booth_components (booth_id, name, condition, current_status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [boothId, name, condition, current_status]
  );
  return rows[0].id;
}

beforeAll(async () => {
  const { rows: userRows } = await query(
    `INSERT INTO users (username, password, name, email, role)
     VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
    [`${PREFIX}-user`, `${PREFIX} User`, `${PREFIX}@example.test`]
  );
  userId = userRows[0].id;

  const { rows: eventRows } = await query(
    `INSERT INTO events (
       name, venue, city, state, start_date, end_date,
       show_start_date, show_end_date, travel_start_date, travel_end_date
     ) VALUES ($1, $2, 'City', 'ST', '2026-09-01', '2026-09-03',
               '2026-09-01', '2026-09-03', '2026-08-30', '2026-09-04')
     RETURNING id`,
    [`${PREFIX}-event`, `${PREFIX}-venue`]
  );
  eventId = eventRows[0].id;

  const { rows: boothRows } = await query(
    `INSERT INTO booths (name) VALUES ($1) RETURNING id`,
    [`${PREFIX}-booth`]
  );
  boothId = boothRows[0].id;

  await query(
    `INSERT INTO event_booth_assignments (event_id, booth_id) VALUES ($1, $2)`,
    [eventId, boothId]
  );
});

afterAll(async () => {
  // booth_movements FKs are ON DELETE SET NULL, not CASCADE, so clean them
  // up explicitly before the catalog rows they reference, in FK order.
  await query(`DELETE FROM booth_movements WHERE booth_id = $1`, [boothId]);
  await query(`DELETE FROM event_booth_assignments WHERE event_id = $1`, [eventId]);
  // booth_components.booth_id is ON DELETE CASCADE, so deleting the booth
  // removes its fixture components too.
  await query(`DELETE FROM booths WHERE id = $1`, [boothId]);
  await query(`DELETE FROM events WHERE id = $1`, [eventId]);
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

describe('booth reports (real database)', () => {
  it('damage report on a good component sets condition and status to damaged, one movement row', async () => {
    const componentId = await makeComponent({ name: `${PREFIX}-good-to-damaged` });

    const movement = await boothInventoryService.reportComponent(componentId, {
      kind: 'damage',
      notes: 'torn corner',
      eventId,
      performedBy: userId,
    });

    expect(movement.id).toBeTruthy();

    const { rows } = await query(
      `SELECT condition, current_status FROM booth_components WHERE id = $1`,
      [componentId]
    );
    expect(rows[0].condition).toBe('damaged');
    expect(rows[0].current_status).toBe('damaged');

    const { rows: movementRows } = await query(
      `SELECT count(*) FROM booth_movements
        WHERE component_id = $1 AND event_type = 'damage_report'`,
      [componentId]
    );
    expect(Number(movementRows[0].count)).toBe(1);
  });

  it('damage report on an already-missing component leaves status missing but sets condition damaged', async () => {
    const componentId = await makeComponent({
      name: `${PREFIX}-already-missing`,
      current_status: 'missing',
    });

    await boothInventoryService.reportComponent(componentId, {
      kind: 'damage',
      eventId,
      performedBy: userId,
    });

    const { rows } = await query(
      `SELECT condition, current_status FROM booth_components WHERE id = $1`,
      [componentId]
    );
    expect(rows[0].current_status).toBe('missing');
    expect(rows[0].condition).toBe('damaged');
  });

  it('missing report sets status missing and leaves condition unchanged', async () => {
    const componentId = await makeComponent({
      name: `${PREFIX}-missing-report`,
      condition: 'good',
    });

    await boothInventoryService.reportComponent(componentId, {
      kind: 'missing',
      eventId,
      performedBy: userId,
    });

    const { rows } = await query(
      `SELECT condition, current_status FROM booth_components WHERE id = $1`,
      [componentId]
    );
    expect(rows[0].current_status).toBe('missing');
    expect(rows[0].condition).toBe('good');
  });

  it('listExceptions returns the right rows with the most recent report per component', async () => {
    // A damaged component with two reports over time — listExceptions should
    // surface only the most recent one (the DISTINCT ON ... ORDER BY shape).
    const damagedId = await makeComponent({ name: `${PREFIX}-exc-damaged` });
    await boothInventoryService.reportComponent(damagedId, {
      kind: 'damage', notes: 'first report', eventId, performedBy: userId,
    });
    // Force a distinguishable, later created_at for the second report so
    // "most recent" is unambiguous regardless of clock resolution.
    await new Promise((r) => setTimeout(r, 10));
    await boothInventoryService.reportComponent(damagedId, {
      kind: 'damage', notes: 'second report', condition: 'fair', eventId, performedBy: userId,
    });

    // A missing component, reported once.
    const missingId = await makeComponent({ name: `${PREFIX}-exc-missing` });
    await boothInventoryService.reportComponent(missingId, {
      kind: 'missing', notes: 'lost at teardown', eventId, performedBy: userId,
    });

    // A perfectly fine component that should NOT appear.
    const goodId = await makeComponent({ name: `${PREFIX}-exc-good` });

    const rows = await boothInventoryService.listExceptions(eventId);
    const byId = new Map(rows.map((r) => [r.component_id, r]));

    expect(byId.has(goodId)).toBe(false);

    const damagedRow = byId.get(damagedId);
    expect(damagedRow).toBeDefined();
    expect(damagedRow!.condition).toBe('fair');
    expect(damagedRow!.current_status).toBe('damaged');
    expect(damagedRow!.notes).toBe('second report');
    expect(damagedRow!.reported_by_name).toBe(`${PREFIX} User`);
    expect(damagedRow!.booth_name).toBe(`${PREFIX}-booth`);

    const missingRow = byId.get(missingId);
    expect(missingRow).toBeDefined();
    expect(missingRow!.current_status).toBe('missing');
    expect(missingRow!.notes).toBe('lost at teardown');

    // No duplicate rows per component despite the multiple movement rows.
    const damagedRowCount = rows.filter((r) => r.component_id === damagedId).length;
    expect(damagedRowCount).toBe(1);
  });
});
