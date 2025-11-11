import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpenseRepository, Expense } from '../../src/database/repositories/ExpenseRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

/**
 * ExpenseRepository Tests
 * 
 * Tests the expense-specific repository methods extending BaseRepository.
 */

vi.mock('../../src/config/database', () => ({
  query: vi.fn(),
}));

describe('ExpenseRepository', () => {
  let repository: ExpenseRepository;

  beforeEach(() => {
    repository = new ExpenseRepository();
    vi.clearAllMocks();
  });

  const mockExpense: Expense = {
    id: 'exp-123',
    user_id: 'user-456',
    event_id: 'event-789',
    date: '2025-11-01',
    merchant: 'Test Merchant',
    amount: 100.50,
    category: 'Food',
    description: 'Team lunch',
    location: 'San Francisco, CA',
    card_used: 'Amex *1234',
    status: 'pending',
    receipt_url: 'https://example.com/receipt.jpg',
    reimbursement_required: false,
    reimbursement_status: null,
    zoho_entity: null,
    zoho_expense_id: null,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  };

  describe('findByUserId', () => {
    it('should find all expenses for a user', async () => {
      const mockExpenses = [mockExpense];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockExpenses,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByUserId('user-456');

      expect(result).toEqual(mockExpenses);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE user_id = $1',
        ['user-456']
      );
    });
  });

  describe('findByEventId', () => {
    it('should find all expenses for an event', async () => {
      const mockExpenses = [mockExpense];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockExpenses,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByEventId('event-789');

      expect(result).toEqual(mockExpenses);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE event_id = $1',
        ['event-789']
      );
    });
  });

  describe('findByStatus', () => {
    it('should find all expenses with a specific status', async () => {
      const mockExpenses = [mockExpense];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockExpenses,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByStatus('pending');

      expect(result).toEqual(mockExpenses);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE status = $1',
        ['pending']
      );
    });
  });

  describe('create', () => {
    it('should create a new expense', async () => {
      const newExpenseData = {
        user_id: 'user-456',
        event_id: 'event-789',
        date: '2025-11-01',
        merchant: 'New Merchant',
        amount: 250.75,
        category: 'Travel',
        description: 'Flight',
        location: 'SFO',
        card_used: 'Visa *5678',
        status: 'pending' as const,
        receipt_url: null,
        reimbursement_required: true,
        reimbursement_status: null,
        zoho_entity: null,
        zoho_expense_id: null,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...newExpenseData, id: 'exp-new', created_at: '2025-11-01', updated_at: '2025-11-01' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.create(newExpenseData);

      expect(result.merchant).toBe('New Merchant');
      expect(result.amount).toBe(250.75);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO expenses'),
        expect.arrayContaining([
          'user-456',
          'event-789',
          '2025-11-01',
          'New Merchant',
          250.75,
          'Travel',
        ])
      );
    });
  });

  describe('update', () => {
    it('should update an expense', async () => {
      const updates = { status: 'approved' as const, amount: 110.00 };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      expect(result.status).toBe('approved');
      expect(result.amount).toBe(110.00);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE expenses'),
        expect.arrayContaining(['exp-123'])
      );
    });

    it('should throw NotFoundError if expense does not exist', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(
        repository.update('exp-999', { status: 'approved' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update updated_at timestamp', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockExpense],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update('exp-123', { status: 'approved' });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.anything()
      );
    });
  });

  describe('updateStatus', () => {
    it('should update only the status field', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, status: 'approved' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.updateStatus('exp-123', 'approved');

      expect(result.status).toBe('approved');
    });

    it('should accept all valid status values', async () => {
      const statuses: Array<'pending' | 'approved' | 'rejected' | 'needs further review'> = [
        'pending',
        'approved',
        'rejected',
        'needs further review',
      ];

      for (const status of statuses) {
        vi.mocked(dbQuery).mockResolvedValue({
          rows: [{ ...mockExpense, status }],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const result = await repository.updateStatus('exp-123', status);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('updateZohoInfo', () => {
    it('should update Zoho expense ID', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, zoho_expense_id: 'zoho-123' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.updateZohoInfo('exp-123', 'zoho-123');

      expect(result.zoho_expense_id).toBe('zoho-123');
    });
  });

  describe('findPendingZohoSync', () => {
    it('should find expenses that need Zoho sync', async () => {
      const expensesNeedingSync = [
        { ...mockExpense, status: 'approved', zoho_entity: 'Entity A', zoho_expense_id: null },
        { ...mockExpense, id: 'exp-124', status: 'approved', zoho_entity: 'Entity B', zoho_expense_id: null },
      ];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: expensesNeedingSync,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findPendingZohoSync();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('approved');
      expect(result[0].zoho_entity).not.toBeNull();
      expect(result[0].zoho_expense_id).toBeNull();

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'approved'"),
        undefined
      );
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('zoho_entity IS NOT NULL'),
        undefined
      );
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('zoho_expense_id IS NULL'),
        undefined
      );
    });
  });

  describe('countByStatus', () => {
    it('should count expenses by status', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ count: '25' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.countByStatus('pending');

      expect(result).toBe(25);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM expenses WHERE status = $1',
        ['pending']
      );
    });

    it('should return 0 if no expenses with that status', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.countByStatus('rejected');

      expect(result).toBe(0);
    });
  });

  describe('getUserStats', () => {
    it('should return user expense statistics', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [
          {
            total: '50',
            total_amount: '5000.00',
            pending: '10',
            approved: '35',
            rejected: '5',
            last_expense_date: '2025-11-01',
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.getUserStats('user-456');

      expect(result).toMatchObject({
        total: 50,
        totalAmount: 5000.00,
        pending: 10,
        approved: 35,
        rejected: 5,
      });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        ['user-456']
      );
    });
  });

  describe('findWithFilters', () => {
    it('should find expenses with multiple filters', async () => {
      const mockExpenses = [mockExpense];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockExpenses,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findWithFilters({
        userId: 'user-456',
        status: 'approved',
      });

      expect(result).toEqual(mockExpenses);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND status = $2'),
        ['user-456', 'approved']
      );
    });

    it('should handle empty filters', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockExpense],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findWithFilters({});

      expect(result).toHaveLength(1);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE'),
        []
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(dbQuery).mockRejectedValue(new Error('Connection lost'));

      await expect(repository.findByUserId('user-456')).rejects.toThrow();
    });
  });
});

