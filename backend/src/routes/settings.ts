import { Router } from 'express';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get all settings
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT key, value FROM app_settings');
    
    const settings: any = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings (admin only)
router.put('/', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await query(
        `INSERT INTO app_settings (key, value) 
         VALUES ($1, $2) 
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
