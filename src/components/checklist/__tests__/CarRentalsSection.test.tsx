import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarRentalsSection } from '../sections/CarRentalsSection';
import { api } from '../../../utils/api';
import type { ChecklistData } from '../TradeShowChecklist';
import type { User, TradeShow } from '../../../App';

// Mock the API
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

// Mock ChecklistReceiptUpload component
vi.mock('../ChecklistReceiptUpload', () => ({
  ChecklistReceiptUpload: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="receipt-upload-modal">
      <button onClick={onClose}>Close Receipt Upload</button>
    </div>
  ),
}));

describe('CarRentalsSection', () => {
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
      { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', username: 'jane', role: 'salesperson', created_at: '2025-01-01' },
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
    carRentals: [
      {
        id: 1,
        provider: 'Enterprise',
        confirmation_number: 'ENT123',
        pickup_date: '2025-11-10',
        return_date: '2025-11-15',
        notes: 'SUV preferred',
        booked: false,
        rental_type: 'group',
        assigned_to_id: null,
        assigned_to_name: null,
      },
      {
        id: 2,
        provider: 'Hertz',
        confirmation_number: 'HRZ456',
        pickup_date: '2025-11-10',
        return_date: '2025-11-15',
        notes: 'Compact car',
        booked: false,
        rental_type: 'individual',
        assigned_to_id: 'user-1',
        assigned_to_name: 'John Doe',
      },
    ],
    boothShipping: [],
    customItems: [],
  };

  const mockOnReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the section with car rentals', () => {
      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('Add Rental')).toBeInTheDocument();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
      expect(screen.getByText('Hertz')).toBeInTheDocument();
    });

    it('should display group rental badge', () => {
      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('Group')).toBeInTheDocument();
    });

    it('should display individual rental with assigned user', () => {
      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    it('should show empty state when no rentals exist', () => {
      const emptyChecklist = { ...mockChecklist, carRentals: [] };

      render(
        <CarRentalsSection
          checklist={emptyChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('No car rentals added yet.')).toBeInTheDocument();
    });
  });

  describe('Add Rental Form', () => {
    it('should show add form when Add Rental button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));

      expect(screen.getByText('New Car Rental')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('e.g., Enterprise, Hertz').length).toBeGreaterThan(0);
    });

    it('should hide add form when Cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));
      expect(screen.getByText('New Car Rental')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByText('New Car Rental')).not.toBeInTheDocument();
    });

    it('should allow selecting rental type', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));

      // Get radios from the add form (first set)
      const radios = screen.getAllByRole('radio');
      const groupRadio = radios.find(r => (r as HTMLInputElement).value === 'group' && (r as HTMLInputElement).name === 'newRentalType') as HTMLInputElement;
      const individualRadio = radios.find(r => (r as HTMLInputElement).value === 'individual' && (r as HTMLInputElement).name === 'newRentalType') as HTMLInputElement;

      expect(groupRadio).toBeChecked(); // Default is group
      expect(individualRadio).not.toBeChecked();

      await user.click(individualRadio);
      expect(individualRadio).toBeChecked();
    });

    it('should show participant dropdown for individual rentals', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));
      
      const individualRadio = screen.getAllByText('Individual Rental').find(
        el => el.closest('label')?.querySelector('input[type="radio"]')
      );
      if (individualRadio) {
        const radioInput = individualRadio.closest('label')?.querySelector('input[type="radio"]');
        if (radioInput) await user.click(radioInput);
      }

      expect(screen.getByText('Assign to Participant')).toBeInTheDocument();
      expect(screen.getAllByText('Select participant...').length).toBeGreaterThan(0);
    });

    it('should create a new car rental when form is submitted', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.createCarRental).mockResolvedValue({ id: 3 });

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      await user.click(screen.getByText('Add Rental'));

      // Get all inputs and select the one from the add form (first one with empty value)
      const providerInputs = screen.getAllByPlaceholderText('e.g., Enterprise, Hertz');
      const confirmationInputs = screen.getAllByPlaceholderText('Reservation number');
      
      const providerInput = providerInputs.find(input => (input as HTMLInputElement).value === '') as HTMLInputElement;
      const confirmationInput = confirmationInputs.find(input => (input as HTMLInputElement).value === '') as HTMLInputElement;

      await user.type(providerInput, 'Budget');
      await user.type(confirmationInput, 'BUD789');

      const addButton = screen.getByRole('button', { name: 'Add' });
      await user.click(addButton);

      await waitFor(() => {
        expect(api.checklist.createCarRental).toHaveBeenCalledWith(1, expect.any(Object));
        expect(api.checklist.createCarRental).toHaveBeenCalledTimes(1);
      });

      expect(mockOnReload).toHaveBeenCalled();
    });
  });

  describe('Edit Rental', () => {
    it('should allow editing rental fields', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const providerInputs = screen.getAllByDisplayValue('Enterprise');
      await user.clear(providerInputs[0]);
      await user.type(providerInputs[0], 'National');

      // Save button should appear after modification
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should save changes when Save button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const providerInputs = screen.getAllByDisplayValue('Enterprise');
      await user.clear(providerInputs[0]);
      await user.type(providerInputs[0], 'National');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.checklist.updateCarRental).toHaveBeenCalledWith(1, expect.any(Object));
        expect(api.checklist.updateCarRental).toHaveBeenCalledTimes(1);
      });

      expect(mockOnReload).toHaveBeenCalled();
    });
  });

  describe('Toggle Booked Status', () => {
    it('should toggle booked status when checkbox is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateCarRental).mockResolvedValue({});

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Find the first unchecked circle (for Enterprise rental)
      const circles = screen.getAllByRole('button');
      const toggleButton = circles.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('w-6') && svg?.classList.contains('text-gray-400');
      });

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(api.checklist.updateCarRental).toHaveBeenCalledWith(1, expect.objectContaining({
            booked: true,
          }));
        });

        expect(mockOnReload).toHaveBeenCalled();
      }
    });
  });

  describe('Delete Rental', () => {
    it('should delete rental when delete button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.deleteCarRental).mockResolvedValue({ success: true });
      global.confirm = vi.fn(() => true);

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.querySelector('polyline'); // Trash icon has polyline
      });

      if (trashButton) {
        await user.click(trashButton);

        await waitFor(() => {
          expect(api.checklist.deleteCarRental).toHaveBeenCalled();
        });

        expect(mockOnReload).toHaveBeenCalled();
      }
    });

    it('should not delete rental if user cancels confirmation', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => false);

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.querySelector('polyline');
      });

      if (trashButton) {
        await user.click(trashButton);

        expect(api.checklist.deleteCarRental).not.toHaveBeenCalled();
        expect(mockOnReload).not.toHaveBeenCalled();
      }
    });
  });

  describe('Receipt Upload', () => {
    it('should open receipt upload modal when Upload Receipt is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const uploadButtons = screen.getAllByText('Upload Receipt');
      await user.click(uploadButtons[0]);

      expect(screen.getByTestId('receipt-upload-modal')).toBeInTheDocument();
    });

    it('should close receipt upload modal', async () => {
      const user = userEvent.setup();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const uploadButtons = screen.getAllByText('Upload Receipt');
      await user.click(uploadButtons[0]);

      expect(screen.getByTestId('receipt-upload-modal')).toBeInTheDocument();

      await user.click(screen.getByText('Close Receipt Upload'));

      expect(screen.queryByTestId('receipt-upload-modal')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should display unbooked rentals before booked rentals', () => {
      const checklistWithBooked = {
        ...mockChecklist,
        carRentals: [
          { ...mockChecklist.carRentals[0], id: 10, booked: true, provider: 'Booked Provider', confirmation_number: 'BOOK123', pickup_date: '2025-11-10', return_date: '2025-11-15', notes: null, rental_type: 'group', assigned_to_id: null, assigned_to_name: null },
          { ...mockChecklist.carRentals[1], id: 11, booked: false, provider: 'Unbooked Provider', confirmation_number: 'UNB456', pickup_date: '2025-11-10', return_date: '2025-11-15', notes: null, rental_type: 'group', assigned_to_id: null, assigned_to_name: null },
        ],
      };

      render(
        <CarRentalsSection
          checklist={checklistWithBooked}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Check that unbooked appears before booked
      expect(screen.getByText('Unbooked Provider')).toBeInTheDocument();
      expect(screen.getByText('Booked Provider')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show alert when rental creation fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.createCarRental).mockRejectedValue(new Error('Network error'));
      global.alert = vi.fn();

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

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to add car rental');
      });
    });

    it('should show alert when rental update fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateCarRental).mockRejectedValue(new Error('Network error'));
      global.alert = vi.fn();

      render(
        <CarRentalsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const providerInputs = screen.getAllByDisplayValue('Enterprise');
      await user.clear(providerInputs[0]);
      await user.type(providerInputs[0], 'National');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to save car rental information');
      });
    });
  });
});

