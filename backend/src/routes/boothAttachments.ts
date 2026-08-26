/**
 * Booth Attachment Routes — /api/booth-attachments
 *
 * Reference photos for booths/containers/components, and damage photos
 * attached to a movement. Uploading is a field operation: the person who finds
 * the torn fabric is the person who photographs it.
 */

import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
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

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { entity_type, entity_id } = req.query;
  validateAttachmentTarget(entity_type, entity_id);
  res.json(await boothAttachmentRepository.findByEntity(
    entity_type as AttachmentEntityType, entity_id as string
  ));
}));

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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entity_type, entity_id, caption } = req.body;
    validateAttachmentTarget(entity_type, entity_id);

    if (!req.file) throw new ValidationError('No file uploaded');
    if (!fs.existsSync(req.file.path)) {
      throw new ValidationError('File was not saved correctly. Please try again.');
    }

    const url = `/uploads/booth-inventory/${req.file.filename}`;
    res.status(201).json(await boothAttachmentRepository.create({
      entity_type: entity_type as AttachmentEntityType,
      entity_id,
      url,
      caption: caption ?? null,
      uploaded_by: req.user!.id,
    }));
  })
);

router.delete('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothAttachmentRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
