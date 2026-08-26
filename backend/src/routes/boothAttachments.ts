/**
 * Booth Attachment Routes — /api/booth-attachments
 *
 * Reference photos for booths/containers/components, and damage photos
 * attached to a movement. Uploading is a field operation: the person who finds
 * the torn fabric is the person who photographs it.
 */

import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { uploadBoothPhoto } from '../config/upload';
import {
  boothAttachmentRepository, AttachmentEntityType,
} from '../database/repositories/BoothAttachmentRepository';
import { READ_ROLES } from '../config/boothRoles';

const router = Router();

const ENTITY_TYPES: AttachmentEntityType[] = ['booth', 'container', 'component', 'movement'];

export function validateAttachmentTarget(entityType: unknown, entityId: unknown): void {
  if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType as AttachmentEntityType)) {
    throw new ValidationError(`entity_type must be one of: ${ENTITY_TYPES.join(', ')}`);
  }
  if (typeof entityId !== 'string' || !entityId) {
    throw new ValidationError('entity_id is required');
  }
}

/**
 * Handles GET / — exported (alongside the POST/DELETE handlers below) so
 * tests can invoke the exact production code path directly, the same
 * convention already used for `validateAttachmentTarget`.
 */
export async function handleListAttachments(req: AuthRequest, res: Response): Promise<void> {
  const { entity_type, entity_id } = req.query;
  validateAttachmentTarget(entity_type, entity_id);
  res.json(await boothAttachmentRepository.findByEntity(
    entity_type as AttachmentEntityType, entity_id as string
  ));
}

/**
 * Handles POST / after `uploadBoothPhoto` has already written the file to
 * disk. Any failure past that point — bad entity_type/entity_id, a missing
 * file, or the INSERT itself throwing — must not leave the just-written file
 * orphaned in booth-inventory/, so validation, the DB insert, and the
 * response are all inside one try/catch that unlinks on any error.
 */
export async function handleCreateAttachment(req: AuthRequest, res: Response): Promise<void> {
  const { entity_type, entity_id, caption } = req.body;

  try {
    validateAttachmentTarget(entity_type, entity_id);
    if (!req.file) throw new ValidationError('No file uploaded');
    if (!fs.existsSync(req.file.path)) {
      throw new ValidationError('File was not saved correctly. Please try again.');
    }

    const url = `/uploads/booth-inventory/${req.file.filename}`;
    const attachment = await boothAttachmentRepository.create({
      entity_type: entity_type as AttachmentEntityType,
      entity_id,
      url,
      caption: caption ?? null,
      uploaded_by: req.user!.id,
    });
    res.status(201).json(attachment);
  } catch (error) {
    // The upload already hit disk before validation/insert ran — don't
    // leave it orphaned. Cleanup is best-effort: a failed unlink must not
    // mask the real validation/DB error the caller needs to see.
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn(`[BoothAttachments] Failed to clean up rejected upload ${req.file.path}:`, unlinkError);
      }
    }
    throw error;
  }
}

/**
 * Handles DELETE /:id. The database row is the source of truth; once it's
 * gone the file is cleaned up on a best-effort basis derived from the
 * stored url's basename only (never the raw url) so a malformed or hostile
 * stored value can't be used to unlink outside booth-inventory/. A failed
 * unlink (file already missing, permissions, etc.) must not turn an
 * otherwise-successful delete into a 500.
 */
export async function handleDeleteAttachment(req: AuthRequest, res: Response): Promise<void> {
  const attachment = await boothAttachmentRepository.findById(req.params.id);
  await boothAttachmentRepository.remove(req.params.id);

  if (attachment?.url) {
    const filename = path.basename(attachment.url);
    const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', 'booth-inventory', filename);
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.warn(`[BoothAttachments] Failed to clean up file for deleted attachment ${req.params.id}:`, unlinkError);
    }
  }

  res.json({ success: true });
}

router.get('/', authorize(...READ_ROLES), asyncHandler(handleListAttachments));

router.post('/', authorize(...READ_ROLES),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    uploadBoothPhoto.single('photo')(req, res, (err: any) => {
      if (err) {
        console.error(`[BoothAttachments] Upload error: ${err.message}`);
        return res.status(400).json({
          error: 'File upload failed',
          details: err.message || 'Invalid file. Images and PDF up to 10MB are allowed.',
        });
      }
      next();
    });
  },
  asyncHandler(handleCreateAttachment)
);

router.delete('/:id', authorize(...READ_ROLES), asyncHandler(handleDeleteAttachment));

export default router;
