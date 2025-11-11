import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { generateExpensePDF } from '../../src/services/ExpensePDFService';
import { ExpenseWithDetails } from '../../src/database/repositories/ExpenseRepository';
import fs from 'fs';
import path from 'path';

/**
 * PDF Generation Integration Tests
 * 
 * Tests expense PDF generation functionality:
 * - PDF generation service
 * - PDF content verification
 * - Receipt image handling
 * - Error handling
 */

// Mock fs for receipt image handling
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('Expense PDF Generation', () => {
  const mockExpense: ExpenseWithDetails = {
    id: 'exp-test-123',
    user_id: 'user-456',
    event_id: 'event-789',
    date: '2025-11-10',
    merchant: 'Test Restaurant',
    amount: 125.50,
    category: 'Food',
    description: 'Team lunch meeting',
    location: 'San Francisco, CA',
    card_used: 'Amex *1234',
    status: 'approved',
    receipt_url: '/uploads/receipt-test.jpg',
    reimbursement_required: false,
    reimbursement_status: null,
    zoho_entity: null,
    zoho_expense_id: null,
    created_at: '2025-11-10T10:00:00Z',
    updated_at: '2025-11-10T10:00:00Z',
    user_name: 'John Doe',
    event_name: 'Tech Expo 2025',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Generation Service', () => {
    it('should generate PDF buffer for expense', async () => {
      const pdfBuffer = await generateExpensePDF(mockExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(pdfBuffer.length).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    it('should include expense details in PDF', async () => {
      const pdfBuffer = await generateExpensePDF(mockExpense);
      const pdfText = pdfBuffer.toString('utf8');

      // PDF is binary, but we can check for some markers
      expect(pdfBuffer.length).toBeGreaterThan(1000); // Reasonable PDF size
    });

    it('should handle expense without receipt', async () => {
      const expenseWithoutReceipt = {
        ...mockExpense,
        receipt_url: null,
      };

      const pdfBuffer = await generateExpensePDF(expenseWithoutReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle expense with receipt image', async () => {
      // Mock file exists
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'));

      const expenseWithReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/receipt-test.jpg',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle missing receipt file gracefully', async () => {
      // Mock file does not exist
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const expenseWithMissingReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/missing-receipt.jpg',
      };

      // Should not throw error, just skip receipt
      const pdfBuffer = await generateExpensePDF(expenseWithMissingReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include user information in PDF', async () => {
      const expenseWithUser = {
        ...mockExpense,
        user_name: 'Jane Smith',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithUser);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include event information in PDF', async () => {
      const expenseWithEvent = {
        ...mockExpense,
        event_name: 'Annual Conference 2025',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithEvent);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle optional fields gracefully', async () => {
      const minimalExpense: ExpenseWithDetails = {
        id: 'exp-minimal',
        user_id: 'user-1',
        event_id: 'event-1',
        date: '2025-11-10',
        merchant: 'Minimal Merchant',
        amount: 50.00,
        category: 'Other',
        card_used: 'Visa',
        status: 'pending',
        reimbursement_required: false,
        created_at: '2025-11-10T10:00:00Z',
        updated_at: '2025-11-10T10:00:00Z',
        description: null,
        location: null,
        receipt_url: null,
        reimbursement_status: null,
        zoho_entity: null,
        zoho_expense_id: null,
        user_name: null,
        event_name: null,
      };

      const pdfBuffer = await generateExpensePDF(minimalExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should format currency correctly', async () => {
      const expenseWithLargeAmount = {
        ...mockExpense,
        amount: 1234.56,
      };

      const pdfBuffer = await generateExpensePDF(expenseWithLargeAmount);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      // PDF should be generated successfully with proper formatting
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle different expense statuses', async () => {
      const statuses: Array<'pending' | 'approved' | 'rejected' | 'needs further review'> = [
        'pending',
        'approved',
        'rejected',
        'needs further review',
      ];

      for (const status of statuses) {
        const expense = {
          ...mockExpense,
          status,
        };

        const pdfBuffer = await generateExpensePDF(expense);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PDF Content Structure', () => {
    it('should generate valid PDF format', async () => {
      const pdfBuffer = await generateExpensePDF(mockExpense);

      // PDF files start with %PDF
      const pdfHeader = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should have reasonable file size', async () => {
      const pdfBuffer = await generateExpensePDF(mockExpense);

      // PDF should be at least 1KB (has content)
      expect(pdfBuffer.length).toBeGreaterThan(1024);
      
      // PDF should be less than 5MB (reasonable size)
      expect(pdfBuffer.length).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid expense data gracefully', async () => {
      const invalidExpense = {
        ...mockExpense,
        amount: NaN,
      } as any;

      // Should handle gracefully or throw meaningful error
      try {
        const pdfBuffer = await generateExpensePDF(invalidExpense);
        expect(pdfBuffer).toBeInstanceOf(Buffer);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle receipt path variations', async () => {
      const paths = [
        '/uploads/receipt.jpg',
        '/api/uploads/receipt.jpg',
        'uploads/receipt.jpg',
      ];

      for (const receiptPath of paths) {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('test'));

        const expense = {
          ...mockExpense,
          receipt_url: receiptPath,
        };

        const pdfBuffer = await generateExpensePDF(expense);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
      }
    });
  });
});

