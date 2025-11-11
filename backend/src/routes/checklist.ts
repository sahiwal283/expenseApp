/**
 * Checklist Routes
 * Handles trade show checklist management (flights, hotels, car rentals, booth shipping, custom items, templates)
 */

import express, { Response } from 'express';
import { authorize, AuthRequest } from '../middleware/auth';
import { uploadBoothMap } from '../config/upload';
import { checklistRepository } from '../database/repositories';

const router = express.Router();

// Get checklist for an event (all authenticated users can view)
router.get('/:eventId', authorize('admin', 'coordinator', 'developer', 'accountant', 'salesperson'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get or create checklist (repository handles get-or-create logic)
    const checklistData = await checklistRepository.findByEventId(eventId);

    res.json(checklistData);
  } catch (error) {
    console.error('[Checklist] Error fetching checklist:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// Update checklist main fields (booth, electricity)
router.put('/:checklistId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { boothOrdered, boothNotes, electricityOrdered, electricityNotes } = req.body;

    const checklist = await checklistRepository.updateMainFields(parseInt(checklistId), {
      boothOrdered,
      boothNotes,
      electricityOrdered,
      electricityNotes
    });

    res.json(checklist);
  } catch (error) {
    console.error('[Checklist] Error updating checklist:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Upload booth map
router.post('/:checklistId/booth-map', authorize('admin', 'coordinator', 'developer'), uploadBoothMap.single('boothMap'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mapUrl = `/uploads/booth-maps/${req.file.filename}`;

    const checklist = await checklistRepository.updateMainFields(parseInt(checklistId), {
      boothMapUrl: mapUrl
    });

    console.log(`[Checklist] Booth map uploaded for checklist ${checklistId}: ${mapUrl}`);
    res.json({ mapUrl: checklist.booth_map_url });
  } catch (error: any) {
    if (error.message === 'Checklist not found') {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    console.error('[Checklist] Error uploading booth map:', error);
    res.status(500).json({ error: 'Failed to upload booth map' });
  }
});

// Delete booth map
router.delete('/:checklistId/booth-map', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;

    await checklistRepository.updateMainFields(parseInt(checklistId), {
      boothMapUrl: undefined
    });

    console.log(`[Checklist] Booth map deleted for checklist ${checklistId}`);
    res.json({ message: 'Booth map deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Checklist not found') {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    console.error('[Checklist] Error deleting booth map:', error);
    res.status(500).json({ error: 'Failed to delete booth map' });
  }
});

// Add flight
router.post('/:checklistId/flights', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { attendeeId, attendeeName, carrier, confirmationNumber, notes, booked } = req.body;

    const flight = await checklistRepository.createFlight({
      checklistId: parseInt(checklistId),
      attendeeId,
      attendeeName,
      carrier,
      confirmationNumber,
      notes,
      booked: booked || false
    });

    res.json(flight);
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

    const flight = await checklistRepository.updateFlight(parseInt(flightId), {
      carrier,
      confirmation_number: confirmationNumber,
      notes,
      booked
    });

    res.json(flight);
  } catch (error) {
    console.error('[Checklist] Error updating flight:', error);
    res.status(500).json({ error: 'Failed to update flight' });
  }
});

// Delete flight
router.delete('/flights/:flightId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { flightId } = req.params;
    await checklistRepository.deleteFlight(parseInt(flightId));
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting flight:', error);
    res.status(500).json({ error: 'Failed to delete flight' });
  }
});

// Add hotel
router.post('/:checklistId/hotels', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { attendeeId, attendeeName, propertyName, confirmationNumber, checkInDate, checkOutDate, notes, booked } = req.body;

    const hotel = await checklistRepository.createHotel({
      checklistId: parseInt(checklistId),
      attendeeId,
      attendeeName,
      propertyName,
      confirmationNumber,
      checkInDate,
      checkOutDate,
      notes,
      booked: booked || false
    });

    res.json(hotel);
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

    const hotel = await checklistRepository.updateHotel(parseInt(hotelId), {
      property_name: propertyName,
      confirmation_number: confirmationNumber,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      notes,
      booked
    });

    res.json(hotel);
  } catch (error) {
    console.error('[Checklist] Error updating hotel:', error);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

// Delete hotel
router.delete('/hotels/:hotelId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    await checklistRepository.deleteHotel(parseInt(hotelId));
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting hotel:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

// Add car rental
router.post('/:checklistId/car-rentals', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { provider, confirmationNumber, pickupDate, returnDate, notes, booked, rentalType, assignedToId, assignedToName } = req.body;

    const rental = await checklistRepository.createCarRental({
      checklistId: parseInt(checklistId),
      provider,
      confirmationNumber,
      pickupDate,
      returnDate,
      notes,
      booked: booked || false,
      rentalType: rentalType || 'group',
      assignedToId: assignedToId || null,
      assignedToName: assignedToName || null
    });

    res.json(rental);
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

    const rental = await checklistRepository.updateCarRental(parseInt(rentalId), {
      provider,
      confirmation_number: confirmationNumber,
      pickup_date: pickupDate,
      return_date: returnDate,
      notes,
      booked,
      rental_type: rentalType || 'group',
      assigned_to_id: assignedToId || null,
      assigned_to_name: assignedToName || null
    });

    res.json(rental);
  } catch (error) {
    console.error('[Checklist] Error updating car rental:', error);
    res.status(500).json({ error: 'Failed to update car rental' });
  }
});

// Delete car rental
router.delete('/car-rentals/:rentalId', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { rentalId } = req.params;
    await checklistRepository.deleteCarRental(parseInt(rentalId));
    res.json({ success: true });
  } catch (error) {
    console.error('[Checklist] Error deleting car rental:', error);
    res.status(500).json({ error: 'Failed to delete car rental' });
  }
});

