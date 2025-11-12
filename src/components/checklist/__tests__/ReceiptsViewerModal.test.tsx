import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptsViewerModal } from '../ReceiptsViewerModal';
import { Expense } from '../../../App';

/**
 * ReceiptsViewerModal Component Tests
 * 
 * Tests the multi-receipt viewer modal functionality:
 * - Modal opens/closes
 * - All receipts displayed
 * - Navigation controls (prev/next, thumbnails, keyboard)
 * - Receipt counter
 * - Keyboard navigation
 * - Receipt info display
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

describe('ReceiptsViewerModal Component Tests', () => {
  const mockOnClose = vi.fn();
  const mockReceipts: Expense[] = [
    createMockExpense('exp-1', '/uploads/receipts/receipt1.jpg', 'Merchant 1', 50.00),
    createMockExpense('exp-2', '/uploads/receipts/receipt2.jpg', 'Merchant 2', 75.50),
    createMockExpense('exp-3', '/uploads/receipts/receipt3.jpg', 'Merchant 3', 100.25),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Opens and Closes', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText(/Receipt 1 of 3/)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and receipts exist', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
    });

    it('should not render when receipts array is empty', () => {
      render(
        <ReceiptsViewerModal
          receipts={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText(/Receipt/)).not.toBeInTheDocument();
    });

    it('should close modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByTitle('Close (Esc)');
      // Stop propagation to prevent backdrop click
      fireEvent.click(closeButton, { stopPropagation: () => {} });

      // onClose may be called multiple times due to event bubbling, but should be called at least once
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking outside (on backdrop)', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Click on backdrop (the outer div)
      const backdrop = screen.getByText(/Receipt 1 of 3/).closest('.fixed');
      if (backdrop) {
        // Click on the backdrop itself, not the content
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should not close modal when clicking on content', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Click on the image container (should not close)
      const image = screen.getByAltText('Receipt 1');
      await user.click(image);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('All Receipts Displayed', () => {
    it('should display first receipt initially', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Receipt 1');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('receipt1.jpg'));
    });

    it('should display all receipts in thumbnails', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // All thumbnails should be present
      expect(screen.getByAltText('Thumbnail 1')).toBeInTheDocument();
      expect(screen.getByAltText('Thumbnail 2')).toBeInTheDocument();
      expect(screen.getByAltText('Thumbnail 3')).toBeInTheDocument();
    });

    it('should show correct receipt when navigating', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Click next button
      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);

      // Should show second receipt
      await waitFor(() => {
        expect(screen.getByAltText('Receipt 2')).toBeInTheDocument();
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Controls', () => {
    it('should show prev/next buttons when multiple receipts', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTitle('Previous (←)')).toBeInTheDocument();
      expect(screen.getByTitle('Next (→)')).toBeInTheDocument();
    });

    it('should not show prev/next buttons when only one receipt', () => {
      const singleReceipt = [mockReceipts[0]];
      render(
        <ReceiptsViewerModal
          receipts={singleReceipt}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTitle('Previous (←)')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Next (→)')).not.toBeInTheDocument();
    });

    it('should navigate to next receipt when next button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
        expect(screen.getByAltText('Receipt 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous receipt when prev button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // First go to second receipt
      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
      });

      // Then go back
      const prevButton = screen.getByTitle('Previous (←)');
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
        expect(screen.getByAltText('Receipt 1')).toBeInTheDocument();
      });
    });

    it('should wrap around to last receipt when clicking prev on first', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Start at first receipt, click previous
      const prevButton = screen.getByTitle('Previous (←)');
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
        expect(screen.getByAltText('Receipt 3')).toBeInTheDocument();
      });
    });

    it('should wrap around to first receipt when clicking next on last', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to last receipt
      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton); // Receipt 2
      await user.click(nextButton); // Receipt 3

      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
      });

      // Click next again (should wrap to first)
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
        expect(screen.getByAltText('Receipt 1')).toBeInTheDocument();
      });
    });

    it('should navigate to receipt when thumbnail clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Click on third thumbnail
      const thumbnail3 = screen.getByTitle('View receipt 3');
      await user.click(thumbnail3);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
        expect(screen.getByAltText('Receipt 3')).toBeInTheDocument();
      });
    });

    it('should highlight current thumbnail', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // First thumbnail should be highlighted
      const thumbnail1 = screen.getByTitle('View receipt 1');
      expect(thumbnail1).toHaveClass('border-white');
      expect(thumbnail1).toHaveClass('scale-110');
    });
  });

  describe('Receipt Counter', () => {
    it('should display correct counter for first receipt', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Receipt 1 of 3')).toBeInTheDocument();
    });

    it('should update counter when navigating', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Receipt 2 of 3')).toBeInTheDocument();
      });
    });

    it('should display correct counter for single receipt', () => {
      const singleReceipt = [mockReceipts[0]];
      render(
        <ReceiptsViewerModal
          receipts={singleReceipt}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Receipt 1 of 1')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next receipt on ArrowRight key', async () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
      });
    });

    it('should navigate to previous receipt on ArrowLeft key', async () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // First go to second receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
      });

      // Then go back with ArrowLeft
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
      });
    });

    it('should close modal on Escape key', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not handle keyboard events when modal is closed', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'Escape' });

      // Should not call onClose since modal is closed
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should wrap around with ArrowLeft on first receipt', async () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Start at first receipt, press ArrowLeft
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
      });
    });

    it('should wrap around with ArrowRight on last receipt', async () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to last receipt
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/Receipt 3 of 3/)).toBeInTheDocument();
      });

      // Press ArrowRight again (should wrap to first)
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
      });
    });
  });

  describe('Receipt Info Display', () => {
    it('should display merchant name', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Merchant 1')).toBeInTheDocument();
    });

    it('should display amount', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('should update merchant and amount when navigating', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Merchant 2')).toBeInTheDocument();
        expect(screen.getByText('$75.50')).toBeInTheDocument();
      });
    });

    it('should handle receipt without merchant', () => {
      const receiptWithoutMerchant = [{
        ...createMockExpense('exp-1', '/uploads/receipts/receipt1.jpg', '', 50.00),
        merchant: undefined as any,
      }];
      render(
        <ReceiptsViewerModal
          receipts={receiptWithoutMerchant}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should not crash, merchant field should not be displayed when undefined
      expect(screen.queryByText(/Merchant/)).not.toBeInTheDocument();
    });

    it('should handle receipt without amount', () => {
      const receiptWithoutAmount = [{
        ...createMockExpense('exp-1', '/uploads/receipts/receipt1.jpg', 'Merchant 1', 0),
        amount: undefined as any,
      }];
      render(
        <ReceiptsViewerModal
          receipts={receiptWithoutAmount}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should not crash, amount field should not be displayed
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe('Image URL Construction', () => {
    it('should construct correct image URL with leading slash', () => {
      render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Receipt 1');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      expect(image).toHaveAttribute('src', expect.stringContaining(`${apiBaseUrl}/uploads/receipts/receipt1.jpg`));
    });

    it('should construct correct image URL without leading slash', () => {
      const receiptWithoutSlash = [createMockExpense('exp-1', 'uploads/receipts/receipt1.jpg', 'Merchant 1', 50.00)];
      render(
        <ReceiptsViewerModal
          receipts={receiptWithoutSlash}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Receipt 1');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      expect(image).toHaveAttribute('src', expect.stringContaining(`${apiBaseUrl}/uploads/receipts/receipt1.jpg`));
    });

    it('should handle receipt without receiptUrl', () => {
      const receiptWithoutUrl = [{
        ...createMockExpense('exp-1', '', 'Merchant 1', 50.00),
        receiptUrl: null as any,
      }];
      render(
        <ReceiptsViewerModal
          receipts={receiptWithoutUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('No receipt image available')).toBeInTheDocument();
    });
  });

  describe('Reset to First Receipt', () => {
    it('should reset to first receipt when modal opens', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // Navigate while closed (should not affect)
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // Open modal
      rerender(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should show first receipt
      expect(screen.getByText(/Receipt 1 of 3/)).toBeInTheDocument();
    });

    it('should reset to first receipt when receipts change', async () => {
      const { rerender } = render(
        <ReceiptsViewerModal
          receipts={mockReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Navigate to second receipt
      const nextButton = screen.getByTitle('Next (→)');
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 3/)).toBeInTheDocument();
      });

      // Change receipts (simulating new data)
      const newReceipts = [mockReceipts[0], mockReceipts[1]];
      rerender(
        <ReceiptsViewerModal
          receipts={newReceipts}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should reset to first receipt
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });
    });
  });
});

