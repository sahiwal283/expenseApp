/**
 * Audit Log Repository
 * 
 * Handles all database operations for audit logs.
 */

import { BaseRepository } from './BaseRepository';

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  status: 'success' | 'failure' | 'warning';
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  changes?: object;
  details?: object;
  error_message?: string;
  created_at: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class AuditLogRepository extends BaseRepository<AuditLog> {
  protected tableName = 'audit_logs';

  /**
   * Create new audit log entry
   */
  async create(data: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    status?: 'success' | 'failure' | 'warning';
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
    changes?: object;
    errorMessage?: string;
  }): Promise<AuditLog> {
    const result = await this.executeQuery<AuditLog>(
      `INSERT INTO ${this.tableName} 
       (user_id, user_name, user_email, user_role, action, entity_type, entity_id, 
        status, ip_address, user_agent, request_method, request_path, changes, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        data.userId || null,
        data.userName || null,
        data.userEmail || null,
        data.userRole || null,
        data.action,
        data.entityType || null,
        data.entityId || null,
        data.status || 'success',
        data.ipAddress || null,
        data.userAgent || null,
        data.requestMethod || null,
        data.requestPath || null,
        data.changes ? JSON.stringify(data.changes) : null,
        data.errorMessage || null
      ]
    );
    return result.rows[0];
  }

  /**
   * Find logs by user ID
   */
  async findByUserId(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Find logs by action
   */
  async findByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       WHERE action = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [action, limit]
    );
    return result.rows;
  }

  /**
   * Find logs by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       WHERE entity_type = $1 AND entity_id = $2 
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    return result.rows;
  }

  /**
   * Find logs with filters
   */
  async findWithFilters(filters: AuditLogFilters): Promise<AuditLog[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entityType);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT $${paramIndex++}` : 'LIMIT 100';
    const offsetClause = filters.offset ? `OFFSET $${paramIndex++}` : '';

    if (filters.limit) params.push(filters.limit);
    if (filters.offset) params.push(filters.offset);

    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       ${whereClause} 
       ORDER BY created_at DESC 
       ${limitClause} ${offsetClause}`,
      params
    );

    return result.rows;
  }

  /**
   * Get recent logs (last N logs)
   */
  async getRecent(limit: number = 50): Promise<AuditLog[]> {
    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Count logs by action
   */
  async countByAction(action: string): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE action = $1`,
      [action]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Count logs by status
   */
  async countByStatus(status: string): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = $1`,
      [status]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get action statistics for a time range
   */
  async getActionStats(timeRange: string = '24h'): Promise<Array<{ action: string; count: number }>> {
    const interval = this.parseTimeRange(timeRange);
    
    const result = await this.executeQuery<{ action: string; count: string }>(
      `SELECT action, COUNT(*) as count 
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY action 
       ORDER BY count DESC`,
      []
    );

    return result.rows.map(row => ({
      action: row.action,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Get failure logs within time range
   */
  async getFailures(timeRange: string = '24h'): Promise<AuditLog[]> {
    const interval = this.parseTimeRange(timeRange);
    
    const result = await this.executeQuery<AuditLog>(
      `SELECT * FROM ${this.tableName} 
       WHERE status = 'failure' 
       AND created_at >= NOW() - INTERVAL '${interval}'
       ORDER BY created_at DESC`,
      []
    );

    return result.rows;
  }

  /**
   * Parse time range string to PostgreSQL interval
   */
  private parseTimeRange(timeRange: string): string {
    const rangeMap: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };
    return rangeMap[timeRange] || '24 hours';
  }

  /**
   * Delete old logs (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const result = await this.executeQuery(
      `DELETE FROM ${this.tableName} 
       WHERE created_at < NOW() - INTERVAL '${days} days'`
    );
    return result.rowCount || 0;
  }
}

// Export singleton instance
export const auditLogRepository = new AuditLogRepository();

