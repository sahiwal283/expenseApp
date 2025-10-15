/**
 * Base Repository Class
 * 
 * Provides common database operations and patterns for all repositories.
 */

import { QueryResult, QueryResultRow } from 'pg';
import { query as dbQuery } from '../../config/database';
import { DatabaseError } from '../../utils/errors';

export abstract class BaseRepository<T extends QueryResultRow> {
  protected abstract tableName: string;
  
  /**
   * Execute a database query with error handling
   */
  protected async executeQuery<R extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<R>> {
    try {
      return await dbQuery(text, params);
    } catch (error) {
      throw new DatabaseError(
        `Query failed on table '${this.tableName}'`,
        error as Error
      );
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string | number): Promise<T | null> {
    const result = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all records
   */
  async findAll(): Promise<T[]> {
    const result = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} ORDER BY id DESC`
    );
    return result.rows;
  }

  /**
   * Find records by column value
   */
  async findBy(column: string, value: any): Promise<T[]> {
    const result = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE ${column} = $1`,
      [value]
    );
    return result.rows;
  }

  /**
   * Count records
   */
  async count(): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if record exists
   */
  async exists(id: string | number): Promise<boolean> {
    const result = await this.executeQuery<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1) as exists`,
      [id]
    );
    return result.rows[0].exists;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number): Promise<boolean> {
    const result = await this.executeQuery(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Get query builder for complex queries
   */
  protected buildQuery(options: {
    select?: string[];
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): { text: string; params: any[] } {
    const select = options.select?.join(', ') || '*';
    let text = `SELECT ${select} FROM ${this.tableName}`;
    const params: any[] = [];
    let paramIndex = 1;

    // WHERE clause
    if (options.where && Object.keys(options.where).length > 0) {
      const whereClauses = Object.entries(options.where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });
      text += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // ORDER BY
    if (options.orderBy) {
      text += ` ORDER BY ${options.orderBy}`;
    }

    // LIMIT and OFFSET
    if (options.limit) {
      text += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    if (options.offset) {
      text += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    return { text, params };
  }
}

