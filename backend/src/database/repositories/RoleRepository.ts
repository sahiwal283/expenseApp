/**
 * Role Repository
 * 
 * Handles all database operations for user roles.
 */

import { BaseRepository } from './BaseRepository';

export interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
  color?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class RoleRepository extends BaseRepository<Role> {
  protected tableName = 'roles';

  /**
   * Find all active roles
   */
  async findAllActive(): Promise<Role[]> {
    const result = await this.executeQuery<Role>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY is_system DESC, name ASC`
    );
    return result.rows;
  }

  /**
   * Find role by name
   */
  async findByName(name: string): Promise<Role | null> {
    const result = await this.executeQuery<Role>(
      `SELECT * FROM ${this.tableName} WHERE name = $1`,
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new role
   */
  async create(data: {
    name: string;
    label: string;
    description?: string;
    color?: string;
  }): Promise<Role> {
    const result = await this.executeQuery<Role>(
      `INSERT INTO ${this.tableName} (name, label, description, color, is_system, is_active)
       VALUES ($1, $2, $3, $4, false, true)
       RETURNING *`,
      [data.name, data.label, data.description || null, data.color || 'bg-gray-100 text-gray-800']
    );
    return result.rows[0];
  }

  /**
   * Update role (system roles have limited editability)
   */
  async update(id: string, data: {
    label?: string;
    description?: string;
    color?: string;
  }): Promise<Role> {
    const result = await this.executeQuery<Role>(
      `UPDATE ${this.tableName}
       SET label = $1,
           description = $2,
           color = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [data.label, data.description, data.color, id]
    );
    return result.rows[0];
  }

  /**
   * Soft delete role
   */
  async softDelete(id: string): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName} SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }

  /**
   * Count users with specific role
   */
  async countUsersWithRole(roleName: string): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      [roleName]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

// Export singleton instance
export const roleRepository = new RoleRepository();

