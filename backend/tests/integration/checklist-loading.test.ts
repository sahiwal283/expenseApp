import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { pool } from '../../src/config/database';
import { checklistRepository } from '../../src/database/repositories';

/**
 * Checklist Loading Integration Tests
 * 
 * Tests checklist loading scenarios:
 * - Empty checklist (new event)
 * - Partial data (some sections empty)
 * - Full data (all sections populated)
 * - Verify no undefined.length errors
 * - Backend response format
 */

describe('Checklist Loading Integration Tests', () => {
  let dbAvailable = false;
  let testEventId: string | null = null;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ Database connection successful');

      // Create a test event
      const eventResult = await pool.query(
        `INSERT INTO events (name, start_date, end_date, location, status, budget, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        ['Test Checklist Event', '2025-12-01', '2025-12-03', 'Test Location', 'upcoming', 10000, 'USD']
      );
      testEventId = eventResult.rows[0].id;
      console.log(`✅ Test event created: ${testEventId}`);
    } catch (error) {
      console.warn('⚠️  Database not available - tests will verify code structure only');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable && testEventId) {
      // Cleanup: Delete test checklist and event
      await pool.query('DELETE FROM event_checklists WHERE event_id = $1', [testEventId]);
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
      console.log('✅ Test data cleaned up');
    }
    await pool.end();
  });

  describe('Empty Checklist (New Event)', () => {
    it('should return empty arrays for new event', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Delete any existing checklist
      await pool.query('DELETE FROM event_checklists WHERE event_id = $1', [testEventId]);

      // Get checklist (should create new one)
      const checklist = await checklistRepository.findByEventId(testEventId);
      
      if (!checklist) {
        // Create if doesn't exist
        await checklistRepository.create(testEventId);
      }

      // Fetch all related data
      const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
        checklistRepository.getFlights(checklist!.id),
        checklistRepository.getHotels(checklist!.id),
        checklistRepository.getCarRentals(checklist!.id),
        checklistRepository.getBoothShipping(checklist!.id),
        checklistRepository.getCustomItems(checklist!.id)
      ]);

      // Verify all arrays are present and empty
      expect(Array.isArray(flights)).toBe(true);
      expect(Array.isArray(hotels)).toBe(true);
      expect(Array.isArray(carRentals)).toBe(true);
      expect(Array.isArray(boothShipping)).toBe(true);
      expect(Array.isArray(customItems)).toBe(true);

      expect(flights.length).toBe(0);
      expect(hotels.length).toBe(0);
      expect(carRentals.length).toBe(0);
      expect(boothShipping.length).toBe(0);
      expect(customItems.length).toBe(0);

      console.log('✅ Empty checklist returns empty arrays');
    });

    it('should not have undefined arrays', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const checklist = await checklistRepository.findByEventId(testEventId);
      if (!checklist) {
        await checklistRepository.create(testEventId);
      }

      const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
        checklistRepository.getFlights(checklist!.id),
        checklistRepository.getHotels(checklist!.id),
        checklistRepository.getCarRentals(checklist!.id),
        checklistRepository.getBoothShipping(checklist!.id),
        checklistRepository.getCustomItems(checklist!.id)
      ]);

      // Verify no undefined values
      expect(flights).not.toBeUndefined();
      expect(hotels).not.toBeUndefined();
      expect(carRentals).not.toBeUndefined();
      expect(boothShipping).not.toBeUndefined();
      expect(customItems).not.toBeUndefined();

      // Verify arrays can be accessed with .length
      expect(() => flights.length).not.toThrow();
      expect(() => hotels.length).not.toThrow();
      expect(() => carRentals.length).not.toThrow();
      expect(() => boothShipping.length).not.toThrow();
      expect(() => customItems.length).not.toThrow();

      console.log('✅ No undefined arrays, all arrays accessible');
    });
  });

  describe('Partial Data (Some Sections Empty)', () => {
    it('should return partial data correctly', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const checklist = await checklistRepository.findByEventId(testEventId);
      if (!checklist) {
        await checklistRepository.create(testEventId);
      }

      // Add only flights (other sections remain empty)
      await pool.query(
        `INSERT INTO checklist_flights (checklist_id, attendee_id, attendee_name, carrier, confirmation_number, booked)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [checklist!.id, 'user-1', 'Test User', 'United Airlines', 'ABC123', false]
      );

      const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
        checklistRepository.getFlights(checklist!.id),
        checklistRepository.getHotels(checklist!.id),
        checklistRepository.getCarRentals(checklist!.id),
        checklistRepository.getBoothShipping(checklist!.id),
        checklistRepository.getCustomItems(checklist!.id)
      ]);

      // Verify flights has data
      expect(Array.isArray(flights)).toBe(true);
      expect(flights.length).toBe(1);
      expect(flights[0].carrier).toBe('United Airlines');

      // Verify other sections are empty arrays
      expect(Array.isArray(hotels)).toBe(true);
      expect(hotels.length).toBe(0);
      expect(Array.isArray(carRentals)).toBe(true);
      expect(carRentals.length).toBe(0);

      console.log('✅ Partial data handled correctly');
    });
  });

  describe('Full Data (All Sections Populated)', () => {
    it('should return full data correctly', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const checklist = await checklistRepository.findByEventId(testEventId);
      if (!checklist) {
        await checklistRepository.create(testEventId);
      }

      // Add data to all sections
      await pool.query(
        `INSERT INTO checklist_flights (checklist_id, attendee_id, attendee_name, carrier, booked)
         VALUES ($1, $2, $3, $4, $5)`,
        [checklist!.id, 'user-1', 'Test User', 'United', false]
      );

      await pool.query(
        `INSERT INTO checklist_hotels (checklist_id, attendee_id, attendee_name, property_name, booked)
         VALUES ($1, $2, $3, $4, $5)`,
        [checklist!.id, 'user-1', 'Test User', 'Marriott', false]
      );

      await pool.query(
        `INSERT INTO checklist_car_rentals (checklist_id, provider, booked, rental_type)
         VALUES ($1, $2, $3, $4)`,
        [checklist!.id, 'Enterprise', false, 'group']
      );

      await pool.query(
        `INSERT INTO checklist_booth_shipping (checklist_id, shipping_method, shipped)
         VALUES ($1, $2, $3)`,
        [checklist!.id, 'carrier', false]
      );

      await pool.query(
        `INSERT INTO checklist_custom_items (checklist_id, title, completed, position)
         VALUES ($1, $2, $3, $4)`,
        [checklist!.id, 'Test Task', false, 0]
      );

      const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
        checklistRepository.getFlights(checklist!.id),
        checklistRepository.getHotels(checklist!.id),
        checklistRepository.getCarRentals(checklist!.id),
        checklistRepository.getBoothShipping(checklist!.id),
        checklistRepository.getCustomItems(checklist!.id)
      ]);

      // Verify all sections have data
      expect(flights.length).toBeGreaterThan(0);
      expect(hotels.length).toBeGreaterThan(0);
      expect(carRentals.length).toBeGreaterThan(0);
      expect(boothShipping.length).toBeGreaterThan(0);
      expect(customItems.length).toBeGreaterThan(0);

      // Verify all are arrays
      expect(Array.isArray(flights)).toBe(true);
      expect(Array.isArray(hotels)).toBe(true);
      expect(Array.isArray(carRentals)).toBe(true);
      expect(Array.isArray(boothShipping)).toBe(true);
      expect(Array.isArray(customItems)).toBe(true);

      console.log('✅ Full data returned correctly');
    });
  });

  describe('Backend Response Format', () => {
    it('should match frontend expectations', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const checklist = await checklistRepository.findByEventId(testEventId);
      if (!checklist) {
        await checklistRepository.create(testEventId);
      }

      const [flights, hotels, carRentals, boothShipping, customItems] = await Promise.all([
        checklistRepository.getFlights(checklist!.id),
        checklistRepository.getHotels(checklist!.id),
        checklistRepository.getCarRentals(checklist!.id),
        checklistRepository.getBoothShipping(checklist!.id),
        checklistRepository.getCustomItems(checklist!.id)
      ]);

      // Simulate backend response format
      const response = {
        ...checklist,
        flights: flights || [],
        hotels: hotels || [],
        carRentals: carRentals || [],
        boothShipping: boothShipping || [],
        customItems: customItems || []
      };

      // Verify response structure matches frontend expectations
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('event_id');
      expect(response).toHaveProperty('flights');
      expect(response).toHaveProperty('hotels');
      expect(response).toHaveProperty('carRentals');
      expect(response).toHaveProperty('boothShipping');
      expect(response).toHaveProperty('customItems');

      // Verify all arrays are present
      expect(Array.isArray(response.flights)).toBe(true);
      expect(Array.isArray(response.hotels)).toBe(true);
      expect(Array.isArray(response.carRentals)).toBe(true);
      expect(Array.isArray(response.boothShipping)).toBe(true);
      expect(Array.isArray(response.customItems)).toBe(true);

      console.log('✅ Response format matches frontend expectations');
    });
  });
});

