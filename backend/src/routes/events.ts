import { Router } from 'express';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get all events
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', u.id,
                 'name', u.name,
                 'email', u.email,
                 'role', u.role
               )
             ) FILTER (WHERE u.id IS NOT NULL) as participants
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN users u ON ep.user_id = u.id
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', u.id,
                 'name', u.name,
                 'email', u.email,
                 'role', u.role
               )
             ) FILTER (WHERE u.id IS NOT NULL) as participants
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN users u ON ep.user_id = u.id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/', authorize('admin', 'coordinator'), async (req: AuthRequest, res) => {
  try {
    const { name, venue, city, state, start_date, end_date, budget, participant_ids } = req.body;

    if (!name || !venue || !city || !state || !start_date || !end_date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await query(
      `INSERT INTO events (name, venue, city, state, start_date, end_date, budget, coordinator_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, venue, city, state, start_date, end_date, budget, req.user?.id]
    );

    const event = result.rows[0];

    // Add participants if provided
    if (participant_ids && Array.isArray(participant_ids)) {
      for (const userId of participant_ids) {
        await query(
          'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)',
          [event.id, userId]
        );
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/:id', authorize('admin', 'coordinator'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, venue, city, state, start_date, end_date, budget, status, participant_ids } = req.body;

    const result = await query(
      `UPDATE events 
       SET name = $1, venue = $2, city = $3, state = $4, start_date = $5, end_date = $6, 
           budget = $7, status = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [name, venue, city, state, start_date, end_date, budget, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update participants if provided
    if (participant_ids && Array.isArray(participant_ids)) {
      await query('DELETE FROM event_participants WHERE event_id = $1', [id]);
      for (const userId of participant_ids) {
        await query(
          'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:id', authorize('admin', 'coordinator'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
