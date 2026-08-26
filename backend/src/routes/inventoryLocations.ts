/**
 * Inventory Location Routes — /api/inventory-locations
 *
 * Reads are open to field-operations roles (salesperson included) so the
 * checklist manifest panel can resolve location names. Writes are catalog
 * management only.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors';
import { inventoryLocationRepository } from '../database/repositories/InventoryLocationRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';

const router = Router();

const LOCATION_TYPES = [
  'company_warehouse', 'storage_unit', 'partner_company', 'partner_person',
  'carrier', 'convention_center', 'hotel', 'show_site', 'other',
];

router.get('/', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, type, is_active } = req.query;
  res.json(await inventoryLocationRepository.search({
    q: typeof q === 'string' ? q : undefined,
    type: typeof type === 'string' ? type : undefined,
    isActive: is_active === undefined ? undefined : is_active !== 'false',
  }));
}));

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const location = await inventoryLocationRepository.findById(req.params.id);
  if (!location) throw new NotFoundError('Location', req.params.id);
  res.json(location);
}));

router.post('/', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type } = req.body;
  if (!name || typeof name !== 'string') throw new ValidationError('name is required');
  if (type && !LOCATION_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${LOCATION_TYPES.join(', ')}`);
  res.status(201).json(await inventoryLocationRepository.create(req.body));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.body;
  if (type && !LOCATION_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${LOCATION_TYPES.join(', ')}`);
  res.json(await inventoryLocationRepository.update(req.params.id, req.body));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await inventoryLocationRepository.softDelete(req.params.id);
  res.json({ success: true });
}));

export default router;
