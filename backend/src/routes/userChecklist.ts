/**
 * User Checklist Routes
 * Handles user-specific checklist item operations
 * All authenticated users can access their own checklist items for events they participate in
 */

import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { userChecklistService } from '../services/UserChecklistService';
import { asyncHandler } from '../utils/errors';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/user-checklist/:eventId
 * Get user's checklist items for an event
 * 
 * Authorization: User must be a participant of the event (or admin/coordinator/developer)
 */
router.get('/:eventId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  const items = await userChecklistService.getUserChecklistItems(userId, eventId);

  res.json({
    eventId,
    userId,
    items: items || [],
    count: items.length
  });
}));

/**
 * PUT /api/user-checklist/:eventId/item/:itemType
 * Mark a checklist item as complete or incomplete
 * 
 * Request body:
 * {
 *   "completed": true/false
 * }
 * 
 * Authorization: User must be a participant of the event (or admin/coordinator/developer)
 */
router.put('/:eventId/item/:itemType', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId, itemType } = req.params;
  const userId = req.user!.id;
  const { completed } = req.body;

  // Validate input
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ 
      error: 'Invalid input',
      details: 'completed field must be a boolean (true or false)'
    });
  }

  // Validate itemType
  if (!itemType || itemType.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid item type',
      details: 'itemType must be a non-empty string'
    });
  }

  // Decode itemType (URL may encode special characters)
  const decodedItemType = decodeURIComponent(itemType);

  const updatedItem = await userChecklistService.updateItemCompletion(
    userId,
    eventId,
    decodedItemType,
    completed
  );

  res.json({
    message: `Item marked as ${completed ? 'complete' : 'incomplete'}`,
    item: updatedItem
  });
}));

/**
 * GET /api/user-checklist/:eventId/stats
 * Get completion statistics for user's checklist items in an event
 * 
 * Authorization: User must be a participant of the event (or admin/coordinator/developer)
 */
router.get('/:eventId/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  const stats = await userChecklistService.getCompletionStats(userId, eventId);

  res.json({
    eventId,
    userId,
    ...stats
  });
}));

export default router;

