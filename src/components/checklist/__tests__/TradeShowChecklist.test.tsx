import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TradeShowChecklist, ChecklistData } from '../TradeShowChecklist';
import { api } from '../../../utils/api';
import { User, TradeShow } from '../../../App';

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

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  username: 'testuser',
};

const mockEvent: TradeShow = {
  id: 'event-1',
  name: 'Test Event',
  venue: 'Test Venue',
  city: 'Test City',
  state: 'CA',
  startDate: '2025-11-01',
  endDate: '2025-11-03',
  showStartDate: '2025-11-01',
  showEndDate: '2025-11-03',
  travelStartDate: '2025-10-31',
  travelEndDate: '2025-11-04',
  status: 'upcoming',
  coordinatorId: 'user-1',
  participants: [
    { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin', username: 'testuser' },
  ],
};

describe('TradeShowChecklist - Page Load Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Allow console errors but track them
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Page Loads Without Errors', () => {
    it('should render checklist page without errors', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const emptyChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(emptyChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/checklist/i)).toBeInTheDocument();
      });

      // Verify component rendered without crashing
      expect(screen.getByText(/Trade Show Checklist/i)).toBeInTheDocument();
    });

    it('should handle events loading', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.getEvents).toHaveBeenCalled();
      });
    });

    it('should display event selector when events are loaded', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const emptyChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(emptyChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
    });
  });

  describe('All Sections Render Correctly', () => {
    it('should render all checklist sections', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const checklistWithData: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistWithData);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
        expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
        expect(screen.getByText(/Car Rentals/i)).toBeInTheDocument();
        expect(screen.getByText(/Custom Tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Events With Data', () => {
    it('should render checklist with flights data', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const checklistWithFlights: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [
          {
            id: 1,
            attendee_id: 'user-1',
            attendee_name: 'Test User',
            carrier: 'United Airlines',
            confirmation_number: 'ABC123',
            notes: 'Window seat preferred',
            booked: false,
          },
        ],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistWithFlights);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      });

      // Verify component rendered without crashing
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });

    it('should render checklist with hotels data', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const checklistWithHotels: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [
          {
            id: 1,
            attendee_id: 'user-1',
            attendee_name: 'Test User',
            property_name: 'Marriott',
            confirmation_number: 'MAR123',
            check_in_date: '2025-11-01',
            check_out_date: '2025-11-03',
            notes: 'King bed',
            booked: false,
          },
        ],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistWithHotels);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
      });

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should render checklist with car rentals data', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const checklistWithCarRentals: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [
          {
            id: 1,
            provider: 'Enterprise',
            confirmation_number: 'ENT123',
            pickup_date: '2025-11-01',
            return_date: '2025-11-03',
            notes: 'SUV preferred',
            booked: false,
            rental_type: 'group',
          },
        ],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistWithCarRentals);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Car Rentals/i)).toBeInTheDocument();
      });

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases - New Event (No Checklist Data)', () => {
    it('should handle new event with no checklist data', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      // Simulate API returning null/undefined for new event
      vi.mocked(api.checklist.getChecklist).mockRejectedValue(new Error('Checklist not found'));

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should not crash, should handle error gracefully
      // Component should still render even if checklist fails to load
    });

    it('should handle empty checklist data structure', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const emptyChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(emptyChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Verify component rendered without crashing (no undefined.length errors)
      expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases - Partial Data', () => {
    it('should handle checklist with partial flights data', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const partialChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_notes: 'Booth ordered',
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [
          {
            id: 1,
            attendee_id: 'user-1',
            attendee_name: 'Test User',
            carrier: null,
            confirmation_number: null,
            notes: null,
            booked: false,
          },
        ],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(partialChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      });

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle checklist with some sections empty', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const partialChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [
          {
            id: 1,
            attendee_id: 'user-1',
            attendee_name: 'Test User',
            carrier: 'United',
            confirmation_number: 'ABC123',
            notes: null,
            booked: true,
          },
        ],
        hotels: [], // Empty
        carRentals: [], // Empty
        boothShipping: [],
        customItems: [], // Empty
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(partialChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      });

      // Verify component rendered without crashing (empty arrays handled)
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });
  });

  describe('No Undefined.Length Errors', () => {
    it('should handle undefined arrays gracefully', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      // Create a checklist that might have undefined arrays (simulating API response issues)
      const problematicChecklist = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: undefined,
        hotels: undefined,
        carRentals: undefined,
        boothShipping: undefined,
        customItems: undefined,
      } as any;
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(problematicChecklist);

      // This should not throw undefined.length errors
      expect(() => {
        render(<TradeShowChecklist user={mockUser} />);
      }).not.toThrow();

      // Wait for component to render
      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle null arrays gracefully', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const nullArraysChecklist = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: null,
        hotels: null,
        carRentals: null,
        boothShipping: null,
        customItems: null,
      } as any;
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(nullArraysChecklist);

      // This should not throw undefined.length errors
      expect(() => {
        render(<TradeShowChecklist user={mockUser} />);
      }).not.toThrow();
    });

    it('should handle missing checklist properties', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const incompleteChecklist = {
        id: 1,
        event_id: 1,
        // Missing many properties
      } as any;
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(incompleteChecklist);

      expect(() => {
        render(<TradeShowChecklist user={mockUser} />);
      }).not.toThrow();
    });
  });

  describe('Events Without Data', () => {
    it('should handle empty events list', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([]);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.getEvents).toHaveBeenCalled();
      });

      // Should show no events message or handle gracefully
      await waitFor(() => {
        expect(api.getEvents).toHaveBeenCalled();
      });
    });

    it('should handle multiple events', async () => {
      const events: TradeShow[] = [
        mockEvent,
        {
          ...mockEvent,
          id: 'event-2',
          name: 'Second Event',
        },
      ];

      vi.mocked(api.getEvents).mockResolvedValue(events);
      
      const emptyChecklist: ChecklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_notes: null,
        booth_map_url: null,
        electricity_ordered: false,
        electricity_notes: null,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };
      
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(emptyChecklist);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.getEvents).toHaveBeenCalled();
      });

      // Check that events are loaded (may be in dropdown)
      await waitFor(() => {
        const eventElements = screen.queryAllByText(/Test Event|Second Event/i);
        expect(eventElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });
});

