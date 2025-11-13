import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { expenseService } from '../../src/services/ExpenseService';
import { expenseRepository } from '../../src/database/repositories/ExpenseRepository';
import { ExpenseAuditService } from '../../src/services/ExpenseAuditService';
import { DuplicateDetectionService } from '../../src/services/DuplicateDetectionService';
import { AuthorizationError, NotFoundError } from '../../src/utils/errors';
import { Expense } from '../../src/database/repositories/ExpenseRepository';
import { pool } from '../../src/config/database';

/**
 * Entity Assignment Tests
 * 
 * Tests entity assignment functionality:
 * - Assign entity to expense
 * - Unassign entity from expense
 * - Change entity on expense
 * - Authorization checks
 * - Auto-approval logic
 * - Regression logic (unassign sets to "needs further review")
 * - Clearing zoho_expense_id on entity change
 * - Verify no regressions in other update operations
 */

// Mock audit and duplicate services
vi.mock('../../src/services/ExpenseAuditService');
vi.mock('../../src/services/DuplicateDetectionService');

describe('Entity Assignment Tests', () => {
  let dbAvailable = false;
  let testUserId: string;
  let testEventId: string;
  let testExpenseId: string;
  let testExpenseWithEntityId: string;
  let testExpenseWithZohoIdId: string;
  let testApprovedExpenseId: string;
  let testRejectedExpenseId: string;
  let testNeedsReviewExpenseId: string;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping integration tests');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }

    vi.clearAllMocks();

    // Mock audit service
    vi.mocked(ExpenseAuditService.logChange).mockResolvedValue(undefined);
    vi.mocked(DuplicateDetectionService.checkForDuplicates).mockResolvedValue([]);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (username, password, name, email, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [`test_user_entity_${Date.now()}`, 'hashed_password', 'Test User', `test_entity_${Date.now()}@example.com`, 'salesperson']
    );
    testUserId = userResult.rows[0].id;

    // Create test event
    const eventResult = await pool.query(
      `INSERT INTO events (name, start_date, end_date, location) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      ['Test Event', '2025-01-01', '2025-01-05', 'Test Location']
    );
    testEventId = eventResult.rows[0].id;

    // Create test expenses with different scenarios
    const expense1 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant Unassigned',
      amount: 100.00,
      category: 'Food',
      status: 'pending',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: null,
      zoho_expense_id: null,
    });
    testExpenseId = expense1.id;

    const expense2 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant With Entity',
      amount: 200.00,
      category: 'Travel',
      status: 'pending',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: 'haute',
      zoho_expense_id: null,
    });
    testExpenseWithEntityId = expense2.id;

    const expense3 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant With Zoho ID',
      amount: 300.00,
      category: 'Accommodation',
      status: 'approved',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: 'haute',
      zoho_expense_id: 'zoho-12345',
    });
    testExpenseWithZohoIdId = expense3.id;

    const expense4 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant Approved',
      amount: 400.00,
      category: 'Food',
      status: 'approved',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: null,
      zoho_expense_id: null,
    });
    testApprovedExpenseId = expense4.id;

    const expense5 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant Rejected',
      amount: 500.00,
      category: 'Travel',
      status: 'rejected',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: null,
      zoho_expense_id: null,
    });
    testRejectedExpenseId = expense5.id;

    const expense6 = await expenseRepository.create({
      user_id: testUserId,
      event_id: testEventId,
      date: '2025-01-15',
      merchant: 'Test Merchant Needs Review',
      amount: 600.00,
      category: 'Accommodation',
      status: 'needs further review',
      card_used: 'Test Card',
      reimbursement_required: false,
      zoho_entity: null,
      zoho_expense_id: null,
    });
    testNeedsReviewExpenseId = expense6.id;
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }

    // Cleanup test data
    const expenseIds = [
      testExpenseId,
      testExpenseWithEntityId,
      testExpenseWithZohoIdId,
      testApprovedExpenseId,
      testRejectedExpenseId,
      testNeedsReviewExpenseId,
    ].filter(Boolean);

    for (const id of expenseIds) {
      try {
        await expenseRepository.delete(id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (testEventId) {
      try {
        await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (testUserId) {
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Assign Entity', () => {
    it('should assign entity to unassigned expense', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');

      expect(result.zoho_entity).toBe('haute');
      expect(result.id).toBe(testExpenseId);

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.zoho_entity).toBe('haute');
    });

    it('should auto-approve pending expense when entity is assigned', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');

      expect(result.status).toBe('approved');
      expect(result.zoho_entity).toBe('haute');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.status).toBe('approved');
    });

    it('should auto-approve "needs further review" expense when entity is assigned', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testNeedsReviewExpenseId, 'haute', 'admin');

      expect(result.status).toBe('approved');
      expect(result.zoho_entity).toBe('haute');

      // Verify in database
      const expense = await expenseRepository.findById(testNeedsReviewExpenseId);
      expect(expense?.status).toBe('approved');
    });

    it('should not change status of already approved expense when assigning entity', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testApprovedExpenseId, 'haute', 'admin');

      expect(result.status).toBe('approved');
      expect(result.zoho_entity).toBe('haute');
    });

    it('should not change status of rejected expense when assigning entity', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testRejectedExpenseId, 'haute', 'admin');

      expect(result.status).toBe('rejected');
      expect(result.zoho_entity).toBe('haute');
    });

    it('should allow assigning different entities', async () => {
      if (!dbAvailable) {
        return;
      }

      const result1 = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');
      expect(result1.zoho_entity).toBe('haute');

      const result2 = await expenseService.assignZohoEntity(testExpenseId, 'boomin', 'admin');
      expect(result2.zoho_entity).toBe('boomin');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.zoho_entity).toBe('boomin');
    });
  });

  describe('Unassign Entity', () => {
    it('should unassign entity using empty string', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseWithEntityId, '', 'admin');

      expect(result.zoho_entity).toBeNull();

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseWithEntityId);
      expect(expense?.zoho_entity).toBeNull();
    });

    it('should unassign entity using whitespace-only string', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseWithEntityId, '   ', 'admin');

      expect(result.zoho_entity).toBeNull();

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseWithEntityId);
      expect(expense?.zoho_entity).toBeNull();
    });

    it('should set status to "needs further review" when unassigning entity from assigned expense', async () => {
      if (!dbAvailable) {
        return;
      }

      // First assign entity (this will auto-approve)
      await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');
      const approvedExpense = await expenseRepository.findById(testExpenseId);
      expect(approvedExpense?.status).toBe('approved');

      // Now unassign entity
      const result = await expenseService.assignZohoEntity(testExpenseId, '', 'admin');

      expect(result.status).toBe('needs further review');
      expect(result.zoho_entity).toBeNull();

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.status).toBe('needs further review');
    });

    it('should not change status when unassigning from expense that was never assigned', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, '', 'admin');

      expect(result.status).toBe('pending'); // Should remain pending
      expect(result.zoho_entity).toBeNull();
    });
  });

  describe('Change Entity', () => {
    it('should change entity from one to another', async () => {
      if (!dbAvailable) {
        return;
      }

      // Start with 'haute'
      await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');
      let expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.zoho_entity).toBe('haute');

      // Change to 'boomin'
      const result = await expenseService.assignZohoEntity(testExpenseId, 'boomin', 'admin');
      expect(result.zoho_entity).toBe('boomin');

      // Verify in database
      expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.zoho_entity).toBe('boomin');
    });

    it('should clear zoho_expense_id when changing entity on expense with Zoho ID', async () => {
      if (!dbAvailable) {
        return;
      }

      // Verify expense has zoho_expense_id
      let expense = await expenseRepository.findById(testExpenseWithZohoIdId);
      expect(expense?.zoho_expense_id).toBe('zoho-12345');
      expect(expense?.zoho_entity).toBe('haute');

      // Change entity
      const result = await expenseService.assignZohoEntity(testExpenseWithZohoIdId, 'boomin', 'admin');

      expect(result.zoho_entity).toBe('boomin');
      expect(result.zoho_expense_id).toBeNull();

      // Verify in database
      expense = await expenseRepository.findById(testExpenseWithZohoIdId);
      expect(expense?.zoho_expense_id).toBeNull();
      expect(expense?.zoho_entity).toBe('boomin');
    });

    it('should not clear zoho_expense_id when assigning same entity', async () => {
      if (!dbAvailable) {
        return;
      }

      // Verify expense has zoho_expense_id
      let expense = await expenseRepository.findById(testExpenseWithZohoIdId);
      expect(expense?.zoho_expense_id).toBe('zoho-12345');
      expect(expense?.zoho_entity).toBe('haute');

      // Assign same entity
      const result = await expenseService.assignZohoEntity(testExpenseWithZohoIdId, 'haute', 'admin');

      expect(result.zoho_entity).toBe('haute');
      expect(result.zoho_expense_id).toBe('zoho-12345'); // Should remain

      // Verify in database
      expense = await expenseRepository.findById(testExpenseWithZohoIdId);
      expect(expense?.zoho_expense_id).toBe('zoho-12345');
    });
  });

  describe('Authorization', () => {
    it('should allow admin to assign entity', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'admin');
      expect(result.zoho_entity).toBe('haute');
    });

    it('should allow accountant to assign entity', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'accountant');
      expect(result.zoho_entity).toBe('haute');
    });

    it('should allow developer to assign entity', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.assignZohoEntity(testExpenseId, 'haute', 'developer');
      expect(result.zoho_entity).toBe('haute');
    });

    it('should reject salesperson from assigning entity', async () => {
      if (!dbAvailable) {
        return;
      }

      await expect(
        expenseService.assignZohoEntity(testExpenseId, 'haute', 'salesperson')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should reject coordinator from assigning entity', async () => {
      if (!dbAvailable) {
        return;
      }

      await expect(
        expenseService.assignZohoEntity(testExpenseId, 'haute', 'coordinator')
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundError for non-existent expense', async () => {
      if (!dbAvailable) {
        return;
      }

      await expect(
        expenseService.assignZohoEntity('non-existent-id', 'haute', 'admin')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('No Regressions in Other Update Operations', () => {
    it('should still allow updating expense fields via updateExpense', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.updateExpense(
        testExpenseId,
        testUserId,
        'salesperson',
        {
          merchant: 'Updated Merchant',
          amount: 150.00,
          category: 'Updated Category',
        }
      );

      expect(result.merchant).toBe('Updated Merchant');
      expect(result.amount).toBe(150.00);
      expect(result.category).toBe('Updated Category');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.merchant).toBe('Updated Merchant');
      expect(expense?.amount).toBe(150.00);
      expect(expense?.category).toBe('Updated Category');
    });

    it('should still allow updating expense status via updateStatus', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseRepository.updateStatus(testExpenseId, 'approved');

      expect(result.status).toBe('approved');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.status).toBe('approved');
    });

    it('should still allow updating reimbursement status', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseRepository.update(testExpenseId, {
        reimbursement_required: true,
        reimbursement_status: 'pending',
      });

      expect(result.reimbursement_required).toBe(true);
      expect(result.reimbursement_status).toBe('pending');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.reimbursement_required).toBe(true);
      expect(expense?.reimbursement_status).toBe('pending');
    });

    it('should still allow updating expense receipt', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.updateExpenseReceipt(
        testExpenseId,
        testUserId,
        'salesperson',
        '/uploads/new-receipt.jpg'
      );

      expect(result.expense.receipt_url).toBe('/uploads/new-receipt.jpg');

      // Verify in database
      const expense = await expenseRepository.findById(testExpenseId);
      expect(expense?.receipt_url).toBe('/uploads/new-receipt.jpg');
    });

    it('should still allow creating new expenses', async () => {
      if (!dbAvailable) {
        return;
      }

      const result = await expenseService.createExpense(testUserId, {
        eventId: testEventId,
        date: '2025-01-20',
        merchant: 'New Merchant',
        amount: 250.00,
        category: 'Food',
        cardUsed: 'Test Card',
        reimbursementRequired: false,
      });

      expect(result.merchant).toBe('New Merchant');
      expect(result.amount).toBe(250.00);
      expect(result.status).toBe('pending');

      // Cleanup
      await expenseRepository.delete(result.id);
    });

    it('should still allow deleting expenses', async () => {
      if (!dbAvailable) {
        return;
      }

      // Create expense to delete
      const expense = await expenseRepository.create({
        user_id: testUserId,
        event_id: testEventId,
        date: '2025-01-20',
        merchant: 'To Delete',
        amount: 50.00,
        category: 'Food',
        status: 'pending',
        card_used: 'Test Card',
        reimbursement_required: false,
      });

      // Delete it
      await expenseRepository.delete(expense.id);

      // Verify deleted
      await expect(expenseRepository.findById(expense.id)).rejects.toThrow(NotFoundError);
    });
  });
});

