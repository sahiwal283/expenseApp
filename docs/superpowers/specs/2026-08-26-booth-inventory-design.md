# Booth Inventory & Tracking — Design

Date: 2026-08-26
Status: Approved
Target release: v2.20.0 (minor — new backwards-compatible feature)

## Problem

Argo tracks trade show *expenses* but has no record of the physical booth
assets those shows depend on. Nobody can answer:

- Which table, fabric, and frame belong to which booth?
- Where is each piece right now — at a show, in transit, in storage, at a
  warehouse?
- Which pieces are going to which show?
- At teardown, is everything back in the crate it belongs in?

The result is that setup and breakdown run on memory, and missing or damaged
pieces are discovered at the next show rather than at the last one.

## Goals

1. A durable catalog of booths, the containers they pack into, and the
   components inside them.
2. A live answer to "where is this piece" plus an immutable history of how it
   got there.
3. A per-show manifest — what is going, what is staying.
4. Setup/teardown ergonomics: bulk moves and a packing checklist that works
   offline at a venue.
5. Exception capture: damaged and missing pieces recorded at the moment they
   are found.

## Prior art

`~/Work/argo` (the rewritten app) implements the catalog, the three-layer
model, movement logging, and weight tracking. Its `docs/BOOTH_INVENTORY_MODEL.md`
lists what it did *not* build:

> Bulk movement · Packing checklist view · Component verification workflow ·
> Damage reporting flow · Booth documents · Shipment integration · Trade show
> linkage on movements · Filter/search within tabs

That list is essentially this project's differentiator. We adopt Argo's model
where it is sound, and build the deferred ergonomics that make the data worth
maintaining. Two further departures from Argo: **hybrid granularity**
(quantity rows and individually-tagged instance rows in one table) and
**offline-first** packing, which Argo cannot do at all.

---

## 1. Data model

One migration: `backend/src/database/migrations/039_create_booth_inventory.sql`.
Eight tables. All ids `UUID DEFAULT gen_random_uuid()`, all timestamps
`TIMESTAMPTZ`, matching existing repo convention.

### 1.1 `inventory_locations`

Named `inventory_locations`, not `locations`: the `events` table already carries
`venue`/`city`/`state`, and a bare `locations` would read as event venues.

| Column | Notes |
|---|---|
| `name` | required |
| `type` | `company_warehouse`, `storage_unit`, `partner_company`, `partner_person`, `carrier`, `convention_center`, `hotel`, `show_site`, `other` |
| `address`, `city`, `state`, `country` | |
| `contact_name`, `contact_phone`, `contact_email` | |
| `notes` | |
| `is_active` | soft delete |

### 1.2 `booths`

| Column | Notes |
|---|---|
| `name` | required |
| `brand`, `size`, `type`, `manufacturer`, `year_acquired` | |
| `description`, `notes` | |
| `current_location_id` | FK → `inventory_locations`, `ON DELETE SET NULL` |
| `current_status` | `in_storage`, `at_warehouse`, `at_partner_location`, `in_transit`, `at_show`, `retired` |
| `is_active` | soft delete |

Booth status does **not** cascade to components. Components track their own
status, because a booth is rarely wholly in one place.

### 1.3 `booth_containers`

| Column | Notes |
|---|---|
| `booth_id` | FK → `booths`, `ON DELETE SET NULL` (a container may be unassigned) |
| `name`, `label`, `description` | |
| `type` | `bag`, `box`, `crate`, `case`, `pallet`, `other` |
| `asset_tag` | nullable, unique where not null — QR payload |
| `dimensions`, `weight_capacity` | freeform |
| `current_location_id` | FK → `inventory_locations` |
| `current_status` | `in_storage`, `in_transit`, `at_show`, `missing` |
| `empty_weight_value`, `packed_weight_value` | `NUMERIC(8,2)` nullable |
| `weight_unit` | `lb` \| `kg`, default `lb` |
| `weight_source` | `estimated`, `measured`, `carrier`, `manufacturer`, `unknown` |
| `weight_notes`, `weight_updated_at`, `weight_updated_by` | |
| `notes` | |

Packed weight is **never** auto-summed from components — packing material and
arrangement make a sum wrong. It is entered manually and a measured value is
never overwritten by a calculation.

### 1.4 `booth_components`

