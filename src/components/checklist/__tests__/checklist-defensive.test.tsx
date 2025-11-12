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

describe('TradeShowChecklist - Defensive Checks Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Null/Undefined API Responses', () => {
    it('should handle null API response', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(null as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalled();
      });

      // Should not crash, should handle gracefully
      expect(screen.getByText(/Trade Show Checklist/i)).toBeInTheDocument();
    });

    it('should handle undefined API response', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(undefined as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(api.checklist.getChecklist).toHaveBeenCalled();
      });

      // Should not crash
      expect(screen.getByText(/Trade Show Checklist/i)).toBeInTheDocument();
    });
  });

  describe('Missing Fields', () => {
    it('should handle missing flights field', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const incompleteData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        // Missing flights field
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(incompleteData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Should not throw undefined.length error
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });

    it('should handle missing hotels field', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const incompleteData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: [],
        // Missing hotels field
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(incompleteData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
      });
    });

    it('should handle missing all array fields', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const minimalData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        // Missing all array fields
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(minimalData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Should render all sections without crashing
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
    });
  });

  describe('Wrong Field Types', () => {
    it('should handle flights as string instead of array', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const wrongTypeData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: 'not an array', // Wrong type
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(wrongTypeData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      });

      // Should normalize to empty array
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });

    it('should handle hotels as number instead of array', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const wrongTypeData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: [],
        hotels: 123, // Wrong type
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(wrongTypeData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
      });
    });

    it('should handle carRentals as object instead of array', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const wrongTypeData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: [],
        hotels: [],
        carRentals: { provider: 'Enterprise' }, // Wrong type
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(wrongTypeData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Car Rentals/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty Arrays', () => {
    it('should handle all empty arrays', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const emptyArraysData: ChecklistData = {
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

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(emptyArraysData);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
        expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
        expect(screen.getByText(/Car Rentals/i)).toBeInTheDocument();
      });

      // Verify no undefined.length errors
      expect(screen.getByText(/Custom Tasks/i)).toBeInTheDocument();
    });
  });

  describe('Array Normalization', () => {
    it('should normalize null arrays to empty arrays', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const nullArraysData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: null,
        hotels: null,
        carRentals: null,
        boothShipping: null,
        customItems: null,
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(nullArraysData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Flights/i)).toBeInTheDocument();
      });

      // Should normalize null to empty array
      expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
    });

    it('should normalize undefined arrays to empty arrays', async () => {
      vi.mocked(api.getEvents).mockResolvedValue([mockEvent]);
      
      const undefinedArraysData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        flights: undefined,
        hotels: undefined,
        carRentals: undefined,
        boothShipping: undefined,
        customItems: undefined,
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(undefinedArraysData as any);

      render(<TradeShowChecklist user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Booth & Facilities/i)).toBeInTheDocument();
      });

      // Should normalize undefined to empty array
      expect(screen.getByText(/Flights/i)).toBeInTheDocument();
    });
  });
});

