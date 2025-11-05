import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { query } from '../config/database';
import { authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface TemplateRow {
  id: number;
  title: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const customItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
  position: z.number().int().min(0, 'Position must be a non-negative integer').optional()
});

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
  position: z.number().int().min(0, 'Position must be a non-negative integer').optional()
});

/**
 * Event Checklist Routes
 * 
 * Manages trade show event checklists including:
 * - Flights (per attendee)
 * - Hotels (per attendee)
 * - Car Rentals (group or individual)
 * - Booth setup and utilities
 * - Shipping tracking
 * - Custom checklist items
 * - Reusable templates
 * 
 * @module routes/checklist
 */

// Configure multer for booth map uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/booth-maps';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'booth-map-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadBoothMap = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/i;  // Case-insensitive
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf'
    ];
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) and PDF are allowed'));
    }
  }
});

// ==========================================
// CHECKLIST TEMPLATES (Must be before parameterized routes!)
// ==========================================

// Get all templates
router.get('/templates', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM checklist_templates WHERE is_active = true ORDER BY position, id'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('[Checklist] Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Create checklist template
 * 
 * Templates are automatically applied to new checklists.
 * 
 * @route POST /api/checklist/templates
 * @param {Object} body - Template details
 * @param {string} body.title - Template title (required)
 * @param {string} body.description - Template description
 * @param {number} body.position - Display position (default: 0)
 * @returns {Object} Created template
 * @access Admin, Developer only
 */
router.post('/templates', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const validated = templateSchema.parse({
      title: req.body.title,
      description: req.body.description,
      position: req.body.position
    });
    
    const result = await query(
      `INSERT INTO checklist_templates (title, description, position, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [validated.title, validated.description || null, validated.position || 0]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.issues 
      });
    }
    console.error('[Checklist] Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, position, is_active } = req.body;
    
    const result = await query(
      `UPDATE checklist_templates 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           position = COALESCE($3, position),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [title, description, position, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete('/templates/:id', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'UPDATE checklist_templates SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[Checklist] Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==========================================
// CUSTOM CHECKLIST ITEMS CRUD
// ==========================================

// Get custom items for a checklist
router.get('/checklist/:checklistId/custom-items', authorize('admin', 'coordinator', 'developer', 'accountant', 'salesperson'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    const result = await query(
      'SELECT * FROM checklist_custom_items WHERE checklist_id = $1 ORDER BY position, id',
      [checklistId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('[Checklist] Error fetching custom items:', error);
    res.status(500).json({ error: 'Failed to fetch custom items' });
  }
});

// Create custom item
router.post('/checklist/:checklistId/custom-items', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    // Validate input
    const validated = customItemSchema.parse({
      title: req.body.title,
      description: req.body.description,
      position: req.body.position
    });
    
    const result = await query(
      `INSERT INTO checklist_custom_items (checklist_id, title, description, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [checklistId, validated.title, validated.description || null, validated.position || 0]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.issues 
      });
    }
    console.error('[Checklist] Error creating custom item:', error);
    res.status(500).json({ error: 'Failed to create custom item' });
  }
});

// Update custom item
router.put('/custom-items/:id', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, completed, position } = req.body;
    
    const result = await query(
      `UPDATE checklist_custom_items 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed),
           position = COALESCE($4, position)
       WHERE id = $5
       RETURNING *`,
      [title, description, completed, position, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating custom item:', error);
    res.status(500).json({ error: 'Failed to update custom item' });
  }
});

// Delete custom item
router.delete('/custom-items/:id', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM checklist_custom_items WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom item not found' });
    }
    
    res.json({ message: 'Custom item deleted successfully' });
  } catch (error) {
    console.error('[Checklist] Error deleting custom item:', error);
    res.status(500).json({ error: 'Failed to delete custom item' });
  }
});

// ==========================================
// EVENT CHECKLIST OPERATIONS
// ==========================================

/**
 * Get or create checklist for an event
 * 
 * Returns complete checklist data including all related entities:
 * - Flights, hotels, car rentals, booth shipping
 * - Custom checklist items
 * 
 * If checklist doesn't exist, creates one and auto-applies active templates.
 * 
 * @route GET /api/checklist/:eventId
 * @param {string} eventId - UUID of the event
 * @returns {Object} Checklist object with all related data
 * @access All authenticated users (read-only for salesperson/accountant)
 */
router.get('/:eventId', authorize('admin', 'coordinator', 'developer', 'accountant', 'salesperson'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get or create checklist
    let checklist = await query(
      'SELECT * FROM event_checklists WHERE event_id = $1',
      [eventId]
    );

    if (checklist.rows.length === 0) {
      // Create new checklist
      checklist = await query(
        `INSERT INTO event_checklists (event_id) VALUES ($1) RETURNING *`,
        [eventId]
      );
      
      const checklistId = checklist.rows[0].id;
      
      // Auto-apply templates to new checklist
      const templates = await query(
        'SELECT * FROM checklist_templates WHERE is_active = true ORDER BY position, id'
      );
      
      if (templates.rows.length > 0) {
        const insertPromises = templates.rows.map((template: TemplateRow) => 
          query(
            `INSERT INTO checklist_custom_items (checklist_id, title, description, position, completed)
             VALUES ($1, $2, $3, $4, false)`,
            [checklistId, template.title, template.description, template.position]
          )
        );
        
        await Promise.all(insertPromises);
        
        // Mark templates as applied
        await query(
          'UPDATE event_checklists SET templates_applied = true WHERE id = $1',
          [checklistId]
        );
      }
    }

    const checklistId = checklist.rows[0].id;

    // Get all related data
    const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
      query('SELECT * FROM checklist_flights WHERE checklist_id = $1 ORDER BY id', [checklistId]),
      query('SELECT * FROM checklist_hotels WHERE checklist_id = $1 ORDER BY id', [checklistId]),
      query('SELECT * FROM checklist_car_rentals WHERE checklist_id = $1 ORDER BY id', [checklistId]),
      query('SELECT * FROM checklist_booth_shipping WHERE checklist_id = $1 ORDER BY id', [checklistId]),
      query('SELECT * FROM checklist_custom_items WHERE checklist_id = $1 ORDER BY position, id', [checklistId])
    ]);

    res.json({
      ...checklist.rows[0],
      flights: flights.rows,
      hotels: hotels.rows,
      carRentals: carRentals.rows,
      boothShipping: boothShipping.rows,
      customItems: customItems.rows
    });
  } catch (error) {
    console.error('[Checklist] Error fetching checklist:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// Update checklist main fields (booth, electricity)
router.put('/checklist/:checklistId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { boothOrdered, boothNotes, electricityOrdered, electricityNotes } = req.body;

    const result = await query(
      `UPDATE event_checklists 
       SET booth_ordered = $1, booth_notes = $2, electricity_ordered = $3, 
           electricity_notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [boothOrdered, boothNotes, electricityOrdered, electricityNotes, checklistId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating checklist:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Upload booth map
router.post('/checklist/:checklistId/booth-map', authorize('admin', 'coordinator', 'developer'), uploadBoothMap.single('boothMap'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mapUrl = `/uploads/booth-maps/${req.file.filename}`;

    const result = await query(
      `UPDATE event_checklists 
       SET booth_map_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [mapUrl, checklistId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    console.log(`[Checklist] Booth map uploaded for checklist ${checklistId}: ${mapUrl}`);
    res.json({ mapUrl: result.rows[0].booth_map_url });
  } catch (error) {
    console.error('[Checklist] Error uploading booth map:', error);
    res.status(500).json({ error: 'Failed to upload booth map' });
  }
});

// Delete booth map
router.delete('/checklist/:checklistId/booth-map', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;

    const result = await query(
      `UPDATE event_checklists 
       SET booth_map_url = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [checklistId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    console.log(`[Checklist] Booth map deleted for checklist ${checklistId}`);
    res.json({ message: 'Booth map deleted successfully' });
  } catch (error) {
    console.error('[Checklist] Error deleting booth map:', error);
    res.status(500).json({ error: 'Failed to delete booth map' });
  }
});

// Add flight
router.post('/checklist/:checklistId/flights', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { attendeeId, attendeeName, carrier, confirmationNumber, notes, booked } = req.body;

    const result = await query(
      `INSERT INTO checklist_flights 
       (checklist_id, attendee_id, attendee_name, carrier, confirmation_number, notes, booked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [checklistId, attendeeId, attendeeName, carrier, confirmationNumber, notes, booked || false]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error adding flight:', error);
    res.status(500).json({ error: 'Failed to add flight' });
  }
});

// Update flight
router.put('/flights/:flightId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { flightId } = req.params;
    const { carrier, confirmationNumber, notes, booked } = req.body;

    const result = await query(
      `UPDATE checklist_flights 
       SET carrier = $1, confirmation_number = $2, notes = $3, booked = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [carrier, confirmationNumber, notes, booked, flightId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating flight:', error);
    res.status(500).json({ error: 'Failed to update flight' });
  }
});

// Delete flight
router.delete('/flights/:flightId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { flightId } = req.params;
    await query('DELETE FROM checklist_flights WHERE id = $1', [flightId]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting flight:', error);
    res.status(500).json({ error: 'Failed to delete flight' });
  }
});

// Add hotel
router.post('/checklist/:checklistId/hotels', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { attendeeId, attendeeName, propertyName, confirmationNumber, checkInDate, checkOutDate, notes, booked } = req.body;

    const result = await query(
      `INSERT INTO checklist_hotels 
       (checklist_id, attendee_id, attendee_name, property_name, confirmation_number, check_in_date, check_out_date, notes, booked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [checklistId, attendeeId, attendeeName, propertyName, confirmationNumber, checkInDate, checkOutDate, notes, booked || false]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error adding hotel:', error);
    res.status(500).json({ error: 'Failed to add hotel' });
  }
});

// Update hotel
router.put('/hotels/:hotelId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { propertyName, confirmationNumber, checkInDate, checkOutDate, notes, booked } = req.body;

    const result = await query(
      `UPDATE checklist_hotels 
       SET property_name = $1, confirmation_number = $2, check_in_date = $3, check_out_date = $4, 
           notes = $5, booked = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [propertyName, confirmationNumber, checkInDate, checkOutDate, notes, booked, hotelId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating hotel:', error);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

// Delete hotel
router.delete('/hotels/:hotelId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    await query('DELETE FROM checklist_hotels WHERE id = $1', [hotelId]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting hotel:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

// Add car rental
router.post('/checklist/:checklistId/car-rentals', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { provider, confirmationNumber, pickupDate, returnDate, notes, booked, rentalType, assignedToId, assignedToName } = req.body;

    const result = await query(
      `INSERT INTO checklist_car_rentals 
       (checklist_id, provider, confirmation_number, pickup_date, return_date, notes, booked, rental_type, assigned_to_id, assigned_to_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [checklistId, provider, confirmationNumber, pickupDate, returnDate, notes, booked || false, rentalType || 'group', assignedToId || null, assignedToName || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error adding car rental:', error);
    res.status(500).json({ error: 'Failed to add car rental' });
  }
});

// Update car rental
router.put('/car-rentals/:rentalId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { rentalId } = req.params;
    const { provider, confirmationNumber, pickupDate, returnDate, notes, booked, rentalType, assignedToId, assignedToName } = req.body;

    const result = await query(
      `UPDATE checklist_car_rentals 
       SET provider = $1, confirmation_number = $2, pickup_date = $3, return_date = $4, 
           notes = $5, booked = $6, rental_type = $7, assigned_to_id = $8, assigned_to_name = $9, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [provider, confirmationNumber, pickupDate, returnDate, notes, booked, rentalType || 'group', assignedToId || null, assignedToName || null, rentalId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error updating car rental:', error);
    res.status(500).json({ error: 'Failed to update car rental' });
  }
});

// Delete car rental
router.delete('/car-rentals/:rentalId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { rentalId } = req.params;
    await query('DELETE FROM checklist_car_rentals WHERE id = $1', [rentalId]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting car rental:', error);
    res.status(500).json({ error: 'Failed to delete car rental' });
  }
});

// Add/Update booth shipping
router.post('/checklist/:checklistId/booth-shipping', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { shippingMethod, carrierName, trackingNumber, shippingDate, deliveryDate, notes, shipped } = req.body;

    // Always insert a new booth shipping record (supports multiple shipments)
    const result = await query(
        `INSERT INTO checklist_booth_shipping 
         (checklist_id, shipping_method, carrier_name, tracking_number, shipping_date, delivery_date, notes, shipped)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [checklistId, shippingMethod, carrierName, trackingNumber, shippingDate, deliveryDate, notes, shipped || false]
      );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Checklist] Error saving booth shipping:', error);
    res.status(500).json({ error: 'Failed to save booth shipping' });
  }
});

// Apply templates to a specific checklist
router.post('/checklist/:checklistId/apply-templates', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    // Get all active templates
    const templates = await query(
      'SELECT * FROM checklist_templates WHERE is_active = true ORDER BY position, id'
    );
    
    // Insert each template as a custom item for this checklist
    const insertPromises = templates.rows.map((template: TemplateRow) => 
      query(
        `INSERT INTO checklist_custom_items (checklist_id, title, description, position, completed)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT DO NOTHING`,
        [checklistId, template.title, template.description, template.position]
      )
    );
    
    await Promise.all(insertPromises);
    
    // Mark templates as applied
    await query(
      'UPDATE event_checklists SET templates_applied = true WHERE id = $1',
      [checklistId]
    );
    
    res.json({ message: 'Templates applied successfully', count: templates.rows.length });
  } catch (error) {
    console.error('[Checklist] Error applying templates:', error);
    res.status(500).json({ error: 'Failed to apply templates' });
  }
});

export default router;

