/**
 * User Checklist Service
 * 
 * Business logic for user-specific checklist operations.
 * Handles authorization, validation, and business rules.
 */

import { userChecklistRepository, UserChecklistItem } from '../database/repositories/UserChecklistRepository';
import { eventRepository } from '../database/repositories/EventRepository';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors';
import { pool } from '../config/database';

class UserChecklistService {
  /**
   * Get user's checklist items for an event
   * Verifies user is a participant of the event
   */
  async getUserChecklistItems(userId: string, eventId: string): Promise<UserChecklistItem[]> {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event', eventId);
    }

    // Verify user is a participant (unless admin/coordinator/developer)
    // Note: This check should be done at route level, but we verify here too for safety
    const isParticipant = await this.verifyUserParticipation(userId, eventId);
    if (!isParticipant) {
      throw new AuthorizationError('You can only view checklist items for events you participate in');
    }

    // Get user's checklist items
    return userChecklistRepository.findByUserAndEvent(userId, eventId);
  }

  /**
   * Mark a checklist item as complete or incomplete
   * Verifies user is a participant and item exists
   */
  async updateItemCompletion(
    userId: string,
    eventId: string,
    itemType: string,
    completed: boolean
  ): Promise<UserChecklistItem> {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event', eventId);
    }

    // Verify user is a participant
    const isParticipant = await this.verifyUserParticipation(userId, eventId);
    if (!isParticipant) {
      throw new AuthorizationError('You can only update checklist items for events you participate in');
    }

    // Validate itemType is not empty
    if (!itemType || typeof itemType !== 'string' || itemType.trim().length === 0) {
      throw new ValidationError('itemType must be a non-empty string');
    }

    // Check if item exists, if not create it
    let userItem = await userChecklistRepository.findByUserEventAndItemType(userId, eventId, itemType);
    
    if (!userItem) {
      // Create new user checklist item
      userItem = await userChecklistRepository.upsert({
        userId,
        eventId,
        itemType,
        completed
      });
    } else {
      // Update existing item
      userItem = await userChecklistRepository.updateCompletion(userId, eventId, itemType, completed);
    }

    return userItem;
  }

  /**
   * Verify if user is a participant of an event
   * Returns true if user is participant, admin, coordinator, or developer
   */
  private async verifyUserParticipation(userId: string, eventId: string): Promise<boolean> {
    // Check if user is admin/coordinator/developer (they can access any event)
    const userResult = await pool.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return false;
    }

    const userRole = userResult.rows[0].role;
    if (['admin', 'coordinator', 'developer'].includes(userRole)) {
      return true;
    }

    // Check if user is a participant
    const participantResult = await pool.query(
      `SELECT 1 FROM event_participants 
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    return participantResult.rows.length > 0;
  }

  /**
   * Get completion statistics for a user in an event
   */
  async getCompletionStats(userId: string, eventId: string): Promise<{
    total: number;
    completed: number;
    incomplete: number;
    completionRate: number;
  }> {
    // Verify user is a participant
    const isParticipant = await this.verifyUserParticipation(userId, eventId);
    if (!isParticipant) {
      throw new AuthorizationError('You can only view stats for events you participate in');
    }

    return userChecklistRepository.getCompletionStats(userId, eventId);
  }
}

export const userChecklistService = new UserChecklistService();

