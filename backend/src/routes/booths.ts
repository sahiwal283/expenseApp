/**
 * Booth Routes — /api/booths
 *
 * Reads are open to field-operations roles so the checklist manifest panel
 * works for setup crew. Writes are catalog management only.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors';
import { boothRepository } from '../database/repositories/BoothRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { boothContainerRepository } from '../database/repositories/BoothContainerRepository';
import { boothComponentRepository } from '../database/repositories/BoothComponentRepository';
import { validateContainerBody, validateComponentBody } from '../validation/boothValidation';

const router = Router();

export const BOOTH_STATUSES = [
  'in_storage', 'at_warehouse', 'at_partner_location',
  'in_transit', 'at_show', 'retired',
];

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, status, location_id, is_active } = req.query;
  res.json(await boothRepository.search({
    q: typeof q === 'string' ? q : undefined,
    status: typeof status === 'string' ? status : undefined,
    locationId: typeof location_id === 'string' ? location_id : undefined,
    isActive: is_active === undefined ? true : is_active !== 'false',
  }));
}));

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const booth = await boothRepository.findByIdWithCounts(req.params.id);
  if (!booth) throw new NotFoundError('Booth', req.params.id);
  res.json(booth);
}));

router.post('/', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, current_status } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  if (current_status && !BOOTH_STATUSES.includes(current_status)) {
    throw new ValidationError(`current_status must be one of: ${BOOTH_STATUSES.join(', ')}`);
  }
  res.status(201).json(await boothRepository.create(req.body));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { current_status } = req.body;
  if (current_status && !BOOTH_STATUSES.includes(current_status)) {
    throw new ValidationError(`current_status must be one of: ${BOOTH_STATUSES.join(', ')}`);
  }
  res.json(await boothRepository.update(req.params.id, req.body));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothRepository.softDelete(req.params.id);
  res.json({ success: true });
}));

// Nested container routes (Task 4), nested component routes (Task 5), and the
// bulk-move route (Task 7) are added here, before the default export below.

router.get('/:id/containers', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothContainerRepository.findByBooth(req.params.id));
}));

router.post('/:id/containers', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  validateContainerBody(req.body);
  res.status(201).json(
    await boothContainerRepository.create({ ...req.body, booth_id: req.params.id })
  );
}));

router.get('/:id/components', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, category, status, container_id, condition } = req.query;
  res.json(await boothComponentRepository.findByBooth(req.params.id, {
    q: typeof q === 'string' ? q : undefined,
    category: typeof category === 'string' ? category : undefined,
    status: typeof status === 'string' ? status : undefined,
    containerId: typeof container_id === 'string' ? container_id : undefined,
    condition: typeof condition === 'string' ? condition : undefined,
  }));
}));

router.post('/:id/components', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  validateComponentBody(req.body);
  res.status(201).json(
    await boothComponentRepository.create({ ...req.body, booth_id: req.params.id })
  );
}));

export default router;
