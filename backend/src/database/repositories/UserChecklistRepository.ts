/**
 * User Checklist Repository
 * 
 * Handles all database operations for user-specific checklist items.
 * Users can mark items as complete/incomplete for events they participate in.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface UserChecklistItem {
  id: number;
  user_id: string;
  event_id: string;
  item_id: number; // References checklist_custom_items.id or other item identifier
  item_type?: string; // Optional: 'custom_item', 'flight', 'hotel', etc.
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export class UserChecklistRepository extends BaseRepository<UserChecklistItem> {
  protected tableName = 'user_checklist_items';

  /**
   * Find all checklist items for a user in an event
   */
  async findByUserAndEvent(userId: string, eventId: string): Promise<UserChecklistItem[]> {
    const result = await this.executeQuery<UserChecklistItem>(
      `SELECT * FROM ${this.tableName} 
       WHERE user_id = $1 AND event_id = $2 
       ORDER BY created_at ASC`,
      [userId, eventId]
    );
    return result.rows;
  }

  /**
   * Find a specific checklist item by user, event, and item ID
   */
  async findByUserEventAndItem(
    userId: string,
    eventId: string,
    itemId: number
  ): Promise<UserChecklistItem | null> {
    const result = await this.executeQuery<UserChecklistItem>(
      `SELECT * FROM ${this.tableName} 
       WHERE user_id = $1 AND event_id = $2 AND item_id = $3 
       LIMIT 1`,
      [userId, eventId, itemId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create or update a user checklist item
   * If item exists, update it; otherwise create new
   */
  async upsert(data: {
    userId: string;
    eventId: string;
    itemId: number;
    completed: boolean;
    itemType?: string;
  }): Promise<UserChecklistItem> {
    const result = await this.executeQuery<UserChecklistItem>(
      `INSERT INTO ${this.tableName} (user_id, event_id, item_id, completed, item_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, event_id, item_id) 
       DO UPDATE SET 
         completed = EXCLUDED.completed,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.userId, data.eventId, data.itemId, data.completed, data.itemType || null]
    );
    return result.rows[0];
  }

  /**
   * Update completion status of a checklist item
   */
  async updateCompletion(
    userId: string,
    eventId: string,
    itemId: number,
    completed: boolean
  ): Promise<UserChecklistItem> {
    const result = await this.executeQuery<UserChecklistItem>(
      `UPDATE ${this.tableName}
       SET completed = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND event_id = $3 AND item_id = $4
       RETURNING *`,
      [completed, userId, eventId, itemId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User checklist item', `${userId}-${eventId}-${itemId}`);
    }

    return result.rows[0];
  }

  /**
   * Delete a user checklist item
   */
  async deleteItem(userId: string, eventId: string, itemId: number): Promise<boolean> {
    const result = await this.executeQuery(
      `DELETE FROM ${this.tableName}
       WHERE user_id = $1 AND event_id = $2 AND item_id = $3`,
      [userId, eventId, itemId]
    );
    return (result.rowCount || 0) > 0;
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
    const result = await this.executeQuery<{
      total: string;
      completed: string;
      incomplete: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE completed = true) as completed,
         COUNT(*) FILTER (WHERE completed = false) as incomplete
       FROM ${this.tableName}
       WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    const stats = result.rows[0];
    const total = parseInt(stats.total) || 0;
    const completed = parseInt(stats.completed) || 0;
    const incomplete = parseInt(stats.incomplete) || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      incomplete,
      completionRate
    };
  }
}

export const userChecklistRepository = new UserChecklistRepository();

