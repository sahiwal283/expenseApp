import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { pool, query } from '../../src/config/database';
import { boothAttachmentRepository } from '../../src/database/repositories/BoothAttachmentRepository';
import { NotFoundError } from '../../src/utils/errors';

/**
 * Booth Attachment Integration Test
 *
 * booth_attachments is polymorphic: entity_id is a bare UUID column with no
 * FK, because it points at four different tables (booths, containers,
 * components, movements) depending on entity_type. That means the WHERE
 * clause in findByEntity is the ONLY thing standing between "list the photos
 * for this component" and "list the photos for every entity that happens to
 * share this uuid". A mock of `config/database` would happily assert the SQL
 * string contains "entity_type = $1 AND entity_id = $2" while a copy/paste
 * bug dropped one of the two conditions from the real query — the mock
 * can't catch that. This test proves the real SQL actually filters on BOTH
 * columns against the real dev database, per the lesson from Task 6 where a
 * mock-only suite let a Critical SQL defect ship.
 */

const PREFIX = `itest-attach-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let userId: string;
const attachmentIds: string[] = [];

beforeAll(async () => {
  const { rows } = await query(
    `INSERT INTO users (username, password, name, email, role)
     VALUES ($1, 'not-a-real-hash', $2, $3, 'admin') RETURNING id`,
    [`${PREFIX}-user`, `${PREFIX} User`, `${PREFIX}@example.test`]
  );
  userId = rows[0].id;
});

afterAll(async () => {
  // Defensive cleanup by collected id, in case a test throws mid-run and
  // leaves a row behind that its own assertions never got to delete.
  if (attachmentIds.length) {
    await query(`DELETE FROM booth_attachments WHERE id = ANY($1)`, [attachmentIds]);
  }
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

describe('BoothAttachmentRepository (real database)', () => {
  it('findByEntity filters on entity_type AND entity_id, and does not leak a different entity_type sharing the same uuid', async () => {
    // entity_id has no FK, so a uuid can legitimately be reused across
    // entity_type values without violating any constraint — this is exactly
    // the scenario the polymorphic filter must handle correctly.
    const sharedId = randomUUID();

    const componentPhoto = await boothAttachmentRepository.create({
      entity_type: 'component',
      entity_id: sharedId,
      url: `/uploads/booth-inventory/${PREFIX}-component.jpg`,
      caption: `${PREFIX} component reference photo`,
      uploaded_by: userId,
    });
    attachmentIds.push(componentPhoto.id);

    const movementPhoto = await boothAttachmentRepository.create({
      entity_type: 'movement',
      entity_id: sharedId,
      url: `/uploads/booth-inventory/${PREFIX}-movement.jpg`,
      caption: `${PREFIX} damage report photo`,
      uploaded_by: userId,
    });
    attachmentIds.push(movementPhoto.id);

    const componentResults = await boothAttachmentRepository.findByEntity('component', sharedId);
    expect(componentResults).toHaveLength(1);
    expect(componentResults[0].id).toBe(componentPhoto.id);
    expect(componentResults[0].entity_type).toBe('component');
    expect(componentResults.map((r) => r.id)).not.toContain(movementPhoto.id);

    const movementResults = await boothAttachmentRepository.findByEntity('movement', sharedId);
    expect(movementResults).toHaveLength(1);
    expect(movementResults[0].id).toBe(movementPhoto.id);
    expect(movementResults.map((r) => r.id)).not.toContain(componentPhoto.id);
  });

  it('findByEntity returns nothing for an entity_id that references no row', async () => {
    // No FK means a caller can post an entity_id that matches nothing at all
    // (typo'd id, deleted parent, wrong id entirely). The repository must
    // not error — it should just report zero attachments for that target.
    const orphanId = randomUUID();
    const results = await boothAttachmentRepository.findByEntity('component', orphanId);
    expect(results).toEqual([]);
  });

  it('remove deletes the row and throws NotFoundError on a second call', async () => {
    const created = await boothAttachmentRepository.create({
      entity_type: 'container',
      entity_id: randomUUID(),
      url: `/uploads/booth-inventory/${PREFIX}-remove-me.jpg`,
      caption: `${PREFIX} to be removed`,
      uploaded_by: userId,
    });

    await boothAttachmentRepository.remove(created.id);

    await expect(boothAttachmentRepository.remove(created.id)).rejects.toThrow(NotFoundError);
    await expect(boothAttachmentRepository.remove(created.id)).rejects.toMatchObject({
      statusCode: 404,
    });

    // Confirm the delete was real, not just an in-memory illusion.
    const { rows } = await query(`SELECT id FROM booth_attachments WHERE id = $1`, [created.id]);
    expect(rows).toHaveLength(0);
  });
});
