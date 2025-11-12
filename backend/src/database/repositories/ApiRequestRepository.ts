/**
 * API Request Repository
 * 
 * Handles all database operations for API request tracking and analytics.
 */

import { BaseRepository } from './BaseRepository';

export interface ApiRequest {
  id: string;
  user_id?: string;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  request_body?: object;
  response_body?: object;
  metadata?: object;
  created_at: string;
}

export interface ApiRequestStats {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  requestsByMethod: Array<{ method: string; count: number }>;
  requestsByPath: Array<{ path: string; count: number; avg_response_time: number }>;
  requestsByStatus: Array<{ status_code: number; count: number }>;
}

export class ApiRequestRepository extends BaseRepository<ApiRequest> {
  protected tableName = 'api_requests';

  /**
   * Create new API request log
   */
  async create(data: {
    userId?: string;
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    requestBody?: object;
    responseBody?: object;
    metadata?: object;
  }): Promise<ApiRequest> {
    const result = await this.executeQuery<ApiRequest>(
      `INSERT INTO ${this.tableName} 
       (user_id, method, path, status_code, response_time_ms, ip_address, 
        user_agent, error_message, request_body, response_body, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.userId || null,
        data.method,
        data.path,
        data.statusCode,
        data.responseTimeMs,
        data.ipAddress || null,
        data.userAgent || null,
        data.errorMessage || null,
        data.requestBody ? JSON.stringify(data.requestBody) : null,
        data.responseBody ? JSON.stringify(data.responseBody) : null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );
    return result.rows[0];
  }

  /**
   * Find requests by user ID
   */
  async findByUserId(userId: string, limit: number = 100): Promise<ApiRequest[]> {
    const result = await this.executeQuery<ApiRequest>(
      `SELECT * FROM ${this.tableName} 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Find requests by path
   */
  async findByPath(path: string, limit: number = 100): Promise<ApiRequest[]> {
    const result = await this.executeQuery<ApiRequest>(
      `SELECT * FROM ${this.tableName} 
       WHERE path = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [path, limit]
    );
    return result.rows;
  }

  /**
   * Find slow requests (above threshold)
   */
  async findSlowRequests(thresholdMs: number = 1000, limit: number = 50): Promise<ApiRequest[]> {
    const result = await this.executeQuery<ApiRequest>(
      `SELECT * FROM ${this.tableName} 
       WHERE response_time_ms > $1 
       ORDER BY response_time_ms DESC 
       LIMIT $2`,
      [thresholdMs, limit]
    );
    return result.rows;
  }

  /**
   * Find failed requests (5xx status codes)
   */
  async findFailedRequests(limit: number = 50): Promise<ApiRequest[]> {
    const result = await this.executeQuery<ApiRequest>(
      `SELECT * FROM ${this.tableName} 
       WHERE status_code >= 500 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get API statistics for a time range
   */
  async getStats(timeRange: string = '24h'): Promise<ApiRequestStats> {
    const interval = this.parseTimeRange(timeRange);

    // Total requests and avg response time
    const totalResult = await this.executeQuery<{
      total: string;
      avg_response_time: string;
      error_count: string;
    }>(
      `SELECT 
        COUNT(*) as total,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status_code >= 500 THEN 1 END) as error_count
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'`
    );

    const total = parseInt(totalResult.rows[0].total, 10);
    const avgResponseTime = parseFloat(totalResult.rows[0].avg_response_time) || 0;
    const errorCount = parseInt(totalResult.rows[0].error_count, 10);
    const errorRate = total > 0 ? (errorCount / total) * 100 : 0;

    // Requests by method
    const methodResult = await this.executeQuery<{ method: string; count: string }>(
      `SELECT method, COUNT(*) as count 
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY method 
       ORDER BY count DESC`
    );

    const requestsByMethod = methodResult.rows.map(row => ({
      method: row.method,
      count: parseInt(row.count, 10)
    }));

    // Requests by path (top 10)
    const pathResult = await this.executeQuery<{
      path: string;
      count: string;
      avg_response_time: string;
    }>(
      `SELECT 
        path, 
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY path 
       ORDER BY count DESC 
       LIMIT 10`
    );

    const requestsByPath = pathResult.rows.map(row => ({
      path: row.path,
      count: parseInt(row.count, 10),
      avg_response_time: parseFloat(row.avg_response_time)
    }));

    // Requests by status code
    const statusResult = await this.executeQuery<{ status_code: number; count: string }>(
      `SELECT status_code, COUNT(*) as count 
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY status_code 
       ORDER BY status_code ASC`
    );

    const requestsByStatus = statusResult.rows.map(row => ({
      status_code: row.status_code,
      count: parseInt(row.count, 10)
    }));

    return {
      totalRequests: total,
      avgResponseTime,
      errorRate,
      requestsByMethod,
      requestsByPath,
      requestsByStatus
    };
  }

  /**
   * Get endpoint performance metrics
   */
  async getEndpointMetrics(timeRange: string = '24h'): Promise<Array<{
    path: string;
    method: string;
    count: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  }>> {
    const interval = this.parseTimeRange(timeRange);

    const result = await this.executeQuery<any>(
      `SELECT 
        path,
        method,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
        (COUNT(CASE WHEN status_code >= 500 THEN 1 END)::float / COUNT(*)::float * 100) as error_rate
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY path, method 
       ORDER BY count DESC 
       LIMIT 20`
    );

    return result.rows.map(row => ({
      path: row.path,
      method: row.method,
      count: parseInt(row.count, 10),
      avgResponseTime: parseFloat(row.avg_response_time),
      minResponseTime: parseFloat(row.min_response_time),
      maxResponseTime: parseFloat(row.max_response_time),
      p95ResponseTime: parseFloat(row.p95_response_time),
      errorRate: parseFloat(row.error_rate) || 0
    }));
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
   * Delete old requests (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const result = await this.executeQuery(
      `DELETE FROM ${this.tableName} 
       WHERE created_at < NOW() - INTERVAL '${days} days'`
    );
    return result.rowCount || 0;
  }

  /**
   * Get hourly request counts for time series
   */
  async getHourlyStats(hours: number = 24): Promise<Array<{
    hour: string;
    count: number;
    avg_response_time: number;
  }>> {
    const result = await this.executeQuery<{
      hour: string;
      count: string;
      avg_response_time: string;
    }>(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time
       FROM ${this.tableName} 
       WHERE created_at >= NOW() - INTERVAL '${hours} hours'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour ASC`
    );

    return result.rows.map(row => ({
      hour: row.hour,
      count: parseInt(row.count, 10),
      avg_response_time: parseFloat(row.avg_response_time)
    }));
  }
}

// Export singleton instance
export const apiRequestRepository = new ApiRequestRepository();


