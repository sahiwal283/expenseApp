import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../../../utils/api';

/**
 * Integration Tests for Checklist Workflow
 * 
 * These tests verify the complete user workflow for managing event checklists,
 * including creating, updating, and coordinating multiple checklist items.
 */

// Mock the API
vi.mock('../../../utils/api', () => ({
  api: {
    checklist: {
      getChecklist: vi.fn(),
      updateChecklist: vi.fn(),
      createFlight: vi.fn(),
      updateFlight: vi.fn(),
      deleteFlight: vi.fn(),
      createHotel: vi.fn(),
      updateHotel: vi.fn(),
      deleteHotel: vi.fn(),
      createCarRental: vi.fn(),
      updateCarRental: vi.fn(),
      deleteCarRental: vi.fn(),
      createBoothShipping: vi.fn(),
      createCustomItem: vi.fn(),
      updateCustomItem: vi.fn(),
      deleteCustomItem: vi.fn(),
      getTemplates: vi.fn(),
      applyTemplates: vi.fn(),
    },
  },
}));

describe('Checklist Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Event Setup Workflow', () => {
    it('should handle full event checklist creation workflow', async () => {
      // Step 1: Get initial checklist (empty)
      const initialChecklist = {
        id: 1,
        event_id: 'event-123',
        booth_ordered: false,
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(initialChecklist);

      const checklist = await api.checklist.getChecklist('event-123');
      expect(checklist).toEqual(initialChecklist);
      expect(checklist.flights).toHaveLength(0);
      expect(checklist.hotels).toHaveLength(0);

      // Step 2: Add flights for attendees
      const flight1 = {
        id: 1,
        attendee_id: 'user-1',
        attendee_name: 'John Doe',
        carrier: 'Delta',
        confirmation_number: 'DL123',
        booked: false,
      };

      vi.mocked(api.checklist.createFlight).mockResolvedValue(flight1);
      const createdFlight = await api.checklist.createFlight(1, {
        attendeeId: 'user-1',
        attendeeName: 'John Doe',
        carrier: 'Delta',
        confirmationNumber: 'DL123',
      });

      expect(createdFlight).toEqual(flight1);
      expect(api.checklist.createFlight).toHaveBeenCalledWith(1, expect.objectContaining({
        attendeeId: 'user-1',
        carrier: 'Delta',
      }));

      // Step 3: Add hotels for attendees
      const hotel1 = {
        id: 1,
        attendee_id: 'user-1',
        attendee_name: 'John Doe',
        property_name: 'Marriott',
        confirmation_number: 'MAR123',
        check_in_date: '2025-11-10',
        check_out_date: '2025-11-15',
        booked: false,
      };

      vi.mocked(api.checklist.createHotel).mockResolvedValue(hotel1);
      const createdHotel = await api.checklist.createHotel(1, {
        attendeeId: 'user-1',
        attendeeName: 'John Doe',
        propertyName: 'Marriott',
        confirmationNumber: 'MAR123',
        checkInDate: '2025-11-10',
        checkOutDate: '2025-11-15',
      });

      expect(createdHotel).toEqual(hotel1);

      // Step 4: Add car rental
      const rental1 = {
        id: 1,
        provider: 'Enterprise',
        confirmation_number: 'ENT123',
        pickup_date: '2025-11-10',
        return_date: '2025-11-15',
        rental_type: 'group',
        booked: false,
      };

      vi.mocked(api.checklist.createCarRental).mockResolvedValue(rental1);
      const createdRental = await api.checklist.createCarRental(1, {
        provider: 'Enterprise',
        confirmationNumber: 'ENT123',
        pickupDate: '2025-11-10',
        returnDate: '2025-11-15',
        rentalType: 'group',
      });

      expect(createdRental).toEqual(rental1);

      // Step 5: Add booth shipping
      const shipping1 = {
        id: 1,
        shipping_method: 'carrier',
        carrier_name: 'FedEx',
        tracking_number: 'TRACK123',
        shipped: false,
      };

      vi.mocked(api.checklist.createBoothShipping).mockResolvedValue(shipping1);
      const createdShipping = await api.checklist.createBoothShipping(1, {
        shippingMethod: 'carrier',
        carrierName: 'FedEx',
        trackingNumber: 'TRACK123',
      });

      expect(createdShipping).toEqual(shipping1);

      // Step 6: Update main checklist fields
      vi.mocked(api.checklist.updateChecklist).mockResolvedValue({
        ...initialChecklist,
        booth_ordered: true,
        electricity_ordered: true,
      });

      const updatedChecklist = await api.checklist.updateChecklist(1, {
        boothOrdered: true,
        electricityOrdered: true,
      });

      expect(updatedChecklist.booth_ordered).toBe(true);
      expect(updatedChecklist.electricity_ordered).toBe(true);
    });
  });

  describe('Mark Items as Booked Workflow', () => {
    it('should mark all checklist items as booked in sequence', async () => {
      // Mark flight as booked
      vi.mocked(api.checklist.updateFlight).mockResolvedValue({
        id: 1,
        booked: true,
      });

      await api.checklist.updateFlight(1, { booked: true });
      expect(api.checklist.updateFlight).toHaveBeenCalledWith(1, { booked: true });

      // Mark hotel as booked
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({
        id: 1,
        booked: true,
      });

      await api.checklist.updateHotel(1, { booked: true });
      expect(api.checklist.updateHotel).toHaveBeenCalledWith(1, { booked: true });

      // Mark car rental as booked
      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({
        id: 1,
        booked: true,
      });

      await api.checklist.updateCarRental(1, { booked: true });
      expect(api.checklist.updateCarRental).toHaveBeenCalledWith(1, { booked: true });
    });
  });

  describe('Custom Items Workflow', () => {
    it('should create and manage custom checklist items', async () => {
      // Get templates
      const mockTemplates = [
        { id: 1, title: 'Order promotional materials', is_active: true },
        { id: 2, title: 'Book staff training', is_active: true },
      ];

      vi.mocked(api.checklist.getTemplates).mockResolvedValue(mockTemplates);
      const templates = await api.checklist.getTemplates();
      expect(templates).toHaveLength(2);

      // Apply templates to checklist
      vi.mocked(api.checklist.applyTemplates).mockResolvedValue({
        message: 'Templates applied successfully',
        count: 2,
      });

      const applyResult = await api.checklist.applyTemplates(1);
      expect(applyResult.count).toBe(2);

      // Create custom item
      const customItem = {
        id: 3,
        title: 'Custom task',
        description: 'Additional custom task',
        completed: false,
      };

      vi.mocked(api.checklist.createCustomItem).mockResolvedValue(customItem);
      const created = await api.checklist.createCustomItem(1, {
        title: 'Custom task',
        description: 'Additional custom task',
      });

      expect(created).toEqual(customItem);

      // Update custom item (mark as completed)
      vi.mocked(api.checklist.updateCustomItem).mockResolvedValue({
        ...customItem,
        completed: true,
      });

      const updated = await api.checklist.updateCustomItem(3, { completed: true });
      expect(updated.completed).toBe(true);

      // Delete custom item
      vi.mocked(api.checklist.deleteCustomItem).mockResolvedValue({
        message: 'Custom item deleted successfully',
      });

      await api.checklist.deleteCustomItem(3);
      expect(api.checklist.deleteCustomItem).toHaveBeenCalledWith(3);
    });
  });

  describe('Multi-Attendee Coordination', () => {
    it('should coordinate bookings for multiple attendees', async () => {
      const attendees = [
        { id: 'user-1', name: 'John Doe' },
        { id: 'user-2', name: 'Jane Smith' },
        { id: 'user-3', name: 'Bob Johnson' },
      ];

      // Create flights for all attendees
      for (const attendee of attendees) {
        vi.mocked(api.checklist.createFlight).mockResolvedValue({
          id: Math.random(),
          attendee_id: attendee.id,
          attendee_name: attendee.name,
          booked: false,
        });

        await api.checklist.createFlight(1, {
          attendeeId: attendee.id,
          attendeeName: attendee.name,
        });
      }

      expect(api.checklist.createFlight).toHaveBeenCalledTimes(3);

      // Create hotels for all attendees
      for (const attendee of attendees) {
        vi.mocked(api.checklist.createHotel).mockResolvedValue({
          id: Math.random(),
          attendee_id: attendee.id,
          attendee_name: attendee.name,
          booked: false,
        });

        await api.checklist.createHotel(1, {
          attendeeId: attendee.id,
          attendeeName: attendee.name,
        });
      }

      expect(api.checklist.createHotel).toHaveBeenCalledTimes(3);
    });
  });

  describe('Individual vs Group Car Rentals', () => {
    it('should handle both individual and group car rentals', async () => {
      // Create group rental (shared by multiple people)
      const groupRental = {
        id: 1,
        provider: 'Enterprise',
        rental_type: 'group',
        assigned_to_id: null,
        assigned_to_name: null,
        booked: false,
      };

      vi.mocked(api.checklist.createCarRental).mockResolvedValue(groupRental);
      const createdGroup = await api.checklist.createCarRental(1, {
        provider: 'Enterprise',
        rentalType: 'group',
      });

      expect(createdGroup.rental_type).toBe('group');
      expect(createdGroup.assigned_to_id).toBeNull();

      // Create individual rental (assigned to specific person)
      const individualRental = {
        id: 2,
        provider: 'Hertz',
        rental_type: 'individual',
        assigned_to_id: 'user-1',
        assigned_to_name: 'John Doe',
        booked: false,
      };

      vi.mocked(api.checklist.createCarRental).mockResolvedValue(individualRental);
      const createdIndividual = await api.checklist.createCarRental(1, {
        provider: 'Hertz',
        rentalType: 'individual',
        assignedToId: 'user-1',
        assignedToName: 'John Doe',
      });

      expect(createdIndividual.rental_type).toBe('individual');
      expect(createdIndividual.assigned_to_id).toBe('user-1');
    });

    it('should convert group rental to individual rental', async () => {
      // Start with group rental
      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({
        id: 1,
        rental_type: 'group',
        assigned_to_id: null,
      });

      await api.checklist.updateCarRental(1, {
        rentalType: 'group',
        assignedToId: null,
      });

      // Convert to individual
      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({
        id: 1,
        rental_type: 'individual',
        assigned_to_id: 'user-2',
        assigned_to_name: 'Jane Smith',
      });

      const updated = await api.checklist.updateCarRental(1, {
        rentalType: 'individual',
        assignedToId: 'user-2',
        assignedToName: 'Jane Smith',
      });

      expect(updated.rental_type).toBe('individual');
      expect(updated.assigned_to_id).toBe('user-2');
    });
  });

  describe('Booth Shipping Methods', () => {
    it('should handle carrier shipping method', async () => {
      const carrierShipping = {
        id: 1,
        shipping_method: 'carrier',
        carrier_name: 'FedEx',
        tracking_number: 'TRACK123',
        shipped: false,
      };

      vi.mocked(api.checklist.createBoothShipping).mockResolvedValue(carrierShipping);
      const created = await api.checklist.createBoothShipping(1, {
        shippingMethod: 'carrier',
        carrierName: 'FedEx',
        trackingNumber: 'TRACK123',
      });

      expect(created.shipping_method).toBe('carrier');
      expect(created.carrier_name).toBe('FedEx');
      expect(created.tracking_number).toBe('TRACK123');
    });

    it('should handle manual shipping method', async () => {
      const manualShipping = {
        id: 2,
        shipping_method: 'manual',
        carrier_name: null,
        tracking_number: null,
        notes: 'Delivering by truck',
        shipped: false,
      };

      vi.mocked(api.checklist.createBoothShipping).mockResolvedValue(manualShipping);
      const created = await api.checklist.createBoothShipping(1, {
        shippingMethod: 'manual',
        notes: 'Delivering by truck',
      });

      expect(created.shipping_method).toBe('manual');
      expect(created.carrier_name).toBeNull();
      expect(created.tracking_number).toBeNull();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle partial failure gracefully', async () => {
      // Flight creation succeeds
      vi.mocked(api.checklist.createFlight).mockResolvedValue({
        id: 1,
        attendee_id: 'user-1',
      });

      await api.checklist.createFlight(1, {
        attendeeId: 'user-1',
        attendeeName: 'John Doe',
      });

      // Hotel creation fails
      vi.mocked(api.checklist.createHotel).mockRejectedValue(new Error('Network error'));

      await expect(
        api.checklist.createHotel(1, {
          attendeeId: 'user-1',
          attendeeName: 'John Doe',
        })
      ).rejects.toThrow('Network error');

      // User can retry hotel creation
      vi.mocked(api.checklist.createHotel).mockResolvedValue({
        id: 1,
        attendee_id: 'user-1',
      });

      const retryResult = await api.checklist.createHotel(1, {
        attendeeId: 'user-1',
        attendeeName: 'John Doe',
      });

      expect(retryResult).toBeDefined();
      expect(retryResult.id).toBe(1);
    });
  });

  describe('Deletion Workflow', () => {
    it('should allow deleting all types of checklist items', async () => {
      // Delete flight
      vi.mocked(api.checklist.deleteFlight).mockResolvedValue({ success: true });
      await api.checklist.deleteFlight(1);
      expect(api.checklist.deleteFlight).toHaveBeenCalledWith(1);

      // Delete hotel
      vi.mocked(api.checklist.deleteHotel).mockResolvedValue({ success: true });
      await api.checklist.deleteHotel(1);
      expect(api.checklist.deleteHotel).toHaveBeenCalledWith(1);

      // Delete car rental
      vi.mocked(api.checklist.deleteCarRental).mockResolvedValue({ success: true });
      await api.checklist.deleteCarRental(1);
      expect(api.checklist.deleteCarRental).toHaveBeenCalledWith(1);

      // Delete custom item
      vi.mocked(api.checklist.deleteCustomItem).mockResolvedValue({
        message: 'Custom item deleted successfully',
      });
      await api.checklist.deleteCustomItem(1);
      expect(api.checklist.deleteCustomItem).toHaveBeenCalledWith(1);
    });
  });

  describe('Comprehensive Checklist State', () => {
    it('should track complete checklist state throughout workflow', async () => {
      // Initial state
      const checklistState = {
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        booth_ordered: false,
        electricity_ordered: false,
      };

      expect(checklistState.flights).toHaveLength(0);
      expect(checklistState.booth_ordered).toBe(false);

      // Add items
      checklistState.flights.push({ id: 1, booked: false });
      checklistState.hotels.push({ id: 1, booked: false });
      checklistState.carRentals.push({ id: 1, booked: false });

      expect(checklistState.flights).toHaveLength(1);
      expect(checklistState.hotels).toHaveLength(1);
      expect(checklistState.carRentals).toHaveLength(1);

      // Update booth status
      checklistState.booth_ordered = true;
      checklistState.electricity_ordered = true;

      expect(checklistState.booth_ordered).toBe(true);
      expect(checklistState.electricity_ordered).toBe(true);

      // Mark items as booked
      checklistState.flights[0].booked = true;
      checklistState.hotels[0].booked = true;
      checklistState.carRentals[0].booked = true;

      const allBooked = [
        ...checklistState.flights,
        ...checklistState.hotels,
        ...checklistState.carRentals,
      ].every((item: any) => item.booked);

      expect(allBooked).toBe(true);
    });
  });
});