| Column | Notes |
|---|---|
| `booth_id` | FK → `booths`, `ON DELETE CASCADE`, required |
| `parent_component_id` | FK self, `ON DELETE SET NULL` — subcomponents |
| `name` | required |
| `category` | `frame`, `frame_part`, `fabric`, `shelf`, `table_top`, `banner`, `light`, `hardware`, `tool`, `case`, `side_piece`, `setup_accessory`, `other` |
| `quantity` | `INTEGER NOT NULL DEFAULT 1`, `CHECK (quantity > 0)` |
| `asset_tag` | nullable, unique where not null |
| `condition` | `good`, `fair`, `damaged`, `retired` |
| `current_status` | `in_storage`, `in_transit`, `at_show`, `missing`, `damaged`, `retired` |
| `current_location_id` | FK → `inventory_locations` |
| `default_container_id` | FK → `booth_containers` — where it belongs |
| `current_container_id` | FK → `booth_containers` — where it is; NULL when loose |
| `last_verified_at`, `last_verified_by` | |
| `weight_value`, `weight_unit`, `weight_source`, `weight_notes`, `weight_updated_at`, `weight_updated_by` | as above |
| `notes` | |

**Hybrid granularity.** A row with an `asset_tag` is one physical object
(`quantity` stays 1, enforced by
`CHECK (asset_tag IS NULL OR quantity = 1)`). A row without one is a counted
pool. This is one table and one set of queries; the only difference downstream
is how a label renders and whether "1 of 6 damaged" is expressible.

Total weight for a quantity row is `weight_value × quantity`, derived at read
time and never stored.

Indexes: `booth_id`, `current_container_id`, `default_container_id`,
`current_location_id`, `current_status`, and partial unique on `asset_tag`.

### 1.5 `booth_movements`

Immutable. Rows are inserted, never updated or deleted.

| Column | Notes |
|---|---|
| `component_id` | FK → `booth_components`, `ON DELETE SET NULL` |
| `container_id` | FK → `booth_containers`, `ON DELETE SET NULL` |
| `booth_id` | FK → `booths` — denormalised so booth history is one indexed query; populated by `BoothMovementService` on insert from the component's or container's owning booth, never supplied by callers |
| `event_type` | `location_change`, `container_change`, `status_change`, `verification`, `damage_report`, `missing_report` |
| `from_location_id`, `to_location_id` | |
| `from_container_id`, `to_container_id` | |
| `from_status`, `to_status` | |
| `from_condition`, `to_condition` | |
| `event_id` | FK → `events` — "what moved for Expo West?" |
| `performed_by` | FK → `users`, `ON DELETE SET NULL`, nullable — a deleted user must not cascade away the history they recorded |
| `notes` | |
| `idempotency_key` | `VARCHAR(64)` nullable, **unique where not null** |
| `created_at` | |

At least one of `component_id` / `container_id` must be set
(`CHECK (component_id IS NOT NULL OR container_id IS NOT NULL)`).

`idempotency_key` is present from day one rather than retrofitted: it is the
mechanism that makes offline replay safe (§4).

### 1.6 `event_booth_assignments`

| Column | Notes |
|---|---|
| `event_id` | FK → `events`, `ON DELETE CASCADE` |
| `booth_id` | FK → `booths`, `ON DELETE CASCADE` |
| `status` | `planned`, `preparing`, `shipped`, `at_show`, `returned`, `cancelled` |
| `needed_by_date` | `DATE` |
| `setup_notes`, `teardown_notes` | |
| `created_by` | FK → `users` |

`UNIQUE (event_id, booth_id)`.

### 1.7 `event_booth_manifest_containers`

| Column | Notes |
|---|---|
| `assignment_id` | FK → `event_booth_assignments`, `ON DELETE CASCADE` |
| `container_id` | FK → `booth_containers`, `ON DELETE CASCADE` |
| `included` | `BOOLEAN NOT NULL DEFAULT true` |
| `is_extra` | `BOOLEAN NOT NULL DEFAULT false` — container borrowed from another booth |
| `notes` | |

`UNIQUE (assignment_id, container_id)`.

**Materialised, not derived.** Assigning a booth to an event inserts one row
per container that booth currently owns, all `included = true`. Excluding
Crate C is then an `UPDATE`; adding a spare case from another booth is an
`INSERT` with `is_extra = true`.

The trade-off is accepted deliberately: the manifest is a snapshot of what was
*decided* for that show, so editing the booth months later does not silently
rewrite history. Drift is surfaced, never auto-reconciled — the manifest view
runs a diff against the booth's current containers and offers an explicit
"2 containers aren't on this manifest — add them?" action
(`POST …/sync`, §2.5).

### 1.8 `booth_attachments`

Polymorphic, serving both component reference photos and damage-report photos.

| Column | Notes |
|---|---|
| `entity_type` | `booth`, `container`, `component`, `movement` |
| `entity_id` | UUID, no FK (polymorphic) |
| `url` | `/uploads/booth-inventory/<filename>` |
| `caption` | |
| `uploaded_by` | FK → `users` |

