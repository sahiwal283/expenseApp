/**
 * Booth inventory role tiers.
 *
 * Two tiers, because the people who MANAGE the catalog are not the people who
 * PACK the crates.
 *
 * Note the deliberate asymmetry: `salesperson` and `temporary` can read every
 * inventory endpoint but cannot see the global Booths page. The page gate is
 * a UI decision; the API read permission is what makes the checklist
 * manifest panel work for setup crew — including temporary/day-of staff, who
 * get the Checklist page (see Sidebar.tsx) and therefore mount the panel.
 * `temporary` belongs in READ_ROLES, not WRITE_ROLES: this tier already
 * covers field operations (move/pack/unpack/report/verify — see the
 * READ_ROLES usage on those routes), which is exactly what a temp does at a
 * venue. WRITE_ROLES is catalog management (create/edit/delete booths,
 * containers, components, manifests) and temps never need it. Do NOT
 * tighten READ_ROLES to match the page gate.
 */

/** Reads + field operations: moves, pack/unpack, verify, damage reports. */
export const READ_ROLES = ['admin', 'coordinator', 'developer', 'salesperson', 'temporary'] as const;

/** Catalog management: create/edit/delete booths, containers, components, manifests. */
export const WRITE_ROLES = ['admin', 'coordinator', 'developer'] as const;
