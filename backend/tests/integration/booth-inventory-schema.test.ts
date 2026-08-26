import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query } from '../../src/config/database';

/**
 * Booth Inventory Schema Test
 *
 * Verifies migration 039 actually applied. Per project history, migrate.ts
 * silently skips a migration on a 42501 permission error, so a clean service
 * start is NOT proof the schema exists.
 */

const TABLES = [
  'inventory_locations',
  'booths',
  'booth_containers',
  'booth_components',
  'booth_movements',
  'event_booth_assignments',
  'event_booth_manifest_containers',
  'booth_attachments',
];

async function columnsOf(table: string): Promise<Set<string>> {
  const { rows } = await query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  return new Set(rows.map((r: { column_name: string }) => r.column_name));
}

describe('booth inventory schema (migration 039)', () => {
  afterAll(async () => { await pool.end(); });

  it('creates all eight tables', async () => {
    const { rows } = await query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [TABLES]
    );
    const found = rows.map((r: { table_name: string }) => r.table_name).sort();
    expect(found).toEqual([...TABLES].sort());
  });

  it('records migration 039 in schema_migrations', async () => {
    const { rows } = await query(
      `SELECT 1 FROM schema_migrations WHERE version LIKE '039%'`
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('gives booth_components the hybrid granularity columns', async () => {
    const cols = await columnsOf('booth_components');
    for (const c of ['quantity', 'asset_tag', 'default_container_id',
                     'current_container_id', 'current_location_id',
                     'parent_component_id', 'weight_value', 'condition']) {
      expect(cols.has(c), `booth_components.${c} missing`).toBe(true);
    }
  });

  describe('booth_components_instance_qty CHECK constraint', () => {
    // A real booth is required: booth_components.booth_id is NOT NULL and FK'd
    // to booths(id), so a bogus/nonexistent booth_id would fail on the FK
    // before Postgres ever evaluates the CHECK, making the test unable to
    // prove the CHECK itself exists and works.
    let boothId: string;

    beforeAll(async () => {
      const { rows } = await query(
        `INSERT INTO booths (name) VALUES ('Schema Test Fixture Booth') RETURNING id`
      );
      boothId = rows[0].id;
    });

    afterAll(async () => {
      // booth_components.booth_id is ON DELETE CASCADE, so deleting the
      // fixture booth also removes any component rows left behind.
      if (boothId) {
        await query(`DELETE FROM booths WHERE id = $1`, [boothId]);
      }
    });

    it('rejects an asset_tag row with quantity > 1', async () => {
      await expect(
        query(
          `INSERT INTO booth_components (booth_id, name, asset_tag, quantity)
           VALUES ($1, 'bad', 'TEST-BAD-1', 5)`,
          [boothId]
        )
      ).rejects.toThrow(/booth_components_instance_qty/);
    });

    it('allows an asset_tag row with quantity = 1', async () => {
      const { rows } = await query(
        `INSERT INTO booth_components (booth_id, name, asset_tag, quantity)
         VALUES ($1, 'good-tagged', 'TEST-GOOD-TAGGED-1', 1) RETURNING id`,
        [boothId]
      );
      expect(rows.length).toBe(1);
      await query(`DELETE FROM booth_components WHERE id = $1`, [rows[0].id]);
    });

    it('allows a pooled row with no asset_tag and quantity > 1', async () => {
      const { rows } = await query(
        `INSERT INTO booth_components (booth_id, name, quantity)
         VALUES ($1, 'good-pooled', 6) RETURNING id`,
        [boothId]
      );
      expect(rows.length).toBe(1);
      await query(`DELETE FROM booth_components WHERE id = $1`, [rows[0].id]);
    });
  });

  it('enforces unique idempotency_key on booth_movements', async () => {
    const { rows } = await query(
      `SELECT indexdef FROM pg_indexes
        WHERE tablename = 'booth_movements' AND indexdef ILIKE '%idempotency_key%'`
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].indexdef).toMatch(/UNIQUE/i);
  });

  it('requires a movement to reference a component or a container', async () => {
    const { rows } = await query(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'booth_movements'::regclass AND contype = 'c'`
    );
    const defs = rows.map((r: { def: string }) => r.def).join(' ');
    expect(defs).toMatch(/component_id IS NOT NULL/);
  });
});
