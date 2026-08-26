# Booth Inventory & Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track every physical booth piece — which booth it belongs to, which crate it packs into, where it is right now, and which show it is going to.

**Architecture:** Three-layer catalog (booth → containers → components) with hybrid granularity: a component row is either a counted pool (`quantity: 6`) or one tagged physical object (`asset_tag: 'FAB-01'`). Location, container, and status are three independent columns; every change to any of them appends an immutable row to `booth_movements`. The packing checklist is a *derived* diff of `current_container_id` vs `default_container_id` — no session table. Per-event manifests are materialised at assignment time so they snapshot intent rather than tracking live booth edits.

**Tech Stack:** Express + TypeScript, raw `pg` with the repository pattern (no ORM), PostgreSQL, Vitest. Frontend React 18 + Vite, Dexie (IndexedDB) for offline, axios via `apiClient.ts`.

**Spec:** `docs/superpowers/specs/2026-08-26-booth-inventory-design.md`

## Global Constraints

- **Target version: v2.20.0** — SemVer minor. Bump `package.json`, `backend/package.json`, and `backend/src/config/version.ts` together.
- **Migration number: `039`** — file `backend/src/database/migrations/039_create_booth_inventory.sql`. Never modify an existing migration.
- **No ORM.** Raw parameterised SQL only. All repositories extend `BaseRepository` and are exported as lowercase singletons (e.g. `export const boothRepository = new BoothRepository()`).
- **Routes never import from other routes.** Cross-cutting logic lives in `backend/src/services/booth/`. Shared role tiers live in `backend/src/config/boothRoles.ts` (created in Task 2) — every booth route imports `READ_ROLES` / `WRITE_ROLES` from there, never from a sibling route file.
- **All routes** use `authorize(...)` from `../middleware/auth` and `asyncHandler` from `../utils/errors`.
- **Error classes** come from `../utils/errors`: `NotFoundError`, `ValidationError`, `ConflictError`.
- **Role tiers** (exact, from spec §2.2):
  - Catalog management: `'admin', 'coordinator', 'developer'`
  - Field operations: `'admin', 'coordinator', 'developer', 'salesperson'`
  - Reads: field-operations roles.
  - `accountant` and `pending` get nothing.
  - **Do NOT tighten API reads to match the Booths *page* gate.** The page is admin/coordinator/developer only, but `salesperson` must be able to READ every inventory endpoint or the checklist manifest panel breaks.
- **Table names:** `inventory_locations` (NOT `locations` — `events` already has venue/city/state), `booths`, `booth_containers`, `booth_components`, `booth_movements`, `event_booth_assignments`, `event_booth_manifest_containers`, `booth_attachments`.
- **Tests:** Vitest. Unit/repository tests mock `../../src/config/database`. Run from `backend/`.

---

## Task 1: Migration 039 — schema

