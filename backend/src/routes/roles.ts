/**
 * Roles API Routes
 * Handles role management operations
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Interface for Role
interface Role {
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

/**
 * GET /api/roles
 * Get all roles
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM roles WHERE is_active = true ORDER BY is_system DESC, name ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/roles/:id
 * Get a specific role by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

/**
 * POST /api/roles
 * Create a new role
 * Only admins can create roles
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only admins can create roles
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create roles' });
    }
    
    const { name, label, description, color } = req.body;
    
    // Validate required fields
    if (!name || !label) {
      return res.status(400).json({ error: 'Name and label are required' });
    }
    
    // Ensure name is lowercase and no spaces
    const roleName = name.toLowerCase().replace(/\s+/g, '_');
    
    // Check if role already exists
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    
    if (existingRole.rows.length > 0) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    
    // Create the role
    const result = await pool.query(
      `INSERT INTO roles (name, label, description, color, is_system, is_active)
       VALUES ($1, $2, $3, $4, false, true)
       RETURNING *`,
      [roleName, label, description || null, color || 'bg-gray-100 text-gray-800']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PUT /api/roles/:id
 * Update a role
 * Only admins can update roles
 * System roles have limited editability (can't change name)
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Only admins can update roles
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update roles' });
    }
    
    const { label, description, color } = req.body;
    
    // Check if role exists and get its system status
    const roleCheck = await pool.query(
      'SELECT is_system FROM roles WHERE id = $1',
      [id]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const isSystem = roleCheck.rows[0].is_system;
    
    // For system roles, only allow updating label, description, and color
    // For custom roles, allow updating all fields
    const result = await pool.query(
      `UPDATE roles
       SET label = $1,
           description = $2,
           color = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [label, description, color, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a role (soft delete by setting is_active = false)
 * Only admins can delete roles
 * System roles cannot be deleted
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Only admins can delete roles
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete roles' });
    }
    
    // Check if role exists and is a system role
    const roleCheck = await pool.query(
      'SELECT name, is_system FROM roles WHERE id = $1',
      [id]
    );
    
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const role = roleCheck.rows[0];
    
    if (role.is_system) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }
    
    // Check if any users have this role
    const usersWithRole = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      [role.name]
    );
    
    const userCount = parseInt(usersWithRole.rows[0].count);
    
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. ${userCount} user(s) currently have this role. Please reassign these users first.` 
      });
    }
    
    // Soft delete the role
    await pool.query(
      'UPDATE roles SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;

