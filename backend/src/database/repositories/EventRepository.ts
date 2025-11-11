/**
 * Event Repository
 * 
 * Handles all database operations for events (trade shows).
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  budget: number;
  zoho_entity?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  show_start_date?: string;
  show_end_date?: string;
  travel_start_date?: string;
  travel_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EventWithStats extends Event {
  participant_count?: number;
  total_expenses?: number;
  pending_expenses?: number;
  approved_expenses?: number;
}

export class EventRepository extends BaseRepository<Event> {
  protected tableName = 'events';

  /**
   * Find events by status
   */
  async findByStatus(status: string): Promise<Event[]> {
    return this.findBy('status', status);
  }

  /**
   * Find events by Zoho entity
   */
  async findByZohoEntity(entity: string): Promise<Event[]> {
    return this.findBy('zoho_entity', entity);
  }

  /**
   * Find active events (upcoming or active status)
   */
  async findActive(): Promise<Event[]> {
    const result = await this.executeQuery<Event>(
      `SELECT * FROM ${this.tableName} 
       WHERE status IN ('upcoming', 'active') 
       ORDER BY start_date ASC`
    );
    return result.rows;
  }

  /**
   * Find upcoming events (within next 90 days)
   */
  async findUpcoming(days: number = 90): Promise<Event[]> {
    const result = await this.executeQuery<Event>(
      `SELECT * FROM ${this.tableName} 
       WHERE status = 'upcoming' 
       AND start_date <= CURRENT_DATE + INTERVAL '${days} days'
       ORDER BY start_date ASC`
    );
    return result.rows;
  }

  /**
   * Find events within date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    const result = await this.executeQuery<Event>(
      `SELECT * FROM ${this.tableName} 
       WHERE start_date >= $1 AND end_date <= $2
       ORDER BY start_date DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  /**
   * Create new event
   */
  async create(data: {
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    budget: number;
    zoho_entity?: string;
    status?: string;
    show_start_date?: string;
    show_end_date?: string;
    travel_start_date?: string;
    travel_end_date?: string;
  }): Promise<Event> {
    const result = await this.executeQuery<Event>(
      `INSERT INTO ${this.tableName} 
       (name, start_date, end_date, location, budget, zoho_entity, status, 
        show_start_date, show_end_date, travel_start_date, travel_end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.name,
        data.start_date,
        data.end_date,
        data.location,
        data.budget,
        data.zoho_entity || null,
        data.status || 'upcoming',
        data.show_start_date || null,
        data.show_end_date || null,
        data.travel_start_date || null,
        data.travel_end_date || null
      ]
    );
    return result.rows[0];
  }

  /**
   * Update event
   */
  async update(id: string, data: Partial<Event>): Promise<Event> {
    const fields = Object.keys(data).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map(field => (data as any)[field]);

    const result = await this.executeQuery<Event>(
      `UPDATE ${this.tableName} 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Event', id);
    }

    return result.rows[0];
  }

  /**
   * Update event status
   */
  async updateStatus(id: string, status: 'upcoming' | 'active' | 'completed' | 'cancelled'): Promise<Event> {
    return this.update(id, { status });
  }

  /**
   * Get event with statistics
   */
  async findByIdWithStats(id: string): Promise<EventWithStats | null> {
    const result = await this.executeQuery<EventWithStats>(
      `SELECT 
        e.*,
        COUNT(DISTINCT ep.user_id) as participant_count,
        COUNT(ex.id) as total_expenses,
        COUNT(CASE WHEN ex.status = 'pending' THEN 1 END) as pending_expenses,
        COUNT(CASE WHEN ex.status = 'approved' THEN 1 END) as approved_expenses
       FROM ${this.tableName} e
       LEFT JOIN event_participants ep ON e.id = ep.event_id
       LEFT JOIN expenses ex ON e.id = ex.event_id
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all events with statistics
   */
  async findAllWithStats(): Promise<EventWithStats[]> {
    const result = await this.executeQuery<EventWithStats>(
      `SELECT 
        e.*,
        COUNT(DISTINCT ep.user_id) as participant_count,
        COUNT(ex.id) as total_expenses,
        COUNT(CASE WHEN ex.status = 'pending' THEN 1 END) as pending_expenses,
        COUNT(CASE WHEN ex.status = 'approved' THEN 1 END) as approved_expenses
       FROM ${this.tableName} e
       LEFT JOIN event_participants ep ON e.id = ep.event_id
       LEFT JOIN expenses ex ON e.id = ex.event_id
       GROUP BY e.id
       ORDER BY e.start_date DESC`
    );
    return result.rows;
  }

  /**
   * Count events by status
   */
  async countByStatus(status: string): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = $1`,
      [status]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get total budget for all events
   */
  async getTotalBudget(): Promise<number> {
    const result = await this.executeQuery<{ total: string }>(
      `SELECT COALESCE(SUM(budget), 0) as total FROM ${this.tableName}`
    );
    return parseFloat(result.rows[0].total);
  }

  /**
   * Get total budget by status
   */
  async getTotalBudgetByStatus(status: string): Promise<number> {
    const result = await this.executeQuery<{ total: string }>(
      `SELECT COALESCE(SUM(budget), 0) as total 
       FROM ${this.tableName} 
       WHERE status = $1`,
      [status]
    );
    return parseFloat(result.rows[0].total);
  }
}

// Export singleton instance
export const eventRepository = new EventRepository();

