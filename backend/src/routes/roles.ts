/**
 * Roles API Routes
 * Handles role management operations
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { roleRepository } from '../database/repositories';

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
    const roles = await roleRepository.findAllActive();
    
    res.json(roles);
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
    
    const role = await roleRepository.findById(id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json(role);
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
    
    // Only admins and developers can create roles
    if (user.role !== 'admin' && user.role !== 'developer') {
      return res.status(403).json({ error: 'Only administrators and developers can create roles' });
    }
    
    const { name, label, description, color } = req.body;
    
    // Validate required fields
    if (!name || !label) {
      return res.status(400).json({ error: 'Name and label are required' });
    }
    
    // Ensure name is lowercase and no spaces
    const roleName = name.toLowerCase().replace(/\s+/g, '_');
    
    // Check if role already exists
    const existingRole = await roleRepository.findByName(roleName);
    
    if (existingRole) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    
    // Create the role
    const role = await roleRepository.create({
      name: roleName,
      label,
      description,
      color
    });
    
    res.status(201).json(role);
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
    
    // Only admins and developers can update roles
    if (user.role !== 'admin' && user.role !== 'developer') {
      return res.status(403).json({ error: 'Only administrators and developers can update roles' });
    }
    
    const { label, description, color } = req.body;
    
    // Check if role exists and get its system status
    const roleCheck = await roleRepository.findById(id);
    
    if (!roleCheck) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const isSystem = roleCheck.is_system;
    
    // For system roles, only allow updating label, description, and color
    // For custom roles, allow updating all fields
    const role = await roleRepository.update(id, {
      label,
      description,
      color
    });
    
    res.json(role);
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
    
    // Only admins and developers can delete roles
    if (user.role !== 'admin' && user.role !== 'developer') {
      return res.status(403).json({ error: 'Only administrators and developers can delete roles' });
    }
    
    // Check if role exists and is a system role
    const role = await roleRepository.findById(id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.is_system) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }
    
    // Check if any users have this role
    const userCount = await roleRepository.countUsersWithRole(role.name);
    
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. ${userCount} user(s) currently have this role. Please reassign these users first.` 
      });
    }
    
    // Soft delete the role
    await roleRepository.softDelete(id);
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;

