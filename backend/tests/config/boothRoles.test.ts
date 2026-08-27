import { describe, it, expect } from 'vitest';
import { READ_ROLES, WRITE_ROLES } from '../../src/config/boothRoles';

describe('boothRoles', () => {
  it('grants temporary staff read + field-ops access, matching the checklist gate', () => {
    // The checklist page (Sidebar.tsx) is open to everyone except accountant —
    // including temporary/day-of setup staff. BoothInventoryPanel mounts
    // unconditionally inside it, so READ_ROLES must cover every role that
    // gate lets in, or the panel is a permanently broken pair of error
    // banners for that role.
    expect(READ_ROLES).toContain('temporary');
  });

  it('keeps temporary out of catalog management (WRITE_ROLES)', () => {
    // Temps do field operations (move/pack/unpack/report/verify — all gated
    // on READ_ROLES, not WRITE_ROLES). They never create/edit/delete booths,
    // containers, components, or manifests.
    expect(WRITE_ROLES).not.toContain('temporary');
  });

  it('still gates accountant out entirely, matching the existing checklist gate', () => {
    expect(READ_ROLES).not.toContain('accountant');
    expect(WRITE_ROLES).not.toContain('accountant');
  });

  it('keeps salesperson read-only, the existing deliberate asymmetry', () => {
    expect(READ_ROLES).toContain('salesperson');
    expect(WRITE_ROLES).not.toContain('salesperson');
  });
});
