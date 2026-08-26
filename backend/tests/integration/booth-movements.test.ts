import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../src/config/database';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';

/**
 * Booth Movements Integration Test
 *
 * Deliberately does NOT mock '../../src/config/database' — the unit tests in
 * tests/services/boothMovementService.test.ts mock pg entirely, which proves
 * JS control flow but nothing about whether the SQL is actually valid.
 * BoothMovementService is the sole writer of an append-only log; this test
 * exercises the real INSERT ... ON CONFLICT statement against the real dev
 * database so a broken ON CONFLICT arbiter (e.g. a partial unique index
 * target that doesn't repeat its WHERE predicate) fails loudly here instead
 * of only in production.
 */

const PREFIX = `itest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
let boothId: string;
let containerId: string;
let componentId: string;

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
    `INSERT INTO booth_containers (booth_id, name) VALUES ($1, $2) RETURNING id`,
    [boothId, `${PREFIX}-container`]
  );
  containerId = containerRows[0].id;

  const { rows: componentRows } = await query(
    `INSERT INTO booth_components (booth_id, name) VALUES ($1, $2) RETURNING id`,
    [boothId, `${PREFIX}-component`]
  );
  componentId = componentRows[0].id;
});

afterAll(async () => {
  // Movements FK to booth/container/component with ON DELETE SET NULL, NOT
  // CASCADE, so deleting the fixture catalog rows would leave orphaned
  // movement rows behind rather than cleaning them up. Every movement this
  // test writes references the fixture booth, container, or component (some
  // via a null idempotency_key, so the prefix filter alone would miss them),
  // so delete by those foreign keys directly, then the catalog rows, in FK
  // order, then the fixture user.
  await query(
    `DELETE FROM booth_movements
      WHERE booth_id = $1 OR container_id = $2 OR component_id = $3`,
    [boothId, containerId, componentId]
  );
  if (containerId) {
    // booth_containers.booth_id is ON DELETE SET NULL, not CASCADE, so the
    // container must be deleted explicitly or it outlives its fixture booth.
    await query(`DELETE FROM booth_containers WHERE id = $1`, [containerId]);
  }
  if (boothId) {
    // booth_components.booth_id IS ON DELETE CASCADE, so this also removes
    // the fixture component.
    await query(`DELETE FROM booths WHERE id = $1`, [boothId]);
  }
  if (userId) {
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
  }
  await pool.end();
});

describe('booth movements (real database)', () => {
  it('inserts a movement row', async () => {
    const result = await boothMovementService.record({
      componentId,
      boothId,
      eventType: 'location_change',
      performedBy: userId,
      idempotencyKey: `${PREFIX}-insert`,
    });

    expect(result.id).toBeTruthy();

    const { rows } = await query(
      `SELECT count(*) FROM booth_movements WHERE idempotency_key = $1`,
      [`${PREFIX}-insert`]
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it('replaying the same idempotency_key is a no-op, not a duplicate', async () => {
    const key = `${PREFIX}-replay`;

    const first = await boothMovementService.record({
      componentId,
      eventType: 'status_change',
      performedBy: userId,
      idempotencyKey: key,
    });

    const second = await boothMovementService.record({
      componentId,
      eventType: 'status_change',
      performedBy: userId,
      idempotencyKey: key,
    });

    expect(second.id).toBe(first.id);

    const { rows } = await query(
      `SELECT count(*) FROM booth_movements WHERE idempotency_key = $1`,
      [key]
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it('two null-key writes both insert as distinct rows', async () => {
    // The partial unique index only applies WHERE idempotency_key IS NOT
    // NULL, so null keys must not collide with each other.
    const first = await boothMovementService.record({
      containerId,
      eventType: 'container_change',
      performedBy: userId,
      notes: `${PREFIX}-null-key-1`,
    });

    const second = await boothMovementService.record({
      containerId,
      eventType: 'container_change',
      performedBy: userId,
      notes: `${PREFIX}-null-key-2`,
    });

    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);

    const { rows } = await query(
      `SELECT count(*) FROM booth_movements WHERE notes IN ($1, $2)`,
      [`${PREFIX}-null-key-1`, `${PREFIX}-null-key-2`]
    );
    expect(Number(rows[0].count)).toBe(2);
  });

  it('withTransaction rolls back a movement recorded before the throw', async () => {
    const key = `${PREFIX}-rollback`;

    await expect(
      boothMovementService.withTransaction(async (client) => {
        await boothMovementService.record(
          {
            componentId,
            eventType: 'verification',
            performedBy: userId,
            idempotencyKey: key,
          },
          client
        );
        throw new Error('rollback trigger');
      })
    ).rejects.toThrow('rollback trigger');

    const { rows } = await query(
      `SELECT count(*) FROM booth_movements WHERE idempotency_key = $1`,
      [key]
    );
    expect(Number(rows[0].count)).toBe(0);
  });
});