**Files:**
- Create: `backend/src/database/migrations/039_create_booth_inventory.sql`
- Test: `backend/tests/integration/booth-inventory-schema.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: eight tables. Every later task depends on these exact column names.

- [ ] **Step 1: Write the failing schema test**

Create `backend/tests/integration/booth-inventory-schema.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
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

  it('rejects an asset_tag row with quantity > 1', async () => {
    await expect(
      query(
        `INSERT INTO booth_components (booth_id, name, asset_tag, quantity)
         VALUES (gen_random_uuid(), 'bad', 'TEST-BAD-1', 5)`
      )
    ).rejects.toThrow();
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/integration/booth-inventory-schema.test.ts`
Expected: FAIL — tables do not exist, `found` is `[]`.

- [ ] **Step 3: Write the migration**

Create `backend/src/database/migrations/039_create_booth_inventory.sql`:

```sql
-- Migration: booth inventory and tracking
-- Description: Physical booth asset tracking. Three layers — booths own
--   containers (crates/cases/bags) and components (frame, fabric, lights).
--   A component is EITHER a counted pool (quantity: 6, asset_tag NULL) OR one
--   tagged physical object (asset_tag set, quantity forced to 1). Location,
--   container and status are independent; every change appends an immutable
--   row to booth_movements. idempotency_key is present from day one because
--   offline packing replays movements from the client queue.
--   Named inventory_locations, not locations: events already carries
--   venue/city/state and a bare `locations` would read as event venues.
-- Version: 2.20.0
-- Date: August 26, 2026

CREATE TABLE IF NOT EXISTS inventory_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  type          VARCHAR(50) NOT NULL DEFAULT 'other'
                  CHECK (type IN ('company_warehouse','storage_unit','partner_company',
                                  'partner_person','carrier','convention_center',
                                  'hotel','show_site','other')),
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100),
  contact_name  VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_active ON inventory_locations(is_active);

CREATE TABLE IF NOT EXISTS booths (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  brand               VARCHAR(255),
  size                VARCHAR(100),
  type                VARCHAR(100),
  manufacturer        VARCHAR(255),
  year_acquired       INTEGER,
  description         TEXT,
  notes               TEXT,
  current_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  current_status      VARCHAR(50) NOT NULL DEFAULT 'in_storage'
                        CHECK (current_status IN ('in_storage','at_warehouse',
                               'at_partner_location','in_transit','at_show','retired')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_booths_active   ON booths(is_active);
CREATE INDEX IF NOT EXISTS idx_booths_status   ON booths(current_status);
CREATE INDEX IF NOT EXISTS idx_booths_location ON booths(current_location_id);

CREATE TABLE IF NOT EXISTS booth_containers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id             UUID REFERENCES booths(id) ON DELETE SET NULL,
  name                 VARCHAR(255) NOT NULL,
  label                VARCHAR(100),
  description          TEXT,
  type                 VARCHAR(50) NOT NULL DEFAULT 'box'
                         CHECK (type IN ('bag','box','crate','case','pallet','other')),
  asset_tag            VARCHAR(64),
  dimensions           VARCHAR(100),
  weight_capacity      VARCHAR(100),
  current_location_id  UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  current_status       VARCHAR(50) NOT NULL DEFAULT 'in_storage'
                         CHECK (current_status IN ('in_storage','in_transit','at_show','missing')),
  empty_weight_value   NUMERIC(8,2),
  packed_weight_value  NUMERIC(8,2),
  weight_unit          VARCHAR(3) NOT NULL DEFAULT 'lb' CHECK (weight_unit IN ('lb','kg')),
  weight_source        VARCHAR(20)
                         CHECK (weight_source IS NULL OR weight_source IN
                                ('estimated','measured','carrier','manufacturer','unknown')),
  weight_notes         TEXT,
  weight_updated_at    TIMESTAMPTZ,
  weight_updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booth_containers_asset_tag
  ON booth_containers(asset_tag) WHERE asset_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booth_containers_booth    ON booth_containers(booth_id);
CREATE INDEX IF NOT EXISTS idx_booth_containers_location ON booth_containers(current_location_id);

CREATE TABLE IF NOT EXISTS booth_components (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id             UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  parent_component_id  UUID REFERENCES booth_components(id) ON DELETE SET NULL,
  name                 VARCHAR(255) NOT NULL,
  category             VARCHAR(100) NOT NULL DEFAULT 'other'
                         CHECK (category IN ('frame','frame_part','fabric','shelf','table_top',
                                'banner','light','hardware','tool','case','side_piece',
                                'setup_accessory','other')),
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  asset_tag            VARCHAR(64),
  condition            VARCHAR(50) NOT NULL DEFAULT 'good'
                         CHECK (condition IN ('good','fair','damaged','retired')),
  current_status       VARCHAR(50) NOT NULL DEFAULT 'in_storage'
                         CHECK (current_status IN ('in_storage','in_transit','at_show',
                                'missing','damaged','retired')),
  current_location_id  UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  default_container_id UUID REFERENCES booth_containers(id) ON DELETE SET NULL,
  current_container_id UUID REFERENCES booth_containers(id) ON DELETE SET NULL,
  last_verified_at     TIMESTAMPTZ,
  last_verified_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  weight_value         NUMERIC(8,2),
  weight_unit          VARCHAR(3) NOT NULL DEFAULT 'lb' CHECK (weight_unit IN ('lb','kg')),
  weight_source        VARCHAR(20)
                         CHECK (weight_source IS NULL OR weight_source IN
                                ('estimated','measured','carrier','manufacturer','unknown')),
  weight_notes         TEXT,
  weight_updated_at    TIMESTAMPTZ,
  weight_updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT booth_components_instance_qty CHECK (asset_tag IS NULL OR quantity = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booth_components_asset_tag
  ON booth_components(asset_tag) WHERE asset_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booth_components_booth     ON booth_components(booth_id);
CREATE INDEX IF NOT EXISTS idx_booth_components_default   ON booth_components(default_container_id);
CREATE INDEX IF NOT EXISTS idx_booth_components_current   ON booth_components(current_container_id);
CREATE INDEX IF NOT EXISTS idx_booth_components_location  ON booth_components(current_location_id);
CREATE INDEX IF NOT EXISTS idx_booth_components_status    ON booth_components(current_status);
CREATE INDEX IF NOT EXISTS idx_booth_components_parent    ON booth_components(parent_component_id);

CREATE TABLE IF NOT EXISTS booth_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id       UUID REFERENCES booth_components(id) ON DELETE SET NULL,
  container_id       UUID REFERENCES booth_containers(id) ON DELETE SET NULL,
  booth_id           UUID REFERENCES booths(id) ON DELETE SET NULL,
  event_type         VARCHAR(50) NOT NULL
                       CHECK (event_type IN ('location_change','container_change',
                              'status_change','verification','damage_report','missing_report')),
  from_location_id   UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id     UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  from_container_id  UUID REFERENCES booth_containers(id) ON DELETE SET NULL,
  to_container_id    UUID REFERENCES booth_containers(id) ON DELETE SET NULL,
  from_status        VARCHAR(50),
  to_status          VARCHAR(50),
  from_condition     VARCHAR(50),
  to_condition       VARCHAR(50),
  event_id           UUID REFERENCES events(id) ON DELETE SET NULL,
  performed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  notes              TEXT,
  idempotency_key    VARCHAR(128),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT booth_movements_target CHECK (component_id IS NOT NULL OR container_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booth_movements_idempotency
  ON booth_movements(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booth_movements_booth     ON booth_movements(booth_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booth_movements_component ON booth_movements(component_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booth_movements_container ON booth_movements(container_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booth_movements_event     ON booth_movements(event_id);

CREATE TABLE IF NOT EXISTS event_booth_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  status          VARCHAR(50) NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','preparing','shipped','at_show','returned','cancelled')),
  needed_by_date  DATE,
  setup_notes     TEXT,
  teardown_notes  TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT event_booth_assignments_unique UNIQUE (event_id, booth_id)
);
CREATE INDEX IF NOT EXISTS idx_event_booth_assignments_event ON event_booth_assignments(event_id);

CREATE TABLE IF NOT EXISTS event_booth_manifest_containers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES event_booth_assignments(id) ON DELETE CASCADE,
  container_id  UUID NOT NULL REFERENCES booth_containers(id) ON DELETE CASCADE,
  included      BOOLEAN NOT NULL DEFAULT true,
  is_extra      BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT event_booth_manifest_unique UNIQUE (assignment_id, container_id)
);
CREATE INDEX IF NOT EXISTS idx_manifest_containers_assignment
  ON event_booth_manifest_containers(assignment_id);

CREATE TABLE IF NOT EXISTS booth_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL
                CHECK (entity_type IN ('booth','container','component','movement')),
  entity_id   UUID NOT NULL,
  url         TEXT NOT NULL,
  caption     TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_booth_attachments_entity
  ON booth_attachments(entity_type, entity_id);
```

- [ ] **Step 4: Apply and verify**

Run: `cd backend && npm run migrate && npx vitest run tests/integration/booth-inventory-schema.test.ts`
Expected: PASS, all six assertions.

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/migrations/039_create_booth_inventory.sql \
        backend/tests/integration/booth-inventory-schema.test.ts
git commit -m "feat(booth): migration 039 — booth inventory schema"
```

---

## Task 2: InventoryLocationRepository + routes

This is the simplest full vertical slice and establishes the pattern every later repository and route follows. Read it carefully before Tasks 3–5.

**Files:**
- Create: `backend/src/config/boothRoles.ts`
- Create: `backend/src/database/repositories/InventoryLocationRepository.ts`
- Create: `backend/src/routes/inventoryLocations.ts`
- Modify: `backend/src/database/repositories/index.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/repositories/InventoryLocationRepository.test.ts`

**Interfaces:**
- Consumes: `inventory_locations` table (Task 1); `BaseRepository`.
- Produces:
  - `export interface InventoryLocation { id, name, type, address, city, state, country, contact_name, contact_phone, contact_email, notes, is_active, created_at, updated_at }`
  - `export const inventoryLocationRepository: InventoryLocationRepository`
  - Methods: `search(filters: { q?: string; type?: string; isActive?: boolean }): Promise<InventoryLocation[]>`, `create(data: Partial<InventoryLocation>): Promise<InventoryLocation>`, `update(id: string, data: Partial<InventoryLocation>): Promise<InventoryLocation>`, `softDelete(id: string): Promise<void>`
  - Mounted at `/api/inventory-locations`
  - `backend/src/config/boothRoles.ts` exporting `READ_ROLES` and `WRITE_ROLES` — **every** booth route in Tasks 3–11 imports them from here.

- [ ] **Step 0: Create the shared role module**

Create `backend/src/config/boothRoles.ts`:

```typescript
/**
 * Booth inventory role tiers.
 *
 * Two tiers, because the people who MANAGE the catalog are not the people who
 * PACK the crates.
 *
 * Note the deliberate asymmetry: `salesperson` can read every inventory
 * endpoint but cannot see the global Booths page. The page gate is a UI
 * decision; the API read permission is what makes the checklist manifest panel
 * work for setup crew. Do NOT tighten READ_ROLES to match the page gate.
 */

/** Reads + field operations: moves, pack/unpack, verify, damage reports. */
export const READ_ROLES = ['admin', 'coordinator', 'developer', 'salesperson'] as const;

/** Catalog management: create/edit/delete booths, containers, components, manifests. */
export const WRITE_ROLES = ['admin', 'coordinator', 'developer'] as const;
```

- [ ] **Step 1: Write the failing repository test**

Create `backend/tests/repositories/InventoryLocationRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryLocationRepository } from '../../src/database/repositories/InventoryLocationRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'loc-1', name: 'Main Warehouse', type: 'company_warehouse',
  address: null, city: 'Tampa', state: 'FL', country: 'US',
  contact_name: null, contact_phone: null, contact_email: null,
  notes: null, is_active: true,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('InventoryLocationRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('search with no filters returns active-ordered list', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.search({});
    expect(result).toEqual([row]);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('FROM inventory_locations');
    expect(sql).toContain('ORDER BY name');
  });

  it('search filters by q, type and isActive with parameterised SQL', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await inventoryLocationRepository.search({ q: 'ware', type: 'storage_unit', isActive: true });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('name ILIKE');
    expect(sql).toContain('type = ');
    expect(sql).toContain('is_active = ');
    expect(params).toEqual(['%ware%', 'storage_unit', true]);
  });

  it('create inserts and returns the row', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.create({ name: 'Main Warehouse', type: 'company_warehouse' });
    expect(result).toEqual(row);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO inventory_locations');
    expect(sql).toContain('RETURNING *');
  });

  it('update throws NotFoundError when the row is missing', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(inventoryLocationRepository.update('missing', { name: 'x' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('update with no fields is a no-op read', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await inventoryLocationRepository.update('loc-1', {});
    expect(result).toEqual(row);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('SELECT');
    expect(sql).not.toContain('UPDATE');
  });

  it('softDelete sets is_active false rather than deleting', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await inventoryLocationRepository.softDelete('loc-1');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('UPDATE inventory_locations');
    expect(sql).toContain('is_active = false');
    expect(sql).not.toContain('DELETE');
    expect(params).toEqual(['loc-1']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/repositories/InventoryLocationRepository.test.ts`
Expected: FAIL — cannot resolve `InventoryLocationRepository`.

- [ ] **Step 3: Write the repository**

Create `backend/src/database/repositories/InventoryLocationRepository.ts`:

```typescript
/**
 * Inventory Location Repository
 *
 * Physical places booth assets can be: warehouses, storage units, convention
 * centres, carriers, partner sites. Named inventory_locations (not locations)
 * because events already carries venue/city/state.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface InventoryLocation {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationFilters {
  q?: string;
  type?: string;
  isActive?: boolean;
}

const WRITABLE = [
  'name', 'type', 'address', 'city', 'state', 'country',
  'contact_name', 'contact_phone', 'contact_email', 'notes', 'is_active',
] as const;

export class InventoryLocationRepository extends BaseRepository<InventoryLocation> {
  protected tableName = 'inventory_locations';

  async search(filters: LocationFilters): Promise<InventoryLocation[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`name ILIKE $${params.length}`); }
    if (filters.type) { params.push(filters.type); where.push(`type = $${params.length}`); }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive); where.push(`is_active = $${params.length}`);
    }

    const result = await this.executeQuery<InventoryLocation>(
      `SELECT * FROM inventory_locations
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY name ASC`,
      params as any[]
    );
    return result.rows;
  }

  async create(data: Partial<InventoryLocation>): Promise<InventoryLocation> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const params = cols.map((c) => data[c]);
    const result = await this.executeQuery<InventoryLocation>(
      `INSERT INTO inventory_locations (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      params as any[]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<InventoryLocation>): Promise<InventoryLocation> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);

    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Location not found');
      return existing;
    }

    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<InventoryLocation>(
      `UPDATE inventory_locations
          SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length}
        RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Location not found');
    return result.rows[0];
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.executeQuery(
      `UPDATE inventory_locations
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Location not found');
  }
}

export const inventoryLocationRepository = new InventoryLocationRepository();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/repositories/InventoryLocationRepository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the routes**

Create `backend/src/routes/inventoryLocations.ts`:

```typescript
/**
 * Inventory Location Routes — /api/inventory-locations
 *
 * Reads are open to field-operations roles (salesperson included) so the
 * checklist manifest panel can resolve location names. Writes are catalog
 * management only.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors';
import { inventoryLocationRepository } from '../database/repositories/InventoryLocationRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';

const router = Router();

const LOCATION_TYPES = [
  'company_warehouse', 'storage_unit', 'partner_company', 'partner_person',
  'carrier', 'convention_center', 'hotel', 'show_site', 'other',
];

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, type, is_active } = req.query;
  res.json(await inventoryLocationRepository.search({
    q: typeof q === 'string' ? q : undefined,
    type: typeof type === 'string' ? type : undefined,
    isActive: is_active === undefined ? undefined : is_active !== 'false',
  }));
}));

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const location = await inventoryLocationRepository.findById(req.params.id);
  if (!location) throw new NotFoundError('Location not found');
  res.json(location);
}));

router.post('/', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  if (type && !LOCATION_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${LOCATION_TYPES.join(', ')}`);
  res.status(201).json(await inventoryLocationRepository.create(req.body));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.body;
  if (type && !LOCATION_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${LOCATION_TYPES.join(', ')}`);
  res.json(await inventoryLocationRepository.update(req.params.id, req.body));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await inventoryLocationRepository.softDelete(req.params.id);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 6: Mount the routes and export the repository**

In `backend/src/server.ts`, add the import alongside the other route imports:

```typescript
import inventoryLocationRoutes from './routes/inventoryLocations';
```

and mount it immediately after the `/api/checklist` mount:

```typescript
app.use('/api/inventory-locations', authenticateToken, sessionTracker, inventoryLocationRoutes);
```

In `backend/src/database/repositories/index.ts`, add:

```typescript
export { inventoryLocationRepository, InventoryLocationRepository } from './InventoryLocationRepository';
export type { InventoryLocation, LocationFilters } from './InventoryLocationRepository';
```

- [ ] **Step 7: Verify the build and full suite**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/config/boothRoles.ts \
        backend/src/database/repositories/InventoryLocationRepository.ts \
        backend/src/routes/inventoryLocations.ts \
        backend/src/database/repositories/index.ts \
        backend/src/server.ts \
        backend/tests/repositories/InventoryLocationRepository.test.ts
git commit -m "feat(booth): inventory locations repository and routes"
```

---

## Task 3: BoothRepository + booth routes

**Files:**
- Create: `backend/src/database/repositories/BoothRepository.ts`
- Create: `backend/src/routes/booths.ts`
- Modify: `backend/src/database/repositories/index.ts`, `backend/src/server.ts`
- Test: `backend/tests/repositories/BoothRepository.test.ts`

**Interfaces:**
- Consumes: `booths` table (Task 1); `BaseRepository`; `READ_ROLES` / `WRITE_ROLES` from `backend/src/config/boothRoles.ts` (Task 2).
- Produces:
  - `export interface Booth { id, name, brand, size, type, manufacturer, year_acquired, description, notes, current_location_id, current_status, is_active, created_at, updated_at }`
  - `export interface BoothWithCounts extends Booth { container_count: number; component_count: number; location_name: string | null }`
  - `export const boothRepository: BoothRepository`
  - Methods: `search(filters: { q?, status?, locationId?, isActive? }): Promise<BoothWithCounts[]>`, `findByIdWithCounts(id): Promise<BoothWithCounts | null>`, `create(data): Promise<Booth>`, `update(id, data): Promise<Booth>`, `softDelete(id): Promise<void>`
  - Mounted at `/api/booths`

- [ ] **Step 1: Write the failing repository test**

Create `backend/tests/repositories/BoothRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothRepository } from '../../src/database/repositories/BoothRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'booth-1', name: '20x20 Haute Main', brand: 'Haute Brands',
  size: '20x20', type: 'island', manufacturer: null, year_acquired: 2024,
  description: null, notes: null, current_location_id: 'loc-1',
  current_status: 'in_storage', is_active: true,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
  container_count: 3, component_count: 42, location_name: 'Main Warehouse',
};

describe('BoothRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('search joins location name and aggregates counts', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothRepository.search({});
    expect(result[0].container_count).toBe(3);
    expect(result[0].component_count).toBe(42);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('LEFT JOIN inventory_locations');
    expect(sql).toContain('booth_containers');
    expect(sql).toContain('booth_components');
  });

  it('search filters by q, status, locationId and isActive', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await boothRepository.search({ q: 'haute', status: 'at_show', locationId: 'loc-1', isActive: true });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('b.name ILIKE');
    expect(sql).toContain('b.current_status =');
    expect(sql).toContain('b.current_location_id =');
    expect(sql).toContain('b.is_active =');
    expect(params).toEqual(['%haute%', 'at_show', 'loc-1', true]);
  });

  it('counts are numbers, not pg count strings', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...row, container_count: '3', component_count: '42' }], rowCount: 1,
    } as any);
    const result = await boothRepository.search({});
    expect(result[0].container_count).toBe(3);
    expect(typeof result[0].component_count).toBe('number');
  });

  it('findByIdWithCounts returns null when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    expect(await boothRepository.findByIdWithCounts('nope')).toBeNull();
  });

  it('create inserts and returns the row', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothRepository.create({ name: '20x20 Haute Main' });
    expect(result.name).toBe('20x20 Haute Main');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).toContain('INSERT INTO booths');
  });

  it('update throws NotFoundError when missing', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothRepository.update('missing', { name: 'x' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('softDelete sets is_active false', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothRepository.softDelete('booth-1');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('is_active = false');
    expect(sql).not.toContain('DELETE');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/repositories/BoothRepository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository**

Create `backend/src/database/repositories/BoothRepository.ts`:

```typescript
/**
 * Booth Repository
 *
 * A booth is the top-level durable asset. Its current_status is a macro state
 * and deliberately does NOT cascade to components — components track their own
 * status because a booth is rarely wholly in one place.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface Booth {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  type: string | null;
  manufacturer: string | null;
  year_acquired: number | null;
  description: string | null;
  notes: string | null;
  current_location_id: string | null;
  current_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoothWithCounts extends Booth {
  container_count: number;
  component_count: number;
  location_name: string | null;
}

export interface BoothFilters {
  q?: string;
  status?: string;
  locationId?: string;
  isActive?: boolean;
}

const WRITABLE = [
  'name', 'brand', 'size', 'type', 'manufacturer', 'year_acquired',
  'description', 'notes', 'current_location_id', 'current_status', 'is_active',
] as const;

const SELECT_WITH_COUNTS = `
  SELECT b.*,
         l.name AS location_name,
         COALESCE(c.cnt, 0) AS container_count,
         COALESCE(k.cnt, 0) AS component_count
    FROM booths b
    LEFT JOIN inventory_locations l ON l.id = b.current_location_id
    LEFT JOIN (SELECT booth_id, COUNT(*)::int AS cnt FROM booth_containers GROUP BY booth_id) c
           ON c.booth_id = b.id
    LEFT JOIN (SELECT booth_id, COUNT(*)::int AS cnt FROM booth_components GROUP BY booth_id) k
           ON k.booth_id = b.id`;

function normalise(row: BoothWithCounts): BoothWithCounts {
  return {
    ...row,
    container_count: Number(row.container_count) || 0,
    component_count: Number(row.component_count) || 0,
  };
}

export class BoothRepository extends BaseRepository<Booth> {
  protected tableName = 'booths';

  async search(filters: BoothFilters): Promise<BoothWithCounts[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`b.name ILIKE $${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`b.current_status = $${params.length}`); }
    if (filters.locationId) { params.push(filters.locationId); where.push(`b.current_location_id = $${params.length}`); }
    if (filters.isActive !== undefined) { params.push(filters.isActive); where.push(`b.is_active = $${params.length}`); }

    const result = await this.executeQuery<BoothWithCounts>(
      `${SELECT_WITH_COUNTS}
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY b.name ASC`,
      params as any[]
    );
    return result.rows.map(normalise);
  }

  async findByIdWithCounts(id: string): Promise<BoothWithCounts | null> {
    const result = await this.executeQuery<BoothWithCounts>(
      `${SELECT_WITH_COUNTS} WHERE b.id = $1`, [id]
    );
    return result.rows[0] ? normalise(result.rows[0]) : null;
  }

  async create(data: Partial<Booth>): Promise<Booth> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<Booth>(
      `INSERT INTO booths (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<Booth>): Promise<Booth> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Booth not found');
      return existing;
    }
    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<Booth>(
      `UPDATE booths SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Booth not found');
    return result.rows[0];
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.executeQuery(
      `UPDATE booths SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Booth not found');
  }
}

export const boothRepository = new BoothRepository();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/repositories/BoothRepository.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write the routes**

Create `backend/src/routes/booths.ts`. Nested container/component collection routes are added in Tasks 4 and 5; this task creates the file with booth-level routes only.

```typescript
/**
 * Booth Routes — /api/booths
 *
 * Reads are open to field-operations roles so the checklist manifest panel
 * works for setup crew. Writes are catalog management only.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors';
import { boothRepository } from '../database/repositories/BoothRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';

const router = Router();

export const BOOTH_STATUSES = [
  'in_storage', 'at_warehouse', 'at_partner_location',
  'in_transit', 'at_show', 'retired',
];

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, status, location_id, is_active } = req.query;
  res.json(await boothRepository.search({
    q: typeof q === 'string' ? q : undefined,
    status: typeof status === 'string' ? status : undefined,
    locationId: typeof location_id === 'string' ? location_id : undefined,
    isActive: is_active === undefined ? true : is_active !== 'false',
  }));
}));

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const booth = await boothRepository.findByIdWithCounts(req.params.id);
  if (!booth) throw new NotFoundError('Booth not found');
  res.json(booth);
}));

router.post('/', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, current_status } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  if (current_status && !BOOTH_STATUSES.includes(current_status)) {
    throw new ValidationError(`current_status must be one of: ${BOOTH_STATUSES.join(', ')}`);
  }
  res.status(201).json(await boothRepository.create(req.body));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { current_status } = req.body;
  if (current_status && !BOOTH_STATUSES.includes(current_status)) {
    throw new ValidationError(`current_status must be one of: ${BOOTH_STATUSES.join(', ')}`);
  }
  res.json(await boothRepository.update(req.params.id, req.body));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothRepository.softDelete(req.params.id);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 6: Mount and export**

In `backend/src/server.ts` add `import boothRoutes from './routes/booths';` and mount after the inventory-locations line:

```typescript
app.use('/api/booths', authenticateToken, sessionTracker, boothRoutes);
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { boothRepository, BoothRepository } from './BoothRepository';
export type { Booth, BoothWithCounts, BoothFilters } from './BoothRepository';
```

- [ ] **Step 7: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/database/repositories/BoothRepository.ts \
        backend/src/routes/booths.ts \
        backend/src/database/repositories/index.ts \
        backend/src/server.ts \
        backend/tests/repositories/BoothRepository.test.ts
git commit -m "feat(booth): booth repository and CRUD routes"
```

---

## Task 4: BoothContainerRepository + container routes

**Files:**
- Create: `backend/src/database/repositories/BoothContainerRepository.ts`
- Create: `backend/src/routes/boothContainers.ts`
- Create: `backend/src/validation/boothValidation.ts`
- Modify: `backend/src/routes/booths.ts` (add nested collection routes)
- Modify: `backend/src/database/repositories/index.ts`, `backend/src/server.ts`
- Test: `backend/tests/repositories/BoothContainerRepository.test.ts`

**Interfaces:**
- Consumes: `booth_containers` table (Task 1); `READ_ROLES` / `WRITE_ROLES` from `backend/src/config/boothRoles.ts` (Task 2).
- Produces:
  - `export interface BoothContainer { id, booth_id, name, label, description, type, asset_tag, dimensions, weight_capacity, current_location_id, current_status, empty_weight_value, packed_weight_value, weight_unit, weight_source, weight_notes, weight_updated_at, weight_updated_by, notes, created_at, updated_at }`
  - `export const boothContainerRepository: BoothContainerRepository`
  - Methods: `findByBooth(boothId): Promise<BoothContainer[]>`, `findByIdOrThrow(id): Promise<BoothContainer>`, `create(data): Promise<BoothContainer>`, `update(id, data, userId): Promise<BoothContainer>`, `remove(id): Promise<void>`
  - `WEIGHT_SOURCES` constant, re-used by Task 5.
  - `backend/src/validation/boothValidation.ts` exporting `validateContainerBody(body): void`. Task 5 adds `validateComponentBody` and `assertGranularity` to the same module. `booths.ts` imports validators from here — never from a sibling route file.
  - Mounted at `/api/booth-containers`; nested `GET|POST /api/booths/:id/containers`.

Note on `update`: it takes a `userId` because touching any weight field must stamp `weight_updated_at` / `weight_updated_by`. That stamping is the distinctive behaviour here and is what the tests target.

- [ ] **Step 1: Write the failing repository test**

Create `backend/tests/repositories/BoothContainerRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothContainerRepository } from '../../src/database/repositories/BoothContainerRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const row = {
  id: 'cont-1', booth_id: 'booth-1', name: 'Crate A', label: 'CR-A',
  description: null, type: 'crate', asset_tag: null,
  dimensions: '48x40x40', weight_capacity: '500 lb',
  current_location_id: 'loc-1', current_status: 'in_storage',
  empty_weight_value: '35.00', packed_weight_value: '142.00',
  weight_unit: 'lb', weight_source: 'measured', weight_notes: null,
  weight_updated_at: null, weight_updated_by: null, notes: null,
  created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('BoothContainerRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByBooth filters by booth and orders by name', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const result = await boothContainerRepository.findByBooth('booth-1');
    expect(result).toHaveLength(1);
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('WHERE booth_id = $1');
    expect(sql).toContain('ORDER BY name');
    expect(params).toEqual(['booth-1']);
  });

  it('findByIdOrThrow throws NotFoundError when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothContainerRepository.findByIdOrThrow('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('stamps weight_updated_at/by when a weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothContainerRepository.update('cont-1', { packed_weight_value: 150 }, 'user-9');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('weight_updated_at = CURRENT_TIMESTAMP');
    expect(sql).toContain('weight_updated_by =');
    expect(params).toContain('user-9');
  });

  it('does NOT stamp weight metadata when no weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    await boothContainerRepository.update('cont-1', { name: 'Crate A2' }, 'user-9');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).not.toContain('weight_updated_at');
  });

  it('coerces numeric weight strings to numbers on read', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [row], rowCount: 1 } as any);
    const [c] = await boothContainerRepository.findByBooth('booth-1');
    expect(c.empty_weight_value).toBe(35);
    expect(c.packed_weight_value).toBe(142);
  });

  it('returns null weights untouched rather than coercing to 0', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...row, empty_weight_value: null, packed_weight_value: null }], rowCount: 1,
    } as any);
    const [c] = await boothContainerRepository.findByBooth('booth-1');
    expect(c.empty_weight_value).toBeNull();
    expect(c.packed_weight_value).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/repositories/BoothContainerRepository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository**

Create `backend/src/database/repositories/BoothContainerRepository.ts`:

```typescript
/**
 * Booth Container Repository
 *
 * Containers (bag/box/crate/case/pallet) are first-class: the same crate moves
 * between locations independently of the booth it belongs to, and needs its own
 * movement history for packing and shipping.
 *
 * Weight: empty (tare) and packed are tracked separately. Packed weight is
 * NEVER auto-summed from components — packing material and arrangement make a
 * sum wrong — so it is manual, and any weight edit stamps who/when.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export const WEIGHT_SOURCES = ['estimated', 'measured', 'carrier', 'manufacturer', 'unknown'];
export const CONTAINER_TYPES = ['bag', 'box', 'crate', 'case', 'pallet', 'other'];
export const CONTAINER_STATUSES = ['in_storage', 'in_transit', 'at_show', 'missing'];

export interface BoothContainer {
  id: string;
  booth_id: string | null;
  name: string;
  label: string | null;
  description: string | null;
  type: string;
  asset_tag: string | null;
  dimensions: string | null;
  weight_capacity: string | null;
  current_location_id: string | null;
  current_status: string;
  empty_weight_value: number | null;
  packed_weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  weight_notes: string | null;
  weight_updated_at: string | null;
  weight_updated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const WRITABLE = [
  'booth_id', 'name', 'label', 'description', 'type', 'asset_tag',
  'dimensions', 'weight_capacity', 'current_location_id', 'current_status',
  'empty_weight_value', 'packed_weight_value', 'weight_unit',
  'weight_source', 'weight_notes', 'notes',
] as const;

const WEIGHT_FIELDS = [
  'empty_weight_value', 'packed_weight_value', 'weight_unit',
  'weight_source', 'weight_notes',
] as const;

/** pg returns NUMERIC as a string; keep null as null rather than coercing to 0. */
function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function normalise(row: BoothContainer): BoothContainer {
  return {
    ...row,
    empty_weight_value: num(row.empty_weight_value),
    packed_weight_value: num(row.packed_weight_value),
  };
}

export class BoothContainerRepository extends BaseRepository<BoothContainer> {
  protected tableName = 'booth_containers';

  async findByBooth(boothId: string): Promise<BoothContainer[]> {
    const result = await this.executeQuery<BoothContainer>(
      `SELECT * FROM booth_containers WHERE booth_id = $1 ORDER BY name ASC`,
      [boothId]
    );
    return result.rows.map(normalise);
  }

  async findByIdOrThrow(id: string): Promise<BoothContainer> {
    const result = await this.executeQuery<BoothContainer>(
      `SELECT * FROM booth_containers WHERE id = $1`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Container not found');
    return normalise(result.rows[0]);
  }

  async create(data: Partial<BoothContainer>): Promise<BoothContainer> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<BoothContainer>(
      `INSERT INTO booth_containers (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return normalise(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<BoothContainer>,
    userId: string
  ): Promise<BoothContainer> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) return this.findByIdOrThrow(id);

    const params: unknown[] = cols.map((c) => data[c]);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);

    // Any weight edit stamps provenance so a measured value is traceable.
    const touchesWeight = cols.some((c) => (WEIGHT_FIELDS as readonly string[]).includes(c));
    if (touchesWeight) {
      params.push(userId);
      sets.push('weight_updated_at = CURRENT_TIMESTAMP');
      sets.push(`weight_updated_by = $${params.length}`);
    }

    params.push(id);
    const result = await this.executeQuery<BoothContainer>(
      `UPDATE booth_containers SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Container not found');
    return normalise(result.rows[0]);
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM booth_containers WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Container not found');
  }
}

export const boothContainerRepository = new BoothContainerRepository();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/repositories/BoothContainerRepository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5a: Create the shared validation module**

Create `backend/src/validation/boothValidation.ts`. Task 5 appends `assertGranularity` and `validateComponentBody` to this same file, so `booths.ts` can validate nested creates without importing a sibling route.

```typescript
/**
 * Booth inventory request validation.
 *
 * Lives outside routes/ so booths.ts can validate nested container and
 * component creates without importing a sibling route file.
 */

import { ValidationError } from '../utils/errors';
import {
  CONTAINER_TYPES, CONTAINER_STATUSES, WEIGHT_SOURCES,
} from '../database/repositories/BoothContainerRepository';

export function validateWeightFields(body: Record<string, unknown>): void {
  if (body.weight_source && !WEIGHT_SOURCES.includes(body.weight_source as string)) {
    throw new ValidationError(`weight_source must be one of: ${WEIGHT_SOURCES.join(', ')}`);
  }
  if (body.weight_unit && !['lb', 'kg'].includes(body.weight_unit as string)) {
    throw new ValidationError('weight_unit must be lb or kg');
  }
}

export function validateContainerBody(body: Record<string, unknown>): void {
  if (body.type && !CONTAINER_TYPES.includes(body.type as string)) {
    throw new ValidationError(`type must be one of: ${CONTAINER_TYPES.join(', ')}`);
  }
  if (body.current_status && !CONTAINER_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${CONTAINER_STATUSES.join(', ')}`);
  }
  validateWeightFields(body);
}
```

- [ ] **Step 5: Write the container routes**

Create `backend/src/routes/boothContainers.ts`. The `DELETE` handler detaches components rather than orphaning them. It does **not** yet log those detaches — `BoothMovementService` does not exist until Task 6, which replaces this handler in its Step 6b. Write the interim version exactly as given here; Task 6 replaces it.

```typescript
/**
 * Booth Container Routes — /api/booth-containers
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { query } from '../config/database';
import { boothContainerRepository } from '../database/repositories/BoothContainerRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { validateContainerBody } from '../validation/boothValidation';

const router = Router();

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const container = await boothContainerRepository.findByIdOrThrow(req.params.id);
  const { rows: components } = await query(
    `SELECT * FROM booth_components WHERE current_container_id = $1 ORDER BY name ASC`,
    [req.params.id]
  );
  res.json({ ...container, components });
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  validateContainerBody(req.body);
  res.json(await boothContainerRepository.update(req.params.id, req.body, req.user!.id));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  // Detach components rather than orphaning them behind a SET NULL FK.
  await query(
    `UPDATE booth_components
        SET current_container_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE current_container_id = $1`,
    [req.params.id]
  );
  await query(
    `UPDATE booth_components
        SET default_container_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE default_container_id = $1`,
    [req.params.id]
  );
  await boothContainerRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 6: Add nested collection routes to `booths.ts`**

In `backend/src/routes/booths.ts`, add these imports at the top:

```typescript
import { boothContainerRepository } from '../database/repositories/BoothContainerRepository';
import { validateContainerBody } from '../validation/boothValidation';
```

and add these routes before `export default router;`:

```typescript
router.get('/:id/containers', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothContainerRepository.findByBooth(req.params.id));
}));

router.post('/:id/containers', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  validateContainerBody(req.body);
  res.status(201).json(
    await boothContainerRepository.create({ ...req.body, booth_id: req.params.id })
  );
}));
```

- [ ] **Step 7: Mount and export**

In `backend/src/server.ts` add `import boothContainerRoutes from './routes/boothContainers';` and mount after `/api/booths`:

```typescript
app.use('/api/booth-containers', authenticateToken, sessionTracker, boothContainerRoutes);
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { boothContainerRepository, BoothContainerRepository } from './BoothContainerRepository';
export type { BoothContainer } from './BoothContainerRepository';
```

- [ ] **Step 8: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/database/repositories/BoothContainerRepository.ts \
        backend/src/routes/boothContainers.ts \
        backend/src/validation/boothValidation.ts \
        backend/src/routes/booths.ts \
        backend/src/database/repositories/index.ts \
        backend/src/server.ts \
        backend/tests/repositories/BoothContainerRepository.test.ts
git commit -m "feat(booth): container repository, routes and weight stamping"
```

---

## Task 5: BoothComponentRepository + component routes

The hybrid-granularity rule lives here: a component is **either** a counted pool (`quantity: 6`, `asset_tag: null`) **or** one tagged physical object (`asset_tag: 'FAB-01'`, `quantity: 1`). The DB enforces it with `booth_components_instance_qty`; this task gives that a friendly error instead of a raw constraint violation.

**Files:**
- Create: `backend/src/database/repositories/BoothComponentRepository.ts`
- Create: `backend/src/routes/boothComponents.ts`
- Modify: `backend/src/validation/boothValidation.ts` (add component validators)
- Modify: `backend/src/routes/booths.ts` (nested component routes)
- Modify: `backend/src/database/repositories/index.ts`, `backend/src/server.ts`
- Test: `backend/tests/repositories/BoothComponentRepository.test.ts`

**Interfaces:**
- Consumes: `booth_components` table (Task 1); `WEIGHT_SOURCES` from Task 4; `READ_ROLES`/`WRITE_ROLES` from `backend/src/config/boothRoles.ts` (Task 2).
- Produces:
  - `export interface BoothComponent { id, booth_id, parent_component_id, name, category, quantity, asset_tag, condition, current_status, current_location_id, default_container_id, current_container_id, last_verified_at, last_verified_by, weight_value, weight_unit, weight_source, weight_notes, weight_updated_at, weight_updated_by, notes, created_at, updated_at }`
  - `export interface ComponentFilters { q?, category?, status?, containerId?, condition? }`
  - `export const boothComponentRepository: BoothComponentRepository`
  - Methods: `findByBooth(boothId, filters): Promise<BoothComponent[]>`, `findByIdOrThrow(id): Promise<BoothComponent>`, `create(data): Promise<BoothComponent>`, `update(id, data, userId): Promise<BoothComponent>`, `remove(id): Promise<void>`
  - `export const COMPONENT_CATEGORIES`, `COMPONENT_STATUSES`, `COMPONENT_CONDITIONS` — Tasks 6, 7 and 9 import these.
  - `assertGranularity(body): void` and `validateComponentBody(body): void`, appended to `backend/src/validation/boothValidation.ts` (created in Task 4) — Task 12's form mirrors the granularity rule client-side.
  - Mounted at `/api/booth-components`; nested `GET|POST /api/booths/:id/components`.

- [ ] **Step 1: Write the failing repository test**

Create `backend/tests/repositories/BoothComponentRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothComponentRepository } from '../../src/database/repositories/BoothComponentRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

const pool = {
  id: 'comp-1', booth_id: 'booth-1', parent_component_id: null,
  name: 'Frame pole', category: 'frame_part', quantity: 6, asset_tag: null,
  condition: 'good', current_status: 'in_storage', current_location_id: 'loc-1',
  default_container_id: 'cont-1', current_container_id: 'cont-1',
  last_verified_at: null, last_verified_by: null,
  weight_value: '2.50', weight_unit: 'lb', weight_source: 'measured',
  weight_notes: null, weight_updated_at: null, weight_updated_by: null,
  notes: null, created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
};

describe('BoothComponentRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByBooth applies category, status, container and q filters', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.findByBooth('booth-1', {
      q: 'pole', category: 'frame_part', status: 'in_storage', containerId: 'cont-1',
    });
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('booth_id = $1');
    expect(sql).toContain('name ILIKE');
    expect(sql).toContain('category =');
    expect(sql).toContain('current_status =');
    expect(sql).toContain('current_container_id =');
    expect(params).toEqual(['booth-1', '%pole%', 'frame_part', 'in_storage', 'cont-1']);
  });

  it('orders parents before their children so the UI can indent one level', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.findByBooth('booth-1', {});
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('ORDER BY');
    expect(sql).toContain('parent_component_id');
  });

  it('coerces numeric weight to a number and leaves null alone', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    const [c] = await boothComponentRepository.findByBooth('booth-1', {});
    expect(c.weight_value).toBe(2.5);

    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ ...pool, weight_value: null }], rowCount: 1,
    } as any);
    const [d] = await boothComponentRepository.findByBooth('booth-1', {});
    expect(d.weight_value).toBeNull();
  });

  it('stamps weight provenance only when a weight field changes', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.update('comp-1', { weight_value: 3 }, 'user-9');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).toContain('weight_updated_by =');

    vi.clearAllMocks();
    vi.mocked(dbQuery).mockResolvedValue({ rows: [pool], rowCount: 1 } as any);
    await boothComponentRepository.update('comp-1', { name: 'Pole' }, 'user-9');
    expect(vi.mocked(dbQuery).mock.calls[0][0]).not.toContain('weight_updated_by');
  });

  it('findByIdOrThrow throws NotFoundError when absent', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await expect(boothComponentRepository.findByIdOrThrow('nope'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/repositories/BoothComponentRepository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository**

Create `backend/src/database/repositories/BoothComponentRepository.ts`:

```typescript
/**
 * Booth Component Repository
 *
 * Hybrid granularity: a row is EITHER a counted pool (quantity 6, asset_tag
 * null) OR one tagged physical object (asset_tag set, quantity 1). The DB
 * constraint booth_components_instance_qty enforces it.
 *
 * Three independent "where" columns, because they answer different questions:
 *   current_location_id  — the physical place
 *   current_container_id — which crate it is in right now (null when loose)
 *   default_container_id — which crate it BELONGS in
 * The last pair is the whole packing checklist (see BoothPackingService).
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export const COMPONENT_CATEGORIES = [
  'frame', 'frame_part', 'fabric', 'shelf', 'table_top', 'banner', 'light',
  'hardware', 'tool', 'case', 'side_piece', 'setup_accessory', 'other',
];
export const COMPONENT_STATUSES = [
  'in_storage', 'in_transit', 'at_show', 'missing', 'damaged', 'retired',
];
export const COMPONENT_CONDITIONS = ['good', 'fair', 'damaged', 'retired'];

export interface BoothComponent {
  id: string;
  booth_id: string;
  parent_component_id: string | null;
  name: string;
  category: string;
  quantity: number;
  asset_tag: string | null;
  condition: string;
  current_status: string;
  current_location_id: string | null;
  default_container_id: string | null;
  current_container_id: string | null;
  last_verified_at: string | null;
  last_verified_by: string | null;
  weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  weight_notes: string | null;
  weight_updated_at: string | null;
  weight_updated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentFilters {
  q?: string;
  category?: string;
  status?: string;
  containerId?: string;
  condition?: string;
}

const WRITABLE = [
  'booth_id', 'parent_component_id', 'name', 'category', 'quantity', 'asset_tag',
  'condition', 'current_status', 'current_location_id',
  'default_container_id', 'current_container_id',
  'weight_value', 'weight_unit', 'weight_source', 'weight_notes', 'notes',
] as const;

const WEIGHT_FIELDS = ['weight_value', 'weight_unit', 'weight_source', 'weight_notes'] as const;

function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function normalise(row: BoothComponent): BoothComponent {
  return { ...row, weight_value: num(row.weight_value), quantity: Number(row.quantity) };
}

export class BoothComponentRepository extends BaseRepository<BoothComponent> {
  protected tableName = 'booth_components';

  async findByBooth(boothId: string, filters: ComponentFilters): Promise<BoothComponent[]> {
    const params: unknown[] = [boothId];
    const where = ['booth_id = $1'];

    if (filters.q) { params.push(`%${filters.q}%`); where.push(`name ILIKE $${params.length}`); }
    if (filters.category) { params.push(filters.category); where.push(`category = $${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`current_status = $${params.length}`); }
    if (filters.containerId) { params.push(filters.containerId); where.push(`current_container_id = $${params.length}`); }
    if (filters.condition) { params.push(filters.condition); where.push(`condition = $${params.length}`); }

    // Parents first, then their children, so the UI can indent one level
    // without a second query or a client-side tree build.
    const result = await this.executeQuery<BoothComponent>(
      `SELECT * FROM booth_components
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(parent_component_id, id), parent_component_id NULLS FIRST, name ASC`,
      params as any[]
    );
    return result.rows.map(normalise);
  }

  async findByIdOrThrow(id: string): Promise<BoothComponent> {
    const result = await this.executeQuery<BoothComponent>(
      `SELECT * FROM booth_components WHERE id = $1`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Component not found');
    return normalise(result.rows[0]);
  }

  async create(data: Partial<BoothComponent>): Promise<BoothComponent> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    const result = await this.executeQuery<BoothComponent>(
      `INSERT INTO booth_components (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      cols.map((c) => data[c]) as any[]
    );
    return normalise(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<BoothComponent>,
    userId: string
  ): Promise<BoothComponent> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) return this.findByIdOrThrow(id);

    const params: unknown[] = cols.map((c) => data[c]);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);

    if (cols.some((c) => (WEIGHT_FIELDS as readonly string[]).includes(c))) {
      params.push(userId);
      sets.push('weight_updated_at = CURRENT_TIMESTAMP');
      sets.push(`weight_updated_by = $${params.length}`);
    }

    params.push(id);
    const result = await this.executeQuery<BoothComponent>(
      `UPDATE booth_components SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Component not found');
    return normalise(result.rows[0]);
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM booth_components WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Component not found');
  }
}

export const boothComponentRepository = new BoothComponentRepository();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/repositories/BoothComponentRepository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5a: Add the component validators**

Append to `backend/src/validation/boothValidation.ts`, and add
`COMPONENT_CATEGORIES, COMPONENT_STATUSES, COMPONENT_CONDITIONS` to its imports
from `../database/repositories/BoothComponentRepository`:

```typescript
/**
 * Hybrid granularity guard. The DB constraint booth_components_instance_qty
 * already enforces this; this turns it into a readable 400 instead of a raw
 * constraint violation surfacing as a 500.
 */
export function assertGranularity(body: Record<string, unknown>): void {
  const hasTag = body.asset_tag !== undefined && body.asset_tag !== null && body.asset_tag !== '';
  const qty = body.quantity;
  if (hasTag && qty !== undefined && Number(qty) !== 1) {
    throw new ValidationError(
      'A component with an asset_tag is a single tracked item and must have quantity 1. ' +
      'Drop the asset_tag to track it as a counted pool instead.'
    );
  }
  if (qty !== undefined && (!Number.isInteger(Number(qty)) || Number(qty) < 1)) {
    throw new ValidationError('quantity must be a positive integer');
  }
}

export function validateComponentBody(body: Record<string, unknown>): void {
  assertGranularity(body);
  if (body.category && !COMPONENT_CATEGORIES.includes(body.category as string)) {
    throw new ValidationError(`category must be one of: ${COMPONENT_CATEGORIES.join(', ')}`);
  }
  if (body.current_status && !COMPONENT_STATUSES.includes(body.current_status as string)) {
    throw new ValidationError(`current_status must be one of: ${COMPONENT_STATUSES.join(', ')}`);
  }
  if (body.condition && !COMPONENT_CONDITIONS.includes(body.condition as string)) {
    throw new ValidationError(`condition must be one of: ${COMPONENT_CONDITIONS.join(', ')}`);
  }
  validateWeightFields(body);
}
```

- [ ] **Step 5: Write the component routes**

Create `backend/src/routes/boothComponents.ts`:

```typescript
/**
 * Booth Component Routes — /api/booth-components
 *
 * Move / report / verify endpoints are added in Tasks 7 and 8 once
 * BoothMovementService exists. This file holds read and catalog-edit routes.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import {
  boothComponentRepository, COMPONENT_CONDITIONS,
} from '../database/repositories/BoothComponentRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { validateComponentBody } from '../validation/boothValidation';

const router = Router();

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothComponentRepository.findByIdOrThrow(req.params.id));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  validateComponentBody(req.body);
  res.json(await boothComponentRepository.update(req.params.id, req.body, req.user!.id));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothComponentRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 6: Add nested component routes to `booths.ts`**

In `backend/src/routes/booths.ts`, add imports:

```typescript
import { boothComponentRepository } from '../database/repositories/BoothComponentRepository';
import { validateComponentBody } from '../validation/boothValidation';
```

and these routes before `export default router;`:

```typescript
router.get('/:id/components', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, category, status, container_id, condition } = req.query;
  res.json(await boothComponentRepository.findByBooth(req.params.id, {
    q: typeof q === 'string' ? q : undefined,
    category: typeof category === 'string' ? category : undefined,
    status: typeof status === 'string' ? status : undefined,
    containerId: typeof container_id === 'string' ? container_id : undefined,
    condition: typeof condition === 'string' ? condition : undefined,
  }));
}));

router.post('/:id/components', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  validateComponentBody(req.body);
  res.status(201).json(
    await boothComponentRepository.create({ ...req.body, booth_id: req.params.id })
  );
}));
```

- [ ] **Step 7: Mount and export**

In `backend/src/server.ts` add `import boothComponentRoutes from './routes/boothComponents';` and mount:

```typescript
app.use('/api/booth-components', authenticateToken, sessionTracker, boothComponentRoutes);
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { boothComponentRepository, BoothComponentRepository } from './BoothComponentRepository';
export type { BoothComponent, ComponentFilters } from './BoothComponentRepository';
```

- [ ] **Step 8: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/database/repositories/BoothComponentRepository.ts \
        backend/src/routes/boothComponents.ts \
        backend/src/validation/boothValidation.ts \
        backend/src/routes/booths.ts \
        backend/src/database/repositories/index.ts \
        backend/src/server.ts \
        backend/tests/repositories/BoothComponentRepository.test.ts
git commit -m "feat(booth): component repository with hybrid granularity"
```

---

## Task 6: Movement log — repository + BoothMovementService

The heart of the feature. Every location, container, status or condition change appends an immutable row. Nothing ever updates or deletes one. `idempotency_key` makes a replayed offline write a no-op, which is what makes Task 15 safe.

**Files:**
- Create: `backend/src/database/repositories/BoothMovementRepository.ts`
- Create: `backend/src/services/booth/BoothMovementService.ts`
- Modify: `backend/src/database/repositories/index.ts`
- Modify: `backend/src/routes/booths.ts`, `backend/src/routes/boothContainers.ts`, `backend/src/routes/boothComponents.ts` (history endpoints)
- Test: `backend/tests/services/boothMovementService.test.ts`

**Interfaces:**
- Consumes: `booth_movements` table (Task 1); `pool` and `query` from `../../config/database`.
- Produces:
  - ```typescript
    export type MovementEventType =
      | 'location_change' | 'container_change' | 'status_change'
      | 'verification' | 'damage_report' | 'missing_report';

    export interface MovementEntry {
      componentId?: string | null;
      containerId?: string | null;
      boothId?: string | null;
      eventType: MovementEventType;
      fromLocationId?: string | null;  toLocationId?: string | null;
      fromContainerId?: string | null; toContainerId?: string | null;
      fromStatus?: string | null;      toStatus?: string | null;
      fromCondition?: string | null;   toCondition?: string | null;
      eventId?: string | null;
      performedBy: string;
      notes?: string | null;
      idempotencyKey?: string | null;
    }
    ```
  - `export const boothMovementRepository` with `findByBooth(boothId, opts)`, `findByComponent(id, opts)`, `findByContainer(id, opts)`, `findByIdempotencyKey(key)`
  - `export const boothMovementService` with:
    - `record(entry: MovementEntry, client?: PoolClient): Promise<BoothMovement>`
    - `recordMany(entries: MovementEntry[], client?: PoolClient): Promise<BoothMovement[]>`
    - `withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>`
    - `derivedKey(base: string | null | undefined, entityType: string, entityId: string): string | null`
  - Tasks 7, 8 and 9 all write their log rows through `boothMovementService`. **No other module inserts into `booth_movements` directly.**

- [ ] **Step 1: Write the failing service test**

Create `backend/tests/services/boothMovementService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery, pool } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

const movement = {
  id: 'mv-1', component_id: 'comp-1', container_id: null, booth_id: 'booth-1',
  event_type: 'location_change', from_location_id: 'loc-1', to_location_id: 'loc-2',
  from_container_id: null, to_container_id: null,
  from_status: null, to_status: null, from_condition: null, to_condition: null,
  event_id: null, performed_by: 'user-1', notes: null,
  idempotency_key: 'key-1', created_at: '2026-08-26T00:00:00Z',
};

describe('BoothMovementService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts a movement and returns it', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [movement], rowCount: 1 } as any);
    const result = await boothMovementService.record({
      componentId: 'comp-1', boothId: 'booth-1', eventType: 'location_change',
      fromLocationId: 'loc-1', toLocationId: 'loc-2', performedBy: 'user-1',
    });
    expect(result.id).toBe('mv-1');
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO booth_movements');
    expect(sql).toContain('ON CONFLICT');
  });

  it('returns the existing row instead of duplicating on idempotency conflict', async () => {
    // Insert returns no row because ON CONFLICT DO NOTHING fired...
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      // ...so the service looks the original up by key.
      .mockResolvedValueOnce({ rows: [movement], rowCount: 1 } as any);

    const result = await boothMovementService.record({
      componentId: 'comp-1', eventType: 'location_change',
      performedBy: 'user-1', idempotencyKey: 'key-1',
    });

    expect(result.id).toBe('mv-1');
    expect(vi.mocked(dbQuery)).toHaveBeenCalledTimes(2);
    const [lookupSql, lookupParams] = vi.mocked(dbQuery).mock.calls[1];
    expect(lookupSql).toContain('WHERE idempotency_key = $1');
    expect(lookupParams).toEqual(['key-1']);
  });

  it('derives per-entity keys so a replayed bulk move is idempotent row by row', () => {
    expect(boothMovementService.derivedKey('abc', 'component', 'comp-1'))
      .toBe('abc:component:comp-1');
    expect(boothMovementService.derivedKey('abc', 'container', 'cont-1'))
      .toBe('abc:container:cont-1');
  });

  it('derivedKey returns null when no base key was supplied', () => {
    expect(boothMovementService.derivedKey(null, 'component', 'comp-1')).toBeNull();
    expect(boothMovementService.derivedKey(undefined, 'component', 'comp-1')).toBeNull();
  });

  it('rejects an entry that targets neither a component nor a container', async () => {
    await expect(
      boothMovementService.record({ eventType: 'status_change', performedBy: 'user-1' })
    ).rejects.toThrow(/component or a container/i);
  });

  it('withTransaction commits and releases the client', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: vi.fn() };
    vi.mocked(pool.connect).mockResolvedValue(client as any);

    const result = await boothMovementService.withTransaction(async () => 'done');

    expect(result).toBe('done');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('withTransaction rolls back and still releases on failure', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: vi.fn() };
    vi.mocked(pool.connect).mockResolvedValue(client as any);

    await expect(
      boothMovementService.withTransaction(async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/services/boothMovementService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the movement repository**

Create `backend/src/database/repositories/BoothMovementRepository.ts`:

```typescript
/**
 * Booth Movement Repository — READ SIDE ONLY.
 *
 * booth_movements is an immutable event log: rows are inserted by
 * BoothMovementService and never updated or deleted. This repository only
 * reads. Do not add write methods here.
 */

import { BaseRepository } from './BaseRepository';

export interface BoothMovement {
  id: string;
  component_id: string | null;
  container_id: string | null;
  booth_id: string | null;
  event_type: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_container_id: string | null;
  to_container_id: string | null;
  from_status: string | null;
  to_status: string | null;
  from_condition: string | null;
  to_condition: string | null;
  event_id: string | null;
  performed_by: string;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface MovementQueryOptions {
  limit?: number;
  eventId?: string;
}

/** Enriched with the names the timeline UI needs, so it renders in one query. */
const SELECT_ENRICHED = `
  SELECT m.*,
         u.name  AS performed_by_name,
         cf.name AS from_location_name,
         ct.name AS to_location_name,
         kf.name AS from_container_name,
         kt.name AS to_container_name,
         comp.name AS component_name,
         cont.name AS container_name
    FROM booth_movements m
    LEFT JOIN users u                ON u.id = m.performed_by
    LEFT JOIN inventory_locations cf ON cf.id = m.from_location_id
    LEFT JOIN inventory_locations ct ON ct.id = m.to_location_id
    LEFT JOIN booth_containers kf    ON kf.id = m.from_container_id
    LEFT JOIN booth_containers kt    ON kt.id = m.to_container_id
    LEFT JOIN booth_components comp  ON comp.id = m.component_id
    LEFT JOIN booth_containers cont  ON cont.id = m.container_id`;

export class BoothMovementRepository extends BaseRepository<BoothMovement> {
  protected tableName = 'booth_movements';

  private async byColumn(
    column: 'booth_id' | 'component_id' | 'container_id',
    id: string,
    opts: MovementQueryOptions
  ): Promise<BoothMovement[]> {
    const params: unknown[] = [id];
    const where = [`m.${column} = $1`];
    if (opts.eventId) { params.push(opts.eventId); where.push(`m.event_id = $${params.length}`); }
    params.push(Math.min(opts.limit ?? 100, 500));

    const result = await this.executeQuery<BoothMovement>(
      `${SELECT_ENRICHED}
        WHERE ${where.join(' AND ')}
        ORDER BY m.created_at DESC
        LIMIT $${params.length}`,
      params as any[]
    );
    return result.rows;
  }

  findByBooth(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('booth_id', id, opts); }
  findByComponent(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('component_id', id, opts); }
  findByContainer(id: string, opts: MovementQueryOptions = {}) { return this.byColumn('container_id', id, opts); }

  async findByIdempotencyKey(key: string): Promise<BoothMovement | null> {
    const result = await this.executeQuery<BoothMovement>(
      `SELECT * FROM booth_movements WHERE idempotency_key = $1`, [key]
    );
    return result.rows[0] || null;
  }
}

export const boothMovementRepository = new BoothMovementRepository();
```

- [ ] **Step 4: Write the movement service**

Create `backend/src/services/booth/BoothMovementService.ts`:

```typescript
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
  ON CONFLICT (idempotency_key) DO NOTHING
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/services/boothMovementService.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Add history endpoints**

In `backend/src/routes/booths.ts` add `import { boothMovementRepository } from '../database/repositories/BoothMovementRepository';` and:

```typescript
router.get('/:id/movements', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, event_id } = req.query;
  res.json(await boothMovementRepository.findByBooth(req.params.id, {
    limit: limit ? Number(limit) : undefined,
    eventId: typeof event_id === 'string' ? event_id : undefined,
  }));
}));
```

In `backend/src/routes/boothContainers.ts` add the same import and:

```typescript
router.get('/:id/movements', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  res.json(await boothMovementRepository.findByContainer(req.params.id, {
    limit: limit ? Number(limit) : undefined,
  }));
}));
```

In `backend/src/routes/boothComponents.ts` add the same import and:

```typescript
router.get('/:id/movements', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  res.json(await boothMovementRepository.findByComponent(req.params.id, {
    limit: limit ? Number(limit) : undefined,
  }));
}));
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { boothMovementRepository, BoothMovementRepository } from './BoothMovementRepository';
export type { BoothMovement, MovementQueryOptions } from './BoothMovementRepository';
```

- [ ] **Step 6b: Log container deletion detaches**

Task 4 left the container `DELETE` handler detaching components without logging
it — a silent gap in an otherwise immutable history. Now that
`BoothMovementService` exists, close it.

In `backend/src/routes/boothContainers.ts`, add
`import { boothMovementService } from '../services/booth/BoothMovementService';`
and replace the whole `router.delete('/:id', …)` handler with:

```typescript
router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const containerId = req.params.id;
  const container = await boothContainerRepository.findByIdOrThrow(containerId);

  await boothMovementService.withTransaction(async (client) => {
    // Components physically in this crate are being detached — that is a real
    // container change and belongs in the log, not a silent UPDATE.
    const { rows: inside } = await client.query(
      `SELECT id, booth_id, current_location_id, current_status
         FROM booth_components WHERE current_container_id = $1 FOR UPDATE`,
      [containerId]
    );

    for (const component of inside) {
      await boothMovementService.record({
        componentId: component.id,
        containerId,
        boothId: component.booth_id,
        eventType: 'container_change',
        fromContainerId: containerId,
        toContainerId: null,
        fromLocationId: component.current_location_id,
        toLocationId: component.current_location_id,
        fromStatus: component.current_status,
        toStatus: component.current_status,
        performedBy: req.user!.id,
        notes: `Container "${container.name}" was deleted`,
      }, client);
    }

    await client.query(
      `UPDATE booth_components
          SET current_container_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE current_container_id = $1`,
      [containerId]
    );
    await client.query(
      `UPDATE booth_components
          SET default_container_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE default_container_id = $1`,
      [containerId]
    );

    // Delete last: the movement rows above FK to this container with
    // ON DELETE SET NULL, so they survive as history with a null container ref.
    await client.query(`DELETE FROM booth_containers WHERE id = $1`, [containerId]);
  });

  res.json({ success: true });
}));
```

Note the ordering: movements are written *before* the container row is deleted,
and `booth_movements.container_id` is `ON DELETE SET NULL`, so the history
survives the deletion with a null container reference rather than disappearing.

- [ ] **Step 7: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/database/repositories/BoothMovementRepository.ts \
        backend/src/services/booth/BoothMovementService.ts \
        backend/src/database/repositories/index.ts \
        backend/src/routes/booths.ts backend/src/routes/boothContainers.ts \
        backend/src/routes/boothComponents.ts \
        backend/tests/services/boothMovementService.test.ts
git commit -m "feat(booth): immutable movement log with idempotent writes"
```

---

## Task 7: Bulk move — BoothInventoryService + move endpoints

"Move all of Crate A to the show site" in one tap is the ergonomics win Argo never built. One request, one transaction, one movement row per affected entity.

**Files:**
- Create: `backend/src/services/booth/BoothInventoryService.ts`
- Modify: `backend/src/routes/booths.ts`, `backend/src/routes/boothContainers.ts`, `backend/src/routes/boothComponents.ts`
- Test: `backend/tests/services/boothInventoryService.test.ts`

**Interfaces:**
- Consumes: `boothMovementService` (Task 6) — `record`, `recordMany`, `withTransaction`, `derivedKey`.
- Produces:
  - ```typescript
    export interface BulkMoveRequest {
      toLocationId?: string | null;
      toStatus?: string | null;
      eventId?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
      performedBy: string;
    }
    export interface BulkMoveResult {
      movedBooths: number;
      movedContainers: number;
      movedComponents: number;
      movementIds: string[];
    }
    ```
  - `export const boothInventoryService` with `moveBooth(boothId, req): Promise<BulkMoveResult>`, `moveContainer(containerId, req): Promise<BulkMoveResult>`, `moveComponent(componentId, req & { toContainerId? }): Promise<BulkMoveResult>`
  - Endpoints `POST /api/booths/:id/move`, `POST /api/booth-containers/:id/move`, `POST /api/booth-components/:id/move`

Cascade rule (exact): moving a **booth** moves the booth row, every container whose `booth_id` matches, and every component whose `current_container_id` is one of those containers **or** whose `booth_id` matches and `current_container_id IS NULL` (loose pieces travel with the booth). Moving a **container** moves the container and every component whose `current_container_id` is that container — never by `booth_id`, because a borrowed crate may hold another booth's pieces.

- [ ] **Step 1: Write the failing service test**

Create `backend/tests/services/boothInventoryService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

vi.mock('../../src/services/booth/BoothMovementService', async () => {
  const actual = await vi.importActual<any>('../../src/services/booth/BoothMovementService');
  return {
    ...actual,
    boothMovementService: {
      derivedKey: actual.boothMovementService.derivedKey.bind(actual.boothMovementService),
      record: vi.fn(),
      recordMany: vi.fn(),
      withTransaction: vi.fn(),
    },
  };
});

/** A stub client whose responses are queued in call order. */
function stubClient(responses: Array<{ rows: any[] }>) {
  const query = vi.fn();
  responses.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue({ rows: [] });
  return { query, release: vi.fn() };
}

describe('BoothInventoryService.moveContainer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('moves the container and only components currently inside it', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [
        { id: 'comp-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        { id: 'comp-2', current_location_id: 'loc-1', current_status: 'in_storage' },
      ] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(
      async (fn: any) => fn(client)
    );
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    const result = await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', toStatus: 'at_show', performedBy: 'user-1',
    });

    expect(result.movedContainers).toBe(1);
    expect(result.movedComponents).toBe(2);
    expect(result.movedBooths).toBe(0);

    const selectSql = client.query.mock.calls[1][0];
    expect(selectSql).toContain('current_container_id = $1');
    expect(selectSql).not.toContain('booth_id');
  });

  it('records one movement per affected entity', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [{ id: 'comp-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1',
    });

    // 1 container + 1 component
    expect(vi.mocked(boothMovementService.record)).toHaveBeenCalledTimes(2);
  });

  it('derives a distinct idempotency key per entity from one base key', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [{ id: 'comp-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1', idempotencyKey: 'base-1',
    });

    const keys = vi.mocked(boothMovementService.record).mock.calls
      .map((c: any[]) => c[0].idempotencyKey);
    expect(keys).toContain('base-1:container:cont-1');
    expect(keys).toContain('base-1:component:comp-1');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('records a location_change when only the location changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-2', performedBy: 'user-1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('location_change');
    expect(entry.fromLocationId).toBe('loc-1');
    expect(entry.toLocationId).toBe('loc-2');
  });

  it('records a status_change when only the status changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-x' } as any);

    await boothInventoryService.moveContainer('cont-1', {
      toStatus: 'in_transit', performedBy: 'user-1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('status_change');
    expect(entry.fromStatus).toBe('in_storage');
    expect(entry.toStatus).toBe('in_transit');
  });

  it('is a no-op when neither location nor status actually changes', async () => {
    const client = stubClient([
      { rows: [{ id: 'cont-1', booth_id: 'booth-1', current_location_id: 'loc-1', current_status: 'in_storage' }] },
      { rows: [] },
    ]);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));

    const result = await boothInventoryService.moveContainer('cont-1', {
      toLocationId: 'loc-1', toStatus: 'in_storage', performedBy: 'user-1',
    });

    expect(vi.mocked(boothMovementService.record)).not.toHaveBeenCalled();
    expect(result.movedContainers).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/services/boothInventoryService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the service**

