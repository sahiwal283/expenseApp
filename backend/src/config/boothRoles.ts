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
