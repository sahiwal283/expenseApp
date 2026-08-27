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
  weight_notes: string | null;
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
  /** True when included+weighed containers do not share one unit. We refuse to
   *  sum incompatible units rather than guess, so weight_total is null then. */
  weight_units_mixed: boolean;
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

export interface BulkMoveResult {
  movedBooths: number;
  movedContainers: number;
  movedComponents: number;
  /**
   * Components belonging to this booth that did NOT move, because they are
   * currently inside a container that is not part of it. They are physically
   * elsewhere, so moving them would be a lie — but the UI must say so rather
   * than let the crew discover it at the venue. Always 0 for container and
   * component moves; only booth-level moves can strand anything.
   */
  strandedComponents: number;
  movementIds: string[];
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
  listBooths: (filters: { q?: string; status?: string; location_id?: string; is_active?: boolean } = {}) =>
    apiClient.get(`/booths${qs(filters)}`) as Promise<Booth[]>,
  getBooth: (id: string) => apiClient.get(`/booths/${id}`) as Promise<Booth>,
  createBooth: (data: Partial<Booth>) => apiClient.post('/booths', data) as Promise<Booth>,
  updateBooth: (id: string, data: Partial<Booth>) =>
    apiClient.patch(`/booths/${id}`, data) as Promise<Booth>,
  deleteBooth: (id: string) => apiClient.delete(`/booths/${id}`),
  moveBooth: (id: string, data: MoveRequest) =>
    apiClient.post(`/booths/${id}/move`, data) as Promise<BulkMoveResult>,

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
    apiClient.post(`/booth-containers/${id}/move`, data) as Promise<BulkMoveResult>,

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
    apiClient.post(`/booth-components/${id}/move`, data) as Promise<BulkMoveResult>,
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
  /**
   * Uses apiClient.upload(), NOT apiClient.post(). post() always sets
   * Content-Type: application/json via buildHeaders, which breaks multipart —
   * the browser must set the boundary itself. upload() already handles that.
   *
   * Blobs from the offline queue have no filename, so wrap them in a File
   * before sending or the backend receives a nameless part and its extension
   * allowlist rejects it.
   */
  uploadAttachment: async (
    entityType: string, entityId: string, file: File | Blob, caption?: string
  ): Promise<BoothAttachment> => {
    const named = file instanceof File
      ? file
      : new File([file], 'photo.jpg', { type: (file as Blob).type || 'image/jpeg' });
    return apiClient.upload<BoothAttachment>(
      '/booth-attachments',
      { entity_type: entityType, entity_id: entityId, ...(caption ? { caption } : {}) },
      named,
      'photo'
    );
  },
  deleteAttachment: (id: string) => apiClient.delete(`/booth-attachments/${id}`),
};