Create `backend/src/services/booth/BoothInventoryService.ts`:

```typescript
/**
 * Booth Inventory Service — bulk movement.
 *
 * One request moves a whole booth or a whole crate. Everything happens in a
 * single transaction, and every affected entity gets its own movement row via
 * BoothMovementService (never a direct insert).
 *
 * Cascade rules:
 *   moveBooth      — the booth, its containers, and its components that are
 *                    either inside those containers or loose (no container)
 *   moveContainer  — the container and components whose current_container_id
 *                    is that container. NEVER by booth_id: a borrowed crate
 *                    may hold another booth's pieces.
 */

import { PoolClient } from 'pg';
import { NotFoundError } from '../../utils/errors';
import { boothMovementService, MovementEntry, MovementEventType } from './BoothMovementService';

export interface BulkMoveRequest {
  toLocationId?: string | null;
  toStatus?: string | null;
  eventId?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  performedBy: string;
}

export interface BulkMoveResult {
  movedBooths: number;
  movedContainers: number;
  movedComponents: number;
  movementIds: string[];
}

interface Movable {
  id: string;
  current_location_id: string | null;
  current_status: string;
}

/**
 * A move can change location, status, or both. Pick the event type that
 * describes what actually changed; location wins when both did, because
 * "where is it" is the question the timeline is usually answering.
 */
function eventTypeFor(locationChanged: boolean, statusChanged: boolean): MovementEventType | null {
  if (locationChanged) return 'location_change';
  if (statusChanged) return 'status_change';
  return null;
}

export class BoothInventoryService {
  private async applyMove(
    client: PoolClient,
    table: 'booths' | 'booth_containers' | 'booth_components',
    entityType: 'booth' | 'container' | 'component',
    entity: Movable,
    boothId: string | null,
    req: BulkMoveRequest,
    collected: MovementEntry[]
  ): Promise<boolean> {
    const nextLocation = req.toLocationId !== undefined && req.toLocationId !== null
      ? req.toLocationId : entity.current_location_id;
    const nextStatus = req.toStatus ?? entity.current_status;

    const locationChanged = nextLocation !== entity.current_location_id;
    const statusChanged = nextStatus !== entity.current_status;
    const eventType = eventTypeFor(locationChanged, statusChanged);
    if (!eventType) return false;

    await client.query(
      `UPDATE ${table}
          SET current_location_id = $1, current_status = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [nextLocation, nextStatus, entity.id]
    );

    collected.push({
      componentId: entityType === 'component' ? entity.id : null,
      containerId: entityType === 'container' ? entity.id : null,
      boothId,
      eventType,
      fromLocationId: entity.current_location_id,
      toLocationId: nextLocation,
      fromStatus: entity.current_status,
      toStatus: nextStatus,
      eventId: req.eventId ?? null,
      performedBy: req.performedBy,
      notes: req.notes ?? null,
      idempotencyKey: boothMovementService.derivedKey(req.idempotencyKey, entityType, entity.id),
    });
    return true;
  }

  async moveContainer(containerId: string, req: BulkMoveRequest): Promise<BulkMoveResult> {
    return boothMovementService.withTransaction(async (client) => {
      const { rows: containers } = await client.query(
        `SELECT id, booth_id, current_location_id, current_status
           FROM booth_containers WHERE id = $1 FOR UPDATE`,
        [containerId]
      );
      if (!containers[0]) throw new NotFoundError('Container not found');
      const container = containers[0];

      const { rows: components } = await client.query(
        `SELECT id, current_location_id, current_status
           FROM booth_components WHERE current_container_id = $1 FOR UPDATE`,
        [containerId]
      );

      const entries: MovementEntry[] = [];
      let movedContainers = 0;
      let movedComponents = 0;

      if (await this.applyMove(client, 'booth_containers', 'container', container, container.booth_id, req, entries)) {
        movedContainers = 1;
      }
      for (const component of components) {
        if (await this.applyMove(client, 'booth_components', 'component', component, container.booth_id, req, entries)) {
          movedComponents += 1;
        }
      }

      const movements = [];
      for (const entry of entries) {
        movements.push(await boothMovementService.record(entry, client));
      }

      return {
        movedBooths: 0,
        movedContainers,
        movedComponents,
        movementIds: movements.map((m) => m.id),
      };
    });
  }

  async moveBooth(boothId: string, req: BulkMoveRequest): Promise<BulkMoveResult> {
    return boothMovementService.withTransaction(async (client) => {
      const { rows: booths } = await client.query(
        `SELECT id, current_location_id, current_status FROM booths WHERE id = $1 FOR UPDATE`,
        [boothId]
      );
      if (!booths[0]) throw new NotFoundError('Booth not found');

      const { rows: containers } = await client.query(
        `SELECT id, current_location_id, current_status
           FROM booth_containers WHERE booth_id = $1 FOR UPDATE`,
        [boothId]
      );
      // Components inside this booth's containers, plus loose ones that
      // belong to the booth and are not packed anywhere.
      const { rows: components } = await client.query(
        `SELECT id, current_location_id, current_status
           FROM booth_components
          WHERE current_container_id IN (
                  SELECT id FROM booth_containers WHERE booth_id = $1)
             OR (booth_id = $1 AND current_container_id IS NULL)
          FOR UPDATE`,
        [boothId]
      );

      const entries: MovementEntry[] = [];
      let movedBooths = 0;
      let movedContainers = 0;
      let movedComponents = 0;

      // The booth row itself gets no movement row (movements reference a
      // component or a container by constraint); its columns still update.
      const booth = booths[0];
      const nextLocation = req.toLocationId ?? booth.current_location_id;
      const nextStatus = req.toStatus ?? booth.current_status;
      if (nextLocation !== booth.current_location_id || nextStatus !== booth.current_status) {
        await client.query(
          `UPDATE booths SET current_location_id = $1, current_status = $2,
                  updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [nextLocation, nextStatus, boothId]
        );
        movedBooths = 1;
      }

      for (const container of containers) {
        if (await this.applyMove(client, 'booth_containers', 'container', container, boothId, req, entries)) {
          movedContainers += 1;
        }
      }
      for (const component of components) {
        if (await this.applyMove(client, 'booth_components', 'component', component, boothId, req, entries)) {
          movedComponents += 1;
        }
      }

      const movements = [];
      for (const entry of entries) {
        movements.push(await boothMovementService.record(entry, client));
      }

      return { movedBooths, movedContainers, movedComponents, movementIds: movements.map((m) => m.id) };
    });
  }

  async moveComponent(
    componentId: string,
    req: BulkMoveRequest & { toContainerId?: string | null }
  ): Promise<BulkMoveResult> {
    return boothMovementService.withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, booth_id, current_location_id, current_status, current_container_id
           FROM booth_components WHERE id = $1 FOR UPDATE`,
        [componentId]
      );
      if (!rows[0]) throw new NotFoundError('Component not found');
      const component = rows[0];

      const nextLocation = req.toLocationId ?? component.current_location_id;
      const nextStatus = req.toStatus ?? component.current_status;
      const nextContainer = req.toContainerId !== undefined
        ? req.toContainerId : component.current_container_id;

      const locationChanged = nextLocation !== component.current_location_id;
      const statusChanged = nextStatus !== component.current_status;
      const containerChanged = nextContainer !== component.current_container_id;

      if (!locationChanged && !statusChanged && !containerChanged) {
        return { movedBooths: 0, movedContainers: 0, movedComponents: 0, movementIds: [] };
      }

      await client.query(
        `UPDATE booth_components
            SET current_location_id = $1, current_status = $2,
                current_container_id = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [nextLocation, nextStatus, nextContainer, componentId]
      );

      // A container change is the more specific story when both happened.
      const eventType: MovementEventType = containerChanged
        ? 'container_change'
        : (eventTypeFor(locationChanged, statusChanged) as MovementEventType);

      const movement = await boothMovementService.record({
        componentId,
        boothId: component.booth_id,
        eventType,
        fromLocationId: component.current_location_id,
        toLocationId: nextLocation,
        fromContainerId: component.current_container_id,
        toContainerId: nextContainer,
        fromStatus: component.current_status,
        toStatus: nextStatus,
        eventId: req.eventId ?? null,
        performedBy: req.performedBy,
        notes: req.notes ?? null,
        idempotencyKey: boothMovementService.derivedKey(req.idempotencyKey, 'component', componentId),
      }, client);

      return { movedBooths: 0, movedContainers: 0, movedComponents: 1, movementIds: [movement.id] };
    });
  }
}

export const boothInventoryService = new BoothInventoryService();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/services/boothInventoryService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the move endpoints**

In `backend/src/routes/booths.ts` add `import { boothInventoryService } from '../services/booth/BoothInventoryService';` and, using the field-operations tier (setup crew move things — that is `READ_ROLES`, which is the reads-plus-field-ops tier):

```typescript
router.post('/:id/move', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { to_location_id, to_status, event_id, notes, idempotency_key } = req.body;
  if (!to_location_id && !to_status) {
    throw new ValidationError('to_location_id or to_status is required');
  }
  res.json(await boothInventoryService.moveBooth(req.params.id, {
    toLocationId: to_location_id ?? null,
    toStatus: to_status ?? null,
    eventId: event_id ?? null,
    notes: notes ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));
```

In `backend/src/routes/boothContainers.ts` add the same import and:

```typescript
router.post('/:id/move', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { to_location_id, to_status, event_id, notes, idempotency_key } = req.body;
  if (!to_location_id && !to_status) {
    throw new ValidationError('to_location_id or to_status is required');
  }
  res.json(await boothInventoryService.moveContainer(req.params.id, {
    toLocationId: to_location_id ?? null,
    toStatus: to_status ?? null,
    eventId: event_id ?? null,
    notes: notes ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));
```

In `backend/src/routes/boothComponents.ts` add the same import and:

```typescript
router.post('/:id/move', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { to_location_id, to_container_id, to_status, event_id, notes, idempotency_key } = req.body;
  res.json(await boothInventoryService.moveComponent(req.params.id, {
    toLocationId: to_location_id ?? null,
    toContainerId: to_container_id,
    toStatus: to_status ?? null,
    eventId: event_id ?? null,
    notes: notes ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));
```

Note: `boothContainers.ts` and `boothComponents.ts` need `ValidationError` added to their existing `../utils/errors` import if not already present.

- [ ] **Step 6: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/booth/BoothInventoryService.ts \
        backend/src/routes/booths.ts backend/src/routes/boothContainers.ts \
        backend/src/routes/boothComponents.ts \
        backend/tests/services/boothInventoryService.test.ts
git commit -m "feat(booth): transactional bulk move for booths and containers"
```

---

## Task 8: Damage, missing and verification reports

Catches problems at the show where they are found, instead of at the next show where they hurt.

**Files:**
- Modify: `backend/src/services/booth/BoothInventoryService.ts`
- Modify: `backend/src/routes/boothComponents.ts`
- Test: `backend/tests/services/boothReports.test.ts`

**Interfaces:**
- Consumes: `boothMovementService` (Task 6); `boothInventoryService` (Task 7).
- Produces, added to `BoothInventoryService`:
  - ```typescript
    export interface ReportRequest {
      kind: 'damage' | 'missing';
      condition?: string | null;   // damage only; defaults to 'damaged'
      notes?: string | null;
      eventId?: string | null;
      idempotencyKey?: string | null;
      performedBy: string;
    }
    ```
  - `reportComponent(componentId, req: ReportRequest): Promise<BoothMovement>`
  - `verifyComponent(componentId, req: { eventId?, notes?, idempotencyKey?, performedBy }): Promise<BoothMovement>`
  - `listExceptions(eventId: string): Promise<ExceptionRow[]>` where
    `ExceptionRow = { component_id, component_name, asset_tag, booth_id, booth_name, condition, current_status, notes, reported_at, reported_by_name }`
  - Endpoints `POST /api/booth-components/:id/report`, `POST /api/booth-components/:id/verify`, `GET /api/booth-manifest/event/:eventId/exceptions` (route added in Task 10; the service method lands here).

Status/condition mapping (exact): `kind: 'missing'` sets `current_status = 'missing'` and leaves `condition` alone — a missing piece is not known to be damaged. `kind: 'damage'` sets `condition` to the supplied value (default `'damaged'`) and sets `current_status = 'damaged'` **only** when the component is not already `missing`, so reporting damage on a missing piece does not silently un-miss it.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/boothReports.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothInventoryService } from '../../src/services/booth/BoothInventoryService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

vi.mock('../../src/services/booth/BoothMovementService', async () => {
  const actual = await vi.importActual<any>('../../src/services/booth/BoothMovementService');
  return {
    ...actual,
    boothMovementService: {
      derivedKey: actual.boothMovementService.derivedKey.bind(actual.boothMovementService),
      record: vi.fn(),
      recordMany: vi.fn(),
      withTransaction: vi.fn(),
    },
  };
});

function clientWith(component: Record<string, unknown>) {
  const query = vi.fn()
    .mockResolvedValueOnce({ rows: [component] })
    .mockResolvedValue({ rows: [] });
  return { query, release: vi.fn() };
}

const base = {
  id: 'comp-1', booth_id: 'booth-1', condition: 'good',
  current_status: 'at_show', current_location_id: 'loc-2',
};

describe('damage / missing / verification reports', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('missing sets status missing and leaves condition alone', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', { kind: 'missing', performedBy: 'u1' });

    const [sql, params] = client.query.mock.calls[1];
    expect(sql).toContain('current_status');
    expect(params).toContain('missing');
    expect(params).not.toContain('damaged');

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('missing_report');
  });

  it('damage sets condition damaged and status damaged', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', {
      kind: 'damage', notes: 'torn corner', performedBy: 'u1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('damage_report');
    expect(entry.fromCondition).toBe('good');
    expect(entry.toCondition).toBe('damaged');
    expect(entry.toStatus).toBe('damaged');
    expect(entry.notes).toBe('torn corner');
  });

  it('damage on an already-missing component does not un-miss it', async () => {
    const client = clientWith({ ...base, current_status: 'missing' });
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', { kind: 'damage', performedBy: 'u1' });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toStatus).toBe('missing');
    expect(entry.toCondition).toBe('damaged');
  });

  it('damage honours an explicit condition such as fair', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothInventoryService.reportComponent('comp-1', {
      kind: 'damage', condition: 'fair', performedBy: 'u1',
    });

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toCondition).toBe('fair');
  });

  it('verify stamps last_verified_at/by and logs a verification', async () => {
    const client = clientWith(base);
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-2' } as any);

    await boothInventoryService.verifyComponent('comp-1', { performedBy: 'u1' });

    const [sql, params] = client.query.mock.calls[1];
    expect(sql).toContain('last_verified_at = CURRENT_TIMESTAMP');
    expect(sql).toContain('last_verified_by');
    expect(params).toContain('u1');

    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('verification');
  });

  it('listExceptions returns damaged and missing pieces for an event', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ component_id: 'comp-1', component_name: 'Fabric', condition: 'damaged' }],
      rowCount: 1,
    } as any);

    const rows = await boothInventoryService.listExceptions('event-1');
    expect(rows).toHaveLength(1);
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('damage_report');
    expect(sql).toContain('missing_report');
    expect(params).toEqual(['event-1']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/services/boothReports.test.ts`
Expected: FAIL — `reportComponent is not a function`.

- [ ] **Step 3: Extend the service**

Add to `backend/src/services/booth/BoothInventoryService.ts` — the imports first:

```typescript
import { query as dbQuery } from '../../config/database';
import { BoothMovement } from '../../database/repositories/BoothMovementRepository';
```

then these interfaces above the class:

```typescript
export interface ReportRequest {
  kind: 'damage' | 'missing';
  condition?: string | null;
  notes?: string | null;
  eventId?: string | null;
  idempotencyKey?: string | null;
  performedBy: string;
}

export interface ExceptionRow {
  component_id: string;
  component_name: string;
  asset_tag: string | null;
  booth_id: string;
  booth_name: string;
  condition: string;
  current_status: string;
  notes: string | null;
  reported_at: string;
  reported_by_name: string | null;
}
```

and these methods inside the class:

```typescript
  async reportComponent(componentId: string, req: ReportRequest): Promise<BoothMovement> {
    return boothMovementService.withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, booth_id, condition, current_status, current_location_id
           FROM booth_components WHERE id = $1 FOR UPDATE`,
        [componentId]
      );
      if (!rows[0]) throw new NotFoundError('Component not found');
      const component = rows[0];

      const isMissing = req.kind === 'missing';
      const nextCondition = isMissing
        ? component.condition
        : (req.condition ?? 'damaged');
      // Reporting damage on an already-missing piece must not un-miss it.
      const nextStatus = isMissing
        ? 'missing'
        : (component.current_status === 'missing' ? 'missing' : 'damaged');

      await client.query(
        `UPDATE booth_components
            SET condition = $1, current_status = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
        [nextCondition, nextStatus, componentId]
      );

      return boothMovementService.record({
        componentId,
        boothId: component.booth_id,
        eventType: isMissing ? 'missing_report' : 'damage_report',
        fromStatus: component.current_status,
        toStatus: nextStatus,
        fromCondition: component.condition,
        toCondition: nextCondition,
        fromLocationId: component.current_location_id,
        toLocationId: component.current_location_id,
        eventId: req.eventId ?? null,
        performedBy: req.performedBy,
        notes: req.notes ?? null,
        idempotencyKey: boothMovementService.derivedKey(req.idempotencyKey, 'component', componentId),
      }, client);
    });
  }

  async verifyComponent(
    componentId: string,
    req: { eventId?: string | null; notes?: string | null; idempotencyKey?: string | null; performedBy: string }
  ): Promise<BoothMovement> {
    return boothMovementService.withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, booth_id, condition, current_status FROM booth_components
          WHERE id = $1 FOR UPDATE`,
        [componentId]
      );
      if (!rows[0]) throw new NotFoundError('Component not found');
      const component = rows[0];

      await client.query(
        `UPDATE booth_components
            SET last_verified_at = CURRENT_TIMESTAMP, last_verified_by = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [req.performedBy, componentId]
      );

      return boothMovementService.record({
        componentId,
        boothId: component.booth_id,
        eventType: 'verification',
        fromStatus: component.current_status,
        toStatus: component.current_status,
        eventId: req.eventId ?? null,
        performedBy: req.performedBy,
        notes: req.notes ?? null,
        idempotencyKey: boothMovementService.derivedKey(req.idempotencyKey, 'verify-component', componentId),
      }, client);
    });
  }

  /**
   * Damaged and missing pieces surfaced for one event: anything reported
   * against this event, plus anything currently in a bad state on a booth
   * assigned to it (a piece damaged at the last show is still a problem now).
   */
  async listExceptions(eventId: string): Promise<ExceptionRow[]> {
    const result = await dbQuery(
      `SELECT DISTINCT ON (c.id)
              c.id AS component_id, c.name AS component_name, c.asset_tag,
              c.booth_id, b.name AS booth_name,
              c.condition, c.current_status,
              m.notes, m.created_at AS reported_at, u.name AS reported_by_name
         FROM booth_components c
         JOIN booths b ON b.id = c.booth_id
         JOIN event_booth_assignments a ON a.booth_id = c.booth_id AND a.event_id = $1
         LEFT JOIN booth_movements m
                ON m.component_id = c.id
               AND m.event_type IN ('damage_report','missing_report')
         LEFT JOIN users u ON u.id = m.performed_by
        WHERE c.current_status IN ('missing','damaged')
           OR c.condition IN ('damaged','fair')
        ORDER BY c.id, m.created_at DESC NULLS LAST`,
      [eventId]
    );
    return result.rows as ExceptionRow[];
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/services/boothReports.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the report/verify endpoints**

In `backend/src/routes/boothComponents.ts` add to the existing `boothInventoryService` import usage:

```typescript
router.post('/:id/report', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { kind, condition, notes, event_id, idempotency_key } = req.body;
  if (kind !== 'damage' && kind !== 'missing') {
    throw new ValidationError("kind must be 'damage' or 'missing'");
  }
  if (condition && !COMPONENT_CONDITIONS.includes(condition)) {
    throw new ValidationError(`condition must be one of: ${COMPONENT_CONDITIONS.join(', ')}`);
  }
  res.json(await boothInventoryService.reportComponent(req.params.id, {
    kind,
    condition: condition ?? null,
    notes: notes ?? null,
    eventId: event_id ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));

router.post('/:id/verify', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { notes, event_id, idempotency_key } = req.body;
  res.json(await boothInventoryService.verifyComponent(req.params.id, {
    notes: notes ?? null,
    eventId: event_id ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));
```

- [ ] **Step 6: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/booth/BoothInventoryService.ts \
        backend/src/routes/boothComponents.ts \
        backend/tests/services/boothReports.test.ts
git commit -m "feat(booth): damage, missing and verification reporting"
```

---

## Task 9: Packing checklist — BoothPackingService

The teardown workflow. Entirely derived from `current_container_id` vs `default_container_id`, so there is no session state to go stale and ticking an item *is* the container change.

**Files:**
- Create: `backend/src/services/booth/BoothPackingService.ts`
- Modify: `backend/src/routes/boothContainers.ts`
- Test: `backend/tests/services/boothPackingService.test.ts`

**Interfaces:**
- Consumes: `boothMovementService` (Task 6).
- Produces:
  - ```typescript
    export interface PackingItem {
      component_id: string;
      name: string;
      asset_tag: string | null;
      quantity: number;
      category: string;
      condition: string;
      current_status: string;
      expected: boolean;      // belongs in this container
      packed: boolean;        // is in this container right now
      stray: boolean;         // is here but belongs elsewhere
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
    ```
  - `export const boothPackingService` with `getChecklist(containerId): Promise<PackingChecklist>`, `pack(containerId, componentIds, opts): Promise<{ packed: number; movementIds: string[] }>`, `unpack(containerId, componentIds, opts): Promise<{ unpacked: number; movementIds: string[] }>` where `opts = { toLocationId?, eventId?, idempotencyKey?, performedBy }`
  - Endpoints `GET /api/booth-containers/:id/packing`, `POST /api/booth-containers/:id/pack`, `POST /api/booth-containers/:id/unpack`

`complete` is `packed_count === expected_count && stray_count === 0` — a crate holding a foreign piece is not correctly packed even if everything expected is present.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/boothPackingService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothPackingService } from '../../src/services/booth/BoothPackingService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

vi.mock('../../src/services/booth/BoothMovementService', async () => {
  const actual = await vi.importActual<any>('../../src/services/booth/BoothMovementService');
  return {
    ...actual,
    boothMovementService: {
      derivedKey: actual.boothMovementService.derivedKey.bind(actual.boothMovementService),
      record: vi.fn(),
      withTransaction: vi.fn(),
    },
  };
});

const container = { id: 'cont-1', name: 'Crate A', booth_id: 'booth-1' };

function rowsFor(items: any[]) {
  vi.mocked(dbQuery)
    .mockResolvedValueOnce({ rows: [container], rowCount: 1 } as any)
    .mockResolvedValueOnce({ rows: items, rowCount: items.length } as any);
}

describe('BoothPackingService.getChecklist', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('marks an expected component in the container as packed', async () => {
    rowsFor([{
      component_id: 'c1', name: 'Frame pole', asset_tag: null, quantity: 6,
      category: 'frame_part', condition: 'good', current_status: 'in_storage',
      default_container_id: 'cont-1', current_container_id: 'cont-1',
      expected_container_name: 'Crate A',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].expected).toBe(true);
    expect(result.items[0].packed).toBe(true);
    expect(result.items[0].stray).toBe(false);
    expect(result.packed_count).toBe(1);
    expect(result.expected_count).toBe(1);
    expect(result.complete).toBe(true);
  });

  it('marks an expected component that is elsewhere as not packed', async () => {
    rowsFor([{
      component_id: 'c1', name: 'Fabric', asset_tag: 'FAB-01', quantity: 1,
      category: 'fabric', condition: 'good', current_status: 'at_show',
      default_container_id: 'cont-1', current_container_id: null,
      expected_container_name: 'Crate A',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].expected).toBe(true);
    expect(result.items[0].packed).toBe(false);
    expect(result.packed_count).toBe(0);
    expect(result.complete).toBe(false);
  });

  it('flags a component that is here but belongs in another crate as a stray', async () => {
    rowsFor([{
      component_id: 'c9', name: 'Spare light', asset_tag: null, quantity: 2,
      category: 'light', condition: 'good', current_status: 'in_storage',
      default_container_id: 'cont-2', current_container_id: 'cont-1',
      expected_container_name: 'Crate B',
    }]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.items[0].stray).toBe(true);
    expect(result.items[0].expected).toBe(false);
    expect(result.stray_count).toBe(1);
    expect(result.expected_count).toBe(0);
  });

  it('is not complete when everything expected is packed but a stray is present', async () => {
    rowsFor([
      { component_id: 'c1', name: 'Pole', asset_tag: null, quantity: 6, category: 'frame_part',
        condition: 'good', current_status: 'in_storage',
        default_container_id: 'cont-1', current_container_id: 'cont-1', expected_container_name: 'Crate A' },
      { component_id: 'c9', name: 'Spare light', asset_tag: null, quantity: 2, category: 'light',
        condition: 'good', current_status: 'in_storage',
        default_container_id: 'cont-2', current_container_id: 'cont-1', expected_container_name: 'Crate B' },
    ]);

    const result = await boothPackingService.getChecklist('cont-1');
    expect(result.packed_count).toBe(1);
    expect(result.expected_count).toBe(1);
    expect(result.stray_count).toBe(1);
    expect(result.complete).toBe(false);
  });
});

describe('BoothPackingService.pack / unpack', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pack sets current_container_id and logs container_change per component', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    const result = await boothPackingService.pack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.packed).toBe(1);
    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.eventType).toBe('container_change');
    expect(entry.toContainerId).toBe('cont-1');
    expect(entry.fromContainerId).toBeNull();
  });

  it('pack skips a component already in the container', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: 'cont-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));

    const result = await boothPackingService.pack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.packed).toBe(0);
    expect(vi.mocked(boothMovementService.record)).not.toHaveBeenCalled();
  });

  it('unpack nulls the container and logs the change', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: 'cont-1', current_location_id: 'loc-1', current_status: 'in_storage' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-2' } as any);

    const result = await boothPackingService.unpack('cont-1', ['c1'], { performedBy: 'u1' });

    expect(result.unpacked).toBe(1);
    const entry = vi.mocked(boothMovementService.record).mock.calls[0][0] as any;
    expect(entry.toContainerId).toBeNull();
    expect(entry.fromContainerId).toBe('cont-1');
  });

  it('derives one idempotency key per component so replay is safe', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'cont-1', booth_id: 'booth-1' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'c1', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
          { id: 'c2', booth_id: 'booth-1', current_container_id: null, current_location_id: 'loc-1', current_status: 'at_show' },
        ] })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(boothMovementService.record).mockResolvedValue({ id: 'mv-1' } as any);

    await boothPackingService.pack('cont-1', ['c1', 'c2'], {
      performedBy: 'u1', idempotencyKey: 'pack-1',
    });

    const keys = vi.mocked(boothMovementService.record).mock.calls.map((c: any[]) => c[0].idempotencyKey);
    expect(keys).toEqual(['pack-1:pack:c1', 'pack-1:pack:c2']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/services/boothPackingService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the service**

Create `backend/src/services/booth/BoothPackingService.ts`:

```typescript
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
    if (!containerResult.rows[0]) throw new NotFoundError('Container not found');
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
      if (!containers[0]) throw new NotFoundError('Container not found');

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/services/boothPackingService.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Add the packing endpoints**

In `backend/src/routes/boothContainers.ts` add `import { boothPackingService } from '../services/booth/BoothPackingService';` and:

```typescript
router.get('/:id/packing', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothPackingService.getChecklist(req.params.id));
}));

router.post('/:id/pack', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { component_ids, to_location_id, event_id, idempotency_key } = req.body;
  if (!Array.isArray(component_ids)) throw new ValidationError('component_ids must be an array');
  res.json(await boothPackingService.pack(req.params.id, component_ids, {
    toLocationId: to_location_id ?? null,
    eventId: event_id ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));

router.post('/:id/unpack', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { component_ids, to_location_id, event_id, idempotency_key } = req.body;
  if (!Array.isArray(component_ids)) throw new ValidationError('component_ids must be an array');
  res.json(await boothPackingService.unpack(req.params.id, component_ids, {
    toLocationId: to_location_id ?? null,
    eventId: event_id ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));
```

- [ ] **Step 6: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/booth/BoothPackingService.ts \
        backend/src/routes/boothContainers.ts \
        backend/tests/services/boothPackingService.test.ts
git commit -m "feat(booth): derived packing checklist with pack/unpack"
```

---

## Task 10: Event manifest — assignment, overrides, drift, weights

"Which pieces are going to which show." Assignment **materialises** one manifest row per container so the manifest snapshots what was decided, rather than silently rewriting itself when someone edits the booth months later.

**Files:**
- Create: `backend/src/database/repositories/EventBoothAssignmentRepository.ts`
- Create: `backend/src/services/booth/BoothManifestService.ts`
- Create: `backend/src/routes/boothManifest.ts`
- Modify: `backend/src/database/repositories/index.ts`, `backend/src/server.ts`
- Test: `backend/tests/services/boothManifestService.test.ts`

**Interfaces:**
- Consumes: `boothMovementService.withTransaction` (Task 6); `boothInventoryService.listExceptions` (Task 8).
- Produces:
  - ```typescript
    export interface ManifestContainer {
      id: string; container_id: string; container_name: string;
      container_type: string; asset_tag: string | null;
      included: boolean; is_extra: boolean;
      packed_weight_value: number | null; weight_unit: string;
      component_count: number;
    }
    export interface ManifestAssignment {
      id: string; event_id: string; booth_id: string; booth_name: string;
      status: string; needed_by_date: string | null;
      setup_notes: string | null; teardown_notes: string | null;
      containers: ManifestContainer[];
      drift: Array<{ container_id: string; container_name: string }>;
      weight_total: number | null;
      weight_unit: string;
      weighed_container_count: number;
      included_container_count: number;
    }
    ```
  - `export const boothManifestService` with `getForEvent(eventId): Promise<ManifestAssignment[]>`, `assignBooth(eventId, boothId, data, userId): Promise<ManifestAssignment>`, `updateAssignment(assignmentId, data): Promise<void>`, `removeAssignment(assignmentId): Promise<void>`, `setContainerIncluded(assignmentId, containerId, included): Promise<void>`, `addExtraContainer(assignmentId, containerId): Promise<void>`, `syncDrift(assignmentId): Promise<{ added: number }>`
  - Mounted at `/api/booth-manifest`

Weight total sums `packed_weight_value` of **included** containers only, and reports `weighed_container_count` vs `included_container_count` so the UI can caveat a partial total instead of presenting a misleading number. `weight_total` is `null` when no included container has a weight.

`syncDrift` is **additive only** — it never removes a manifest row. Removing is always an explicit human decision.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/boothManifestService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boothManifestService } from '../../src/services/booth/BoothManifestService';
import { boothMovementService } from '../../src/services/booth/BoothMovementService';
import { query as dbQuery } from '../../src/config/database';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn(),
}));

vi.mock('../../src/services/booth/BoothMovementService', async () => {
  const actual = await vi.importActual<any>('../../src/services/booth/BoothMovementService');
  return {
    ...actual,
    boothMovementService: { ...actual.boothMovementService, withTransaction: vi.fn() },
  };
});

const assignment = {
  id: 'asg-1', event_id: 'ev-1', booth_id: 'booth-1', booth_name: '20x20 Haute',
  status: 'planned', needed_by_date: '2026-03-04',
  setup_notes: null, teardown_notes: null,
};

describe('BoothManifestService.getForEvent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sums packed weight of included containers only', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '142.00', weight_unit: 'lb', component_count: 12 },
        { id: 'm2', container_id: 'c2', container_name: 'Crate B', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '88.00', weight_unit: 'lb', component_count: 5 },
        { id: 'm3', container_id: 'c3', container_name: 'Crate C', container_type: 'crate',
          asset_tag: null, included: false, is_extra: false,
          packed_weight_value: '200.00', weight_unit: 'lb', component_count: 4 },
      ], rowCount: 3 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBe(230);
    expect(result.included_container_count).toBe(2);
    expect(result.weighed_container_count).toBe(2);
  });

  it('reports a partial weight count when some included containers are unweighed', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: '142.00', weight_unit: 'lb', component_count: 12 },
        { id: 'm2', container_id: 'c2', container_name: 'Crate B', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: null, weight_unit: 'lb', component_count: 5 },
      ], rowCount: 2 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBe(142);
    expect(result.included_container_count).toBe(2);
    expect(result.weighed_container_count).toBe(1);
  });

  it('returns a null weight total when nothing included is weighed', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [
        { id: 'm1', container_id: 'c1', container_name: 'Crate A', container_type: 'crate',
          asset_tag: null, included: true, is_extra: false,
          packed_weight_value: null, weight_unit: 'lb', component_count: 12 },
      ], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.weight_total).toBeNull();
  });

  it('surfaces drift — booth containers absent from the manifest', async () => {
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [
        { container_id: 'c9', container_name: 'Crate D' },
      ], rowCount: 1 } as any);

    const [result] = await boothManifestService.getForEvent('ev-1');
    expect(result.drift).toEqual([{ container_id: 'c9', container_name: 'Crate D' }]);
  });
});

describe('BoothManifestService.assignBooth', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('materialises one manifest row per container the booth owns', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'asg-1' }] })   // insert assignment
        .mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] })  // booth containers
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(boothMovementService.withTransaction).mockImplementation(async (fn: any) => fn(client));
    vi.mocked(dbQuery)
      .mockResolvedValueOnce({ rows: [assignment], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await boothManifestService.assignBooth('ev-1', 'booth-1', {}, 'user-1');

    const insertCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('event_booth_manifest_containers')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![0]).toContain('INSERT INTO event_booth_manifest_containers');
    expect(insertCall![1]).toEqual(['asg-1', ['c1', 'c2']]);
  });
});

describe('BoothManifestService.syncDrift', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('adds missing rows and never removes existing ones', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [{ id: 'x' }, { id: 'y' }], rowCount: 2 } as any);

    const result = await boothManifestService.syncDrift('asg-1');

    expect(result.added).toBe(2);
    const [sql] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO event_booth_manifest_containers');
    expect(sql).toContain('ON CONFLICT');
    expect(sql).not.toContain('DELETE');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/services/boothManifestService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the assignment repository**

Create `backend/src/database/repositories/EventBoothAssignmentRepository.ts`:

```typescript
/**
 * Event Booth Assignment Repository
 *
 * Which booths are going to which events. The per-container manifest lives in
 * event_booth_manifest_containers and is managed by BoothManifestService.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface EventBoothAssignment {
  id: string;
  event_id: string;
  booth_id: string;
  status: string;
  needed_by_date: string | null;
  setup_notes: string | null;
  teardown_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSIGNMENT_STATUSES = [
  'planned', 'preparing', 'shipped', 'at_show', 'returned', 'cancelled',
];

const WRITABLE = ['status', 'needed_by_date', 'setup_notes', 'teardown_notes'] as const;

export class EventBoothAssignmentRepository extends BaseRepository<EventBoothAssignment> {
  protected tableName = 'event_booth_assignments';

  async update(id: string, data: Partial<EventBoothAssignment>): Promise<EventBoothAssignment> {
    const cols = WRITABLE.filter((c) => data[c] !== undefined);
    if (!cols.length) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Assignment not found');
      return existing;
    }
    const params: unknown[] = cols.map((c) => data[c]);
    params.push(id);
    const result = await this.executeQuery<EventBoothAssignment>(
      `UPDATE event_booth_assignments
          SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length} RETURNING *`,
      params as any[]
    );
    if (!result.rows[0]) throw new NotFoundError('Assignment not found');
    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM event_booth_assignments WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Assignment not found');
  }
}

export const eventBoothAssignmentRepository = new EventBoothAssignmentRepository();
```

- [ ] **Step 4: Write the manifest service**

Create `backend/src/services/booth/BoothManifestService.ts`:

```typescript
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
    if (!created) throw new NotFoundError('Assignment not found after creation');
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
    if (!result.rows[0]) throw new NotFoundError('Manifest container not found');
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/services/boothManifestService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the manifest routes**

Create `backend/src/routes/boothManifest.ts`:

```typescript
/**
 * Booth Manifest Routes — /api/booth-manifest
 *
 * Reads are field-operations tier so setup crew see the manifest inside the
 * event checklist. Editing which booth or crate goes to a show is catalog
 * management.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { boothManifestService } from '../services/booth/BoothManifestService';
import { boothInventoryService } from '../services/booth/BoothInventoryService';
import {
  eventBoothAssignmentRepository, ASSIGNMENT_STATUSES,
} from '../database/repositories/EventBoothAssignmentRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';

const router = Router();

router.get('/event/:eventId', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothManifestService.getForEvent(req.params.eventId));
}));

router.get('/event/:eventId/exceptions', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothInventoryService.listExceptions(req.params.eventId));
}));

router.post('/event/:eventId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { booth_id, needed_by_date, setup_notes, status } = req.body;
  if (!booth_id) throw new ValidationError('booth_id is required');
  if (status && !ASSIGNMENT_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`);
  }
  res.status(201).json(await boothManifestService.assignBooth(
    req.params.eventId, booth_id,
    { needed_by_date, setup_notes, status },
    req.user!.id
  ));
}));

router.patch('/:assignmentId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (status && !ASSIGNMENT_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`);
  }
  res.json(await eventBoothAssignmentRepository.update(req.params.assignmentId, req.body));
}));

router.delete('/:assignmentId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await eventBoothAssignmentRepository.remove(req.params.assignmentId);
  res.json({ success: true });
}));

router.patch('/:assignmentId/containers/:containerId', authorize(...WRITE_ROLES),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { included } = req.body;
    if (typeof included !== 'boolean') throw new ValidationError('included must be a boolean');
    await boothManifestService.setContainerIncluded(
      req.params.assignmentId, req.params.containerId, included
    );
    res.json({ success: true });
  })
);

router.post('/:assignmentId/containers', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { container_id } = req.body;
  if (!container_id) throw new ValidationError('container_id is required');
  await boothManifestService.addExtraContainer(req.params.assignmentId, container_id);
  res.status(201).json({ success: true });
}));

router.post('/:assignmentId/sync', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothManifestService.syncDrift(req.params.assignmentId));
}));

export default router;
```

- [ ] **Step 7: Mount and export**

In `backend/src/server.ts` add `import boothManifestRoutes from './routes/boothManifest';` and mount:

```typescript
app.use('/api/booth-manifest', authenticateToken, sessionTracker, boothManifestRoutes);
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { eventBoothAssignmentRepository, EventBoothAssignmentRepository } from './EventBoothAssignmentRepository';
export type { EventBoothAssignment } from './EventBoothAssignmentRepository';
```

- [ ] **Step 8: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/database/repositories/EventBoothAssignmentRepository.ts \
        backend/src/services/booth/BoothManifestService.ts \
        backend/src/routes/boothManifest.ts \
        backend/src/database/repositories/index.ts backend/src/server.ts \
        backend/tests/services/boothManifestService.test.ts
git commit -m "feat(booth): event manifest with materialised containers and drift detection"
```

---

## Task 11: Photo attachments

Reference photos on components/containers, and damage photos on a movement. One polymorphic table serves both.

**Files:**
- Modify: `backend/src/config/upload.ts` (add `uploadBoothPhoto` + `initializeUploadDirectories`)
- Create: `backend/src/database/repositories/BoothAttachmentRepository.ts`
- Create: `backend/src/routes/boothAttachments.ts`
- Modify: `backend/src/database/repositories/index.ts`, `backend/src/server.ts`
- Test: `backend/tests/routes/boothAttachments.test.ts`

**Interfaces:**
- Consumes: `booth_attachments` table (Task 1); `isAllowedBoothMapFile` and `ensureDirectory` patterns already in `backend/src/config/upload.ts`.
- Produces:
  - `export const uploadBoothPhoto` — multer instance, field name `photo`, 10 MB limit, writes to `<UPLOAD_DIR>/booth-inventory/`
  - `export interface BoothAttachment { id, entity_type, entity_id, url, caption, uploaded_by, created_at }`
  - `export const boothAttachmentRepository` with `findByEntity(entityType, entityId): Promise<BoothAttachment[]>`, `create(data): Promise<BoothAttachment>`, `remove(id): Promise<void>`
  - `GET /api/booth-attachments?entity_type=&entity_id=`, `POST /api/booth-attachments` (multipart), `DELETE /api/booth-attachments/:id`
  - Task 15's offline photo queue POSTs to this same endpoint after reconnect.

`entity_type` is one of `booth | container | component | movement`. Damage photos use `movement` with the movement id returned by `POST /api/booth-components/:id/report`.

- [ ] **Step 1: Write the failing route test**

Create `backend/tests/routes/boothAttachments.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateAttachmentTarget } from '../../src/routes/boothAttachments';
import { boothAttachmentRepository } from '../../src/database/repositories/BoothAttachmentRepository';
import { query as dbQuery } from '../../src/config/database';
import { ValidationError } from '../../src/utils/errors';

vi.mock('../../src/config/database', () => ({
  pool: { query: vi.fn() },
  query: vi.fn(),
}));

describe('validateAttachmentTarget', () => {
  it('accepts each supported entity type', () => {
    for (const t of ['booth', 'container', 'component', 'movement']) {
      expect(() => validateAttachmentTarget(t, '11111111-1111-1111-1111-111111111111')).not.toThrow();
    }
  });

  it('rejects an unknown entity type', () => {
    expect(() => validateAttachmentTarget('spaceship', '11111111-1111-1111-1111-111111111111'))
      .toThrow(ValidationError);
  });

  it('rejects a missing entity id', () => {
    expect(() => validateAttachmentTarget('component', '')).toThrow(ValidationError);
  });
});

describe('BoothAttachmentRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('findByEntity filters on both type and id', async () => {
    vi.mocked(dbQuery).mockResolvedValue({ rows: [], rowCount: 0 } as any);
    await boothAttachmentRepository.findByEntity('component', 'comp-1');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('entity_type = $1');
    expect(sql).toContain('entity_id = $2');
    expect(params).toEqual(['component', 'comp-1']);
  });

  it('create stores the url and uploader', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ id: 'att-1', url: '/uploads/booth-inventory/x.jpg' }], rowCount: 1,
    } as any);
    const result = await boothAttachmentRepository.create({
      entity_type: 'component', entity_id: 'comp-1',
      url: '/uploads/booth-inventory/x.jpg', caption: 'torn corner', uploaded_by: 'u1',
    });
    expect(result.id).toBe('att-1');
    const [sql, params] = vi.mocked(dbQuery).mock.calls[0];
    expect(sql).toContain('INSERT INTO booth_attachments');
    expect(params).toContain('u1');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run tests/routes/boothAttachments.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Add the multer instance**

In `backend/src/config/upload.ts`, add this storage config after `boothMapStorage`:

```typescript
// Configure multer storage for booth inventory photos
const boothPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const uploadDir = path.join(baseUploadDir, 'booth-inventory');
    ensureDirectory(baseUploadDir);
    ensureDirectory(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'booth-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer upload middleware for booth inventory photos
export const uploadBoothPhoto = multer({
  storage: boothPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const { allowed, reason } = isAllowedBoothMapFile(file.mimetype, file.originalname);
    if (allowed) {
      console.log(`[Upload] Accepting booth photo: ${file.originalname} (mime: ${file.mimetype || 'none'})`);
      return cb(null, true);
    }
    console.warn(`[Upload] Rejected booth photo: ${file.originalname} (${reason})`);
    cb(new Error(reason || 'Only images (JPEG, PNG, GIF, HEIC, WebP) and PDF files are allowed'));
  }
});
```

and in `initializeUploadDirectories()`, add the new directory alongside `boothMapsDir`:

```typescript
    const boothInventoryDir = path.join(baseUploadDir, 'booth-inventory');
    ensureDirectory(boothInventoryDir);
```

- [ ] **Step 4: Write the repository**

Create `backend/src/database/repositories/BoothAttachmentRepository.ts`:

```typescript
/**
 * Booth Attachment Repository
 *
 * Polymorphic: one table serves component/container reference photos and
 * damage-report photos (entity_type 'movement'). entity_id has no FK because
 * it points at four different tables.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export type AttachmentEntityType = 'booth' | 'container' | 'component' | 'movement';

export interface BoothAttachment {
  id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  url: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export class BoothAttachmentRepository extends BaseRepository<BoothAttachment> {
  protected tableName = 'booth_attachments';

  async findByEntity(
    entityType: AttachmentEntityType, entityId: string
  ): Promise<BoothAttachment[]> {
    const result = await this.executeQuery<BoothAttachment>(
      `SELECT a.*, u.name AS uploaded_by_name
         FROM booth_attachments a
         LEFT JOIN users u ON u.id = a.uploaded_by
        WHERE a.entity_type = $1 AND a.entity_id = $2
        ORDER BY a.created_at DESC`,
      [entityType, entityId]
    );
    return result.rows;
  }

  async create(data: {
    entity_type: AttachmentEntityType;
    entity_id: string;
    url: string;
    caption?: string | null;
    uploaded_by?: string | null;
  }): Promise<BoothAttachment> {
    const result = await this.executeQuery<BoothAttachment>(
      `INSERT INTO booth_attachments (entity_type, entity_id, url, caption, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.entity_type, data.entity_id, data.url, data.caption ?? null, data.uploaded_by ?? null]
    );
    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    const result = await this.executeQuery(
      `DELETE FROM booth_attachments WHERE id = $1 RETURNING id`, [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Attachment not found');
  }
}

export const boothAttachmentRepository = new BoothAttachmentRepository();
```

- [ ] **Step 5: Write the routes**

Create `backend/src/routes/boothAttachments.ts`:

```typescript
/**
 * Booth Attachment Routes — /api/booth-attachments
 *
 * Reference photos for booths/containers/components, and damage photos
 * attached to a movement. Uploading is a field operation: the person who finds
 * the torn fabric is the person who photographs it.
 */

import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { uploadBoothPhoto } from '../config/upload';
import {
  boothAttachmentRepository, AttachmentEntityType,
} from '../database/repositories/BoothAttachmentRepository';
import { READ_ROLES } from '../config/boothRoles';

const router = Router();

const ENTITY_TYPES: AttachmentEntityType[] = ['booth', 'container', 'component', 'movement'];

export function validateAttachmentTarget(entityType: unknown, entityId: unknown): void {
  if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType as AttachmentEntityType)) {
    throw new ValidationError(`entity_type must be one of: ${ENTITY_TYPES.join(', ')}`);
  }
  if (typeof entityId !== 'string' || !entityId) {
    throw new ValidationError('entity_id is required');
  }
}

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { entity_type, entity_id } = req.query;
  validateAttachmentTarget(entity_type, entity_id);
  res.json(await boothAttachmentRepository.findByEntity(
    entity_type as AttachmentEntityType, entity_id as string
  ));
}));

