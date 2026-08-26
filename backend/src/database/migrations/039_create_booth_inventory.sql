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
  performed_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
