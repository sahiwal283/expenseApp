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
    if (!result.rows[0]) throw new NotFoundError('Attachment', id);
  }
}

export const boothAttachmentRepository = new BoothAttachmentRepository();