// Add/Update booth shipping
router.post('/:checklistId/booth-shipping', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { shippingMethod, carrierName, trackingNumber, shippingDate, deliveryDate, notes, shipped } = req.body;

    // Always insert a new booth shipping record (supports multiple shipments)
    const shipping = await checklistRepository.createBoothShipping({
      checklistId: parseInt(checklistId),
      shippingMethod,
      carrierName,
      trackingNumber,
      shippingDate,
      deliveryDate,
      notes,
      shipped: shipped || false
    });

    res.json(shipping);
  } catch (error) {
    console.error('[Checklist] Error saving booth shipping:', error);
    res.status(500).json({ error: 'Failed to save booth shipping' });
  }
});

// ==========================================
// CUSTOM CHECKLIST ITEMS
// ==========================================

// Get custom items for a checklist
router.get('/:checklistId/custom-items', authorize('admin', 'coordinator', 'developer', 'accountant', 'salesperson'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const customItems = await checklistRepository.getCustomItems(parseInt(checklistId));
    res.json(customItems);
  } catch (error) {
    console.error('[Checklist] Error fetching custom items:', error);
    res.status(500).json({ error: 'Failed to fetch custom items' });
  }
});

// Create custom item
router.post('/:checklistId/custom-items', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { title, description, position } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const customItem = await checklistRepository.createCustomItem({
      checklistId: parseInt(checklistId),
      title,
      description,
      position
    });
    
    res.json(customItem);
  } catch (error) {
    console.error('[Checklist] Error creating custom item:', error);
    res.status(500).json({ error: 'Failed to create custom item' });
  }
});

// Update custom item
router.put('/custom-items/:id', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, completed, position } = req.body;
    
    const customItem = await checklistRepository.updateCustomItem(parseInt(id), {
      title,
      description,
      completed,
      position
    });
    
    res.json(customItem);
  } catch (error: any) {
    if (error.message === 'CustomItem not found') {
      return res.status(404).json({ error: 'Custom item not found' });
    }
    console.error('[Checklist] Error updating custom item:', error);
    res.status(500).json({ error: 'Failed to update custom item' });
  }
});

// Delete custom item
router.delete('/custom-items/:id', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await checklistRepository.deleteCustomItem(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Custom item not found' });
    }
    
    res.json({ message: 'Custom item deleted successfully' });
  } catch (error) {
    console.error('[Checklist] Error deleting custom item:', error);
    res.status(500).json({ error: 'Failed to delete custom item' });
  }
});

// ==========================================
// CHECKLIST TEMPLATES
// ==========================================

// Get all templates
router.get('/templates', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const templates = await checklistRepository.getActiveTemplates();
    res.json(templates);
  } catch (error) {
    console.error('[Checklist] Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create template
router.post('/templates', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, position } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const template = await checklistRepository.createTemplate({
      title,
      description,
      position
    });
    
    res.json(template);
  } catch (error) {
    console.error('[Checklist] Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, position, is_active } = req.body;
    
    const template = await checklistRepository.updateTemplate(parseInt(id), {
      title,
      description,
      position,
      is_active
    });
    
    res.json(template);
  } catch (error: any) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    console.error('[Checklist] Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete('/templates/:id', authorize('admin', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await checklistRepository.softDeleteTemplate(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[Checklist] Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Apply templates to a specific checklist
router.post('/:checklistId/apply-templates', authorize('admin', 'coordinator', 'developer'), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId } = req.params;
    const count = await checklistRepository.applyTemplatesToChecklist(parseInt(checklistId));
    
    res.json({ message: 'Templates applied successfully', count });
  } catch (error) {
    console.error('[Checklist] Error applying templates:', error);
    res.status(500).json({ error: 'Failed to apply templates' });
  }
});

export default router;

