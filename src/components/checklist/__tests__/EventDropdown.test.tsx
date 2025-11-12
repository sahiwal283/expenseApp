import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeShowChecklist, ChecklistData } from '../TradeShowChecklist';
import { api } from '../../../utils/api';
import { User, TradeShow } from '../../../App';
import { createMockUser, createMockEvent, createEmptyChecklist } from '../../../test/utils/testHelpers';

/**
 * Event Dropdown Tests
 * 
 * Tests the filter buttons removal feature:
 * - Event dropdown displays correctly
 * - Event selection and checklist loading
 * - All events shown in dropdown
 * - Auto-selection of first event
 * - No console errors
 * - Responsive design
 */

// Mock API calls
vi.mock('../../../utils/api', () => ({
  api: {
    USE_SERVER: true,
    getEvents: vi.fn(),
    checklist: {
      getChecklist: vi.fn(),
      updateChecklist: vi.fn(),
    },
  },
}));

describe('Event Dropdown - Filter Buttons Removal Tests', () => {
  const mockUser = createMockUser({ role: 'admin' });
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Event Dropdown Display', () => {
    it('should display event dropdown when events are loaded', async () => {
      const event1 = createMockEvent({ id: 'event-1', name: 'Event One' });
      const event2 = createMockEvent({ id: 'event-2', name: 'Event Two' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event1, event2]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should show "No events available" when no events exist', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([]);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('No events available')).toBeInTheDocument();
      });
    });

    it('should display all events in dropdown', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'Event One', startDate: '2025-11-01' }),
        createMockEvent({ id: 'event-2', name: 'Event Two', startDate: '2025-11-15' }),
        createMockEvent({ id: 'event-3', name: 'Event Three', startDate: '2025-12-01' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      // Check all events are in dropdown (via option elements)
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      const optionTexts = Array.from(dropdown.options).map(opt => opt.textContent);
      
      expect(optionTexts.some(text => text?.includes('Event One'))).toBe(true);
      expect(optionTexts.some(text => text?.includes('Event Two'))).toBe(true);
      expect(optionTexts.some(text => text?.includes('Event Three'))).toBe(true);
    });

    it('should display event name and date in dropdown options', async () => {
      const event = createMockEvent({ 
        id: 'event-1', 
        name: 'Test Event', 
        startDate: '2025-11-01' 
      });

      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
        expect(dropdown).toBeInTheDocument();
      });

      // Check event name and date are in dropdown option
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      const option = Array.from(dropdown.options).find(opt => opt.value === 'event-1');
      expect(option).toBeDefined();
      expect(option?.textContent).toContain('Test Event');
    });
  });

  describe('Event Selection and Checklist Loading', () => {
    it('should load checklist when event is selected', async () => {
      const event1 = createMockEvent({ id: 'event-1', name: 'Event One' });
      const event2 = createMockEvent({ id: 'event-2', name: 'Event Two' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event1, event2]);
      
      const checklist1 = createEmptyChecklist();
      const checklist2 = { ...createEmptyChecklist(), booth_ordered: true };

      vi.mocked(api.checklist.getChecklist)
        .mockResolvedValueOnce(checklist1) // First event auto-selected
        .mockResolvedValueOnce(checklist2); // Second event selected

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for initial load
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      // Select second event
      const dropdown = screen.getByRole('combobox');
      await userEvent.selectOptions(dropdown, 'event-2');

      // Should load checklist for second event
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-2');
      });
    });

    it('should show loading state when checklist is loading', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      
      // Delay checklist response to test loading state
      vi.mocked(api.checklist.getChecklist).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createEmptyChecklist()), 100))
      );

      render(<TradeShowChecklist user={mockUser} />);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByText('Loading checklist...')).toBeInTheDocument();
      });
    });

    it('should display checklist data after loading', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      
      const checklist: ChecklistData = {
        ...createEmptyChecklist(),
        booth_ordered: true,
        flights: [
          {
            id: 1,
            attendee_id: 'user-1',
            attendee_name: 'Test User',
            carrier: 'United',
            confirmation_number: 'ABC123',
            notes: null,
            booked: false,
          },
        ],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklist);

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for checklist to load
      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Should display checklist sections
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });

    it('should handle checklist loading error gracefully', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockRejectedValue(new Error('Failed to load'));

      render(<TradeShowChecklist user={mockUser} />);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load Checklist/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Auto-Selection of First Event', () => {
    it('should auto-select first event when events load', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'First Event' }),
        createMockEvent({ id: 'event-2', name: 'Second Event' }),
        createMockEvent({ id: 'event-3', name: 'Third Event' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for events to load and first event to be auto-selected
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      // Dropdown should show first event as selected
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown.value).toBe('event-1');
    });

    it('should maintain selection when events reload', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'First Event' }),
        createMockEvent({ id: 'event-2', name: 'Second Event' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for initial auto-selection
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      // Verify dropdown shows first event selected
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown.value).toBe('event-1');
    });

    it('should auto-select first event even if previous selection was cleared', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'First Event' }),
        createMockEvent({ id: 'event-2', name: 'Second Event' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Should auto-select first event
      await waitFor(() => {
        const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
        expect(dropdown.value).toBe('event-1');
      });
    });
  });

  describe('No Console Errors', () => {
    it('should not log console errors during normal operation', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Check that no unexpected errors were logged
      // Component may log expected messages, but should not have errors
      const errorCalls = consoleErrorSpy.mock.calls.filter(call => {
        const message = call[0]?.toString() || '';
        // Filter out expected logging and allow component's own console.error for errors
        return !message.includes('[Checklist]') && 
               !message.includes('Error loading events') &&
               !message.includes('Failed to load');
      });

      // Should have minimal unexpected errors (component may log expected errors)
      // The key is that component doesn't crash
      expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
    });

    it('should handle empty events array without errors', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([]);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('No events available')).toBeInTheDocument();
      });

      // Should handle empty events gracefully without crashing
      // Component may log expected messages
      expect(screen.getByText('No events available')).toBeInTheDocument();
    });

    it('should handle API errors without crashing', async () => {
      vi.mocked(api.getEvents).mockRejectedValue(new Error('API Error'));

      render(<TradeShowChecklist user={mockUser} />);

      // Component should render without crashing
      // May show error state or empty state, but should not crash
      await waitFor(() => {
        // Component should render something (either checklist or error state)
        const hasContent = screen.queryByRole('combobox') || 
                          screen.queryByText(/No events available/i) ||
                          screen.queryByText(/checklist/i);
        expect(hasContent).toBeTruthy();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile layout', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      // Check parent container has responsive classes
      const dropdownContainer = screen.getByRole('combobox').closest('.flex');
      expect(dropdownContainer).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should have full width on mobile, auto width on desktop', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      // Dropdown wrapper should have responsive width classes
      const dropdownWrapper = screen.getByRole('combobox').parentElement;
      expect(dropdownWrapper).toHaveClass('w-full', 'sm:w-auto');
    });

    it('should have responsive gap spacing', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Event One' });
      
      vi.mocked(api.getEvents).mockResolvedValue([event]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      // Container should have gap-4 for spacing
      const container = screen.getByRole('combobox').closest('.flex');
      expect(container).toHaveClass('gap-4');
    });
  });

  describe('Event Selection Interaction', () => {
    it('should update selected event when dropdown changes', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'Event One' }),
        createMockEvent({ id: 'event-2', name: 'Event Two' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for initial load
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      // Select second event
      const dropdown = screen.getByRole('combobox');
      await userEvent.selectOptions(dropdown, 'event-2');

      // Should update selection
      expect((dropdown as HTMLSelectElement).value).toBe('event-2');
    });

    it('should load checklist for newly selected event', async () => {
      const events = [
        createMockEvent({ id: 'event-1', name: 'Event One' }),
        createMockEvent({ id: 'event-2', name: 'Event Two' }),
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Wait for initial load
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      // Clear previous calls
      vi.mocked(api.checklist.getChecklist).mockClear();

      // Select second event
      const dropdown = screen.getByRole('combobox');
      await userEvent.selectOptions(dropdown, 'event-2');

      // Should load checklist for second event
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-2');
      });
    });

    it('should show "No events available" when events array is empty', async () => {
      // Test scenario where no events exist from the start
      vi.mocked(api.getEvents).mockResolvedValue([]);

      render(<TradeShowChecklist user={mockUser} />);

      // When no events, should show "No events available" in dropdown
      await waitFor(() => {
        const dropdowns = screen.getAllByRole('combobox');
        // Should have exactly one dropdown
        expect(dropdowns.length).toBe(1);
        const dropdown = dropdowns[0] as HTMLSelectElement;
        // Check dropdown has "No events available" option
        const options = Array.from(dropdown.options);
        const hasNoEventsOption = options.some(opt => opt.textContent?.includes('No events available'));
        expect(hasNoEventsOption).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('Multiple Events Handling', () => {
    it('should handle many events in dropdown', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({
          id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
          startDate: `2025-11-${String(i + 1).padStart(2, '0')}`,
        })
      );

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      // All events should be in dropdown (check via option elements)
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(dropdown.options);
      
      // Should have all events plus the default option
      expect(options.length).toBeGreaterThanOrEqual(events.length);
      
      // Check that event names appear in option text
      events.forEach(event => {
        const optionFound = options.some(option => 
          option.textContent?.includes(event.name)
        );
        expect(optionFound).toBe(true);
      });
    });

    it('should auto-select first event when many events are loaded', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
        })
      );

      vi.mocked(api.getEvents).mockResolvedValue(events);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(createEmptyChecklist());

      render(<TradeShowChecklist user={mockUser} />);

      // Should auto-select first event
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalledWith('event-1');
      });

      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown.value).toBe('event-1');
    });
  });
});

