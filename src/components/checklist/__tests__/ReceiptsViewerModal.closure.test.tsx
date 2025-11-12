import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReceiptsViewerModal } from '../ReceiptsViewerModal';
import { Expense } from '../../../App';

/**
 * ReceiptsViewerModal Closure Fix Tests
 * 
 * Tests the closure fix implementation:
 * - Keyboard navigation works correctly with ref pattern
 * - Navigation works when receipts array changes
 * - Safety checks prevent crashes with empty arrays
 * - No regressions in existing functionality
 */

const createMockExpense = (id: string, receiptUrl: string, merchant?: string, amount?: number): Expense => ({
  id,
  userId: 'user-1',
  tradeShowId: 'event-1',
  amount: amount || 100.00,
  category: 'Travel',
  merchant: merchant || 'Test Merchant',
  date: '2025-01-15T10:00:00Z',
  description: 'Test expense',
  cardUsed: 'Visa',
  reimbursementRequired: true,
  status: 'pending',
  receiptUrl,
});

describe('ReceiptsViewerModal Closure Fix Tests', () => {
  const mockOnClose = vi.fn();
  const initialReceipts: Expense[] = [
    createMockExpense('exp-1', '/uploads/receipts/receipt1.jpg', 'Merchant 1', 50.00),
    createMockExpense('exp-2', '/uploads/receipts/receipt2.jpg', 'Merchant 2', 75.50),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Keyboard Navigation with Ref Pattern', () => {
    it('should navigate correctly with ArrowRight when receipts array changes', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Verify initial state
      expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();

      // Navigate to second receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change receipts array (add more receipts) - simulates data refresh
      const updatedReceipts: Expense[] = [
        ...initialReceipts,
        createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.00),
        createMockExpense('exp-4', '/uploads/receipts/receipt4.jpg', 'Merchant 4', 125.00),
      ];

      rerender(
        <ReceiptsViewerModal
          receipts={updatedReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first receipt when array changes
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 4/)).toBeInTheDocument();
      });

      // Keyboard navigation should work with new array length
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 4/)).toBeInTheDocument();
      });

      // Navigate to last receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 4 of 4/)).toBeInTheDocument();
      });

      // Wrap around should work with new array length
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 4/)).toBeInTheDocument();
      });
    });

    it('should navigate correctly with ArrowLeft when receipts array changes', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Start at first receipt
      expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();

      // Change receipts array (reduce to single receipt)
      const singleReceipt = [initialReceipts[0]];

      rerender(
        <ReceiptsViewerModal
          receipts={singleReceipt}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first receipt
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
      });

      // ArrowLeft should not crash (should stay at first since only one receipt)
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
      });
    });

    it('should use ref pattern to avoid stale closure in keyboard handler', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change receipts array to have 5 receipts
      const expandedReceipts: Expense[] = [
        ...initialReceipts,
        createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.00),
        createMockExpense('exp-4', '/uploads/receipts/receipt4.jpg', 'Merchant 4', 125.00),
        createMockExpense('exp-5', '/uploads/receipts/receipt5.jpg', 'Merchant 5', 150.00),
      ];

      rerender(
        <ReceiptsViewerModal
          receipts={expandedReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 5/)).toBeInTheDocument();
      });

      // Keyboard navigation should use updated length (5, not stale 2)
      // Navigate through all 5 receipts
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
      }

      await waitFor(() => {
        expect(screen.getByText(/Receipt 5 of 5/)).toBeInTheDocument();
      });

      // Wrap around should work with correct length (5)
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 5/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation When Receipts Array Changes', () => {
    it('should reset to first receipt when receipts array changes', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      const nextButton = screen.getByTitle('Next (→)');
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change receipts array
      const newReceipts: Expense[] = [
        createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.00),
        createMockExpense('exp-4', '/uploads/receipts/receipt4.jpg', 'Merchant 4', 125.00),
        createMockExpense('exp-5', '/uploads/receipts/receipt5.jpg', 'Merchant 5', 150.00),
      ];

      rerender(
        <ReceiptsViewerModal
          receipts={newReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first receipt
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
      });
    });

    it('should update navigation handlers when receipts length changes', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate with buttons
      const nextButton = screen.getByTitle('Next (→)');
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change to single receipt (use same receipt to avoid undefined)
      const singleReceipt = [initialReceipts[0]];
      rerender(
        <ReceiptsViewerModal
          receipts={singleReceipt}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first receipt and hide buttons (single receipt)
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
        expect(screen.queryByTitle('Next (→)')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Previous (←)')).not.toBeInTheDocument();
      });
    });

    it('should handle receipts array changing from multiple to empty', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Verify modal is open
      expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();

      // Change to empty array
      rerender(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should not render (empty array check)
      await waitFor(() => {
        expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
      });
    });

    it('should handle receipts array changing from empty to multiple', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should not render
      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();

      // Change to multiple receipts
      rerender(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should render with first receipt
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });
    });
  });

  describe('Safety Checks for Empty Arrays', () => {
    it('should not crash when navigating with empty array', () => {
      render(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should not render
      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();

      // Keyboard events should not crash
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Should not crash
      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
    });

    it('should handle keyboard navigation when array becomes empty', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change to empty array
      rerender(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should close (empty array check)
      await waitFor(() => {
        expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
      });

      // Keyboard events should not crash
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Should still not render
      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
    });

    it('should check receiptsLength > 0 before navigation in keyboard handler', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate normally
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change to empty array
      rerender(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Modal should not render
      await waitFor(() => {
        expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
      });

      // Even if keyboard events fire, should not crash
      // The ref check (receiptsLength > 0) should prevent navigation
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Should still not render
      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
    });

    it('should handle single receipt correctly (no navigation needed)', () => {
      const singleReceipt = [initialReceipts[0]];
      render(
        <ReceiptsViewerModal
          receipts={singleReceipt}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should render
      expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();

      // Keyboard navigation should not crash (but won't navigate since only one receipt)
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
    });
  });

  describe('No Regressions in Existing Functionality', () => {
    it('should still navigate correctly with prev/next buttons', async () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByTitle('Next (→)');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      const prevButton = screen.getByTitle('Previous (←)');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });
    });

    it('should still navigate correctly with thumbnails', async () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const thumbnail2 = screen.getByTitle('View receipt 2');
      fireEvent.click(thumbnail2);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });
    });

    it('should still wrap around correctly', async () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Wrap forward
      const nextButton = screen.getByTitle('Next (→)');
      fireEvent.click(nextButton); // Receipt 2
      fireEvent.click(nextButton); // Receipt 1 (wrap)

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });

      // Wrap backward
      const prevButton = screen.getByTitle('Previous (←)');
      fireEvent.click(prevButton); // Receipt 2 (wrap)

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });
    });

    it('should still close modal with Escape key', () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should still display receipt counter correctly', () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Receipt 1 of 2')).toBeInTheDocument();
    });

    it('should still display receipt info correctly', () => {
      render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Merchant 1')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });

  describe('Ref Pattern Implementation', () => {
    it('should update ref when receipts length changes', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Initial length is 2
      expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();

      // Change to 3 receipts
      const expandedReceipts: Expense[] = [
        ...initialReceipts,
        createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.00),
      ];

      rerender(
        <ReceiptsViewerModal
          receipts={expandedReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Ref should be updated, counter should show 3
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
      });

      // Keyboard navigation should use updated ref (length 3)
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
      });
    });

    it('should use ref in keyboard handler to avoid stale closure', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={initialReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
      });

      // Change receipts array (expand to 5)
      const expandedReceipts: Expense[] = [
        ...initialReceipts,
        createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.00),
        createMockExpense('exp-4', '/uploads/receipts/receipt4.jpg', 'Merchant 4', 125.00),
        createMockExpense('exp-5', '/uploads/receipts/receipt5.jpg', 'Merchant 5', 150.00),
      ];

      rerender(
        <ReceiptsViewerModal
          receipts={expandedReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Reset to first
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 5/)).toBeInTheDocument();
      });

      // Keyboard handler should use ref (current length 5), not stale closure (old length 2)
      // Navigate to last receipt (index 4)
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
      }

      await waitFor(() => {
        expect(screen.getByText(/Receipt 5 of 5/)).toBeInTheDocument();
      });

      // Wrap around should work with correct length (5)
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 5/)).toBeInTheDocument();
      });
    });
  });
});

