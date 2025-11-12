import { describe, it, expect } from 'vitest';
import {
  createMockUser,
  createMockEvent,
  createEmptyChecklist,
  createMockChecklist,
  createMockFlight,
  createMockHotel,
  createMockCarRental,
} from '../testHelpers';
import { User, TradeShow } from '../../../App';
import { ChecklistData } from '../../../components/checklist/TradeShowChecklist';

/**
 * Frontend Shared Test Utilities Tests
 * 
 * Verifies shared test utilities work correctly
 */

describe('Frontend Shared Test Utilities', () => {
  describe('createMockUser', () => {
    it('should create mock user with default values', () => {
      const user = createMockUser();

      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('admin');
      expect(user.username).toBe('testuser');
    });

    it('should allow overriding user properties', () => {
      const user = createMockUser({ role: 'coordinator', name: 'Custom User' });

      expect(user.role).toBe('coordinator');
      expect(user.name).toBe('Custom User');
      expect(user.id).toBe('user-1'); // Default preserved
    });
  });

  describe('createMockEvent', () => {
    it('should create mock event with default values', () => {
      const event = createMockEvent();

      expect(event.id).toBe('event-1');
      expect(event.name).toBe('Test Event');
      expect(event.venue).toBe('Test Venue');
      expect(event.status).toBe('upcoming');
      expect(event.participants.length).toBe(1);
    });

    it('should allow overriding event properties', () => {
      const event = createMockEvent({ name: 'Custom Event', status: 'active' });

      expect(event.name).toBe('Custom Event');
      expect(event.status).toBe('active');
      expect(event.id).toBe('event-1'); // Default preserved
    });
  });

  describe('createEmptyChecklist', () => {
    it('should create empty checklist with all arrays empty', () => {
      const checklist = createEmptyChecklist();

      expect(checklist.id).toBe(1);
      expect(checklist.event_id).toBe(1);
      expect(checklist.flights).toEqual([]);
      expect(checklist.hotels).toEqual([]);
      expect(checklist.carRentals).toEqual([]);
      expect(checklist.boothShipping).toEqual([]);
      expect(checklist.customItems).toEqual([]);
    });

    it('should allow overriding checklist properties', () => {
      const checklist = createEmptyChecklist({ booth_ordered: true, id: 5 });

      expect(checklist.booth_ordered).toBe(true);
      expect(checklist.id).toBe(5);
      expect(checklist.flights).toEqual([]); // Default preserved
    });
  });

  describe('createMockChecklist', () => {
    it('should create checklist with sample data', () => {
      const checklist = createMockChecklist();

      expect(checklist.flights.length).toBeGreaterThan(0);
      expect(checklist.hotels.length).toBeGreaterThan(0);
      expect(checklist.carRentals.length).toBeGreaterThan(0);
    });

    it('should allow overriding checklist properties', () => {
      const checklist = createMockChecklist({ flights: [] });

      expect(checklist.flights).toEqual([]);
      expect(checklist.hotels.length).toBeGreaterThan(0); // Default preserved
    });
  });

  describe('createMockFlight', () => {
    it('should create mock flight with default values', () => {
      const flight = createMockFlight();

      expect(flight.attendee_name).toBe('Test User');
      expect(flight.carrier).toBe('United Airlines');
      expect(flight.booked).toBe(false);
    });

    it('should allow overriding flight properties', () => {
      const flight = createMockFlight({ booked: true, carrier: 'Delta' });

      expect(flight.booked).toBe(true);
      expect(flight.carrier).toBe('Delta');
    });
  });

  describe('createMockHotel', () => {
    it('should create mock hotel with default values', () => {
      const hotel = createMockHotel();

      expect(hotel.attendee_name).toBe('Test User');
      expect(hotel.property_name).toBe('Marriott Downtown');
      expect(hotel.booked).toBe(false);
    });

    it('should allow overriding hotel properties', () => {
      const hotel = createMockHotel({ booked: true, property_name: 'Hilton' });

      expect(hotel.booked).toBe(true);
      expect(hotel.property_name).toBe('Hilton');
    });
  });

  describe('createMockCarRental', () => {
    it('should create mock car rental with default values', () => {
      const rental = createMockCarRental();

      expect(rental.provider).toBe('Enterprise');
      expect(rental.rental_type).toBe('group');
      expect(rental.booked).toBe(false);
    });

    it('should allow overriding car rental properties', () => {
      const rental = createMockCarRental({ booked: true, rental_type: 'individual' });

      expect(rental.booked).toBe(true);
      expect(rental.rental_type).toBe('individual');
    });
  });
});

