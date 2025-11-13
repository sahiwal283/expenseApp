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

    it('should filter out undefined values from update data', async () => {
      const updates = {
        status: 'approved' as const,
        amount: undefined, // Should be filtered out
        zoho_expense_id: undefined, // Should be filtered out
        merchant: 'Updated Merchant',
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, status: 'approved', merchant: 'Updated Merchant' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      // Verify the query was called with only defined values
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE expenses'),
        expect.arrayContaining([
          'exp-123',
          'approved',
          'Updated Merchant',
        ])
      );

      // Verify undefined values were not included in the query
      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).not.toContain('amount');
      expect(queryString).not.toContain('zoho_expense_id');
      expect(queryValues).not.toContain(undefined);
    });

    it('should allow null values for clearing fields', async () => {
      const updates = {
        zoho_expense_id: null, // Should be included (for clearing the field)
        zoho_entity: null, // Should be included
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, zoho_expense_id: null, zoho_entity: null }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      // Verify null values were included in the query
      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).toContain('zoho_expense_id');
      expect(queryString).toContain('zoho_entity');
      expect(queryValues).toContain(null);
    });

    it('should return current expense if all values are undefined', async () => {
      vi.mocked(dbQuery).mockResolvedValueOnce({
        rows: [mockExpense],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', {
        status: undefined,
        amount: undefined,
      });

      // Should call findById instead of UPDATE (via executeQuery)
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE id = $1',
        ['exp-123']
      );
      expect(result).toEqual(mockExpense);
    });

    it('should handle empty object (all undefined)', async () => {
      vi.mocked(dbQuery).mockResolvedValueOnce({
        rows: [mockExpense],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', {});

      // Should call findById instead of UPDATE
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE id = $1',
        ['exp-123']
      );
      expect(result).toEqual(mockExpense);
    });

    it('should handle mixed null and undefined values', async () => {
      const updates = {
        zoho_expense_id: null, // Should be included (clear field)
        zoho_entity: null, // Should be included (clear field)
        merchant: undefined, // Should be filtered out
        amount: undefined, // Should be filtered out
        status: 'approved' as const, // Should be included
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, zoho_expense_id: null, zoho_entity: null, status: 'approved' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      // Verify query includes null values but not undefined
      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).toContain('zoho_expense_id');
      expect(queryString).toContain('zoho_entity');
      expect(queryString).toContain('status');
      expect(queryString).not.toContain('merchant');
      expect(queryString).not.toContain('amount');
      expect(queryValues).toContain(null);
      expect(queryValues).toContain('approved');
      expect(queryValues).not.toContain(undefined);
    });

    it('should clear duplicate_check field with null', async () => {
      const updates = {
        duplicate_check: null, // Should clear the field
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, duplicate_check: null }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).toContain('duplicate_check');
      expect(queryValues).toContain(null);
    });

    it('should set duplicate_check field with defined value', async () => {
      const duplicateData = JSON.stringify([{ id: 'exp-456', similarity: 0.95 }]);
      const updates = {
        duplicate_check: duplicateData,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, duplicate_check: duplicateData }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).toContain('duplicate_check');
      expect(queryValues).toContain(duplicateData);
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE expenses; --";
      const updates = {
        merchant: maliciousInput,
        description: maliciousInput,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, merchant: maliciousInput, description: maliciousInput }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      // Verify parameterized query (uses $1, $2, etc. placeholders)
      expect(queryString).toMatch(/\$\d+/);
      // Verify malicious input is in values array, not in query string
      expect(queryString).not.toContain(maliciousInput);
      expect(queryValues).toContain(maliciousInput);
    });

    it('should throw NotFoundError when updating non-existent expense with all undefined', async () => {
      vi.mocked(dbQuery).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(
        repository.update('non-existent', {
          status: undefined,
          amount: undefined,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update multiple fields with defined values', async () => {
      const updates = {
        merchant: 'Updated Merchant',
        amount: 200.00,
        category: 'Updated Category',
        description: 'Updated Description',
        location: 'Updated Location',
        card_used: 'Updated Card',
        reimbursement_required: true,
        zoho_entity: 'haute',
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      expect(result.merchant).toBe('Updated Merchant');
      expect(result.amount).toBe(200.00);
      expect(result.category).toBe('Updated Category');
      expect(result.description).toBe('Updated Description');
      expect(result.location).toBe('Updated Location');
      expect(result.card_used).toBe('Updated Card');
      expect(result.reimbursement_required).toBe(true);
      expect(result.zoho_entity).toBe('haute');
    });

    it('should handle null values for all nullable fields', async () => {
      const updates = {
        zoho_expense_id: null,
        zoho_entity: null,
        duplicate_check: null,
        description: null,
        location: null,
        receipt_url: null,
        reimbursement_status: null,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, ...updates }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      // Verify all null values are included
      expect(queryString).toContain('zoho_expense_id');
      expect(queryString).toContain('zoho_entity');
      expect(queryString).toContain('duplicate_check');
      expect(queryString).toContain('description');
      expect(queryString).toContain('location');
      expect(queryString).toContain('receipt_url');
      expect(queryString).toContain('reimbursement_status');
      
      // Count null values in query values
      const nullCount = queryValues.filter(v => v === null).length;
      expect(nullCount).toBeGreaterThanOrEqual(7);
    });

    it('should filter out id field even if provided', async () => {
      const updates = {
        id: 'should-be-ignored',
        merchant: 'Updated Merchant',
        status: 'approved' as const,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, merchant: 'Updated Merchant', status: 'approved' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;

      // Verify id is not in SET clause (it's only in WHERE clause)
      expect(queryString).toContain('WHERE id = $1');
      expect(queryString).not.toMatch(/SET.*id\s*=/);
    });

    it('should handle boolean false values correctly', async () => {
      const updates = {
        reimbursement_required: false,
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, reimbursement_required: false }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryString = callArgs[0] as string;
      const queryValues = callArgs[1] as any[];

      expect(queryString).toContain('reimbursement_required');
      expect(queryValues).toContain(false);
    });

    it('should handle zero and empty string values correctly', async () => {
      const updates = {
        amount: 0,
        description: '',
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ ...mockExpense, amount: 0, description: '' }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update('exp-123', updates);

      const callArgs = vi.mocked(dbQuery).mock.calls[0];
      const queryValues = callArgs[1] as any[];

      expect(queryValues).toContain(0);
      expect(queryValues).toContain('');
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

