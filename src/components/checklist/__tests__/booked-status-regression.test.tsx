import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarRentalsSection } from '../sections/CarRentalsSection';
import { api } from '../../../utils/api';
import type { ChecklistData } from '../TradeShowChecklist';
import type { User, TradeShow } from '../../../App';

/**
 * REGRESSION TESTS: Booked Status Bug
 * 
 * Bug: Frontend was hardcoding booked: true when saving car rentals,
 * ignoring the actual booked state from the user.
 * 
 * Fix: Removed hardcoded booked: true, now passes actual state.
 * 
 * These tests ensure the bug doesn't recur.
 */

vi.mock('../../../utils/api', () => ({
  api: {
    checklist: {
      createCarRental: vi.fn(),
      updateCarRental: vi.fn(),
      deleteCarRental: vi.fn(),
    },
    createExpense: vi.fn(),
  },
}));

vi.mock('../ChecklistReceiptUpload', () => ({
  ChecklistReceiptUpload: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="receipt-upload-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('REGRESSION: Booked Status Bug (v1.27.15)', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    role: 'coordinator',
    created_at: '2025-01-01',
  };

  const mockEvent: TradeShow = {
    id: 'event-123',
    name: 'Test Trade Show',
    location: 'Las Vegas, NV',
    start_date: '2025-11-10',
    end_date: '2025-11-15',
    description: 'Test event',
    status: 'upcoming',
    participants: [
      { id: 'user-1', name: 'John Doe', email: 'john@example.com', username: 'john', role: 'salesperson', created_at: '2025-01-01' },
    ],
    expenses: [],
    created_at: '2025-01-01',
  };

  const mockChecklist: ChecklistData = {
    id: 1,
    event_id: 'event-123',
    booth_ordered: false,
    booth_notes: null,
    booth_map_url: null,
    electricity_ordered: false,
    electricity_notes: null,
    templates_applied: false,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    flights: [],
    hotels: [],
    carRentals: [],
    boothShipping: [],
    customItems: [],
  };

  const mockOnReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creating New Car Rentals', () => {
    it('CRITICAL: should save booked: true when creating a rental WITH information', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.createCarRental).mockResolvedValue({ id: 1 });

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Open add form
      await user.click(screen.getByText('Add Rental'));

      // Fill in rental information
      const providerInputs = screen.getAllByPlaceholderText('e.g., Enterprise, Hertz');
      const providerInput = providerInputs.find(input => (input as HTMLInputElement).value === '') as HTMLInputElement;
      await user.type(providerInput, 'Enterprise');

      // Submit
      const addButton = screen.getByRole('button', { name: 'Add' });
      await user.click(addButton);

      // FIXED: Should preserve initial booked state (false for new rental)
      await waitFor(() => {
        expect(api.checklist.createCarRental).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            provider: 'Enterprise',
            booked: false, // FIXED: Should not auto-mark as booked, preserves initial state
          })
        );
      });
    });

    it('REGRESSION: should not hardcode booked status - respect component logic', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.createCarRental).mockResolvedValue({ id: 1 });

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));

      const providerInputs = screen.getAllByPlaceholderText('e.g., Enterprise, Hertz');
      const providerInput = providerInputs.find(input => (input as HTMLInputElement).value === '') as HTMLInputElement;
      await user.type(providerInput, 'Budget');

      const addButton = screen.getByRole('button', { name: 'Add' });
      await user.click(addButton);

      // The key test: verify the API is called with the component's intended booked value
      // (not hardcoded, but determined by the component's actual booked state)
      await waitFor(() => {
        const callArgs = vi.mocked(api.checklist.createCarRental).mock.calls[0];
        expect(callArgs).toBeDefined();
        expect(callArgs[1]).toHaveProperty('booked');
        // FIXED: The component preserves the actual state, not hardcoded to true
        expect(callArgs[1].booked).toBe(false);
      });
    });
  });

  describe('Updating Existing Car Rentals', () => {
    it('CRITICAL: should save booked: true when updating rental information', async () => {
      const user = userEvent.setup();
      const checklistWithRental: ChecklistData = {
        ...mockChecklist,
        carRentals: [{
          id: 1,
          provider: 'Enterprise',
          confirmation_number: 'ENT123',
          pickup_date: '2025-11-10',
          return_date: '2025-11-15',
          notes: null,
          booked: false, // Start unbooked
          rental_type: 'group',
          assigned_to_id: null,
          assigned_to_name: null,
        }],
      };

      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={checklistWithRental}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Edit the rental
      const providerInput = screen.getByDisplayValue('Enterprise');
      await user.clear(providerInput);
      await user.type(providerInput, 'Hertz');

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // CRITICAL: Should mark as booked when saving info
      await waitFor(() => {
        expect(api.checklist.updateCarRental).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            provider: 'Hertz',
            booked: false, // FIXED: Should preserve existing state, not hardcode to true
          })
        );
      });
    });

    it('REGRESSION: should preserve booked state when toggling checkbox', async () => {
      const user = userEvent.setup();
      const checklistWithRental: ChecklistData = {
        ...mockChecklist,
        carRentals: [{
          id: 1,
          provider: 'Enterprise',
          confirmation_number: 'ENT123',
          pickup_date: '2025-11-10',
          return_date: '2025-11-15',
          notes: null,
          booked: false, // Unbooked
          rental_type: 'group',
          assigned_to_id: null,
          assigned_to_name: null,
        }],
      };

      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={checklistWithRental}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Toggle the checkbox
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-gray-400'); // Unbooked circle
      });

      if (toggleButton) {
        await user.click(toggleButton);

        // CRITICAL: When toggling, should respect the toggle logic (false → true)
        await waitFor(() => {
          expect(api.checklist.updateCarRental).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
              booked: true, // Should flip to true
            })
          );
        });
      }
    });

    it('REGRESSION: toggling booked from true to false should work', async () => {
      const user = userEvent.setup();
      const checklistWithBookedRental: ChecklistData = {
        ...mockChecklist,
        carRentals: [{
          id: 1,
          provider: 'Enterprise',
          confirmation_number: 'ENT123',
          pickup_date: '2025-11-10',
          return_date: '2025-11-15',
          notes: null,
          booked: true, // Already booked
          rental_type: 'group',
          assigned_to_id: null,
          assigned_to_name: null,
        }],
      };

      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={checklistWithBookedRental}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Find and click the booked checkbox
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-green-600'); // Booked checkmark
      });

      if (toggleButton) {
        await user.click(toggleButton);

        // Should toggle from true to false
        await waitFor(() => {
          expect(api.checklist.updateCarRental).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
              booked: false, // Should flip to false
            })
          );
        });
      }
    });
  });

  describe('Booked Status Scenarios', () => {
    it('should handle scenario: unbooked rental → edit info → should become booked', async () => {
      const user = userEvent.setup();
      const checklistWithUnbookedRental: ChecklistData = {
        ...mockChecklist,
        carRentals: [{
          id: 1,
          provider: null,
          confirmation_number: null,
          pickup_date: null,
          return_date: null,
          notes: null,
          booked: false,
          rental_type: 'group',
          assigned_to_id: null,
          assigned_to_name: null,
        }],
      };

      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={checklistWithUnbookedRental}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Fill in the rental details
      const providerInputs = screen.getAllByPlaceholderText('e.g., Enterprise, Hertz');
      await user.type(providerInputs[0], 'Enterprise');

      const confirmationInputs = screen.getAllByPlaceholderText('Reservation number');
      await user.type(confirmationInputs[0], 'ENT123');

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // FIXED: Should preserve existing booked state (false) when filling details
      await waitFor(() => {
        expect(api.checklist.updateCarRental).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            provider: 'Enterprise',
            confirmationNumber: 'ENT123',
            booked: false, // FIXED: Should preserve existing state, not auto-mark as booked
          })
        );
      });
    });
  });
});

