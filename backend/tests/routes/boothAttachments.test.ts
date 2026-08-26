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
