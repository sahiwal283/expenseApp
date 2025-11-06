import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, apiClient } from '../api';

// Mock apiClient methods
vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBaseURL: vi.fn(() => 'http://localhost:5000'),
  },
  TokenManager: {
    getToken: vi.fn(() => 'mock-token'),
    setToken: vi.fn(),
    removeToken: vi.fn(),
  },
}));

describe('API Checklist Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getChecklist', () => {
    it('should fetch checklist for an event', async () => {
      const mockChecklist = {
        id: 1,
        event_id: 'event-123',
        booth_ordered: false,
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockChecklist);

      const result = await api.checklist.getChecklist('event-123');

      expect(apiClient.get).toHaveBeenCalledWith('/checklist/event-123');
      expect(result).toEqual(mockChecklist);
    });

    it('should handle errors when fetching checklist', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(api.checklist.getChecklist('event-123')).rejects.toThrow('Network error');
    });
  });

  describe('updateChecklist', () => {
    it('should update checklist main fields', async () => {
      const payload = {
        boothOrdered: true,
        boothNotes: 'Booth 123',
        electricityOrdered: true,
        electricityNotes: '220V required',
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateChecklist(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/1', payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Flight Operations', () => {
    it('should create a new flight', async () => {
      const payload = {
        attendeeId: 'user-123',
        attendeeName: 'John Doe',
        carrier: 'Delta',
        confirmationNumber: 'ABC123',
        notes: 'Window seat',
        booked: false,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createFlight(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/flights', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should update a flight', async () => {
      const payload = {
        carrier: 'United',
        confirmationNumber: 'XYZ789',
        booked: true,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateFlight(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/flights/1', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should delete a flight', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const result = await api.checklist.deleteFlight(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/checklist/flights/1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Hotel Operations', () => {
    it('should create a new hotel reservation', async () => {
      const payload = {
        attendeeId: 'user-123',
        attendeeName: 'Jane Smith',
        propertyName: 'Marriott Downtown',
        confirmationNumber: 'HOTEL123',
        checkInDate: '2025-11-10',
        checkOutDate: '2025-11-15',
        notes: 'King bed',
        booked: false,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createHotel(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/hotels', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should update a hotel reservation', async () => {
      const payload = {
        propertyName: 'Hilton Garden Inn',
        confirmationNumber: 'HOTEL456',
        booked: true,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateHotel(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/hotels/1', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should delete a hotel reservation', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const result = await api.checklist.deleteHotel(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/checklist/hotels/1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Car Rental Operations', () => {
    it('should create a new car rental', async () => {
      const payload = {
        provider: 'Enterprise',
        confirmationNumber: 'RENT123',
        pickupDate: '2025-11-10',
        returnDate: '2025-11-15',
        notes: 'SUV preferred',
        booked: false,
        rentalType: 'group',
        assignedToId: null,
        assignedToName: null,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createCarRental(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/car-rentals', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should create an individual car rental with assigned user', async () => {
      const payload = {
        provider: 'Hertz',
        confirmationNumber: 'RENT456',
        pickupDate: '2025-11-10',
        returnDate: '2025-11-15',
        notes: 'Compact car',
        booked: false,
        rentalType: 'individual',
        assignedToId: 'user-123',
        assignedToName: 'John Doe',
      };

      const mockResponse = { id: 2, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createCarRental(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/car-rentals', payload);
      expect(result).toEqual(mockResponse);
      expect(result.rentalType).toBe('individual');
      expect(result.assignedToId).toBe('user-123');
    });

    it('should update a car rental', async () => {
      const payload = {
        provider: 'Budget',
        confirmationNumber: 'RENT789',
        booked: true,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateCarRental(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/car-rentals/1', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should delete a car rental', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const result = await api.checklist.deleteCarRental(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/checklist/car-rentals/1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Booth Shipping Operations', () => {
    it('should create booth shipping information', async () => {
      const payload = {
        shippingMethod: 'carrier',
        carrierName: 'FedEx',
        trackingNumber: 'TRACK123',
        shippingDate: '2025-11-05',
        deliveryDate: '2025-11-09',
        notes: 'Fragile items',
        shipped: false,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createBoothShipping(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/booth-shipping', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should handle manual shipping method', async () => {
      const payload = {
        shippingMethod: 'manual',
        carrierName: null,
        trackingNumber: null,
        shippingDate: '2025-11-05',
        deliveryDate: null,
        notes: 'Self-delivery by truck',
        shipped: false,
      };

      const mockResponse = { id: 2, ...payload };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createBoothShipping(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/booth-shipping', payload);
      expect(result.shippingMethod).toBe('manual');
    });
  });

  describe('Custom Items Operations', () => {
    it('should get custom items for a checklist', async () => {
      const mockItems = [
        { id: 1, title: 'Order promotional materials', completed: false },
        { id: 2, title: 'Book staff training', completed: true },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockItems);

      const result = await api.checklist.getCustomItems(1);

      expect(apiClient.get).toHaveBeenCalledWith('/checklist/1/custom-items');
      expect(result).toEqual(mockItems);
    });

    it('should create a custom item', async () => {
      const payload = {
        title: 'Order banners',
        description: 'Large format banners for booth',
        position: 0,
      };

      const mockResponse = { id: 1, ...payload, completed: false };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createCustomItem(1, payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/custom-items', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should update a custom item', async () => {
      const payload = {
        title: 'Updated title',
        completed: true,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateCustomItem(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/custom-items/1', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should delete a custom item', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ message: 'Custom item deleted successfully' });

      const result = await api.checklist.deleteCustomItem(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/checklist/custom-items/1');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Template Operations', () => {
    it('should get all templates', async () => {
      const mockTemplates = [
        { id: 1, title: 'Standard setup', is_active: true },
        { id: 2, title: 'Premium booth', is_active: true },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockTemplates);

      const result = await api.checklist.getTemplates();

      expect(apiClient.get).toHaveBeenCalledWith('/checklist/templates');
      expect(result).toEqual(mockTemplates);
    });

    it('should create a template', async () => {
      const payload = {
        title: 'New template',
        description: 'Template for large events',
        position: 0,
      };

      const mockResponse = { id: 1, ...payload, is_active: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.createTemplate(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/templates', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should update a template', async () => {
      const payload = {
        title: 'Updated template',
        is_active: false,
      };

      const mockResponse = { id: 1, ...payload };
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await api.checklist.updateTemplate(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/checklist/templates/1', payload);
      expect(result).toEqual(mockResponse);
    });

    it('should delete a template', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ message: 'Template deleted successfully' });

      const result = await api.checklist.deleteTemplate(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/checklist/templates/1');
      expect(result).toHaveProperty('message');
    });

    it('should apply templates to a checklist', async () => {
      const mockResponse = { message: 'Templates applied successfully', count: 5 };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await api.checklist.applyTemplates(1);

      expect(apiClient.post).toHaveBeenCalledWith('/checklist/1/apply-templates', {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(api.checklist.getChecklist('event-123')).rejects.toThrow('Network error');
    });

    it('should handle 404 errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Checklist not found'));

      await expect(api.checklist.getChecklist('nonexistent')).rejects.toThrow('Checklist not found');
    });

    it('should handle server errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Internal server error'));

      await expect(
        api.checklist.createFlight(1, { attendeeId: 'user-123', attendeeName: 'Test' })
      ).rejects.toThrow('Internal server error');
    });
  });
});