router.post('/', authorize(...READ_ROLES),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    uploadBoothPhoto.single('photo')(req, res, (err: any) => {
      if (err) {
        console.error(`[BoothAttachments] Upload error: ${err.message}`);
        return res.status(400).json({
          error: 'File upload failed',
          details: err.message || 'Invalid file. Images and PDF up to 10MB are allowed.',
        });
      }
      next();
    });
  },
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entity_type, entity_id, caption } = req.body;
    validateAttachmentTarget(entity_type, entity_id);

    if (!req.file) throw new ValidationError('No file uploaded');
    if (!fs.existsSync(req.file.path)) {
      throw new ValidationError('File was not saved correctly. Please try again.');
    }

    const url = `/uploads/booth-inventory/${req.file.filename}`;
    res.status(201).json(await boothAttachmentRepository.create({
      entity_type: entity_type as AttachmentEntityType,
      entity_id,
      url,
      caption: caption ?? null,
      uploaded_by: req.user!.id,
    }));
  })
);

router.delete('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothAttachmentRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npx vitest run tests/routes/boothAttachments.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Mount and export**

In `backend/src/server.ts` add `import boothAttachmentRoutes from './routes/boothAttachments';` and mount:

```typescript
app.use('/api/booth-attachments', authenticateToken, sessionTracker, boothAttachmentRoutes);
```

In `backend/src/database/repositories/index.ts` add:

```typescript
export { boothAttachmentRepository, BoothAttachmentRepository } from './BoothAttachmentRepository';
export type { BoothAttachment, AttachmentEntityType } from './BoothAttachmentRepository';
```

- [ ] **Step 8: Verify**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass. The backend is now feature-complete; the frontend follows.

- [ ] **Step 9: Commit**

```bash
git add backend/src/config/upload.ts \
        backend/src/database/repositories/BoothAttachmentRepository.ts \
        backend/src/routes/boothAttachments.ts \
        backend/src/database/repositories/index.ts backend/src/server.ts \
        backend/tests/routes/boothAttachments.test.ts
git commit -m "feat(booth): photo attachments for components, containers and damage reports"
```

---

## Task 12: Frontend foundation — boothApi, nav wiring, Booths page shell, Locations tab

**Files:**
- Create: `src/utils/boothApi.ts`
- Create: `src/components/booths/BoothsPage.tsx`
- Create: `src/components/booths/LocationsTab.tsx`
- Create: `src/components/booths/LocationFormModal.tsx`
- Modify: `src/App.tsx`, `src/components/layout/Sidebar.tsx`
- Test: `src/components/booths/__tests__/LocationsTab.test.tsx`

**Interfaces:**
- Consumes: every backend endpoint from Tasks 2–11; `apiClient` from `src/utils/apiClient.ts`.
- Produces: `src/utils/boothApi.ts` exporting `boothApi` and the shared TS types below. Tasks 13, 14 and 15 all import from here — this is the single frontend contract for the feature.

A dedicated module rather than extending `src/utils/api.ts`, which is already 458 lines and one object literal.

- [ ] **Step 1: Write the failing component test**

Create `src/components/booths/__tests__/LocationsTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationsTab } from '../LocationsTab';
import { boothApi } from '../../../utils/boothApi';

vi.mock('../../../utils/boothApi', () => ({
  boothApi: {
    listLocations: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
  },
}));

const locations = [
  { id: 'l1', name: 'Main Warehouse', type: 'company_warehouse', city: 'Tampa',
    state: 'FL', is_active: true },
  { id: 'l2', name: 'Vegas Convention Center', type: 'convention_center',
    city: 'Las Vegas', state: 'NV', is_active: true },
];

describe('LocationsTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists locations returned by the API', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Vegas Convention Center')).toBeInTheDocument();
  });

  it('renders the human-readable location type, not the raw enum', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText('Company warehouse')).toBeInTheDocument();
    expect(screen.queryByText('company_warehouse')).not.toBeInTheDocument();
  });

  it('filters as the user types', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage />);
    await screen.findByText('Main Warehouse');

    await userEvent.type(screen.getByPlaceholderText(/search locations/i), 'vegas');

    await waitFor(() => {
      expect(vi.mocked(boothApi.listLocations)).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'vegas' })
      );
    });
  });

  it('hides the add button for a user who cannot manage the catalog', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue(locations as any);
    render(<LocationsTab canManage={false} />);
    await screen.findByText('Main Warehouse');
    expect(screen.queryByRole('button', { name: /add location/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no locations', async () => {
    vi.mocked(boothApi.listLocations).mockResolvedValue([] as any);
    render(<LocationsTab canManage />);
    expect(await screen.findByText(/no locations yet/i)).toBeInTheDocument();
  });

  it('surfaces a load failure instead of rendering an empty list silently', async () => {
    vi.mocked(boothApi.listLocations).mockRejectedValue(new Error('network down'));
    render(<LocationsTab canManage />);
    expect(await screen.findByText(/couldn't load locations/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/booths/__tests__/LocationsTab.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the API client**

Create `src/utils/boothApi.ts`:

```typescript
/**
 * Booth Inventory API Client
 *
 * The single frontend contract for booth inventory. Kept separate from
 * src/utils/api.ts, which is already a 458-line object literal.
 */

import { apiClient } from './apiClient';

// ========== Types ==========

export interface InventoryLocation {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  is_active: boolean;
}

export interface Booth {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  type: string | null;
  manufacturer: string | null;
  year_acquired: number | null;
  description: string | null;
  notes: string | null;
  current_location_id: string | null;
  current_status: string;
  is_active: boolean;
  container_count: number;
  component_count: number;
  location_name: string | null;
}

export interface BoothContainer {
  id: string;
  booth_id: string | null;
  name: string;
  label: string | null;
  type: string;
  asset_tag: string | null;
  dimensions: string | null;
  current_location_id: string | null;
  current_status: string;
  empty_weight_value: number | null;
  packed_weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  weight_notes: string | null;
  notes: string | null;
}

export interface BoothComponent {
  id: string;
  booth_id: string;
  parent_component_id: string | null;
  name: string;
  category: string;
  quantity: number;
  asset_tag: string | null;
  condition: string;
  current_status: string;
  current_location_id: string | null;
  default_container_id: string | null;
  current_container_id: string | null;
  last_verified_at: string | null;
  weight_value: number | null;
  weight_unit: string;
  weight_source: string | null;
  notes: string | null;
}

export interface BoothMovement {
  id: string;
  component_id: string | null;
  container_id: string | null;
  event_type: string;
  from_location_name: string | null;
  to_location_name: string | null;
  from_container_name: string | null;
  to_container_name: string | null;
  from_status: string | null;
  to_status: string | null;
  component_name: string | null;
  container_name: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

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

export interface ExceptionRow {
  component_id: string;
  component_name: string;
  asset_tag: string | null;
  booth_id: string;
  booth_name: string;
  condition: string;
  current_status: string;
  notes: string | null;
  reported_at: string | null;
  reported_by_name: string | null;
}

export interface BoothAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  url: string;
  caption: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}

export interface MoveRequest {
  to_location_id?: string | null;
  to_container_id?: string | null;
  to_status?: string | null;
  event_id?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
}

// ========== Display labels ==========

/** Turn a snake_case enum into a sentence — never show raw enums to a user. */
export function humanise(value: string | null | undefined): string {
  if (!value) return '—';
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const LOCATION_TYPES = [
  'company_warehouse', 'storage_unit', 'partner_company', 'partner_person',
  'carrier', 'convention_center', 'hotel', 'show_site', 'other',
];
export const BOOTH_STATUSES = [
  'in_storage', 'at_warehouse', 'at_partner_location',
  'in_transit', 'at_show', 'retired',
];
export const CONTAINER_TYPES = ['bag', 'box', 'crate', 'case', 'pallet', 'other'];
export const CONTAINER_STATUSES = ['in_storage', 'in_transit', 'at_show', 'missing'];
export const COMPONENT_CATEGORIES = [
  'frame', 'frame_part', 'fabric', 'shelf', 'table_top', 'banner', 'light',
  'hardware', 'tool', 'case', 'side_piece', 'setup_accessory', 'other',
];
export const COMPONENT_CONDITIONS = ['good', 'fair', 'damaged', 'retired'];
export const WEIGHT_SOURCES = ['estimated', 'measured', 'carrier', 'manufacturer', 'unknown'];
export const ASSIGNMENT_STATUSES = [
  'planned', 'preparing', 'shipped', 'at_show', 'returned', 'cancelled',
];

// ========== Client ==========

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const boothApi = {
  // Locations
  listLocations: (filters: { q?: string; type?: string; is_active?: boolean } = {}) =>
    apiClient.get(`/inventory-locations${qs(filters)}`) as Promise<InventoryLocation[]>,
  createLocation: (data: Partial<InventoryLocation>) =>
    apiClient.post('/inventory-locations', data) as Promise<InventoryLocation>,
  updateLocation: (id: string, data: Partial<InventoryLocation>) =>
    apiClient.patch(`/inventory-locations/${id}`, data) as Promise<InventoryLocation>,
  deleteLocation: (id: string) => apiClient.delete(`/inventory-locations/${id}`),

  // Booths
  listBooths: (filters: { q?: string; status?: string; location_id?: string } = {}) =>
    apiClient.get(`/booths${qs(filters)}`) as Promise<Booth[]>,
  getBooth: (id: string) => apiClient.get(`/booths/${id}`) as Promise<Booth>,
  createBooth: (data: Partial<Booth>) => apiClient.post('/booths', data) as Promise<Booth>,
  updateBooth: (id: string, data: Partial<Booth>) =>
    apiClient.patch(`/booths/${id}`, data) as Promise<Booth>,
  deleteBooth: (id: string) => apiClient.delete(`/booths/${id}`),
  moveBooth: (id: string, data: MoveRequest) => apiClient.post(`/booths/${id}/move`, data),

  // Containers
  listContainers: (boothId: string) =>
    apiClient.get(`/booths/${boothId}/containers`) as Promise<BoothContainer[]>,
  createContainer: (boothId: string, data: Partial<BoothContainer>) =>
    apiClient.post(`/booths/${boothId}/containers`, data) as Promise<BoothContainer>,
  getContainer: (id: string) => apiClient.get(`/booth-containers/${id}`) as Promise<BoothContainer>,
  updateContainer: (id: string, data: Partial<BoothContainer>) =>
    apiClient.patch(`/booth-containers/${id}`, data) as Promise<BoothContainer>,
  deleteContainer: (id: string) => apiClient.delete(`/booth-containers/${id}`),
  moveContainer: (id: string, data: MoveRequest) =>
    apiClient.post(`/booth-containers/${id}/move`, data),

  // Components
  listComponents: (boothId: string, filters: {
    q?: string; category?: string; status?: string; container_id?: string;
  } = {}) => apiClient.get(`/booths/${boothId}/components${qs(filters)}`) as Promise<BoothComponent[]>,
  createComponent: (boothId: string, data: Partial<BoothComponent>) =>
    apiClient.post(`/booths/${boothId}/components`, data) as Promise<BoothComponent>,
  updateComponent: (id: string, data: Partial<BoothComponent>) =>
    apiClient.patch(`/booth-components/${id}`, data) as Promise<BoothComponent>,
  deleteComponent: (id: string) => apiClient.delete(`/booth-components/${id}`),
  moveComponent: (id: string, data: MoveRequest) =>
    apiClient.post(`/booth-components/${id}/move`, data),
  reportComponent: (id: string, data: {
    kind: 'damage' | 'missing'; condition?: string; notes?: string;
    event_id?: string; idempotency_key?: string;
  }) => apiClient.post(`/booth-components/${id}/report`, data) as Promise<BoothMovement>,
  verifyComponent: (id: string, data: { notes?: string; event_id?: string; idempotency_key?: string }) =>
    apiClient.post(`/booth-components/${id}/verify`, data) as Promise<BoothMovement>,

  // Movements
  boothMovements: (boothId: string, filters: { limit?: number; event_id?: string } = {}) =>
    apiClient.get(`/booths/${boothId}/movements${qs(filters)}`) as Promise<BoothMovement[]>,
  componentMovements: (id: string) =>
    apiClient.get(`/booth-components/${id}/movements`) as Promise<BoothMovement[]>,
  containerMovements: (id: string) =>
    apiClient.get(`/booth-containers/${id}/movements`) as Promise<BoothMovement[]>,

  // Packing
  getPacking: (containerId: string) =>
    apiClient.get(`/booth-containers/${containerId}/packing`) as Promise<PackingChecklist>,
  pack: (containerId: string, data: {
    component_ids: string[]; to_location_id?: string | null;
    event_id?: string | null; idempotency_key?: string | null;
  }) => apiClient.post(`/booth-containers/${containerId}/pack`, data),
  unpack: (containerId: string, data: {
    component_ids: string[]; to_location_id?: string | null;
    event_id?: string | null; idempotency_key?: string | null;
  }) => apiClient.post(`/booth-containers/${containerId}/unpack`, data),

  // Manifest
  getManifest: (eventId: string) =>
    apiClient.get(`/booth-manifest/event/${eventId}`) as Promise<ManifestAssignment[]>,
  getExceptions: (eventId: string) =>
    apiClient.get(`/booth-manifest/event/${eventId}/exceptions`) as Promise<ExceptionRow[]>,
  assignBooth: (eventId: string, data: {
    booth_id: string; needed_by_date?: string | null; setup_notes?: string | null;
  }) => apiClient.post(`/booth-manifest/event/${eventId}`, data) as Promise<ManifestAssignment>,
  updateAssignment: (assignmentId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/booth-manifest/${assignmentId}`, data),
  removeAssignment: (assignmentId: string) => apiClient.delete(`/booth-manifest/${assignmentId}`),
  setContainerIncluded: (assignmentId: string, containerId: string, included: boolean) =>
    apiClient.patch(`/booth-manifest/${assignmentId}/containers/${containerId}`, { included }),
  addExtraContainer: (assignmentId: string, containerId: string) =>
    apiClient.post(`/booth-manifest/${assignmentId}/containers`, { container_id: containerId }),
  syncManifestDrift: (assignmentId: string) =>
    apiClient.post(`/booth-manifest/${assignmentId}/sync`, {}) as Promise<{ added: number }>,

  // Attachments
  listAttachments: (entityType: string, entityId: string) =>
    apiClient.get(`/booth-attachments${qs({ entity_type: entityType, entity_id: entityId })}`) as Promise<BoothAttachment[]>,
  uploadAttachment: async (
    entityType: string, entityId: string, file: File | Blob, caption?: string
  ): Promise<BoothAttachment> => {
    const form = new FormData();
    form.append('photo', file, (file as File).name || 'photo.jpg');
    form.append('entity_type', entityType);
    form.append('entity_id', entityId);
    if (caption) form.append('caption', caption);
    return apiClient.post('/booth-attachments', form) as Promise<BoothAttachment>;
  },
  deleteAttachment: (id: string) => apiClient.delete(`/booth-attachments/${id}`),
};
```

**Before writing this file, confirm `apiClient` exposes `get/post/patch/delete` and that `post` passes a `FormData` body through without forcing `Content-Type: application/json`.** Read `src/utils/apiClient.ts` and, if it always sets that header, add a branch that skips it when the body is `FormData` — the browser must set the multipart boundary itself. If `patch` does not exist, add it mirroring `post`.

- [ ] **Step 4: Write the Locations tab and modal**

Create `src/components/booths/LocationFormModal.tsx`:

```tsx
import React, { useState } from 'react';
import { boothApi, InventoryLocation, LOCATION_TYPES, humanise } from '../../utils/boothApi';

interface Props {
  location?: InventoryLocation | null;
  onClose: () => void;
  onSaved: () => void;
}

export const LocationFormModal: React.FC<Props> = ({ location, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: location?.name ?? '',
    type: location?.type ?? 'company_warehouse',
    city: location?.city ?? '',
    state: location?.state ?? '',
    address: location?.address ?? '',
    contact_name: location?.contact_name ?? '',
    contact_phone: location?.contact_phone ?? '',
    notes: location?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (location) await boothApi.updateLocation(location.id, form);
      else await boothApi.createLocation(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {location ? 'Edit location' : 'Add location'}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            className="w-full rounded border px-3 py-2"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Type</span>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>{humanise(t)}</option>
            ))}
          </select>
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">City</span>
            <input className="w-full rounded border px-3 py-2" value={form.city}
                   onChange={(e) => set('city', e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">State</span>
            <input className="w-full rounded border px-3 py-2" value={form.state}
                   onChange={(e) => set('state', e.target.value)} />
          </label>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea className="w-full rounded border px-3 py-2" rows={2} value={form.notes}
                    onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
                  className="rounded border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

Create `src/components/booths/LocationsTab.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { boothApi, InventoryLocation, humanise } from '../../utils/boothApi';
import { LocationFormModal } from './LocationFormModal';

interface Props { canManage: boolean; }

export const LocationsTab: React.FC<Props> = ({ canManage }) => {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryLocation | null | undefined>(undefined);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await boothApi.listLocations({ q: search || undefined, is_active: true }));
    } catch {
      setError("Couldn't load locations. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(q); }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [q, load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Search locations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canManage && (
          <button
            onClick={() => setEditing(null)}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white"
          >
            <Plus size={16} /> Add location
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!error && !loading && locations.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No locations yet. Add the warehouse or storage unit your booths live in.
        </p>
      )}

      <ul className="divide-y rounded border">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-gray-400" />
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-gray-500">
                  {humanise(l.type)}
                  {l.city ? ` · ${l.city}${l.state ? `, ${l.state}` : ''}` : ''}
                </p>
              </div>
            </div>
            {canManage && (
              <button onClick={() => setEditing(l)} className="text-sm text-blue-600">Edit</button>
            )}
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <LocationFormModal
          location={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); void load(q); }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 5: Write the page shell**

Create `src/components/booths/BoothsPage.tsx`. `BoothCatalogTab` and `BoothMovementsTab` are built in Task 13 — until then this file imports only `LocationsTab` and renders a short "coming in the next task" note for the other two tabs, so the app builds and the nav entry works end to end.

```tsx
import React, { useState } from 'react';
import { User } from '../../App';
import { LocationsTab } from './LocationsTab';

type Tab = 'catalog' | 'locations' | 'movements';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'catalog', label: 'Booths' },
  { id: 'locations', label: 'Locations' },
  { id: 'movements', label: 'History' },
];

interface Props { user: User; }

export const BoothsPage: React.FC<Props> = ({ user }) => {
  const [tab, setTab] = useState<Tab>('catalog');
  const canManage = ['admin', 'coordinator', 'developer'].includes(user.role);

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Booth Inventory</h1>
        <p className="text-sm text-gray-500">
          Every booth, crate and piece — what it is, where it is, and which show it is going to.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 border-b" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm ${
              tab === t.id
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'locations' && <LocationsTab canManage={canManage} />}
      {tab !== 'locations' && (
        <p className="text-sm text-gray-500">Coming in the next step.</p>
      )}
    </div>
  );
};
```

- [ ] **Step 6: Wire the nav**

In `src/components/layout/Sidebar.tsx`, import `Package` from `lucide-react`, add this entry after the `expenses` line:

```typescript
  { id: 'booths', label: 'Booths', icon: Package, roles: ['admin', 'coordinator', 'developer'] },
```

and add `'booths'` to the Workspace section ids:

```typescript
  { label: 'Workspace', ids: ['events', 'checklist', 'expenses', 'booths'] },
```

In `src/App.tsx`, import the page:

```typescript
import { BoothsPage } from './components/booths/BoothsPage';
```

and add the render branch alongside the others (near line 433):

```tsx
              {currentPage === 'booths' && ['admin', 'coordinator', 'developer'].includes(user.role) && (
                <BoothsPage user={user} />
              )}
```

Also extend the accountant guard at `src/App.tsx:368` so `booths` is blocked for accountants the same way `events` and `checklist` are:

```typescript
    const blockedForAccountant = page === 'events' || page === 'checklist' || page === 'booths';
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/components/booths/__tests__/LocationsTab.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 8: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build clean, no new lint errors.

- [ ] **Step 9: Commit**

```bash
git add src/utils/boothApi.ts src/components/booths/ src/App.tsx \
        src/components/layout/Sidebar.tsx
git commit -m "feat(booth): frontend API client, Booths page shell and locations tab"
```

---

## Task 13: Booth catalog, detail tabs and action modals

**Files:**
- Create: `src/components/booths/BoothCatalogTab.tsx`
- Create: `src/components/booths/BoothDetail.tsx`
- Create: `src/components/booths/BoothContainersTab.tsx`
- Create: `src/components/booths/BoothComponentsTab.tsx`
- Create: `src/components/booths/BoothMovementsTab.tsx`
- Create: `src/components/booths/ComponentFormModal.tsx`
- Create: `src/components/booths/ContainerFormModal.tsx`
- Create: `src/components/booths/WeightEditModal.tsx`
- Create: `src/components/booths/MoveModal.tsx`
- Create: `src/components/booths/PhotoGallery.tsx`
- Modify: `src/components/booths/BoothsPage.tsx`
- Test: `src/components/booths/__tests__/ComponentFormModal.test.tsx`, `src/components/booths/__tests__/BoothComponentsTab.test.tsx`

**Interfaces:**
- Consumes: everything from `src/utils/boothApi.ts` (Task 12).
- Produces (props contracts other files rely on):
  - `<BoothCatalogTab canManage: boolean; onOpenBooth: (boothId: string) => void />`
  - `<BoothDetail boothId: string; canManage: boolean; onBack: () => void />`
  - `<MoveModal target: { kind: 'booth'|'container'|'component'; id: string; name: string }; onClose: () => void; onMoved: () => void />` — Task 14 reuses this in the checklist panel.
  - `<PhotoGallery entityType: string; entityId: string; canEdit: boolean />` — Task 14 reuses this.
  - `<WeightEditModal kind: 'container'|'component'; entity: BoothContainer|BoothComponent; onClose; onSaved />`

The distinctive UI decision: **`ComponentFormModal` makes granularity an explicit choice.** A "Track this piece individually" toggle swaps the quantity field for an asset-tag field, mirroring the server rule from Task 5 so the hybrid model is visible rather than a hidden schema detail.

- [ ] **Step 1: Write the failing tests**

Create `src/components/booths/__tests__/ComponentFormModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentFormModal } from '../ComponentFormModal';
import { boothApi } from '../../../utils/boothApi';

vi.mock('../../../utils/boothApi', async () => {
  const actual = await vi.importActual<any>('../../../utils/boothApi');
  return {
    ...actual,
    boothApi: { createComponent: vi.fn(), updateComponent: vi.fn(), listContainers: vi.fn() },
  };
});

describe('ComponentFormModal granularity toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listContainers).mockResolvedValue([] as any);
  });

  it('shows a quantity field by default', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/asset tag/i)).not.toBeInTheDocument();
  });

  it('swaps quantity for asset tag when tracking individually', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByLabelText(/track this piece individually/i));
    expect(screen.getByLabelText(/asset tag/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();
  });

  it('submits quantity and no asset tag in pooled mode', async () => {
    vi.mocked(boothApi.createComponent).mockResolvedValue({ id: 'c1' } as any);
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText(/^name/i), 'Frame pole');
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), '6');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.createComponent)).toHaveBeenCalledWith('b1',
        expect.objectContaining({ name: 'Frame pole', quantity: 6, asset_tag: null }));
    });
  });

  it('submits asset tag and quantity 1 in instance mode', async () => {
    vi.mocked(boothApi.createComponent).mockResolvedValue({ id: 'c1' } as any);
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText(/^name/i), 'Fabric graphic');
    await userEvent.click(screen.getByLabelText(/track this piece individually/i));
    await userEvent.type(screen.getByLabelText(/asset tag/i), 'FAB-01');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.createComponent)).toHaveBeenCalledWith('b1',
        expect.objectContaining({ name: 'Fabric graphic', asset_tag: 'FAB-01', quantity: 1 }));
    });
  });

  it('requires an asset tag when tracking individually', async () => {
    render(<ComponentFormModal boothId="b1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText(/^name/i), 'Fabric');
    await userEvent.click(screen.getByLabelText(/track this piece individually/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/asset tag is required/i);
    expect(vi.mocked(boothApi.createComponent)).not.toHaveBeenCalled();
  });
});
```

Create `src/components/booths/__tests__/BoothComponentsTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoothComponentsTab } from '../BoothComponentsTab';
import { boothApi } from '../../../utils/boothApi';

