/**
 * Event Routes
 * Handles trade show event management (CRUD)
 */

import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { eventRepository, EventWithParticipants } from '../database/repositories';
import { processParticipants, removeAllParticipants } from '../services/EventParticipantService';

const router = Router();

router.use(authenticateToken);
function convertEventTypes(event: EventWithParticipants) {
  return {
    ...event,
    startDate: event.start_date,
    endDate: event.end_date,
    showStartDate: event.show_start_date || event.start_date, // Fallback for backward compat
    showEndDate: event.show_end_date || event.end_date, // Fallback for backward compat
    travelStartDate: event.travel_start_date || event.start_date, // Fallback for backward compat
    travelEndDate: event.travel_end_date || event.end_date, // Fallback for backward compat
    budget: event.budget ? parseFloat(String(event.budget)) : undefined,
    coordinatorId: event.coordinator_id,
    participants: event.participants || [],
  };
}


// Get all events
router.get('/', async (req: AuthRequest, res) => {
  try {
    const events = await eventRepository.findAllWithParticipants();
    res.json(events.map(convertEventTypes));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const event = await eventRepository.findByIdWithParticipants(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(convertEventTypes(event));
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { name, venue, city, state, start_date, end_date, show_start_date, show_end_date, travel_start_date, travel_end_date, budget, participant_ids, participants } = req.body;

    if (!name || !venue || !city || !state || !start_date || !end_date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Create event using repository
    const event = await eventRepository.create({
      name,
      venue,
      city,
      state,
      start_date,
      end_date,
      show_start_date: show_start_date || start_date,
      show_end_date: show_end_date || end_date,
      travel_start_date: travel_start_date || start_date,
      travel_end_date: travel_end_date || end_date,
      budget,
      coordinator_id: req.user?.id
    });

    console.log(`[Events] Created event: ${event.id} - ${event.name}`);

    // Handle participants - best effort (don't fail event if participant fails)
    await processParticipants(event.id, participants, participant_ids);

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
    const { name, venue, city, state, start_date, end_date, show_start_date, show_end_date, travel_start_date, travel_end_date, budget, status, participant_ids, participants } = req.body;

    // Start transaction
    await client.query('BEGIN');
    console.log(`[Events] Starting transaction for event update: ${id}`);

    // Update event using repository with transaction support
    const event = await eventRepository.updateWithTransaction(id, {
      name,
      venue,
      city,
      state,
      start_date,
      end_date,
      show_start_date: show_start_date || start_date,
      show_end_date: show_end_date || end_date,
      travel_start_date: travel_start_date || start_date,
      travel_end_date: travel_end_date || end_date,
      budget,
      status
    }, client);

    // Update participants if provided
    if (participants || participant_ids) {
      await removeAllParticipants(id, client);
      await processParticipants(id, participants, participant_ids, client);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('[Events] Transaction committed successfully');

    res.json(convertEventTypes(event));
  } catch (error: any) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('[Events] Transaction rolled back due to error:', error);
    
    // Better error message based on error type
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'A user with that email or username already exists' });
    } else if (error.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ error: 'Invalid participant ID provided' });
    } else if (error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
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

    await eventRepository.delete(id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
