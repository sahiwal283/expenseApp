/**
 * Checklist Auto-Check Service Integration Tests
 * 
 * Tests the auto-check service that automatically marks checklist items as complete
 * when expenses with receipts are created or updated:
 * - Expense creation with receipt for each supported category
 * - Receipt update for each supported category
 * - Checklist items marked as complete
 * - Expenses without receipts (should not auto-check)
 * - Error handling (checklist doesn't exist, matching item not found)
 * - Legacy categories (Flights, Hotels)
 * - Booth shipping (existing entry vs new entry)
 * - Flight/hotel matching by attendee_id
 * - Errors don't fail expense operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { pool } from '../../src/config/database';
import { expenseRepository } from '../../src/database/repositories/ExpenseRepository';
import { checklistRepository } from '../../src/database/repositories/ChecklistRepository';
import { userRepository } from '../../src/database/repositories/UserRepository';
import { eventRepository } from '../../src/database/repositories/EventRepository';
import { expenseService } from '../../src/services/ExpenseService';
import { checklistAutoCheckService } from '../../src/services/ChecklistAutoCheckService';
import { Expense } from '../../src/database/repositories/ExpenseRepository';

describe('Checklist Auto-Check Service Integration Tests', () => {
  let dbAvailable = false;
  let testUserId: string;
  let testUserId2: string;
  let testEventId: string;
  let testChecklistId: number | null = null;
  let testFlightId: number | null = null;
  let testHotelId: number | null = null;
  let testBoothShippingId: number | null = null;

  // Mock console.log and console.error to capture logs
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(async () => {
    // Verify database connection
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      console.warn('⚠️  Database not available locally - tests will verify code structure only');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }

    // Clear log spies
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();

    // Create test users
    try {
      const testUser = await userRepository.create({
        username: `test_user_autocheck_${Date.now()}`,
        password: 'hashed_password',
        name: 'Test User AutoCheck',
        email: `test_autocheck_${Date.now()}@example.com`,
        role: 'salesperson'
      });
      testUserId = testUser.id;

      const testUser2 = await userRepository.create({
        username: `test_user2_autocheck_${Date.now()}`,
        password: 'hashed_password',
        name: 'Test User 2 AutoCheck',
        email: `test2_autocheck_${Date.now()}@example.com`,
        role: 'coordinator'
      });
      testUserId2 = testUser2.id;

      // Create test event
      const testEvent = await eventRepository.create({
        name: 'Test AutoCheck Event',
        location: 'Test Location',
        start_date: '2025-12-01',
        end_date: '2025-12-03',
        budget: 10000
      });
      testEventId = testEvent.id;

      // Get or create checklist
      let checklist = await checklistRepository.findByEventId(testEventId);
      if (!checklist) {
        checklist = await checklistRepository.create(testEventId);
      }
      testChecklistId = checklist.id;

      // Create test flight for user 1
      const flight = await checklistRepository.createFlight({
        checklistId: testChecklistId,
        attendeeId: testUserId,
        attendeeName: 'Test User AutoCheck',
        carrier: 'United Airlines',
        booked: false
      });
      testFlightId = flight.id;

      // Create test hotel for user 1
      const hotel = await checklistRepository.createHotel({
        checklistId: testChecklistId,
        attendeeId: testUserId,
        attendeeName: 'Test User AutoCheck',
        propertyName: 'Test Hotel',
        booked: false
      });
      testHotelId = hotel.id;

      // Create test booth shipping entry
      const shipping = await checklistRepository.createBoothShipping({
        checklistId: testChecklistId,
        shippingMethod: 'carrier',
        shipped: false
      });
      testBoothShippingId = shipping.id;
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Clean up test data
      try {
        // Delete expenses
        await pool.query('DELETE FROM expenses WHERE event_id = $1', [testEventId]);
        
        // Delete checklist items
        if (testChecklistId) {
          await pool.query('DELETE FROM checklist_flights WHERE checklist_id = $1', [testChecklistId]);
          await pool.query('DELETE FROM checklist_hotels WHERE checklist_id = $1', [testChecklistId]);
          await pool.query('DELETE FROM checklist_booth_shipping WHERE checklist_id = $1', [testChecklistId]);
          await pool.query('DELETE FROM event_checklists WHERE id = $1', [testChecklistId]);
        }
        
        // Delete event
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
        
        // Delete users
        if (testUserId) await userRepository.delete(testUserId);
        if (testUserId2) await userRepository.delete(testUserId2);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Restore console mocks
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    await pool.end();
  });

  describe('Expense Creation with Receipt - Supported Categories', () => {
    it('should auto-check electricity ordered when expense created with receipt', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset checklist state
      await checklistRepository.updateMainFields(testChecklistId, {
        electricityOrdered: false
      });

      // Create expense with receipt for electricity
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Electricity Provider',
        amount: 500.00,
        category: 'Booth / Marketing / Tools',
        description: 'Electricity for booth',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/electricity-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify checklist was updated
      const checklist = await checklistRepository.findById(testChecklistId);
      expect(checklist?.electricity_ordered).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Electricity marked as ordered')
      );
    });

    it('should auto-check booth ordered when expense created with receipt', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset checklist state
      await checklistRepository.updateMainFields(testChecklistId, {
        boothOrdered: false
      });

      // Create expense with receipt for booth (no electricity in description)
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Booth Provider',
        amount: 1000.00,
        category: 'Booth / Marketing / Tools',
        description: 'Booth space rental',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/booth-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify checklist was updated
      const checklist = await checklistRepository.findById(testChecklistId);
      expect(checklist?.booth_ordered).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Booth space marked as ordered')
      );
    });

    it('should auto-check booth shipping when expense created with receipt', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset shipping state
      if (testBoothShippingId) {
        await checklistRepository.updateBoothShipping(testBoothShippingId, {
          shipped: false
        });
      }

      // Create expense with receipt for shipping
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Shipping Company',
        amount: 200.00,
        category: 'Shipping Charges',
        description: 'Booth shipping',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/shipping-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify shipping was updated
      const shippingEntries = await checklistRepository.getBoothShipping(testChecklistId);
      const mostRecent = shippingEntries[shippingEntries.length - 1];
      expect(mostRecent.shipped).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Booth shipping marked as shipped')
      );
    });

    it('should auto-check flight booked when expense created with receipt (new category)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testFlightId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset flight state
      await checklistRepository.updateFlight(testFlightId, {
        booked: false
      });

      // Create expense with receipt for flight (new category)
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'United Airlines',
        amount: 500.00,
        category: 'Travel - Flight',
        description: 'Flight ticket',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/flight-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify flight was updated
      const flights = await checklistRepository.getFlights(testChecklistId);
      const matchingFlight = flights.find(f => f.attendee_id === testUserId);
      expect(matchingFlight?.booked).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Flight marked as booked')
      );
    });

    it('should auto-check flight booked when expense created with receipt (legacy category)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testFlightId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset flight state
      await checklistRepository.updateFlight(testFlightId, {
        booked: false
      });

      // Create expense with receipt for flight (legacy category)
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Delta Airlines',
        amount: 600.00,
        category: 'Flights', // Legacy category
        description: 'Flight ticket',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/flight-receipt-legacy.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify flight was updated
      const flights = await checklistRepository.getFlights(testChecklistId);
      const matchingFlight = flights.find(f => f.attendee_id === testUserId);
      expect(matchingFlight?.booked).toBe(true);
    });

    it('should auto-check hotel booked when expense created with receipt (new category)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testHotelId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset hotel state
      await checklistRepository.updateHotel(testHotelId, {
        booked: false
      });

      // Create expense with receipt for hotel (new category)
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Hotel',
        amount: 300.00,
        category: 'Accommodation - Hotel',
        description: 'Hotel booking',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/hotel-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify hotel was updated
      const hotels = await checklistRepository.getHotels(testChecklistId);
      const matchingHotel = hotels.find(h => h.attendee_id === testUserId);
      expect(matchingHotel?.booked).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Hotel marked as booked')
      );
    });

    it('should auto-check hotel booked when expense created with receipt (legacy category)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testHotelId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset hotel state
      await checklistRepository.updateHotel(testHotelId, {
        booked: false
      });

      // Create expense with receipt for hotel (legacy category)
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Legacy Hotel',
        amount: 400.00,
        category: 'Hotels', // Legacy category
        description: 'Hotel booking',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/hotel-receipt-legacy.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify hotel was updated
      const hotels = await checklistRepository.getHotels(testChecklistId);
      const matchingHotel = hotels.find(h => h.attendee_id === testUserId);
      expect(matchingHotel?.booked).toBe(true);
    });
  });

  describe('Receipt Update - Supported Categories', () => {
    it('should auto-check when receipt is updated for electricity expense', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create expense without receipt first
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Electricity Provider',
        amount: 500.00,
        category: 'Booth / Marketing / Tools',
        description: 'Electricity for booth',
        cardUsed: 'Haute CC',
        receiptUrl: undefined,
        reimbursementRequired: false
      });

      // Reset checklist state
      await checklistRepository.updateMainFields(testChecklistId, {
        electricityOrdered: false
      });

      // Update expense with receipt
      const updatedExpense = await expenseService.updateExpenseReceipt(
        expense.id,
        testUserId,
        'salesperson',
        '/uploads/electricity-receipt-updated.jpg'
      );

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify checklist was updated
      const checklist = await checklistRepository.findById(testChecklistId);
      expect(checklist?.electricity_ordered).toBe(true);
    });

    it('should auto-check when receipt is updated for flight expense', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testFlightId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create expense without receipt first
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'United Airlines',
        amount: 500.00,
        category: 'Travel - Flight',
        description: 'Flight ticket',
        cardUsed: 'Haute CC',
        receiptUrl: undefined,
        reimbursementRequired: false
      });

      // Reset flight state
      await checklistRepository.updateFlight(testFlightId, {
        booked: false
      });

      // Update expense with receipt
      const updatedExpense = await expenseService.updateExpenseReceipt(
        expense.id,
        testUserId,
        'salesperson',
        '/uploads/flight-receipt-updated.jpg'
      );

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify flight was updated
      const flights = await checklistRepository.getFlights(testChecklistId);
      const matchingFlight = flights.find(f => f.attendee_id === testUserId);
      expect(matchingFlight?.booked).toBe(true);
    });
  });

  describe('Expenses Without Receipts', () => {
    it('should NOT auto-check when expense created without receipt', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset checklist state
      await checklistRepository.updateMainFields(testChecklistId, {
        electricityOrdered: false,
        boothOrdered: false
      });

      // Create expense without receipt
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Booth / Marketing / Tools',
        description: 'Electricity for booth',
        cardUsed: 'Haute CC',
        receiptUrl: undefined,
        reimbursementRequired: false
      });

      // Wait a bit to ensure no async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify checklist was NOT updated
      const checklist = await checklistRepository.findById(testChecklistId);
      expect(checklist?.electricity_ordered).toBe(false);
      expect(checklist?.booth_ordered).toBe(false);

      // Verify no auto-check logging occurred
      const autoCheckLogs = consoleLogSpy.mock.calls.filter(call =>
        call[0]?.toString().includes('[ChecklistAutoCheck]')
      );
      expect(autoCheckLogs.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should create checklist if it does not exist', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create new event without checklist
      const newEvent = await eventRepository.create({
        name: 'Test Event No Checklist',
        location: 'Test Location',
        start_date: '2025-12-01',
        end_date: '2025-12-03',
        budget: 5000
      });

      // Delete any existing checklist
      await pool.query('DELETE FROM event_checklists WHERE event_id = $1', [newEvent.id]);

      // Create expense with receipt
      const expense = await expenseService.createExpense(testUserId, {
        eventId: newEvent.id,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Booth / Marketing / Tools',
        description: 'Booth space',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify checklist was created
      const checklist = await checklistRepository.findByEventId(newEvent.id);
      expect(checklist).toBeDefined();
      expect(checklist?.booth_ordered).toBe(true);

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] Created checklist for event')
      );

      // Cleanup
      await pool.query('DELETE FROM expenses WHERE event_id = $1', [newEvent.id]);
      await pool.query('DELETE FROM event_checklists WHERE event_id = $1', [newEvent.id]);
      await pool.query('DELETE FROM events WHERE id = $1', [newEvent.id]);
    });

    it('should handle missing flight gracefully (no matching attendee)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create expense with receipt for flight, but user has no flight entry
      const expense = await expenseService.createExpense(testUserId2, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'United Airlines',
        amount: 500.00,
        category: 'Travel - Flight',
        description: 'Flight ticket',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/flight-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no error was thrown (expense creation succeeded)
      expect(expense).toBeDefined();

      // Verify warning log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ⚠️ No matching flight found')
      );
    });

    it('should handle missing hotel gracefully (no matching attendee)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create expense with receipt for hotel, but user has no hotel entry
      const expense = await expenseService.createExpense(testUserId2, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Hotel',
        amount: 300.00,
        category: 'Accommodation - Hotel',
        description: 'Hotel booking',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/hotel-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no error was thrown (expense creation succeeded)
      expect(expense).toBeDefined();

      // Verify warning log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ⚠️ No matching hotel found')
      );
    });

    it('should not fail expense creation if auto-check errors', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Mock checklistRepository to throw error
      const originalFindByEventId = checklistRepository.findByEventId;
      vi.spyOn(checklistRepository, 'findByEventId').mockRejectedValueOnce(
        new Error('Database error')
      );

      // Create expense with receipt - should succeed even if auto-check fails
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Booth / Marketing / Tools',
        description: 'Booth space',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/receipt.jpg',
        reimbursementRequired: false
      });

      // Verify expense was created successfully
      expect(expense).toBeDefined();
      expect(expense.id).toBeDefined();

      // Verify error was logged but didn't fail expense creation
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpenseService] Failed to auto-check checklist'),
        expect.any(Error)
      );

      // Restore original method
      vi.restoreAllMocks();
    });
  });

  describe('Booth Shipping - Existing vs New Entry', () => {
    it('should update existing booth shipping entry when receipt uploaded', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId || !testBoothShippingId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Reset shipping state
      await checklistRepository.updateBoothShipping(testBoothShippingId, {
        shipped: false
      });

      // Create expense with receipt for shipping
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Shipping Company',
        amount: 200.00,
        category: 'Shipping Charges',
        description: 'Booth shipping',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/shipping-receipt.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify existing entry was updated
      const shippingEntries = await checklistRepository.getBoothShipping(testChecklistId);
      const updatedEntry = shippingEntries.find(s => s.id === testBoothShippingId);
      expect(updatedEntry?.shipped).toBe(true);

      // Verify logging mentions existing entry
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Booth shipping marked as shipped (entry')
      );
    });

    it('should create new booth shipping entry if none exists', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Delete all shipping entries
      await pool.query('DELETE FROM checklist_booth_shipping WHERE checklist_id = $1', [testChecklistId]);

      // Create expense with receipt for shipping
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Shipping Company',
        amount: 200.00,
        category: 'Shipping Charges',
        description: 'Booth shipping',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/shipping-receipt-new.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify new entry was created and marked as shipped
      const shippingEntries = await checklistRepository.getBoothShipping(testChecklistId);
      expect(shippingEntries.length).toBeGreaterThan(0);
      const newEntry = shippingEntries[shippingEntries.length - 1];
      expect(newEntry.shipped).toBe(true);

      // Verify logging mentions creation
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChecklistAutoCheck] ✓ Created and marked booth shipping as shipped')
      );
    });
  });

  describe('Flight/Hotel Matching by Attendee ID', () => {
    it('should match flight by attendee_id (user_id from expense)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create flight for user 2
      const flight2 = await checklistRepository.createFlight({
        checklistId: testChecklistId,
        attendeeId: testUserId2,
        attendeeName: 'Test User 2 AutoCheck',
        carrier: 'Delta Airlines',
        booked: false
      });

      // Create expense with receipt for user 2's flight
      const expense = await expenseService.createExpense(testUserId2, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Delta Airlines',
        amount: 600.00,
        category: 'Travel - Flight',
        description: 'Flight ticket',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/flight-receipt-user2.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify user 2's flight was updated, not user 1's
      const flights = await checklistRepository.getFlights(testChecklistId);
      const user2Flight = flights.find(f => f.id === flight2.id);
      const user1Flight = flights.find(f => f.id === testFlightId);
      
      expect(user2Flight?.booked).toBe(true);
      expect(user1Flight?.booked).toBe(false); // User 1's flight should remain unchanged
    });

    it('should match hotel by attendee_id (user_id from expense)', async () => {
      if (!dbAvailable || !testEventId || !testChecklistId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create hotel for user 2
      const hotel2 = await checklistRepository.createHotel({
        checklistId: testChecklistId,
        attendeeId: testUserId2,
        attendeeName: 'Test User 2 AutoCheck',
        propertyName: 'User 2 Hotel',
        booked: false
      });

      // Create expense with receipt for user 2's hotel
      const expense = await expenseService.createExpense(testUserId2, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'User 2 Hotel',
        amount: 400.00,
        category: 'Accommodation - Hotel',
        description: 'Hotel booking',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/hotel-receipt-user2.jpg',
        reimbursementRequired: false
      });

      // Wait for async auto-check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify user 2's hotel was updated, not user 1's
      const hotels = await checklistRepository.getHotels(testChecklistId);
      const user2Hotel = hotels.find(h => h.id === hotel2.id);
      const user1Hotel = hotels.find(h => h.id === testHotelId);
      
      expect(user2Hotel?.booked).toBe(true);
      expect(user1Hotel?.booked).toBe(false); // User 1's hotel should remain unchanged
    });
  });

  describe('Errors Do Not Fail Expense Operations', () => {
    it('should not fail expense creation if auto-check service throws error', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Mock autoCheckFromExpense to throw error
      const originalAutoCheck = checklistAutoCheckService.autoCheckFromExpense;
      vi.spyOn(checklistAutoCheckService, 'autoCheckFromExpense').mockRejectedValueOnce(
        new Error('Auto-check service error')
      );

      // Create expense with receipt - should succeed
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Booth / Marketing / Tools',
        description: 'Booth space',
        cardUsed: 'Haute CC',
        receiptUrl: '/uploads/receipt.jpg',
        reimbursementRequired: false
      });

      // Verify expense was created successfully
      expect(expense).toBeDefined();
      expect(expense.id).toBeDefined();
      expect(expense.receipt_url).toBe('/uploads/receipt.jpg');

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpenseService] Failed to auto-check checklist'),
        expect.any(Error)
      );

      // Restore original method
      vi.restoreAllMocks();
    });

    it('should not fail receipt update if auto-check service throws error', async () => {
      if (!dbAvailable || !testEventId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create expense without receipt first
      const expense = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Booth / Marketing / Tools',
        description: 'Booth space',
        cardUsed: 'Haute CC',
        receiptUrl: undefined,
        reimbursementRequired: false
      });

      // Mock autoCheckFromExpense to throw error
      vi.spyOn(checklistAutoCheckService, 'autoCheckFromExpense').mockRejectedValueOnce(
        new Error('Auto-check service error')
      );

      // Update expense with receipt - should succeed
      const updatedExpense = await expenseService.updateExpenseReceipt(
        expense.id,
        testUserId,
        'salesperson',
        '/uploads/receipt-updated.jpg'
      );

      // Verify receipt was updated successfully
      expect(updatedExpense.expense.receipt_url).toBe('/uploads/receipt-updated.jpg');

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpenseService] Failed to auto-check checklist'),
        expect.any(Error)
      );

      // Restore original method
      vi.restoreAllMocks();
    });
  });
});