vi.mock('../../../utils/boothApi', async () => {
  const actual = await vi.importActual<any>('../../../utils/boothApi');
  return {
    ...actual,
    boothApi: { listComponents: vi.fn(), listContainers: vi.fn() },
  };
});

const components = [
  { id: 'c1', booth_id: 'b1', parent_component_id: null, name: 'Frame', category: 'frame',
    quantity: 1, asset_tag: null, condition: 'good', current_status: 'in_storage',
    current_container_id: 'k1', default_container_id: 'k1', weight_value: 40, weight_unit: 'lb' },
  { id: 'c2', booth_id: 'b1', parent_component_id: 'c1', name: 'Cross bar', category: 'frame_part',
    quantity: 4, asset_tag: null, condition: 'good', current_status: 'in_storage',
    current_container_id: 'k1', default_container_id: 'k1', weight_value: 2.5, weight_unit: 'lb' },
  { id: 'c3', booth_id: 'b1', parent_component_id: null, name: 'Fabric', category: 'fabric',
    quantity: 1, asset_tag: 'FAB-01', condition: 'damaged', current_status: 'at_show',
    current_container_id: null, default_container_id: 'k2', weight_value: null, weight_unit: 'lb' },
];

describe('BoothComponentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listContainers).mockResolvedValue([
      { id: 'k1', name: 'Crate A' }, { id: 'k2', name: 'Crate B' },
    ] as any);
  });

  it('shows a pooled component as a count and a tagged one by its tag', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText('×4')).toBeInTheDocument();
    expect(screen.getByText('FAB-01')).toBeInTheDocument();
  });

  it('indents a child component under its parent', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    const child = await screen.findByTestId('component-row-c2');
    expect(child.className).toMatch(/pl-8/);
  });

  it('flags a damaged component', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText(/damaged/i)).toBeInTheDocument();
  });

  it('shows total weight for a pooled component', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    // 2.5 lb each × 4 = 10 lb total
    expect(await screen.findByText(/10 lb/)).toBeInTheDocument();
  });

  it('says so plainly when a weight is not recorded', async () => {
    vi.mocked(boothApi.listComponents).mockResolvedValue(components as any);
    render(<BoothComponentsTab boothId="b1" canManage />);
    expect(await screen.findByText(/not recorded/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/components/booths/__tests__/`
Expected: FAIL — `ComponentFormModal` and `BoothComponentsTab` not found.

- [ ] **Step 3: Write `ComponentFormModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import {
  boothApi, BoothComponent, BoothContainer,
  COMPONENT_CATEGORIES, COMPONENT_CONDITIONS, humanise,
} from '../../utils/boothApi';

interface Props {
  boothId: string;
  component?: BoothComponent | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ComponentFormModal: React.FC<Props> = ({ boothId, component, onClose, onSaved }) => {
  // Granularity is an explicit user choice, not a hidden schema detail:
  // a tagged piece is ONE object; an untagged one is a counted pool.
  const [individual, setIndividual] = useState(Boolean(component?.asset_tag));
  const [containers, setContainers] = useState<BoothContainer[]>([]);
  const [form, setForm] = useState({
    name: component?.name ?? '',
    category: component?.category ?? 'other',
    quantity: String(component?.quantity ?? 1),
    asset_tag: component?.asset_tag ?? '',
    condition: component?.condition ?? 'good',
    default_container_id: component?.default_container_id ?? '',
    notes: component?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boothApi.listContainers(boothId).then(setContainers).catch(() => setContainers([]));
  }, [boothId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (individual && !form.asset_tag.trim()) {
      setError('Asset tag is required when tracking a piece individually');
      return;
    }
    const quantity = individual ? 1 : Number(form.quantity);
    if (!individual && (!Number.isInteger(quantity) || quantity < 1)) {
      setError('Quantity must be a whole number of 1 or more');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      condition: form.condition,
      quantity,
      asset_tag: individual ? form.asset_tag.trim() : null,
      default_container_id: form.default_container_id || null,
      notes: form.notes || null,
    };
    try {
      if (component) await boothApi.updateComponent(component.id, payload);
      else await boothApi.createComponent(boothId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this component');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {component ? 'Edit component' : 'Add component'}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm" htmlFor="component-name">
          <span className="mb-1 block font-medium">Name</span>
          <input id="component-name" className="w-full rounded border px-3 py-2"
                 value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Category</span>
          <select className="w-full rounded border px-3 py-2" value={form.category}
                  onChange={(e) => set('category', e.target.value)}>
            {COMPONENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanise(c)}</option>
            ))}
          </select>
        </label>

        <label className="mb-3 flex items-start gap-2 rounded bg-gray-50 p-3 text-sm">
          <input
            id="individual-toggle"
            type="checkbox"
            className="mt-1"
            checked={individual}
            onChange={(e) => setIndividual(e.target.checked)}
          />
          <span>
            <span className="block font-medium">Track this piece individually</span>
            <span className="block text-xs text-gray-500">
              Give it its own tag so you can say exactly which one is damaged or missing.
              Leave off for interchangeable parts you only need a count of.
            </span>
          </span>
        </label>

        {individual ? (
          <label className="mb-3 block text-sm" htmlFor="asset-tag">
            <span className="mb-1 block font-medium">Asset tag</span>
            <input id="asset-tag" className="w-full rounded border px-3 py-2"
                   placeholder="FAB-01" value={form.asset_tag}
                   onChange={(e) => set('asset_tag', e.target.value)} />
          </label>
        ) : (
          <label className="mb-3 block text-sm" htmlFor="quantity">
            <span className="mb-1 block font-medium">Quantity</span>
            <input id="quantity" type="number" min={1} className="w-full rounded border px-3 py-2"
                   value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </label>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Packs into</span>
          <select className="w-full rounded border px-3 py-2" value={form.default_container_id}
                  onChange={(e) => set('default_container_id', e.target.value)}>
            <option value="">— not assigned —</option>
            {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Condition</span>
          <select className="w-full rounded border px-3 py-2" value={form.condition}
                  onChange={(e) => set('condition', e.target.value)}>
            {COMPONENT_CONDITIONS.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

- [ ] **Step 4: Write `BoothComponentsTab.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  boothApi, BoothComponent, BoothContainer,
  COMPONENT_CATEGORIES, humanise,
} from '../../utils/boothApi';
import { ComponentFormModal } from './ComponentFormModal';
import { WeightEditModal } from './WeightEditModal';

interface Props { boothId: string; canManage: boolean; }

/** Pooled parts show a per-unit weight times their count; instances show their own. */
function weightLabel(c: BoothComponent): string {
  if (c.weight_value === null) return 'Not recorded';
  const total = c.weight_value * (c.quantity || 1);
  const each = c.quantity > 1 ? ` (${c.weight_value} ${c.weight_unit} each)` : '';
  return `${total} ${c.weight_unit}${each}`;
}

export const BoothComponentsTab: React.FC<Props> = ({ boothId, canManage }) => {
  const [components, setComponents] = useState<BoothComponent[]>([]);
  const [containers, setContainers] = useState<BoothContainer[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BoothComponent | null | undefined>(undefined);
  const [weighing, setWeighing] = useState<BoothComponent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComponents(await boothApi.listComponents(boothId, {
        q: q || undefined, category: category || undefined,
      }));
    } catch {
      setError("Couldn't load components. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [boothId, q, category]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  useEffect(() => {
    boothApi.listContainers(boothId).then(setContainers).catch(() => setContainers([]));
  }, [boothId]);

  const containerName = (id: string | null) =>
    containers.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Search components…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={category}
                onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {COMPONENT_CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setEditing(null)}
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white">
            <Plus size={16} /> Add component
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && components.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No components yet. Add the frame, fabric and hardware that make up this booth.
        </p>
      )}

      <ul className="divide-y rounded border">
        {components.map((c) => (
          <li
            key={c.id}
            data-testid={`component-row-${c.id}`}
            className={`flex flex-wrap items-center justify-between gap-2 py-3 pr-4 ${
              c.parent_component_id ? 'pl-8' : 'pl-4'
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {c.name}
                {c.asset_tag
                  ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{c.asset_tag}</span>
                  : c.quantity > 1 && <span className="text-sm text-gray-500">×{c.quantity}</span>}
                {(c.condition === 'damaged' || c.current_status === 'missing') && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    {humanise(c.current_status === 'missing' ? 'missing' : c.condition)}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {humanise(c.category)} · Packs into {containerName(c.default_container_id)}
                {' · '}{weightLabel(c)}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-3 text-sm">
                <button onClick={() => setWeighing(c)} className="text-gray-600">Weight</button>
                <button onClick={() => setEditing(c)} className="text-blue-600">Edit</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <ComponentFormModal
          boothId={boothId}
          component={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); void load(); }}
        />
      )}
      {weighing && (
        <WeightEditModal
          kind="component"
          entity={weighing}
          onClose={() => setWeighing(null)}
          onSaved={() => { setWeighing(null); void load(); }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 5: Write the remaining components**

Write these five files following the same conventions (Tailwind classes, `humanise()` for every enum shown to a user, `role="alert"` on error text, an explicit empty state, `boothApi` for all I/O):

**`WeightEditModal.tsx`** — props `{ kind: 'container' | 'component'; entity: BoothContainer | BoothComponent; onClose: () => void; onSaved: () => void }`. For `kind === 'container'` render `empty_weight_value` and `packed_weight_value`; for `component` render a single `weight_value`. Both render `weight_unit` (lb/kg select), `weight_source` (select over `WEIGHT_SOURCES`, rendered with `humanise`), and `weight_notes`. Submit calls `boothApi.updateContainer` / `boothApi.updateComponent`. Include the standing rule as helper text under packed weight: *"Enter the measured packed weight — it is never calculated from component weights, because packing material and arrangement change it."*

**`ContainerFormModal.tsx`** — props `{ boothId: string; container?: BoothContainer | null; onClose; onSaved }`. Fields: name, label, type (select over `CONTAINER_TYPES`), asset_tag (optional, helper text "Used for QR labels later"), dimensions, notes. Calls `boothApi.createContainer(boothId, …)` or `boothApi.updateContainer(id, …)`.

**`MoveModal.tsx`** — props `{ target: { kind: 'booth' | 'container' | 'component'; id: string; name: string }; eventId?: string | null; onClose: () => void; onMoved: () => void }`. Loads locations via `boothApi.listLocations({ is_active: true })`. Fields: destination location (select), new status (select — `BOOTH_STATUSES` for a booth, `CONTAINER_STATUSES` otherwise), note. Generates `idempotency_key` with `crypto.randomUUID()` **once on mount** (a `useState` initialiser, never on each render — a fresh key per render would defeat the deduplication). Dispatches to `boothApi.moveBooth` / `moveContainer` / `moveComponent` by `target.kind`. On success show what happened, e.g. `"Moved 1 crate and 12 components to Main Warehouse"`, from the returned counts.

**`BoothMovementsTab.tsx`** — props `{ boothId: string }`. Loads `boothApi.boothMovements(boothId, { limit: 100 })`, renders a reverse-chronological timeline. Each row: relative date, `humanise(event_type)`, the entity name (`component_name ?? container_name`), a from→to phrase built from whichever pair is populated (location, container or status), and `performed_by_name`. Empty state: *"No movement recorded yet."*

**`PhotoGallery.tsx`** — props `{ entityType: string; entityId: string; canEdit: boolean }`. Loads `boothApi.listAttachments(entityType, entityId)`, renders a thumbnail grid, and when `canEdit` shows a file input that calls `boothApi.uploadAttachment`. Each thumbnail gets a delete control calling `boothApi.deleteAttachment`. Empty state: *"No photos yet."*

**`BoothContainersTab.tsx`** — props `{ boothId: string; canManage: boolean }`. Lists containers via `boothApi.listContainers`, one row each showing name, `humanise(type)`, asset tag when present, component count, and weights formatted as `Empty: 35 lb / Packed: 142 lb · measured` (or *"Weight not recorded"*). Row actions: Weight (opens `WeightEditModal` with `kind="container"`), Move (opens `MoveModal` with `kind: 'container'`), Edit (opens `ContainerFormModal`). Header has an "Add container" button when `canManage`.

**`BoothCatalogTab.tsx`** — props `{ canManage: boolean; onOpenBooth: (boothId: string) => void }`. Search box plus status filter (`BOOTH_STATUSES` via `humanise`), calling `boothApi.listBooths`. Each row: booth name, brand/size, `humanise(current_status)`, `location_name`, and `"{container_count} containers · {component_count} pieces"`. Clicking a row calls `onOpenBooth(booth.id)`. "Add booth" button when `canManage` opens an inline create form posting to `boothApi.createBooth`.

**`BoothDetail.tsx`** — props `{ boothId: string; canManage: boolean; onBack: () => void }`. Loads the booth via `boothApi.getBooth`. Renders a back button, the booth name and status, a "Move booth" button opening `MoveModal` with `kind: 'booth'`, and four sub-tabs: Overview (inline edit of name/brand/size/type/manufacturer/year/notes via `boothApi.updateBooth`, plus `<PhotoGallery entityType="booth" entityId={boothId} canEdit={canManage} />`), Containers (`BoothContainersTab`), Components (`BoothComponentsTab`), History (`BoothMovementsTab`).

- [ ] **Step 6: Wire the tabs into `BoothsPage.tsx`**

Replace the placeholder branch. Add `const [openBoothId, setOpenBoothId] = useState<string | null>(null);` and render:

```tsx
      {tab === 'catalog' && !openBoothId && (
        <BoothCatalogTab canManage={canManage} onOpenBooth={setOpenBoothId} />
      )}
      {tab === 'catalog' && openBoothId && (
        <BoothDetail
          boothId={openBoothId}
          canManage={canManage}
          onBack={() => setOpenBoothId(null)}
        />
      )}
      {tab === 'locations' && <LocationsTab canManage={canManage} />}
      {tab === 'movements' && <AllMovementsTab />}
```

where `AllMovementsTab` is a small local component in `BoothsPage.tsx` that lists booths via `boothApi.listBooths({})` and renders `<BoothMovementsTab boothId={selected} />` for whichever booth the user picks, defaulting to the first.

Switching tabs must clear `openBoothId` so leaving and returning to Booths lands on the list, not a stale detail view.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/booths/__tests__/`
Expected: PASS (all three test files, 16 tests).

- [ ] **Step 8: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build clean, no new lint errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/booths/
git commit -m "feat(booth): booth catalog, detail tabs, weight/move/photo modals"
```

---

## Task 14: Checklist Booth section — manifest, packing checklist, exceptions

Where setup crew actually work. Access follows the checklist's existing gate (everyone except `accountant`), so a `salesperson` who cannot see the global Booths page can still pack a crate here.

**Files:**
- Create: `src/components/checklist/sections/BoothSection/BoothInventoryPanel.tsx`
- Create: `src/components/checklist/sections/BoothSection/ManifestView.tsx`
- Create: `src/components/checklist/sections/BoothSection/PackingChecklist.tsx`
- Create: `src/components/checklist/sections/BoothSection/ExceptionsList.tsx`
- Create: `src/components/checklist/sections/BoothSection/ReportIssueModal.tsx`
- Modify: `src/components/checklist/sections/BoothSection/index.ts`
- Modify: `src/components/checklist/sections/BoothSection.tsx` (mount point only)
- Test: `src/components/checklist/sections/BoothSection/__tests__/PackingChecklist.test.tsx`, `.../ManifestView.test.tsx`

**Interfaces:**
- Consumes: `boothApi` and its types (Task 12); `MoveModal`, `PhotoGallery` from `src/components/booths/` (Task 13).
- Produces:
  - `<BoothInventoryPanel event: TradeShow; user: User />` — the only thing `BoothSection.tsx` adds.
  - `<ManifestView eventId: string; canManage: boolean; onOpenPacking: (containerId: string, containerName: string) => void />`
  - `<PackingChecklist containerId: string; containerName: string; eventId: string; onClose: () => void />`
  - `<ExceptionsList eventId: string />`
  - `<ReportIssueModal componentId: string; componentName: string; eventId: string; onClose; onReported />`

`BoothSection.tsx` is already ~10 KB. It gains **only** the import and a `<BoothInventoryPanel …/>` mount below the existing shipping section — no inline additions.

- [ ] **Step 1: Write the failing tests**

Create `src/components/checklist/sections/BoothSection/__tests__/PackingChecklist.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingChecklist } from '../PackingChecklist';
import { boothApi } from '../../../../../utils/boothApi';

vi.mock('../../../../../utils/boothApi', async () => {
  const actual = await vi.importActual<any>('../../../../../utils/boothApi');
  return { ...actual, boothApi: { getPacking: vi.fn(), pack: vi.fn(), unpack: vi.fn() } };
});

const checklist = {
  container_id: 'k1', container_name: 'Crate A',
  expected_count: 3, packed_count: 1, stray_count: 1, complete: false,
  items: [
    { component_id: 'c1', name: 'Frame pole', asset_tag: null, quantity: 6,
      category: 'frame_part', condition: 'good', current_status: 'in_storage',
      expected: true, packed: true, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c2', name: 'Fabric', asset_tag: 'FAB-01', quantity: 1,
      category: 'fabric', condition: 'good', current_status: 'at_show',
      expected: true, packed: false, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c3', name: 'LED bar', asset_tag: null, quantity: 2,
      category: 'light', condition: 'good', current_status: 'at_show',
      expected: true, packed: false, stray: false,
      expected_container_id: 'k1', expected_container_name: 'Crate A' },
    { component_id: 'c9', name: 'Spare monitor', asset_tag: 'MON-02', quantity: 1,
      category: 'other', condition: 'good', current_status: 'at_show',
      expected: false, packed: false, stray: true,
      expected_container_id: 'k2', expected_container_name: 'Crate B' },
  ],
};

describe('PackingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.getPacking).mockResolvedValue(checklist as any);
  });

  it('shows packed progress out of the expected count', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText('1/3 packed')).toBeInTheDocument();
  });

  it('checks the box for an item already packed', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByRole('checkbox', { name: /frame pole/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /fabric/i })).not.toBeChecked();
  });

  it('warns about a stray piece that belongs in another crate', async () => {
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText(/belongs in crate b/i)).toBeInTheDocument();
  });

  it('packs an item when its box is ticked', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.pack)).toHaveBeenCalledWith('k1',
        expect.objectContaining({ component_ids: ['c2'], event_id: 'e1' }));
    });
  });

  it('sends an idempotency key with every pack call', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /fabric/i }));

    await waitFor(() => {
      const arg = vi.mocked(boothApi.pack).mock.calls[0][1] as any;
      expect(arg.idempotency_key).toEqual(expect.any(String));
      expect(arg.idempotency_key.length).toBeGreaterThan(0);
    });
  });

  it('unpacks an item when its box is unticked', async () => {
    vi.mocked(boothApi.unpack).mockResolvedValue({ unpacked: 1 } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /frame pole/i }));

    await waitFor(() => {
      expect(vi.mocked(boothApi.unpack)).toHaveBeenCalledWith('k1',
        expect.objectContaining({ component_ids: ['c1'] }));
    });
  });

  it('celebrates a complete crate', async () => {
    vi.mocked(boothApi.getPacking).mockResolvedValue({
      ...checklist, packed_count: 3, stray_count: 0, complete: true,
      items: checklist.items.filter((i) => i.expected).map((i) => ({ ...i, packed: true })),
    } as any);
    render(<PackingChecklist containerId="k1" containerName="Crate A" eventId="e1" onClose={vi.fn()} />);
    expect(await screen.findByText(/crate is fully packed/i)).toBeInTheDocument();
  });
});
```

Create `src/components/checklist/sections/BoothSection/__tests__/ManifestView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManifestView } from '../ManifestView';
import { boothApi } from '../../../../../utils/boothApi';

vi.mock('../../../../../utils/boothApi', async () => {
  const actual = await vi.importActual<any>('../../../../../utils/boothApi');
  return {
    ...actual,
    boothApi: {
      getManifest: vi.fn(), listBooths: vi.fn(), assignBooth: vi.fn(),
      setContainerIncluded: vi.fn(), syncManifestDrift: vi.fn(),
    },
  };
});

const manifest = [{
  id: 'asg-1', event_id: 'e1', booth_id: 'b1', booth_name: '20x20 Haute Main',
  status: 'preparing', needed_by_date: '2026-03-04', setup_notes: null, teardown_notes: null,
  containers: [
    { id: 'm1', container_id: 'k1', container_name: 'Crate A', container_type: 'crate',
      asset_tag: null, included: true, is_extra: false,
      packed_weight_value: 142, weight_unit: 'lb', component_count: 12 },
    { id: 'm2', container_id: 'k2', container_name: 'Crate C', container_type: 'crate',
      asset_tag: null, included: false, is_extra: false,
      packed_weight_value: null, weight_unit: 'lb', component_count: 4 },
  ],
  drift: [],
  weight_total: 142, weight_unit: 'lb',
  weighed_container_count: 1, included_container_count: 1,
}];

describe('ManifestView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boothApi.listBooths).mockResolvedValue([] as any);
  });

  it('lists the assigned booth and its containers', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText('20x20 Haute Main')).toBeInTheDocument();
    expect(screen.getByText('Crate A')).toBeInTheDocument();
  });

  it('shows the manifest weight total', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/142 lb/)).toBeInTheDocument();
  });

  it('caveats a partial weight total rather than presenting it as complete', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], weight_total: 142, weighed_container_count: 1, included_container_count: 3,
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/1 of 3 containers weighed/i)).toBeInTheDocument();
  });

  it('says so when nothing included has been weighed', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], weight_total: null, weighed_container_count: 0, included_container_count: 2,
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/no weights recorded/i)).toBeInTheDocument();
  });

  it('offers to add drifted containers instead of adding them silently', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue([{
      ...manifest[0], drift: [{ container_id: 'k9', container_name: 'Crate D' }],
    }] as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);
    expect(await screen.findByText(/1 container on this booth isn't on this manifest/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add (it|them)/i })).toBeInTheDocument();
  });

  it('toggles a container in or out of the manifest', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    vi.mocked(boothApi.setContainerIncluded).mockResolvedValue({} as any);
    render(<ManifestView eventId="e1" canManage onOpenPacking={vi.fn()} />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /crate c/i }));

    expect(vi.mocked(boothApi.setContainerIncluded)).toHaveBeenCalledWith('asg-1', 'k2', true);
  });

  it('hides manifest editing from a user who cannot manage', async () => {
    vi.mocked(boothApi.getManifest).mockResolvedValue(manifest as any);
    render(<ManifestView eventId="e1" canManage={false} onOpenPacking={vi.fn()} />);
    await screen.findByText('20x20 Haute Main');
    expect(screen.queryByRole('button', { name: /assign a booth/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/components/checklist/sections/BoothSection/__tests__/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `PackingChecklist.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { boothApi, PackingChecklist as Checklist } from '../../../../utils/boothApi';
import { ReportIssueModal } from './ReportIssueModal';

interface Props {
  containerId: string;
  containerName: string;
  eventId: string;
  onClose: () => void;
}

export const PackingChecklist: React.FC<Props> = ({
  containerId, containerName, eventId, onClose,
}) => {
  const [data, setData] = useState<Checklist | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await boothApi.getPacking(containerId));
    } catch {
      setError("Couldn't load the packing list. Your changes will still sync when you're back online.");
    }
  }, [containerId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (componentId: string, currentlyPacked: boolean) => {
    setBusy(componentId);
    setError(null);
    // A fresh key per action: the server dedupes replays of THIS action, and a
    // later toggle of the same component is a genuinely new event.
    const idempotency_key = crypto.randomUUID();
    try {
      const payload = { component_ids: [componentId], event_id: eventId, idempotency_key };
      if (currentlyPacked) await boothApi.unpack(containerId, payload);
      else await boothApi.pack(containerId, payload);
      await load();
    } catch {
      setError('That change is queued and will sync when you reconnect.');
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return <p className="p-4 text-sm text-gray-500">Loading packing list…</p>;
  }

  return (
    <div className="rounded border">
      <header className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
        <div>
          <h4 className="font-medium">{containerName}</h4>
          <p className="text-xs text-gray-500">
            {data.packed_count}/{data.expected_count} packed
            {data.stray_count > 0 && ` · ${data.stray_count} stray`}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close packing list"><X size={18} /></button>
      </header>

      {error && <p role="alert" className="bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</p>}

      {data.complete && (
        <p className="flex items-center gap-2 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} /> This crate is fully packed.
        </p>
      )}

      <ul className="divide-y">
        {data.items.map((item) => (
          <li key={item.component_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <label className="flex flex-1 items-center gap-3">
              <input
                type="checkbox"
                aria-label={item.name}
                checked={item.packed}
                disabled={item.stray || busy === item.component_id}
                onChange={() => toggle(item.component_id, item.packed)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={item.packed ? 'text-gray-500 line-through' : ''}>{item.name}</span>
                  {item.asset_tag
                    ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{item.asset_tag}</span>
                    : item.quantity > 1 && <span className="text-xs text-gray-500">×{item.quantity}</span>}
                </span>
                {item.stray && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    In this crate, but belongs in {item.expected_container_name}
                  </span>
                )}
              </span>
            </label>
            <button
              onClick={() => setReporting({ id: item.component_id, name: item.name })}
              className="shrink-0 text-xs text-amber-700"
            >
              Report issue
            </button>
          </li>
        ))}
      </ul>

      {reporting && (
        <ReportIssueModal
          componentId={reporting.id}
          componentName={reporting.name}
          eventId={eventId}
          onClose={() => setReporting(null)}
          onReported={() => { setReporting(null); void load(); }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Write `ManifestView.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { boothApi, Booth, ManifestAssignment, humanise } from '../../../../utils/boothApi';

interface Props {
  eventId: string;
  canManage: boolean;
  onOpenPacking: (containerId: string, containerName: string) => void;
}

/**
 * Never present a partial weight total as if it were complete — freight quotes
 * get made from this number.
 */
function weightLine(a: ManifestAssignment): string {
  if (a.weight_total === null) {
    return `No weights recorded for ${a.included_container_count} container${
      a.included_container_count === 1 ? '' : 's'}`;
  }
  const complete = a.weighed_container_count === a.included_container_count;
  return complete
    ? `${a.weight_total} ${a.weight_unit} total`
    : `${a.weight_total} ${a.weight_unit} so far · ${a.weighed_container_count} of ${
        a.included_container_count} containers weighed`;
}

export const ManifestView: React.FC<Props> = ({ eventId, canManage, onOpenPacking }) => {
  const [assignments, setAssignments] = useState<ManifestAssignment[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await boothApi.getManifest(eventId));
    } catch {
      setError("Couldn't load the booth manifest for this show.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (canManage) boothApi.listBooths({}).then(setBooths).catch(() => setBooths([]));
  }, [canManage]);

  const toggleContainer = async (assignmentId: string, containerId: string, included: boolean) => {
    await boothApi.setContainerIncluded(assignmentId, containerId, included);
    await load();
  };

  const assign = async (boothId: string) => {
    setAdding(false);
    await boothApi.assignBooth(eventId, { booth_id: boothId });
    await load();
  };

  const resolveDrift = async (assignmentId: string) => {
    await boothApi.syncManifestDrift(assignmentId);
    await load();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading manifest…</p>;
  if (error) return <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      {assignments.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No booth assigned to this show yet.
        </p>
      )}

      {assignments.map((a) => (
        <section key={a.id} className="rounded border">
          <header className="border-b bg-gray-50 px-4 py-3">
            <h4 className="flex items-center gap-2 font-medium">
              <Package size={16} /> {a.booth_name}
            </h4>
            <p className="text-xs text-gray-500">
              {humanise(a.status)}
              {a.needed_by_date && ` · needed by ${a.needed_by_date}`}
              {' · '}{weightLine(a)}
            </p>
          </header>

          {a.drift.length > 0 && canManage && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <span>
                {a.drift.length} container{a.drift.length === 1 ? " isn't" : "s aren't"} on this manifest
                {' '}({a.drift.map((d) => d.container_name).join(', ')}).
              </span>
              <button onClick={() => resolveDrift(a.id)} className="shrink-0 font-medium underline">
                {a.drift.length === 1 ? 'Add it' : 'Add them'}
              </button>
            </div>
          )}

          <ul className="divide-y">
            {a.containers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={c.container_name}
                    checked={c.included}
                    disabled={!canManage}
                    onChange={(e) => toggleContainer(a.id, c.container_id, e.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      {c.container_name}
                      {c.is_extra && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                          added
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {humanise(c.container_type)} · {c.component_count} pieces
                      {c.packed_weight_value !== null
                        ? ` · ${c.packed_weight_value} ${c.weight_unit}`
                        : ' · weight not recorded'}
                    </span>
                  </span>
                </label>
                <button
                  onClick={() => onOpenPacking(c.container_id, c.container_name)}
                  className="shrink-0 text-sm text-blue-600"
                >
                  Pack
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {canManage && (
        adding ? (
          <select
            autoFocus
            className="w-full rounded border px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => e.target.value && assign(e.target.value)}
          >
            <option value="" disabled>Choose a booth…</option>
            {booths
              .filter((b) => !assignments.some((a) => a.booth_id === b.id))
              .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded border px-3 py-2 text-sm"
          >
            <Plus size={16} /> Assign a booth
          </button>
        )
      )}
    </div>
  );
};
```

- [ ] **Step 5: Write the remaining three components**

**`ReportIssueModal.tsx`** — props `{ componentId: string; componentName: string; eventId: string; onClose: () => void; onReported: () => void }`. Radio choice of `damage` or `missing`; a notes textarea; an optional photo file input. Submit calls `boothApi.reportComponent(componentId, { kind, notes, event_id, idempotency_key: crypto.randomUUID() })`, and when a photo was chosen, follows with `boothApi.uploadAttachment('movement', movement.id, file)` using the movement id from the report response. If the photo upload fails but the report succeeded, show *"Issue recorded. The photo will upload when you're back online."* and still call `onReported()` — never lose the report because the photo failed.

**`ExceptionsList.tsx`** — props `{ eventId: string }`. Loads `boothApi.getExceptions(eventId)`. Renders each row as component name (plus asset tag when present), booth name, `humanise(current_status)` / `humanise(condition)`, the note, and who reported it and when. Empty state: *"No damaged or missing pieces reported."* Wrap the whole block in a heading that shows the count so it can be scanned at a glance.

**`BoothInventoryPanel.tsx`** — props `{ event: TradeShow; user: User }`. Holds the panel state: which container's packing list is open (`useState<{ id: string; name: string } | null>`). Computes `canManage = ['admin','coordinator','developer'].includes(user.role)`. Renders a bordered section titled "Booth inventory" containing `<ManifestView …/>`, then `<PackingChecklist …/>` when a container is open, then `<ExceptionsList eventId={event.id} />`. Import `TradeShow` and `User` types from `'../../../../App'` to match how `BoothSection.tsx` already imports them.

- [ ] **Step 6: Mount the panel**

In `src/components/checklist/sections/BoothSection/index.ts` add:

```typescript
export { BoothInventoryPanel } from './BoothInventoryPanel';
```

In `src/components/checklist/sections/BoothSection.tsx`, add `BoothInventoryPanel` to the existing import from `'./BoothSection/index'`, and render it after the booth-shipping section — a mount point only, nothing inline:

```tsx
      <BoothInventoryPanel event={event} user={user} />
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/checklist/sections/BoothSection/__tests__/`
Expected: PASS (14 tests across the two new files).

- [ ] **Step 8: Verify the full frontend suite, build and lint**

Run: `npx vitest run && npm run build && npm run lint`
Expected: all green, no new lint errors. Confirm the pre-existing `BoothSection` tests still pass — the mount must not disturb them.

- [ ] **Step 9: Commit**

```bash
git add src/components/checklist/sections/BoothSection/ \
        src/components/checklist/sections/BoothSection.tsx
git commit -m "feat(booth): checklist manifest panel, packing checklist and exceptions"
```

---

## Task 15: Offline packing

The highest-risk piece, and the reason `idempotency_key` went into the schema in Task 1.

**Why it is tractable:** movements are append-only *events*, not mutations. Replaying one out of order cannot corrupt history — the log records what happened and the derived `current_*` columns settle to last-write-wins. The unique `idempotency_key` makes a duplicated replay a no-op. That is the whole safety argument; do not weaken it by inventing client-side merge logic.

**Files:**
- Modify: `src/utils/offlineDb.ts` (Dexie v4, new entity types, photo blob store)
- Modify: `src/utils/syncManager.ts` (dispatch for the new entities)
- Modify: `src/components/checklist/sections/BoothSection/PackingChecklist.tsx` (optimistic + queued badge)
- Modify: `src/components/checklist/sections/BoothSection/ReportIssueModal.tsx` (queue the photo blob)
- Test: `src/utils/__tests__/syncManager.booth.test.ts`

**Interfaces:**
- Consumes: `boothApi` (Task 12); existing `offlineDb`, `syncManager`, `networkMonitor`, `generateUUID`.
- Produces:
  - `SyncQueueItem['entity']` extended to `'expense' | 'user' | 'event' | 'booth_movement' | 'booth_photo'`
  - ```typescript
    export interface PendingBoothPhoto {
      id: string;            // UUID, also the queue item's localId
      entityType: string;    // 'movement' | 'component' | 'container' | 'booth'
      entityId: string;      // may be an idempotency_key placeholder, see below
      blob: Blob;
      caption?: string;
      createdAt: number;
    }
    ```
  - `offlineDb.pendingBoothPhotos` table, plus `putPendingBoothPhoto(photo)`, `getPendingBoothPhoto(id)`, `deletePendingBoothPhoto(id)`
  - `syncManager` handles both new entities.

**Photo ordering.** A damage photo may be captured before its movement exists server-side. The queue item stores the movement's `idempotency_key` as `entityId` with a `pending_movement:` prefix; on replay, the photo handler first resolves that key to a real movement id (the movement queue item having synced first, FIFO by `timestamp`), then uploads. If the key cannot be resolved yet, throw so the existing retry/backoff picks it up on the next pass — do not drop the photo.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/syncManager.booth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncManager } from '../syncManager';
import { offlineDb } from '../offlineDb';
import { boothApi } from '../boothApi';

vi.mock('../offlineDb', () => ({
  offlineDb: {
    addToSyncQueue: vi.fn(),
    updateQueueItem: vi.fn(),
    markQueueItemSynced: vi.fn(),
    markQueueItemFailed: vi.fn(),
    getPendingBoothPhoto: vi.fn(),
    deletePendingBoothPhoto: vi.fn(),
    putPendingBoothPhoto: vi.fn(),
  },
}));

vi.mock('../boothApi', () => ({
  boothApi: {
    pack: vi.fn(), unpack: vi.fn(), moveComponent: vi.fn(),
    reportComponent: vi.fn(), uploadAttachment: vi.fn(),
  },
}));

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1', action: 'CREATE', entity: 'booth_movement',
    timestamp: Date.now(), retryCount: 0, status: 'pending',
    deviceId: 'd1', userId: 'u1', idempotencyKey: 'idem-1',
    data: { op: 'pack', containerId: 'k1', componentIds: ['c1'], eventId: 'e1' },
    ...overrides,
  } as any;
}

describe('syncManager — booth movements', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('replays a queued pack through boothApi with its idempotency key', async () => {
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 1 } as any);
    await syncManager.syncItem(item());
    expect(vi.mocked(boothApi.pack)).toHaveBeenCalledWith('k1', {
      component_ids: ['c1'], event_id: 'e1', idempotency_key: 'idem-1',
    });
  });

  it('replays a queued unpack', async () => {
    vi.mocked(boothApi.unpack).mockResolvedValue({ unpacked: 1 } as any);
    await syncManager.syncItem(item({ data: {
      op: 'unpack', containerId: 'k1', componentIds: ['c2'], eventId: 'e1',
    } }));
    expect(vi.mocked(boothApi.unpack)).toHaveBeenCalledWith('k1', expect.objectContaining({
      component_ids: ['c2'], idempotency_key: 'idem-1',
    }));
  });

  it('replays a queued damage report', async () => {
    vi.mocked(boothApi.reportComponent).mockResolvedValue({ id: 'mv-1' } as any);
    await syncManager.syncItem(item({ data: {
      op: 'report', componentId: 'c3', kind: 'damage', notes: 'torn', eventId: 'e1',
    } }));
    expect(vi.mocked(boothApi.reportComponent)).toHaveBeenCalledWith('c3', expect.objectContaining({
      kind: 'damage', notes: 'torn', idempotency_key: 'idem-1',
    }));
  });

  it('marks a replayed duplicate as synced rather than failed', async () => {
    // The server returns 200 with the original movement on an idempotency hit.
    vi.mocked(boothApi.pack).mockResolvedValue({ packed: 0 } as any);
    await syncManager.syncItem(item());
    expect(vi.mocked(offlineDb.markQueueItemSynced)).toHaveBeenCalledWith('q1', undefined);
    expect(vi.mocked(offlineDb.markQueueItemFailed)).not.toHaveBeenCalled();
  });

  it('uploads a queued photo blob and clears it from the store', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue({
      id: 'p1', entityType: 'component', entityId: 'c1', blob, createdAt: 1,
    } as any);
    vi.mocked(boothApi.uploadAttachment).mockResolvedValue({ id: 'att-1' } as any);

    await syncManager.syncItem(item({
      id: 'q2', entity: 'booth_photo', data: { photoId: 'p1' },
    }));

    expect(vi.mocked(boothApi.uploadAttachment)).toHaveBeenCalledWith(
      'component', 'c1', blob, undefined
    );
    expect(vi.mocked(offlineDb.deletePendingBoothPhoto)).toHaveBeenCalledWith('p1');
  });

  it('throws (so it retries) when a photo still points at an unsynced movement', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue({
      id: 'p1', entityType: 'movement', entityId: 'pending_movement:idem-9',
      blob, createdAt: 1,
    } as any);

    await syncManager.syncItem(item({
      id: 'q3', entity: 'booth_photo', data: { photoId: 'p1' },
    }));

    // Retried, not dropped: the blob must survive for the next pass.
    expect(vi.mocked(offlineDb.deletePendingBoothPhoto)).not.toHaveBeenCalled();
    expect(vi.mocked(boothApi.uploadAttachment)).not.toHaveBeenCalled();
  });

  it('drops a photo whose blob has vanished instead of retrying forever', async () => {
    vi.mocked(offlineDb.getPendingBoothPhoto).mockResolvedValue(null as any);
    await syncManager.syncItem(item({
      id: 'q4', entity: 'booth_photo', data: { photoId: 'gone' },
    }));
    expect(vi.mocked(offlineDb.markQueueItemSynced)).toHaveBeenCalledWith('q4', undefined);
  });
});
```

Note: `syncItem` is currently `private`. Change it to `public` (or `/** @internal */ public`) so it is directly testable — the existing private-method tests in this repo already reach for the same pattern.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/utils/__tests__/syncManager.booth.test.ts`
Expected: FAIL — `Unknown entity type: booth_movement`.

- [ ] **Step 3: Extend `offlineDb.ts`**

Widen the entity union:

```typescript
  entity: 'expense' | 'user' | 'event' | 'booth_movement' | 'booth_photo';
```

Add the interface near the other cached types:

```typescript
/** A photo captured offline, held until its target exists server-side. */
export interface PendingBoothPhoto {
  id: string;
  entityType: string;
  /**
   * A real entity id, OR `pending_movement:<idempotencyKey>` when the movement
   * this photo belongs to has not synced yet.
   */
  entityId: string;
  blob: Blob;
  caption?: string;
  createdAt: number;
}
```

Declare the table and bump the version — Dexie carries v1–v3 tables forward, so only the new store is declared:

```typescript
  pendingBoothPhotos!: Table<PendingBoothPhoto, string>;
```

```typescript
    // v4 adds booth inventory: cached catalog data for offline packing and a
    // blob store for photos captured with no signal.
    this.version(4).stores({
      cachedBoothInventory: 'key',
      pendingBoothPhotos: 'id, createdAt'
    });
```

Add `cachedBoothInventory!: Table<{ key: string; data: any; cachedAt: number }, string>;` alongside it, and these methods, each swallowing errors the same way `setCachedPicklists` does (a failed cache write must not break a working session):

```typescript
  async putPendingBoothPhoto(photo: PendingBoothPhoto): Promise<void> {
    await this.pendingBoothPhotos.put(photo);
  }

  async getPendingBoothPhoto(id: string): Promise<PendingBoothPhoto | null> {
    try {
      return (await this.pendingBoothPhotos.get(id)) ?? null;
    } catch (error) {
      console.error('[offlineDb] Failed to read pending booth photo:', error);
      return null;
    }
  }

  async deletePendingBoothPhoto(id: string): Promise<void> {
    try {
      await this.pendingBoothPhotos.delete(id);
    } catch (error) {
      console.error('[offlineDb] Failed to delete pending booth photo:', error);
    }
  }

  async setCachedBoothInventory(key: string, data: any): Promise<void> {
    try {
      await this.cachedBoothInventory.put({ key, data, cachedAt: Date.now() });
    } catch (error) {
      console.error('[offlineDb] Failed to cache booth inventory:', error);
    }
  }

  async getCachedBoothInventory(key: string): Promise<any | null> {
    try {
      return (await this.cachedBoothInventory.get(key))?.data ?? null;
    } catch (error) {
      console.error('[offlineDb] Failed to read cached booth inventory:', error);
      return null;
    }
  }
```

- [ ] **Step 4: Extend `syncManager.ts`**

Add `import { boothApi } from './boothApi';`. Change `private async syncItem` to `async syncItem`. Add two cases to the entity switch:

```typescript
        case 'booth_movement':
          remoteId = await this.syncBoothMovement(item);
          break;
        case 'booth_photo':
          remoteId = await this.syncBoothPhoto(item);
          break;
```

and these two methods:

```typescript
  /**
   * Booth movements are append-only events, so replay is safe: the server
   * dedupes on idempotency_key and returns the original. A "0 changed"
   * response is a successful replay, NOT a failure.
   */
  private async syncBoothMovement(item: SyncQueueItem): Promise<string | undefined> {
    const { op, containerId, componentIds, componentId, eventId, kind, notes,
            toLocationId, toContainerId, toStatus } = item.data;
    const idempotency_key = item.idempotencyKey;

    switch (op) {
      case 'pack':
        await boothApi.pack(containerId, {
          component_ids: componentIds, event_id: eventId, idempotency_key,
        });
        return undefined;
      case 'unpack':
        await boothApi.unpack(containerId, {
          component_ids: componentIds, event_id: eventId, idempotency_key,
        });
        return undefined;
      case 'move':
        await boothApi.moveComponent(componentId, {
          to_location_id: toLocationId ?? null,
          to_container_id: toContainerId,
          to_status: toStatus ?? null,
          event_id: eventId ?? null,
          idempotency_key,
        });
        return undefined;
      case 'report': {
        const movement = await boothApi.reportComponent(componentId, {
          kind, notes, event_id: eventId, idempotency_key,
        });
        return movement?.id;
      }
      default:
        throw new Error(`Unknown booth movement op: ${op}`);
    }
  }

  /**
   * A photo may have been captured before its movement synced. Its entityId is
   * then `pending_movement:<key>`; throw so the existing backoff retries after
   * the movement lands. Never drop the blob — the photo IS the evidence.
   */
  private async syncBoothPhoto(item: SyncQueueItem): Promise<string | undefined> {
    const photo = await offlineDb.getPendingBoothPhoto(item.data.photoId);
    if (!photo) {
      // Blob is gone (cache eviction). Nothing to retry — let it settle.
      console.warn(`[SyncManager] Pending booth photo ${item.data.photoId} not found; dropping`);
      return undefined;
    }

    if (photo.entityId.startsWith('pending_movement:')) {
      throw new Error('Movement for this photo has not synced yet; will retry');
    }

    const attachment = await boothApi.uploadAttachment(
      photo.entityType, photo.entityId, photo.blob, photo.caption
    );
    await offlineDb.deletePendingBoothPhoto(photo.id);
    return attachment?.id;
  }
```

After a `booth_movement` with `op: 'report'` syncs and returns a movement id, resolve any pending photo pointing at its key. Add to `syncItem`, right after `markQueueItemSynced`:

```typescript
      if (item.entity === 'booth_movement' && item.data?.op === 'report' && remoteId) {
        await this.resolvePendingPhotoTarget(item.idempotencyKey, remoteId);
      }
```

and:

```typescript
  /** Point any queued photo for this movement at the real movement id. */
  private async resolvePendingPhotoTarget(key: string, movementId: string): Promise<void> {
    try {
      const placeholder = `pending_movement:${key}`;
      const pending = await offlineDb.pendingBoothPhotos
        .filter((p) => p.entityId === placeholder).toArray();
      for (const photo of pending) {
        await offlineDb.putPendingBoothPhoto({ ...photo, entityId: movementId });
      }
    } catch (error) {
      console.error('[SyncManager] Failed to resolve pending photo target:', error);
    }
  }
```

- [ ] **Step 5: Make the packing checklist queue when offline**

In `PackingChecklist.tsx`, import `networkMonitor` and `syncManager`. In `toggle()`, when `!networkMonitor.isOnline()`, enqueue instead of calling the API directly, update local state optimistically, and skip the reload:

```typescript
    if (!networkMonitor.isOnline()) {
      await syncManager.queueAction(
        'CREATE', 'booth_movement',
        { op: currentlyPacked ? 'unpack' : 'pack',
          containerId, componentIds: [componentId], eventId },
        { idempotencyKey: idempotency_key }
      );
      setData((prev) => prev && {
        ...prev,
        items: prev.items.map((i) =>
          i.component_id === componentId ? { ...i, packed: !currentlyPacked } : i),
        packed_count: prev.packed_count + (currentlyPacked ? -1 : 1),
      });
      setBusy(null);
      return;
    }
```

Check `syncManager`'s existing public enqueue method name and signature before writing this — use whatever it already exposes (it wraps `offlineDb.addToSyncQueue`) rather than adding a new one. Render a queued badge in the header when offline, using the existing sync-status event subscription:

```tsx
        {!online && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            Offline · {pendingCount} queued
          </span>
        )}
```

- [ ] **Step 6: Make `ReportIssueModal` queue its photo**

When a photo is chosen and the report is queued offline, write the blob with a placeholder target and enqueue the upload:

```typescript
      const photoId = generateUUID();
      await offlineDb.putPendingBoothPhoto({
        id: photoId,
        entityType: 'movement',
        entityId: `pending_movement:${idempotencyKey}`,
        blob: file,
        createdAt: Date.now(),
      });
      await syncManager.queueAction('CREATE', 'booth_photo', { photoId });
```

When online, keep the direct path from Task 14 (report, then upload against the returned movement id).

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/syncManager.booth.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 8: Verify the whole suite**

Run: `npx vitest run && npm run build && npm run lint`
Expected: all green. Pay particular attention to the existing `syncManager` tests — widening the entity union and unprivatising `syncItem` must not disturb them.

- [ ] **Step 9: Manual offline check**

Run `npm run start:all`, open the checklist Booth section, open a packing list, then set the browser DevTools Network tab to Offline. Tick two items, confirm the queued badge appears and the boxes stay ticked. Return to Online, confirm the queue drains and a reload shows the same two items still packed.

- [ ] **Step 10: Commit**

```bash
git add src/utils/offlineDb.ts src/utils/syncManager.ts \
        src/components/checklist/sections/BoothSection/ \
        src/utils/__tests__/syncManager.booth.test.ts
git commit -m "feat(booth): offline packing checklist with idempotent replay"
```

---

## Task 16: Release v2.20.0 and deploy to production

**Files:**
- Modify: `package.json`, `backend/package.json`, `backend/src/config/version.ts`
- Modify: `docs/superpowers/plans/2026-08-26-booth-inventory.md` (tick remaining boxes)

**Interfaces:**
- Consumes: everything from Tasks 1–15.
- Produces: v2.20.0 on `main`, deployed and verified in production.

- [ ] **Step 1: Run the full verification suite**

```bash
cd backend && npm test && npm run build && cd ..
npx vitest run && npm run lint && npm run build
```

Expected: everything green. Do not proceed on a single failure — record the output rather than claiming success.

- [ ] **Step 2: Bump the version in all three places**

```bash
npm version 2.20.0 --no-git-tag-version
cd backend && npm version 2.20.0 --no-git-tag-version && cd ..
sed -i '' "s/FRONTEND_VERSION = '.*'/FRONTEND_VERSION = '2.20.0'/" backend/src/config/version.ts
grep -n '"version"' package.json backend/package.json
grep -n FRONTEND_VERSION backend/src/config/version.ts
```

Expected: `2.20.0` in all three.

- [ ] **Step 3: Commit and merge to main**

```bash
git add package.json backend/package.json backend/src/config/version.ts
git commit -m "chore(release): v2.20.0 — booth inventory and tracking"
git checkout main
git merge --no-ff feat/booth-inventory -m "Merge feat/booth-inventory: booth inventory and tracking (v2.20.0)"
git push origin main
```

- [ ] **Step 4: Deploy to production**

```bash
ssh root@192.168.1.190
```

Follow the project's documented deploy path. The authoritative backend env file is `/etc/expenseapp/backend.env` — do NOT ship a `.env` inside the deploy tarball (that caused a 25-minute outage on 2026-08-26).

- [ ] **Step 5: Verify migration 039 actually applied**

`migrate.ts` silently skips a migration on a `42501` permission error, so a clean service start is **not** proof. Query directly:

```bash
psql -U <db_user> -d <db_name> -c "SELECT version FROM schema_migrations WHERE version LIKE '039%';"
psql -U <db_user> -d <db_name> -c "\dt booth*"
```

Expected: one `039` row, and the five `booth*` tables plus `inventory_locations` and `event_booth_*`. If the row is missing, the migration was skipped — check the backend log for `42501` and fix the grant before continuing.

- [ ] **Step 6: Restart the backend and clear the proxy cache**

```bash
systemctl restart trade-show-app-backend
systemctl status trade-show-app-backend --no-pager
```

Then restart the NPMplus proxy (Proxmox container 104) so the new frontend is served rather than the cached bundle.

- [ ] **Step 7: Smoke-test live**

1. Log in as an admin. Confirm the **Booths** nav entry appears.
2. Create a location, a booth, a container, and two components — one pooled (`quantity 6`), one tagged (`asset_tag`). Confirm the granularity toggle behaves.
3. Set the tagged component's `default_container_id` to the container, open the container's packing list, tick the item, confirm it shows packed.
4. Open an event's checklist → Booth section → assign the booth, confirm the manifest materialises the container.
5. Report the tagged component damaged with a note; confirm it appears in the exceptions list.
6. Log in as a `salesperson`. Confirm the Booths nav entry is **absent** but the checklist Booth inventory panel still loads and the packing list works.
7. Confirm `/api/health` (or the app footer) reports 2.20.0.

- [ ] **Step 8: Record the outcome**

Report exactly what passed and what did not. If any smoke-test step fails, say so with the output rather than reporting a clean deploy.
