import { Router } from 'express';
import { query, pool } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
function convertEventTypes(event: any) {
  return {
    ...event,
    startDate: event.start_date,
    endDate: event.end_date,
    budget: event.budget ? parseFloat(event.budget) : undefined,
    coordinatorId: event.coordinator_id,
    participants: event.participants || [],
  };
}


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

    res.json(result.rows.map(convertEventTypes));
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

    res.json(convertEventTypes(result.rows[0]));
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { name, venue, city, state, start_date, end_date, budget, participant_ids, participants } = req.body;

    if (!name || !venue || !city || !state || !start_date || !end_date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Insert event (critical - must succeed)
    const result = await query(
      `INSERT INTO events (name, venue, city, state, start_date, end_date, budget, coordinator_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, venue, city, state, start_date, end_date, budget, req.user?.id]
    );

    const event = result.rows[0];
    console.log(`[Events] Created event: ${event.id} - ${event.name}`);

    // Handle participants - best effort (don't fail event if participant fails)
    if (participants && Array.isArray(participants)) {
      const bcrypt = require('bcrypt');
      console.log(`[Events] Processing ${participants.length} participants (best effort)`);
      
      for (const participant of participants) {
        try {
          let userId = participant.id;
          
          // Check if user exists
          const userCheck = await query('SELECT id FROM users WHERE id = $1', [participant.id]);
          
          // If user doesn't exist, create them
          if (userCheck.rows.length === 0) {
            console.log(`[Events] Creating new user for custom participant: ${participant.name} (${participant.email})`);
            
            // Generate a default password for custom participants
            const defaultPassword = await bcrypt.hash('changeme123', 10);
            
            try {
              const newUserResult = await query(
                'INSERT INTO users (id, username, password, name, email, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [participant.id, participant.username, defaultPassword, participant.name, participant.email, participant.role || 'temporary']
              );
              
              userId = newUserResult.rows[0].id;
              console.log(`[Events] ✓ Created user: ${userId}`);
            } catch (userError: any) {
              console.error(`[Events] ⚠️ Failed to create user ${participant.email}:`, userError.message);
              // Skip this participant, continue with others
              continue;
            }
          } else {
            console.log(`[Events] ✓ User already exists: ${userId}`);
          }
          
          // Add participant to event
          await query(
            'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [event.id, userId]
          );
          console.log(`[Events] ✓ Added participant ${userId} to event ${event.id}`);
        } catch (participantError: any) {
          console.error(`[Events] ⚠️ Failed to add participant ${participant.name}:`, participantError.message);
          // Continue with next participant
        }
      }
    } else if (participant_ids && Array.isArray(participant_ids)) {
      // Fallback: Handle old format (just IDs)
      console.log(`[Events] Processing ${participant_ids.length} participant IDs (legacy format)`);
      for (const userId of participant_ids) {
        try {
          await query(
            'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [event.id, userId]
          );
          console.log(`[Events] ✓ Added participant ${userId} to event ${event.id}`);
        } catch (participantError: any) {
          console.error(`[Events] ⚠️ Failed to add participant ${userId}:`, participantError.message);
          // Continue with next participant
        }
      }
    }

    // Event created successfully (even if some participants failed)
    res.status(201).json(event);
  } catch (error) {
    console.error('[Events] Failed to create event:', error);
    res.status(500).json({ error: 'Failed to create event. Please try again.' });
  }
});

// Update event
router.put('/:id', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res) => {
  const client = await pool.connect(); // Get a client for transaction
  
  try {
    const { id } = req.params;
    const { name, venue, city, state, start_date, end_date, budget, status, participant_ids, participants } = req.body;

    // Start transaction
    await client.query('BEGIN');
    console.log(`[Events] Starting transaction for event update: ${id}`);

    const result = await client.query(
      `UPDATE events 
       SET name = $1, venue = $2, city = $3, state = $4, start_date = $5, end_date = $6, 
           budget = $7, status = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [name, venue, city, state, start_date, end_date, budget, status, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update participants if provided (handle both full participant objects and IDs)
    if (participants && Array.isArray(participants)) {
      const bcrypt = require('bcrypt');
      await client.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
      console.log(`[Events] Deleted existing participants for event ${id}`);
      console.log(`[Events] Processing ${participants.length} participants`);
      
      for (const participant of participants) {
        let userId = participant.id;
        
        // Check if user exists
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [participant.id]);
        
        // If user doesn't exist, create them
        if (userCheck.rows.length === 0) {
          console.log(`[Events] Creating new user for custom participant: ${participant.name} (${participant.email})`);
          
          const defaultPassword = await bcrypt.hash('changeme123', 10);
          
          const newUserResult = await client.query(
            'INSERT INTO users (id, username, password, name, email, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [participant.id, participant.username, defaultPassword, participant.name, participant.email, participant.role || 'temporary']
          );
          
          userId = newUserResult.rows[0].id;
          console.log(`[Events] ✓ Created user: ${userId}`);
        } else {
          console.log(`[Events] ✓ User already exists: ${userId}`);
        }
        
        await client.query(
          'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
        console.log(`[Events] ✓ Added participant ${userId} to event ${id}`);
      }
    } else if (participant_ids && Array.isArray(participant_ids)) {
      // Fallback: Handle old format (just IDs)
      await client.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
      console.log(`[Events] Processing ${participant_ids.length} participant IDs (legacy format)`);
      for (const userId of participant_ids) {
        await client.query(
          'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
        console.log(`[Events] ✓ Added participant ${userId} to event ${id}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('[Events] Transaction committed successfully');

    res.json(convertEventTypes(result.rows[0]));
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('[Events] Transaction rolled back due to error:', error);
    
    // Better error message based on error type
    if ((error as any).code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'A user with that email or username already exists' });
    } else if ((error as any).code === '23503') { // Foreign key constraint violation
      res.status(400).json({ error: 'Invalid participant ID provided' });
    } else {
      res.status(500).json({ error: 'Failed to update event. Please try again.' });
    }
  } finally {
    // Release the client back to the pool
    client.release();
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
