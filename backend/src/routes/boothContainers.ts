/**
 * Booth Container Routes — /api/booth-containers
 */

import { Router, Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { query } from '../config/database';
import { boothContainerRepository } from '../database/repositories/BoothContainerRepository';
import { boothMovementRepository } from '../database/repositories/BoothMovementRepository';
import { boothMovementService } from '../services/booth/BoothMovementService';
import { boothInventoryService } from '../services/booth/BoothInventoryService';
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
  const containerId = req.params.id;
  const container = await boothContainerRepository.findByIdOrThrow(containerId);

  await boothMovementService.withTransaction(async (client) => {
    // Components physically in this crate are being detached — that is a real
    // container change and belongs in the log, not a silent UPDATE.
    const { rows: inside } = await client.query(
      `SELECT id, booth_id, current_location_id, current_status
         FROM booth_components WHERE current_container_id = $1 FOR UPDATE`,
      [containerId]
    );

    for (const component of inside) {
      await boothMovementService.record({
        componentId: component.id,
        containerId,
        boothId: component.booth_id,
        eventType: 'container_change',
        fromContainerId: containerId,
        toContainerId: null,
        fromLocationId: component.current_location_id,
        toLocationId: component.current_location_id,
        fromStatus: component.current_status,
        toStatus: component.current_status,
        performedBy: req.user!.id,
        notes: `Container "${container.name}" was deleted`,
      }, client);
    }

    await client.query(
      `UPDATE booth_components
          SET current_container_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE current_container_id = $1`,
      [containerId]
    );
    await client.query(
      `UPDATE booth_components
          SET default_container_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE default_container_id = $1`,
      [containerId]
    );

    // Delete last: the movement rows above FK to this container with
    // ON DELETE SET NULL, so they survive as history with a null container ref.
    await client.query(`DELETE FROM booth_containers WHERE id = $1`, [containerId]);
  });

  res.json({ success: true });
}));

router.get('/:id/movements', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  res.json(await boothMovementRepository.findByContainer(req.params.id, {
    limit: limit ? Number(limit) : undefined,
  }));
}));

// Bulk move: field operations, not catalog management — setup crew move
// things, so this uses READ_ROLES (the reads-plus-field-ops tier), not
// WRITE_ROLES.
router.post('/:id/move', authorize(...READ_ROLES), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { to_location_id, to_status, event_id, notes, idempotency_key } = req.body;
  if (!to_location_id && !to_status) {
    throw new ValidationError('to_location_id or to_status is required');
  }
  res.json(await boothInventoryService.moveContainer(req.params.id, {
    toLocationId: to_location_id ?? null,
    toStatus: to_status ?? null,
    eventId: event_id ?? null,
    notes: notes ?? null,
    idempotencyKey: idempotency_key ?? null,
    performedBy: req.user!.id,
  }));
}));

export default router;
