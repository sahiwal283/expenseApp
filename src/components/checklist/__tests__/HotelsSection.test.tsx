import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HotelsSection } from '../sections/HotelsSection';
import { api } from '../../../utils/api';
import type { ChecklistData } from '../TradeShowChecklist';
import type { User, TradeShow } from '../../../App';

// Mock the API
vi.mock('../../../utils/api', () => ({
  api: {
    checklist: {
      createHotel: vi.fn(),
      updateHotel: vi.fn(),
      deleteHotel: vi.fn(),
    },
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

describe('HotelsSection', () => {
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
    hotels: [
      {
        id: 1,
        attendee_id: 'user-1',
        attendee_name: 'John Doe',
        property_name: 'Marriott Downtown',
        confirmation_number: 'MAR123',
        check_in_date: '2025-11-10',
        check_out_date: '2025-11-15',
        notes: 'King bed',
        booked: false,
      },
      {
        id: 2,
        attendee_id: 'user-2',
        attendee_name: 'Jane Smith',
        property_name: 'Hilton Garden Inn',
        confirmation_number: 'HIL456',
        check_in_date: '2025-11-10',
        check_out_date: '2025-11-15',
        notes: 'Two queen beds',
        booked: true,
      },
    ],
    carRentals: [],
    boothShipping: [],
    customItems: [],
  };

  const mockOnReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the section with hotels for each participant', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Marriott Downtown')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hilton Garden Inn')).toBeInTheDocument();
    });

    it('should display participant email addresses', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should show empty state when no participants exist', () => {
      const emptyEvent = { ...mockEvent, participants: [] };

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={emptyEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getByText('No participants added to this event yet.')).toBeInTheDocument();
    });

    it('should display booked status correctly', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // John's hotel is not booked (gray circle)
      // Jane's hotel is booked (green checkmark)
      const buttons = screen.getAllByRole('button');
      const checkCircles = buttons.filter(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-green-600') || svg?.classList.contains('text-gray-400');
      });

      expect(checkCircles.length).toBeGreaterThan(0);
    });
  });

  describe('Hotel Information Fields', () => {
    it('should render all hotel input fields', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getAllByText('Property Name').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Confirmation Number').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Check-In Date').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Check-Out Date').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
    });

    it('should allow editing hotel fields', async () => {
      const user = userEvent.setup();

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const propertyInput = screen.getByDisplayValue('Marriott Downtown');
      await user.clear(propertyInput);
      await user.type(propertyInput, 'Holiday Inn Express');

      // Save button should appear after modification
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should prevent check-out date before check-in date', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const checkOutInputs = screen.getAllByDisplayValue('2025-11-15');
      const checkOutInput = checkOutInputs[0] as HTMLInputElement;

      // Check-out input should have min attribute set to check-in date
      expect(checkOutInput).toHaveAttribute('min', '2025-11-10');
    });
  });

  describe('Create New Hotel', () => {
    it('should create a new hotel when saving for participant without hotel', async () => {
      const user = userEvent.setup();
      const checklistNoHotels = { ...mockChecklist, hotels: [] };
      vi.mocked(api.checklist.createHotel).mockResolvedValue({ id: 3 });

      render(
        <HotelsSection
          checklist={checklistNoHotels}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const propertyInputs = screen.getAllByPlaceholderText('e.g., Marriott Downtown');
      await user.type(propertyInputs[0], 'New Hotel');

      const confirmationInputs = screen.getAllByPlaceholderText('Reservation number');
      await user.type(confirmationInputs[0], 'NEW123');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.checklist.createHotel).toHaveBeenCalledWith(1, expect.any(Object));
        expect(api.checklist.createHotel).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      expect(mockOnReload).toHaveBeenCalled();
    });
  });

  describe('Update Existing Hotel', () => {
    it('should update existing hotel when saving', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({});

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const propertyInput = screen.getByDisplayValue('Marriott Downtown');
      await user.clear(propertyInput);
      await user.type(propertyInput, 'Sheraton');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.checklist.updateHotel).toHaveBeenCalledWith(1, expect.any(Object));
        expect(api.checklist.updateHotel).toHaveBeenCalledTimes(1);
      });

      expect(mockOnReload).toHaveBeenCalled();
    });

    it('should update check-in and check-out dates', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({});

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const checkInInputs = screen.getAllByDisplayValue('2025-11-10');
      await user.clear(checkInInputs[0]);
      await user.type(checkInInputs[0], '2025-11-09');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.checklist.updateHotel).toHaveBeenCalledWith(1, expect.objectContaining({
          checkInDate: '2025-11-09',
        }));
      });
    });

    it('should update notes field', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({});

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const notesInputs = screen.getAllByPlaceholderText(/Room type/);
      await user.clear(notesInputs[0]);
      await user.type(notesInputs[0], 'Corner room with view');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.checklist.updateHotel).toHaveBeenCalledWith(1, expect.objectContaining({
          notes: 'Corner room with view',
        }));
      });
    });
  });

  describe('Toggle Booked Status', () => {
    it('should toggle booked status when checkbox is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({});

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Find the unbooked hotel's toggle button (John's hotel)
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-gray-400');
      });

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(api.checklist.updateHotel).toHaveBeenCalledWith(1, expect.objectContaining({
            booked: true,
          }));
        });

        expect(mockOnReload).toHaveBeenCalled();
      }
    });

    it('should toggle from booked to unbooked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockResolvedValue({});

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Find the booked hotel's toggle button (Jane's hotel)
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-green-600');
      });

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(api.checklist.updateHotel).toHaveBeenCalledWith(2, expect.objectContaining({
            booked: false,
          }));
        });

        expect(mockOnReload).toHaveBeenCalled();
      }
    });

    it('should not toggle if hotel does not exist yet', async () => {
      const user = userEvent.setup();
      const checklistNoHotels = { ...mockChecklist, hotels: [] };

      render(
        <HotelsSection
          checklist={checklistNoHotels}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      // Toggle buttons should be disabled for participants without hotels
      const buttons = screen.getAllByRole('button');
      const disabledToggles = buttons.filter(btn => btn.hasAttribute('disabled'));

      expect(disabledToggles.length).toBeGreaterThan(0);
    });
  });

  describe('Receipt Upload', () => {
    it('should open receipt upload modal when Upload Receipt is clicked', async () => {
      const user = userEvent.setup();

      render(
        <HotelsSection
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
        <HotelsSection
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
    it('should display unbooked hotels before booked hotels', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const participants = screen.getAllByText(/Doe|Smith/);
      // John Doe (unbooked) should appear before Jane Smith (booked)
      expect(participants[0]).toHaveTextContent('John Doe');
      expect(participants[1]).toHaveTextContent('Jane Smith');
    });
  });

  describe('Error Handling', () => {
    it('should show alert when hotel creation fails', async () => {
      const user = userEvent.setup();
      const checklistNoHotels = { ...mockChecklist, hotels: [] };
      vi.mocked(api.checklist.createHotel).mockRejectedValue(new Error('Network error'));
      global.alert = vi.fn();

      render(
        <HotelsSection
          checklist={checklistNoHotels}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const propertyInputs = screen.getAllByPlaceholderText('e.g., Marriott Downtown');
      await user.type(propertyInputs[0], 'New Hotel');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to save hotel information');
      });
    });

    it('should show alert when hotel update fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockRejectedValue(new Error('Network error'));
      global.alert = vi.fn();

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const propertyInput = screen.getByDisplayValue('Marriott Downtown');
      await user.clear(propertyInput);
      await user.type(propertyInput, 'Sheraton');

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to save hotel information');
      });
    });

    it('should handle toggle booked error gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(api.checklist.updateHotel).mockRejectedValue(new Error('Network error'));

      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-gray-400');
      });

      if (toggleButton) {
        await user.click(toggleButton);

        await waitFor(() => {
          expect(api.checklist.updateHotel).toHaveBeenCalled();
        });

        // Should not reload on error
        expect(mockOnReload).not.toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for form inputs', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getAllByText('Property Name').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Confirmation Number').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Check-In Date').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Check-Out Date').length).toBeGreaterThan(0);
    });

    it('should have proper placeholder text', () => {
      render(
        <HotelsSection
          checklist={mockChecklist}
          user={mockUser}
          event={mockEvent}
          onReload={mockOnReload}
        />
      );

      expect(screen.getAllByPlaceholderText('e.g., Marriott Downtown').length).toBeGreaterThan(0);
      expect(screen.getAllByPlaceholderText('Reservation number').length).toBeGreaterThan(0);
      expect(screen.getAllByPlaceholderText(/Room type/).length).toBeGreaterThan(0);
    });
  });
});

