import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChecklistSummary } from '../useChecklistSummary';
import { api } from '../../../../../utils/api';

/**
 * useChecklistSummary Hook Tests
 * 
 * Tests the checklist loading hook:
 * - No infinite loops (useCallback stability)
 * - Loading state transitions
 * - Error handling
 * - Booth map URL extraction
 */

vi.mock('../../../../../utils/api', () => ({
  api: {
    USE_SERVER: true,
    checklist: {
      getChecklist: vi.fn(),
    },
  },
}));

describe('useChecklistSummary Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('No Infinite Loops', () => {
    it('should return stable loadChecklistSummary function (useCallback)', () => {
      const { result, rerender } = renderHook(() => useChecklistSummary());

      const firstCall = result.current.loadChecklistSummary;
      
      // Rerender multiple times
      rerender();
      rerender();
      rerender();

      // Function reference should be stable (same reference)
      expect(result.current.loadChecklistSummary).toBe(firstCall);
    });

    it('should not cause infinite loop when called multiple times', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      // Call multiple times rapidly
      await result.current.loadChecklistSummary('event-1', 2);
      await result.current.loadChecklistSummary('event-1', 2);
      await result.current.loadChecklistSummary('event-1', 2);

      // Should only be called 3 times (once per call, not infinite)
      expect(api.checklist.getChecklist).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading State Transitions', () => {
    it('should set loading to true when loading starts', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: false,
        booth_map_url: null,
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      // Delay response to test loading state
      vi.mocked(api.checklist.getChecklist).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(checklistData), 50))
      );

      const { result } = renderHook(() => useChecklistSummary());

      // Start loading
      const loadPromise = result.current.loadChecklistSummary('event-1', 0);

      // Wait for loading state to be set (React state updates are async)
      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(true);
      }, { timeout: 100 });

      await loadPromise;

      // Should be done loading
      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
      });
    });

    it('should set loading to false after successful load', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 2);

      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
        expect(result.current.checklistData).not.toBeNull();
      });
    });

    it('should set loading to false after error', async () => {
      vi.mocked(api.checklist.getChecklist).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 0);

      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
      });
    });
  });

  describe('Booth Map URL Extraction', () => {
    it('should extract booth_map_url when present', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 2);

      await waitFor(() => {
        expect(result.current.checklistData?.booth_map_url).toBe('/uploads/booth-maps/test.jpg');
      });
    });

    it('should set booth_map_url to null when not present', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: null,
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 2);

      await waitFor(() => {
        expect(result.current.checklistData?.booth_map_url).toBeNull();
      });
    });

    it('should set booth_map_url to null when empty string', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: '',
        electricity_ordered: false,
        flights: [],
        hotels: [],
        carRentals: [],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 2);

      await waitFor(() => {
        expect(result.current.checklistData?.booth_map_url).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(api.checklist.getChecklist).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 0);

      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
        expect(result.current.checklistData).toBeNull();
      });
    });

    it('should handle invalid data gracefully', async () => {
      vi.mocked(api.checklist.getChecklist).mockResolvedValue(null as any);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 0);

      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
        expect(result.current.checklistData).toBeNull();
      });
    });

    it('should handle non-object data gracefully', async () => {
      vi.mocked(api.checklist.getChecklist).mockResolvedValue('invalid' as any);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 0);

      await waitFor(() => {
        expect(result.current.loadingChecklist).toBe(false);
        expect(result.current.checklistData).toBeNull();
      });
    });
  });

  describe('Checklist Data Normalization', () => {
    it('should normalize checklist data correctly', async () => {
      const checklistData = {
        id: 1,
        event_id: 1,
        booth_ordered: true,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        electricity_ordered: false,
        flights: [
          { id: 1, attendee_id: 'user-1', attendee_name: 'User 1', carrier: 'United', confirmation_number: 'ABC123', notes: null, booked: true },
          { id: 2, attendee_id: 'user-2', attendee_name: 'User 2', carrier: 'Delta', confirmation_number: 'DEF456', notes: null, booked: false },
        ],
        hotels: [
          { id: 1, attendee_id: 'user-1', attendee_name: 'User 1', property_name: 'Marriott', confirmation_number: 'MAR123', check_in_date: '2026-01-01', check_out_date: '2026-01-03', notes: null, booked: true },
        ],
        carRentals: [
          { id: 1, provider: 'Enterprise', confirmation_number: 'ENT123', pickup_date: '2026-01-01', return_date: '2026-01-03', notes: null, booked: false, rental_type: 'group' },
        ],
        boothShipping: [],
        customItems: [],
      };

      vi.mocked(api.checklist.getChecklist).mockResolvedValue(checklistData);

      const { result } = renderHook(() => useChecklistSummary());

      await result.current.loadChecklistSummary('event-1', 2); // 2 participants

      await waitFor(() => {
        expect(result.current.checklistData).not.toBeNull();
        expect(result.current.checklistData?.flights_booked).toBe(1); // 1 booked flight
        expect(result.current.checklistData?.flights_total).toBe(2); // participant count
        expect(result.current.checklistData?.hotels_booked).toBe(1); // 1 booked hotel
        expect(result.current.checklistData?.hotels_total).toBe(2); // participant count
        expect(result.current.checklistData?.car_rentals_booked).toBe(0); // 0 booked
        expect(result.current.checklistData?.car_rentals_total).toBe(1); // 1 car rental record
      });
    });
  });
});

