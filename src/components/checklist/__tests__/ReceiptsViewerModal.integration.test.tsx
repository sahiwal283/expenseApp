import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoothSection } from '../sections/BoothSection';
import { Expense } from '../../../App';
import { createMockUser, createMockEvent, createEmptyChecklist } from '../../../test/utils/testHelpers';

/**
 * ReceiptsViewerModal Integration Tests
 * 
 * Tests integration with BoothSection for all three sections:
 * - Booth section
 * - Electricity section
 * - Booth shipping section
 */

// Mock the useBoothReceipts hook
vi.mock('../sections/BoothSection/hooks/useBoothReceipts', () => ({
  useBoothReceipts: () => ({
    receiptStatus: {
      booth: [
        { id: 'exp-1', receiptUrl: '/uploads/receipts/booth1.jpg', merchant: 'Booth Merchant 1', amount: 100 },
        { id: 'exp-2', receiptUrl: '/uploads/receipts/booth2.jpg', merchant: 'Booth Merchant 2', amount: 200 },
      ],
      electricity: [
        { id: 'exp-3', receiptUrl: '/uploads/receipts/electricity1.jpg', merchant: 'Electricity Merchant', amount: 50 },
      ],
      booth_shipping: [
        { id: 'exp-4', receiptUrl: '/uploads/receipts/shipping1.jpg', merchant: 'Shipping Merchant', amount: 75 },
        { id: 'exp-5', receiptUrl: '/uploads/receipts/shipping2.jpg', merchant: 'Shipping Merchant 2', amount: 80 },
      ],
    },
    loadReceipts: vi.fn(),
  }),
}));

// Mock API calls
vi.mock('../../../utils/api', () => ({
  api: {
    checklist: {
      updateMainFields: vi.fn(),
      uploadBoothMap: vi.fn(),
      deleteBoothMap: vi.fn(),
      getBoothShipping: vi.fn(),
      createBoothShipping: vi.fn(),
      updateBoothShipping: vi.fn(),
      deleteBoothShipping: vi.fn(),
    },
  },
}));

describe('ReceiptsViewerModal Integration Tests', () => {
  const mockUser = createMockUser();
  const mockEvent = createMockEvent();
  const mockChecklist = createEmptyChecklist();
  const mockOnUpdate = vi.fn();
  const mockOnReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Booth Section', () => {
    it('should open modal when clicking View button on booth section', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      // Find and click View button in booth section
      const viewButtons = screen.getAllByTitle('View receipt');
      const boothViewButton = viewButtons[0]; // First View button is for booth

      await user.click(boothViewButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });
    });

    it('should display all booth receipts in modal', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      const viewButtons = screen.getAllByTitle('View receipt');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        // Should show counter
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
        // Should show thumbnails
        expect(screen.getByAltText('Thumbnail 1')).toBeInTheDocument();
        expect(screen.getByAltText('Thumbnail 2')).toBeInTheDocument();
      });
    });
  });

  describe('Electricity Section', () => {
    it('should open modal when clicking View button on electricity section', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      // Find View button in electricity section (second View button)
      const viewButtons = screen.getAllByTitle('View receipt');
      const electricityViewButton = viewButtons[1];

      await user.click(electricityViewButton);

      // Modal should open with electricity receipt
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
        expect(screen.getByText('Electricity Merchant')).toBeInTheDocument();
      });
    });

    it('should display electricity receipt info correctly', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      const viewButtons = screen.getAllByTitle('View receipt');
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('Electricity Merchant')).toBeInTheDocument();
        expect(screen.getByText('$50.00')).toBeInTheDocument();
      });
    });
  });

  describe('Booth Shipping Section', () => {
    it('should open modal when clicking View button on booth shipping section', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      // Find View button in booth shipping section (third View button)
      const viewButtons = screen.getAllByTitle('View receipt');
      const shippingViewButton = viewButtons[2];

      await user.click(shippingViewButton);

      // Modal should open with shipping receipts
      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });
    });

    it('should display all booth shipping receipts', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      const viewButtons = screen.getAllByTitle('View receipt');
      await user.click(viewButtons[2]);

      await waitFor(() => {
        // Should show counter for 2 receipts
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
        // Should show thumbnails
        expect(screen.getByAltText('Thumbnail 1')).toBeInTheDocument();
        expect(screen.getByAltText('Thumbnail 2')).toBeInTheDocument();
      });
    });

    it('should navigate between shipping receipts', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      const viewButtons = screen.getAllByTitle('View receipt');
      await user.click(viewButtons[2]);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
      });

      // Navigate to second receipt
      const nextButton = screen.getByTitle('Next (→)');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 2 of 2/)).toBeInTheDocument();
        expect(screen.getByText('Shipping Merchant 2')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Section Functionality', () => {
    it('should close modal and open with different section receipts', async () => {
      const user = userEvent.setup();
      render(
        <BoothSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onUpdate={mockOnUpdate}
          onReload={mockOnReload}
          saving={false}
        />
      );

      // Open booth receipts
      const viewButtons = screen.getAllByTitle('View receipt');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 2/)).toBeInTheDocument();
        expect(screen.getByText('Booth Merchant 1')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTitle('Close (Esc)');
      await user.click(closeButton);

      // Wait for modal to close (may take a moment)
      await waitFor(() => {
        const receiptText = screen.queryByText(/Receipt 1 of 2/);
        expect(receiptText).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Open electricity receipts
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/Receipt 1 of 1/)).toBeInTheDocument();
        expect(screen.getByText('Electricity Merchant')).toBeInTheDocument();
      });
    });
  });
});

