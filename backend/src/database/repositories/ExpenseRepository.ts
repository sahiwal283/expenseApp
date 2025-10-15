/**
 * Expense Repository
 * 
 * Handles all database operations for expenses.
 */

import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '../../utils/errors';

export interface Expense {
  id: string;
  user_id: string;
  event_id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  description?: string;
  location?: string;
  card_used: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string;
  reimbursement_required: boolean;
  reimbursement_status?: string;
  zoho_entity?: string;
  zoho_expense_id?: string;
  created_at: string;
  updated_at: string;
}

export class ExpenseRepository extends BaseRepository<Expense> {
  protected tableName = 'expenses';

  /**
   * Find expenses by user
   */
  async findByUserId(userId: string): Promise<Expense[]> {
    return this.findBy('user_id', userId);
  }

  /**
   * Find expenses by event
   */
  async findByEventId(eventId: string): Promise<Expense[]> {
    return this.findBy('event_id', eventId);
  }

  /**
   * Find expenses by status
   */
  async findByStatus(status: string): Promise<Expense[]> {
    return this.findBy('status', status);
  }

  /**
   * Create new expense
   */
  async create(data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const result = await this.executeQuery<Expense>(
      `INSERT INTO ${this.tableName} 
       (user_id, event_id, date, merchant, amount, category, description, 
        location, card_used, status, receipt_url, reimbursement_required, 
        reimbursement_status, zoho_entity, zoho_expense_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        data.user_id, data.event_id, data.date, data.merchant, data.amount,
        data.category, data.description, data.location, data.card_used,
        data.status, data.receipt_url, data.reimbursement_required,
        data.reimbursement_status, data.zoho_entity, data.zoho_expense_id
      ]
    );
    return result.rows[0];
  }

  /**
   * Update expense
   */
  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map(field => (data as any)[field]);

    const result = await this.executeQuery<Expense>(
      `UPDATE ${this.tableName} 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Expense', id);
    }

    return result.rows[0];
  }

  /**
   * Update expense status (for approvals)
   */
  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Expense> {
    return this.update(id, { status });
  }

  /**
   * Update Zoho sync info
   */
  async updateZohoInfo(id: string, zohoExpenseId: string): Promise<Expense> {
    return this.update(id, { zoho_expense_id: zohoExpenseId });
  }

  /**
   * Find expenses needing Zoho sync
   */
  async findPendingZohoSync(): Promise<Expense[]> {
    const result = await this.executeQuery<Expense>(
      `SELECT * FROM ${this.tableName} 
       WHERE status = 'approved' 
       AND zoho_entity IS NOT NULL 
       AND zoho_expense_id IS NULL`
    );
    return result.rows;
  }

  /**
   * Count expenses by status
   */
  async countByStatus(status: string): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = $1`,
      [status]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get expense statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    total: number;
    totalAmount: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const result = await this.executeQuery<any>(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
       FROM ${this.tableName}
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      totalAmount: parseFloat(row.total_amount),
      pending: parseInt(row.pending, 10),
      approved: parseInt(row.approved, 10),
      rejected: parseInt(row.rejected, 10)
    };
  }

  /**
   * Get expenses with filters (for reports)
   */
  async findWithFilters(filters: {
    userId?: string;
    eventId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    entity?: string;
  }): Promise<Expense[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }
    if (filters.eventId) {
      conditions.push(`event_id = $${paramIndex++}`);
      params.push(filters.eventId);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.startDate) {
      conditions.push(`date >= $${paramIndex++}`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`date <= $${paramIndex++}`);
      params.push(filters.endDate);
    }
    if (filters.entity) {
      conditions.push(`zoho_entity = $${paramIndex++}`);
      params.push(filters.entity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await this.executeQuery<Expense>(
      `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY date DESC, created_at DESC`,
      params
    );
    
    return result.rows;
  }
}

// Export singleton instance
export const expenseRepository = new ExpenseRepository();

