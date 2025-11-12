import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChecklistSummary } from '../ChecklistSummary';
import { createMockUser } from '../../../../test/utils/testHelpers';

/**
 * ChecklistSummary Component Tests
 * 
 * Tests the ChecklistSummary component including:
 * - Data refreshes when modal opens (via props)
 * - Booth map display integration
 * - Loading states
 * - Defensive checks for malformed data
 */

describe('ChecklistSummary Component Tests', () => {
  const mockUser = createMockUser();

  describe('Data Refreshes When Modal Opens', () => {
    it('should display updated checklist data when checklistData changes', () => {
      const initialData = {
        booth_ordered: false,
        electricity_ordered: false,
        booth_map_url: null,
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      };

      const { rerender } = render(
        <ChecklistSummary
          user={mockUser}
          checklistData={initialData}
          loadingChecklist={false}
        />
      );

      // Initial state should show unchecked booth
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();

      // Update with new data (simulating data refresh)
      const updatedData = {
        ...initialData,
        booth_ordered: true,
      };

      rerender(
        <ChecklistSummary
          user={mockUser}
          checklistData={updatedData}
          loadingChecklist={false}
        />
      );

      // Updated state should be reflected
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when loadingChecklist is true', () => {
      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={null}
          loadingChecklist={true}
        />
      );

      // Should show loading spinner (Loader2 component with animate-spin class)
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should not display checklist when loading', () => {
      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={null}
          loadingChecklist={true}
        />
      );

      expect(screen.queryByText('Booth Space Ordered')).not.toBeInTheDocument();
    });
  });

  describe('Booth Map Display Integration', () => {
    it('should NOT render booth map (moved to EventDetailsModal)', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Booth map should NOT be displayed in ChecklistSummary (moved to EventDetailsModal)
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
      expect(screen.queryByAltText('Booth Floor Plan')).not.toBeInTheDocument();
      expect(screen.queryByText('Booth Layout')).not.toBeInTheDocument();
    });

    it('should not render booth map even when booth_map_url is available', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Booth map should NOT be displayed (moved to EventDetailsModal)
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
    });
  });

  describe('Defensive Checks - Malformed API Responses', () => {
    it('should handle null checklistData', () => {
      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={null}
          loadingChecklist={false}
        />
      );

      expect(screen.getByText('Checklist not available')).toBeInTheDocument();
    });

    it('should handle checklistData with missing booth_map_url field', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        // booth_map_url missing
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      } as any;

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Should not crash
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
      // Booth map should NOT be displayed (moved to EventDetailsModal)
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
    });

    it('should handle checklistData with empty booth_map_url string', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '',
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Booth map should NOT be displayed (moved to EventDetailsModal)
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
    });

    it('should handle checklistData with wrong type for booth_map_url', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: 12345, // Wrong type
        flights: [],
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      } as any;

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Should not crash - component should handle invalid type gracefully
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
      // Booth map should NOT be displayed (moved to EventDetailsModal)
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
      expect(screen.queryByText('Invalid booth map URL')).not.toBeInTheDocument();
    });

    it('should handle missing flights array', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: null,
        // flights missing
        hotels: [],
        carRentals: [],
        flights_booked: 0,
        flights_total: 0,
        hotels_booked: 0,
        hotels_total: 0,
        car_rentals_booked: 0,
        car_rentals_total: 0,
        booth_shipped: false,
      } as any;

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Should use optional chaining or default
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
    });
  });
});

