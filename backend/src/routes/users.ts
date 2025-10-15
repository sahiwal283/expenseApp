import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get all users
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, username, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, username, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin and developer)
router.post('/', authorize('admin', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { username, password, name, email, role } = req.body;

    if (!username || !password || !name || !email || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (username, password, name, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, email, role, created_at',
      [username, hashedPassword, name, email, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin and developer)
router.put('/:id', authorize('admin', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    let updateQuery: string;
    let queryParams: any[];

    if (password) {
      // If password is provided, hash it and update
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, password = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, username, name, email, role';
      queryParams = [name, email, role, hashedPassword, id];
    } else {
      // If no password, update other fields only
      updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, username, name, email, role';
      queryParams = [name, email, role, id];
    }

    const result = await query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin and developer)
router.delete('/:id', authorize('admin', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
