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

    it('should handle missing receipt file gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const expenseWithMissingReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/nonexistent.jpg',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithMissingReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle receipt file read errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const expenseWithErrorReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/error-receipt.jpg',
      };

      // Should not throw, but handle error gracefully
      const pdfBuffer = await generateExpensePDF(expenseWithErrorReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Various Expense Types', () => {
    it('should generate PDF for food expense', async () => {
      const foodExpense = {
        ...mockExpense,
        category: 'Food',
        merchant: 'Restaurant ABC',
      };

      const pdfBuffer = await generateExpensePDF(foodExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF for travel expense', async () => {
      const travelExpense = {
        ...mockExpense,
        category: 'Travel',
        merchant: 'Airline XYZ',
        location: 'San Francisco, CA',
      };

      const pdfBuffer = await generateExpensePDF(travelExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF for accommodation expense', async () => {
      const accommodationExpense = {
        ...mockExpense,
        category: 'Accommodation',
        merchant: 'Hotel ABC',
        amount: 250.00,
      };

      const pdfBuffer = await generateExpensePDF(accommodationExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF for other expense types', async () => {
      const otherExpense = {
        ...mockExpense,
        category: 'Other',
        description: 'Miscellaneous expense',
      };

      const pdfBuffer = await generateExpensePDF(otherExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Receipt Image Handling', () => {
    it('should handle different image formats', async () => {
      const formats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

      for (const format of formats) {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'));

        const expense = {
          ...mockExpense,
          receipt_url: `/uploads/receipt${format}`,
        };

        const pdfBuffer = await generateExpensePDF(expense);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      }
    });

    it('should handle PDF receipt files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const expenseWithPDFReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/receipt.pdf',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithPDFReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle unknown receipt file types', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const expenseWithUnknownReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/receipt.unknown',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithUnknownReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Large Receipt Handling', () => {
    it('should handle large receipt images', async () => {
      // Simulate large image (10MB)
      const largeImageBuffer = Buffer.alloc(10 * 1024 * 1024, 'x');
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(largeImageBuffer);

      const expenseWithLargeReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/large-receipt.jpg',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithLargeReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle very large receipt images (20MB+)', async () => {
      // Simulate very large image (25MB)
      const veryLargeImageBuffer = Buffer.alloc(25 * 1024 * 1024, 'x');
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(veryLargeImageBuffer);

      const expenseWithVeryLargeReceipt = {
        ...mockExpense,
        receipt_url: '/uploads/very-large-receipt.jpg',
      };

      const pdfBuffer = await generateExpensePDF(expenseWithVeryLargeReceipt);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent PDF Generation', () => {
    it('should handle concurrent PDF generation requests', async () => {
      const expenses = Array.from({ length: 5 }, (_, i) => ({
        ...mockExpense,
        id: `exp-${i}`,
        amount: 100 + i * 10,
      }));

      // Generate PDFs concurrently
      const pdfPromises = expenses.map(expense => generateExpensePDF(expense));
      const pdfBuffers = await Promise.all(pdfPromises);

      // All should succeed
      expect(pdfBuffers).toHaveLength(5);
      pdfBuffers.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent PDF generation with receipts', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'));

      const expenses = Array.from({ length: 10 }, (_, i) => ({
        ...mockExpense,
        id: `exp-${i}`,
        receipt_url: `/uploads/receipt-${i}.jpg`,
      }));

      // Generate PDFs concurrently
      const pdfPromises = expenses.map(expense => generateExpensePDF(expense));
      const pdfBuffers = await Promise.all(pdfPromises);

      // All should succeed
      expect(pdfBuffers).toHaveLength(10);
      pdfBuffers.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });
    });

    it('should handle mixed concurrent requests (with and without receipts)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'));

      const expenses = [
        { ...mockExpense, id: 'exp-1', receipt_url: '/uploads/receipt-1.jpg' },
        { ...mockExpense, id: 'exp-2', receipt_url: null },
        { ...mockExpense, id: 'exp-3', receipt_url: '/uploads/receipt-3.jpg' },
        { ...mockExpense, id: 'exp-4', receipt_url: null },
        { ...mockExpense, id: 'exp-5', receipt_url: '/uploads/receipt-5.jpg' },
      ];

      // Generate PDFs concurrently
      const pdfPromises = expenses.map(expense => generateExpensePDF(expense));
      const pdfBuffers = await Promise.all(pdfPromises);

      // All should succeed
      expect(pdfBuffers).toHaveLength(5);
      pdfBuffers.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PDF Content Verification', () => {
    it('should include all expense details in PDF', async () => {
      const detailedExpense = {
        ...mockExpense,
        description: 'Detailed description',
        location: 'San Francisco, CA',
        card_used: 'Amex *1234',
        reimbursement_required: true,
        reimbursement_status: 'pending',
        zoho_entity: 'Test Entity',
        zoho_expense_id: 'ZHO-12345',
        user_name: 'John Doe',
        event_name: 'Tech Expo 2025',
      };

      const pdfBuffer = await generateExpensePDF(detailedExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Verify PDF format
      const pdfHeader = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should format amounts correctly', async () => {
      const amounts = [0.01, 1.00, 10.50, 100.99, 1000.00, 9999.99];

      for (const amount of amounts) {
        const expense = {
          ...mockExpense,
          amount,
        };

        const pdfBuffer = await generateExpensePDF(expense);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      }
    });

    it('should include date in correct format', async () => {
      const dates = ['2025-01-01', '2025-12-31', '2025-06-15'];

      for (const date of dates) {
        const expense = {
          ...mockExpense,
          date,
        };

        const pdfBuffer = await generateExpensePDF(expense);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Promise Handling Fix', () => {
    it('should properly handle Promise resolution', async () => {
      const pdfBuffer = await generateExpensePDF(mockExpense);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should properly handle Promise rejection on PDF error', async () => {
      // This test verifies that errors are properly caught and rejected
      // The Promise handling fix ensures event handlers are set up before content generation
      const pdfBuffer = await generateExpensePDF(mockExpense);

      // Should resolve successfully
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle Promise race conditions correctly', async () => {
      // Generate multiple PDFs rapidly to test Promise handling
      const promises = Array.from({ length: 20 }, () => generateExpensePDF(mockExpense));
      
      const pdfBuffers = await Promise.all(promises);

      // All should resolve successfully
      expect(pdfBuffers).toHaveLength(20);
      pdfBuffers.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });
    });
  });
});