Index on `(entity_type, entity_id)`. Upload reuses the multer pattern already
in `backend/src/routes/checklist.ts:259` (booth-map upload).

### 1.9 What is deliberately absent

**No packing-session table.** "Packed" is derived:
`current_container_id = default_container_id`. The checklist is a diff, so
there are no half-finished sessions to reconcile and the state is
self-healing. Ticking an item *is* the container change; there is no separate
progress record that can disagree with reality.

**No changes to existing checklist booth fields.** `booth_ordered`,
`electricity_ordered`, `booth_notes`, `booth_map_url`, and booth shipping are
per-show logistics and stay exactly as they are. Inventory is a new domain
that links in through the manifest.

---

## 2. Backend API

New files under `backend/src/`:

```
database/migrations/039_create_booth_inventory.sql
database/repositories/InventoryLocationRepository.ts
database/repositories/BoothRepository.ts
database/repositories/BoothContainerRepository.ts
database/repositories/BoothComponentRepository.ts
database/repositories/BoothMovementRepository.ts
database/repositories/EventBoothAssignmentRepository.ts
database/repositories/BoothAttachmentRepository.ts
services/booth/BoothMovementService.ts      — writes the log, enforces idempotency
services/booth/BoothInventoryService.ts     — catalog + bulk moves
services/booth/BoothPackingService.ts       — derived packing checklist
services/booth/BoothManifestService.ts      — event assignment + overrides
routes/inventoryLocations.ts
routes/booths.ts
routes/boothContainers.ts
routes/boothComponents.ts
routes/boothManifest.ts
routes/boothAttachments.ts
```

All repositories extend `BaseRepository`. All routes use `authorize()` +
`asyncHandler` per existing convention. Routes never import from other routes;
cross-cutting logic lives in the services.

### 2.1 Mounts (`server.ts`)

```ts
app.use('/api/inventory-locations', authenticateToken, sessionTracker, inventoryLocationRoutes);
app.use('/api/booths',              authenticateToken, sessionTracker, boothRoutes);
app.use('/api/booth-containers',    authenticateToken, sessionTracker, boothContainerRoutes);
app.use('/api/booth-components',    authenticateToken, sessionTracker, boothComponentRoutes);
app.use('/api/booth-manifest',      authenticateToken, sessionTracker, boothManifestRoutes);
app.use('/api/booth-attachments',   authenticateToken, sessionTracker, boothAttachmentRoutes);
```

### 2.2 Role split

Two distinct permission tiers, because the people who *manage* the catalog are
not the people who *pack the crates*:

| Tier | Roles | Covers |
|---|---|---|
| Catalog management | `admin`, `coordinator`, `developer` | create/edit/delete booths, containers, components, locations; assign booths to events; edit manifests |
| Field operations | `admin`, `coordinator`, `developer`, `salesperson` | moves, pack/unpack, verification, damage and missing reports, photo upload |
| Read | field-ops roles | all GETs |

`accountant` and `pending` have no access, matching the existing checklist
gate in `App.tsx:368`.

Note the deliberate asymmetry: `salesperson` **can** read every inventory
endpoint but **cannot** see the global Booths page. The page gate is a UI
decision (the catalog is a management surface); the API read permission is
what makes the checklist manifest panel work for setup crew. Do not "tighten"
the API reads to match the page gate — that would break the panel.

### 2.3 Catalog endpoints

```
GET    /api/inventory-locations            ?q=&type=&is_active=
POST   /api/inventory-locations
GET    /api/inventory-locations/:id
PATCH  /api/inventory-locations/:id
DELETE /api/inventory-locations/:id        soft delete (is_active=false)

GET    /api/booths                         ?q=&status=&location_id=&is_active=
POST   /api/booths
GET    /api/booths/:id                     + container/component counts
PATCH  /api/booths/:id
DELETE /api/booths/:id                     soft delete
GET    /api/booths/:id/containers
POST   /api/booths/:id/containers
GET    /api/booths/:id/components          ?q=&category=&status=&container_id=
POST   /api/booths/:id/components
GET    /api/booths/:id/movements           ?limit=&before=&event_id=

GET    /api/booth-containers/:id           + component list
PATCH  /api/booth-containers/:id
DELETE /api/booth-containers/:id
GET    /api/booth-containers/:id/movements

GET    /api/booth-components/:id
PATCH  /api/booth-components/:id
DELETE /api/booth-components/:id
GET    /api/booth-components/:id/movements
```

