/**
 * Booth Container Routes — /api/booth-containers
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { query } from '../config/database';
import { boothContainerRepository } from '../database/repositories/BoothContainerRepository';
import { READ_ROLES, WRITE_ROLES } from '../config/boothRoles';
import { validateContainerBody } from '../validation/boothValidation';

const router = Router();

router.get('/:id', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const container = await boothContainerRepository.findByIdOrThrow(req.params.id);
  const { rows: components } = await query(
    `SELECT * FROM booth_components WHERE current_container_id = $1 ORDER BY name ASC`,
    [req.params.id]
  );
  res.json({ ...container, components });
}));

router.patch('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  validateContainerBody(req.body);
  res.json(await boothContainerRepository.update(req.params.id, req.body, req.user!.id));
}));

router.delete('/:id', authorize(...WRITE_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  // Detach components rather than orphaning them behind a SET NULL FK.
  await query(
    `UPDATE booth_components
        SET current_container_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE current_container_id = $1`,
    [req.params.id]
  );
  await query(
    `UPDATE booth_components
        SET default_container_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE default_container_id = $1`,
    [req.params.id]
  );
  await boothContainerRepository.remove(req.params.id);
  res.json({ success: true });
}));

export default router;
