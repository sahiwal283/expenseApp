/**
 * Booth Component Routes — /api/booth-components
 *
 * Move / report / verify endpoints are added in Tasks 7 and 8 once
 * BoothMovementService exists. This file holds read and catalog-edit routes.
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import {
  boothComponentRepository, COMPONENT_CONDITIONS,
} from '../database/repositories/BoothComponentRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { validateComponentBody } from '../validation/boothValidation';

const router = Router();

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothComponentRepository.findByIdOrThrow(req.params.id));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  validateComponentBody(req.body);
  res.json(await boothComponentRepository.update(req.params.id, req.body, req.user!.id));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothComponentRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