`DELETE` on a container nulls `current_container_id` / `default_container_id`
on its components rather than orphaning them, and records a
`container_change` movement for each.

### 2.4 Movement endpoints

Every write that changes `current_location_id`, `current_container_id`,
`current_status`, or `condition` auto-records a movement through
`BoothMovementService`. Callers never write the log directly.

```
POST /api/booths/:id/move
     { to_location_id, to_status?, notes?, event_id?, idempotency_key? }
     Bulk: moves the booth, all its containers, and all components whose
     current_container_id is one of those containers. One movement row per
     affected entity, all in a single transaction.

POST /api/booth-containers/:id/move
     Same shape; moves the container and everything currently inside it.

POST /api/booth-components/:id/move
     { to_location_id?, to_container_id?, to_status?, notes?, event_id?, idempotency_key? }

POST /api/booth-components/:id/report
     { kind: 'damage' | 'missing', condition?, notes?, event_id?, idempotency_key? }
     Writes damage_report / missing_report and updates condition/status.

POST /api/booth-components/:id/verify
     Sets last_verified_at/by, writes a verification movement.
```

**Idempotency.** Any movement-producing POST accepts an optional
`idempotency_key`. `BoothMovementService` inserts with
`ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`
(the predicate is required: the index is partial, and Postgres rejects the
statement without it); on conflict it returns the
existing movement with `200` instead of creating a duplicate. Bulk moves
derive per-entity keys as `<key>:<entity_type>:<entity_id>` so a replayed bulk
move is idempotent across every row it touched.

### 2.5 Packing and manifest endpoints

```
GET  /api/booth-containers/:id/packing
     Derived checklist. For each component with default_container_id = :id:
       { component, expected: true, packed: current_container_id === :id }
     Plus strays: components whose current_container_id = :id but whose
     default_container_id is something else — flagged 'unexpected'.

POST /api/booth-containers/:id/pack
     { component_ids: [...], idempotency_key? }
     Sets current_container_id = :id for each. Records container_change.

POST /api/booth-containers/:id/unpack
     { component_ids: [...], to_location_id?, idempotency_key? }
     Sets current_container_id = NULL. Records container_change.

GET    /api/booth-manifest/event/:eventId
       Assignments + containers + included/extra flags + weight totals
       + drift ("containers on the booth but not on this manifest")

POST   /api/booth-manifest/event/:eventId
       { booth_id, needed_by_date?, setup_notes? }
       Creates the assignment AND materialises manifest container rows.

PATCH  /api/booth-manifest/:assignmentId
DELETE /api/booth-manifest/:assignmentId
PATCH  /api/booth-manifest/:assignmentId/containers/:containerId
       { included }
POST   /api/booth-manifest/:assignmentId/containers
       { container_id }  → is_extra = true
POST   /api/booth-manifest/:assignmentId/sync
       Adds manifest rows for booth containers currently missing from it.
       Never removes rows; drift resolution is always additive and explicit.
```

Weight totals are computed from `packed_weight_value` of included containers,
returned alongside a count of how many containers actually have a weight
recorded so the UI can caveat a partial total rather than present a
misleading number.

---

## 3. Frontend

### 3.1 Global Booths page

New top-level page, gated to `admin` / `coordinator` / `developer`. Follows the
existing string-based `currentPage` pattern in `App.tsx` (no React Router) and
adds a `booths` nav entry in `Sidebar.tsx`.

```
src/components/booths/
  BoothsPage.tsx            tab shell: Catalog | Locations | Movements
  BoothCatalogTab.tsx       searchable booth list + create modal
  BoothDetail.tsx           tabs: Overview | Containers | Components | History
  BoothContainersTab.tsx    list + weights + per-row edit
  BoothComponentsTab.tsx    list, indented children, filter by category/status/container
  BoothMovementsTab.tsx     timeline, filterable by event
  LocationsTab.tsx          location list + create/edit
  ComponentFormModal.tsx    create/edit; asset_tag toggles instance mode
  ContainerFormModal.tsx
  WeightEditModal.tsx       value + unit + source + notes
  MoveModal.tsx             bulk move: destination, status, note
  PhotoGallery.tsx          attachments for a booth/container/component
  hooks/useBoothInventory.ts
```

The component form makes granularity explicit: a "Track individually" toggle
swaps the quantity field for an asset-tag field, so the hybrid model is a
visible choice rather than a hidden schema detail.

### 3.2 Checklist Booth section panel

The existing `BoothSection.tsx` gains an Inventory panel below the current
booth/electricity/map/shipping cards. Its access follows the checklist's
existing gate (everyone except `accountant`).

