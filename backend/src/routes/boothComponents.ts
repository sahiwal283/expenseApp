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
import { boothMovementRepository } from '../database/repositories/BoothMovementRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { validateComponentBody, normaliseAssetTag } from '../validation/boothValidation';

const router = Router();

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(await boothComponentRepository.findByIdOrThrow(req.params.id));
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await boothComponentRepository.findByIdOrThrow(req.params.id);
  normaliseAssetTag(req.body);
  // Granularity is a property of the RESULTING row, not of the patch — a PATCH
  // that sets only one side of the asset_tag/quantity pair must still be checked
  // against what the other side already is.
  validateComponentBody({ ...existing, ...req.body });
  res.json(await boothComponentRepository.update(req.params.id, req.body, req.user!.id));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  await boothComponentRepository.remove(req.params.id);
  res.json({ success: true });
}));

router.get('/:id/movements', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  res.json(await boothMovementRepository.findByComponent(req.params.id, {
    limit: limit ? Number(limit) : undefined,
  }));
}));

export default router;
