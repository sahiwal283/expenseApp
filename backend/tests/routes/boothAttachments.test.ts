import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateAttachmentTarget, handleCreateAttachment } from '../../src/routes/boothAttachments';
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

/**
 * handleCreateAttachment cleanup — Fix round 1, Finding 1
 *
 * `uploadBoothPhoto` writes the file to disk BEFORE this handler runs, so
 * any failure after that point (bad entity_type, missing entity_id, or the
 * INSERT itself throwing) must not leave the file orphaned in
 * booth-inventory/. These tests use a real temp file on real fs (fs is not
 * mocked in this file) and call the exported handler directly — the same
 * function the route actually wires up via asyncHandler — to prove the
 * cleanup really happens, not just that the code compiles.
 */
describe('handleCreateAttachment file cleanup', () => {
  let tempFilePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempFilePath = path.join(os.tmpdir(), `booth-attach-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    fs.writeFileSync(tempFilePath, 'fake-image-bytes');
  });

  function makeReqRes(body: Record<string, unknown>) {
    const req: any = {
      body,
      file: { path: tempFilePath, filename: path.basename(tempFilePath) },
      user: { id: 'u1', username: 'field-user', role: 'salesperson' },
    };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    return { req, res };
  }

  it('unlinks the uploaded file when entity_type is invalid, and rethrows the validation error', async () => {
    expect(fs.existsSync(tempFilePath)).toBe(true);
    const { req, res } = makeReqRes({ entity_type: 'spaceship', entity_id: 'comp-1' });

    await expect(handleCreateAttachment(req, res)).rejects.toThrow(ValidationError);

    expect(fs.existsSync(tempFilePath)).toBe(false);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it('unlinks the uploaded file when entity_id is missing, and rethrows the validation error', async () => {
    const { req, res } = makeReqRes({ entity_type: 'component', entity_id: '' });

    await expect(handleCreateAttachment(req, res)).rejects.toThrow(ValidationError);

    expect(fs.existsSync(tempFilePath)).toBe(false);
  });

  it('unlinks the uploaded file when the DB insert itself fails after a successful write', async () => {
    vi.mocked(dbQuery).mockRejectedValue(new Error('connection terminated'));
    const { req, res } = makeReqRes({ entity_type: 'component', entity_id: 'comp-1' });

    await expect(handleCreateAttachment(req, res)).rejects.toThrow();

    expect(fs.existsSync(tempFilePath)).toBe(false);
  });

  it('does not touch the file and returns 201 on a successful create', async () => {
    vi.mocked(dbQuery).mockResolvedValue({
      rows: [{ id: 'att-1', url: `/uploads/booth-inventory/${path.basename(tempFilePath)}` }],
      rowCount: 1,
    } as any);
    const { req, res } = makeReqRes({ entity_type: 'component', entity_id: 'comp-1' });

    await handleCreateAttachment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // The file has done its job (multer wrote it, the row now points at it)
    // — a successful create must NOT unlink it.
    expect(fs.existsSync(tempFilePath)).toBe(true);
    fs.unlinkSync(tempFilePath); // test cleanup, since the handler correctly left it in place
  });
});