```
src/components/checklist/sections/BoothSection/
  BoothInventoryPanel.tsx   manifest summary + entry points
  ManifestView.tsx          assigned booths, container include/exclude, weight total
  PackingChecklist.tsx      per-container pack/unpack, offline-capable
  ExceptionsList.tsx        damaged + missing for this event
  ReportIssueModal.tsx      damage/missing + note + photo
```

`BoothSection.tsx` is already ~10 KB and near the size where it should stop
growing; the panel is a sibling component, not inline additions, and
`BoothSection.tsx` gains only the mount point.

### 3.3 API client

A dedicated `src/utils/boothApi.ts` rather than extending `src/utils/api.ts`,
which is already 458 lines and a single object literal. Same axios instance
and JWT interceptor via `apiClient.ts`.

---

## 4. Offline

The packing checklist must work at a convention centre with no usable wifi.
This is the highest-risk part of the feature and the reason `idempotency_key`
is in the schema from the start.

**Why it is tractable:** movements are append-only events, not mutations.
Replaying a movement out of order cannot corrupt history — the log records
what happened, and the derived `current_*` columns settle to last-write-wins.
The unique `idempotency_key` makes a duplicated replay a no-op.

### 4.1 Changes

- `src/utils/offlineDb.ts`: bump Dexie to `version(4)`. Extend
  `SyncQueueItem['entity']` with `'booth_movement' | 'booth_attachment'`. Add a
  `cachedBoothInventory` store (booths, containers, components, locations for
  the events the user is on) and a `pendingBoothPhotos` store holding `Blob`s.
- `src/utils/syncManager.ts`: handle the new entities, dispatching to
  `boothApi`. Each queued item carries a client-generated `idempotency_key`
  (existing `generateUUID`), reusing the existing retry/backoff and
  `MAX_RETRIES = 5`.
- Packing checklist writes optimistically to Dexie and enqueues; the UI shows
  a queued-changes badge using the existing sync-status events.

### 4.2 Photos offline

Dexie stores `Blob`s natively, so a damage photo taken with no signal is held
in `pendingBoothPhotos` and uploaded on reconnect, after which the attachment
row is created. The queue item references the movement's `idempotency_key`
rather than a server id, since the movement may not exist server-side yet.

This is the single most complex piece of the feature. If it proves unstable
under test it degrades cleanly: the photo capture is disabled offline and the
damage report still records status and note. That fallback is a UI flag, not
a schema change.

---

## 5. Build order

Each stage is independently verifiable and leaves the app working.

| # | Stage | Verification |
|---|---|---|
| 1 | Migration 039 + 7 repositories | schema test; repository unit tests |
| 2 | Catalog API (locations, booths, containers, components) | route tests, role-gate tests |
| 3 | Movement engine: auto-record, bulk move, damage/missing/verify, idempotency | unit + integration; explicit duplicate-key replay test |
| 4 | Packing API: derived checklist, pack/unpack, strays | integration tests incl. unexpected-container case |
| 5 | Manifest API: assignment, materialisation, overrides, drift sync, weights | integration; partial-weight caveat test |
| 6 | Frontend: global Booths page | component tests; manual pass |
| 7 | Frontend: checklist manifest panel + packing UI | component tests; manual pass |
| 8 | Offline: Dexie v4, queue handlers, photo blobs | sync-replay tests incl. duplicate replay |
| 9 | Release v2.20.0 + production deploy | full suite, lint, live smoke test |

TDD per `superpowers:test-driven-development` throughout — tests precede
implementation at every stage.

## 6. Versioning and deployment

**v2.20.0.** SemVer minor: new backwards-compatible functionality, no breaking
changes to existing endpoints or schema. Bump `package.json`,
`backend/package.json`, and the generated `backend/src/config/version.ts`.

Deployment follows the documented path — build, deploy, restart
`trade-show-app-backend`, clear the NPMplus proxy cache so the new frontend
is actually served.

**Migration risk.** Per project history, `migrate.ts` silently skips a
migration on a `42501` permission error, which previously caused a schema
drift incident. Migration 039 must be confirmed applied by querying
`schema_migrations` after deploy — not inferred from a clean service start.

## 7. Out of scope

Deferred deliberately, with the schema shaped so none require a rewrite:

- **QR label printing and camera scanning.** `asset_tag` exists on containers
  and components as the payload; scanning becomes an input method on the same
  packing screens.
- **Shipment integration.** The existing booth-shipping section stays
  independent; `booth_movements` can gain a `shipment_id` later.
- **Booth documents** (setup guides, assembly diagrams).
- **Maintenance/repair history** beyond the condition field and damage reports.
- **Cost and depreciation tracking.**
