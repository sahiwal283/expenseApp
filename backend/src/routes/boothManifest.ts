/**
 * Booth Manifest Routes — /api/booth-manifest
 *
 * Reads are field-operations tier so setup crew see the manifest inside the
 * event checklist. Editing which booth or crate goes to a show is catalog
 * management.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { boothManifestService } from '../services/booth/BoothManifestService';
import { boothInventoryService } from '../services/booth/BoothInventoryService';
import {
  eventBoothAssignmentRepository, ASSIGNMENT_STATUSES,
} from '../database/repositories/EventBoothAssignmentRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';

const router = Router();

router.get('/event/:eventId', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothManifestService.getForEvent(req.params.eventId));
}));

router.get('/event/:eventId/exceptions', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothInventoryService.listExceptions(req.params.eventId));
}));

router.post('/event/:eventId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { booth_id, needed_by_date, setup_notes, status } = req.body;
  if (!booth_id) throw new ValidationError('booth_id is required');
  if (status && !ASSIGNMENT_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`);
  }
  res.status(201).json(await boothManifestService.assignBooth(
    req.params.eventId, booth_id,
    { needed_by_date, setup_notes, status },
    req.user!.id
  ));
}));

router.patch('/:assignmentId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (status && !ASSIGNMENT_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`);
  }
  res.json(await eventBoothAssignmentRepository.update(req.params.assignmentId, req.body));
}));

router.delete('/:assignmentId', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await eventBoothAssignmentRepository.remove(req.params.assignmentId);
  res.json({ success: true });
}));

router.patch('/:assignmentId/containers/:containerId', authorize(...WRITE_ROLES),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { included } = req.body;
    if (typeof included !== 'boolean') throw new ValidationError('included must be a boolean');
    await boothManifestService.setContainerIncluded(
      req.params.assignmentId, req.params.containerId, included
    );
    res.json({ success: true });
  })
);

router.post('/:assignmentId/containers', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { container_id } = req.body;
  if (!container_id) throw new ValidationError('container_id is required');
  await boothManifestService.addExtraContainer(req.params.assignmentId, container_id);
  res.status(201).json({ success: true });
}));

router.post('/:assignmentId/sync', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothManifestService.syncDrift(req.params.assignmentId));
}));

export default router;
