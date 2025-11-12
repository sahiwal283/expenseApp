import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventDetailsModal } from '../EventDetailsModal';
import { createMockUser, createMockEvent } from '../../../../test/utils/testHelpers';

/**
 * EventDetailsModal Component Tests
 * 
 * Tests the EventDetailsModal component including:
 * - Booth map display (moved from ChecklistSummary)
 * - Conditional rendering (with/without booth map URL)
 * - Loading states
 * - Error states
 */

describe('EventDetailsModal Component Tests', () => {
  const mockUser = createMockUser();
  const mockEvent = createMockEvent();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Booth Map Display', () => {
    it('should display booth map when booth_map_url is available', async () => {
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should show "Booth Floor Plan" section
      expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
      expect(screen.getByText('Booth Layout')).toBeInTheDocument();

      // Should show booth map image
      await waitFor(() => {
        const image = screen.getByAltText('Booth Floor Plan');
        expect(image).toBeInTheDocument();
      });
    });

    it('should not display booth map when booth_map_url is null', () => {
      const checklistData = {
        booth_ordered: true,
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

      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should not show "Booth Floor Plan" section
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
      expect(screen.queryByText('Booth Layout')).not.toBeInTheDocument();
    });

    it('should not display booth map when booth_map_url is undefined', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: undefined,
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should not show "Booth Floor Plan" section
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });

    it('should not display booth map when checklistData is null', () => {
      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={null}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should not show "Booth Floor Plan" section
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });

    it('should not display booth map when loadingChecklist is true', () => {
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={true}
          onClose={mockOnClose}
        />
      );

      // Should not show "Booth Floor Plan" section when loading
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });
  });

  describe('Booth Map Image Component', () => {
    it('should display loading state initially', async () => {
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should show loading spinner initially
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should handle invalid booth map URL', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '', // Empty string - treated as falsy, so section won't render
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Empty string is falsy, so booth map section won't render at all
      // (condition: checklistData?.booth_map_url evaluates to false)
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });

    it('should handle wrong type for booth_map_url', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: 12345 as any, // Wrong type - treated as truthy, so section renders but component shows error
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Wrong type is truthy, so booth map section renders
      // But BoothMapImage component will show error message
      expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
      expect(screen.getByText('Invalid booth map URL')).toBeInTheDocument();
    });

    it('should construct correct image URL', async () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: boothMapUrl,
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Wait for image to load
      await waitFor(() => {
        const image = screen.getByAltText('Booth Floor Plan');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', expect.stringContaining(boothMapUrl));
      });
    });

    it('should normalize URL that does not start with /', async () => {
      const boothMapUrl = 'uploads/booth-maps/test.jpg'; // No leading slash
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: boothMapUrl,
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should normalize URL by adding leading slash
      await waitFor(() => {
        const image = screen.getByAltText('Booth Floor Plan');
        expect(image).toBeInTheDocument();
        // URL should be normalized to start with /
        expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/booth-maps/test.jpg'));
      });
    });

    it('should display error state when image fails to load', async () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/nonexistent.jpg',
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Find the image element
      const image = screen.getByAltText('Booth Floor Plan');
      
      // Simulate image error
      const errorEvent = new Event('error', { bubbles: true });
      image.dispatchEvent(errorEvent);

      // Wait for error state to be displayed
      await waitFor(() => {
        expect(screen.getByText('Failed to load booth map image')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should allow clicking image to view full size', async () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: boothMapUrl,
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

      // Mock window.open
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Wait for image to be rendered (may still be loading)
      await waitFor(() => {
        const image = screen.getByAltText('Booth Floor Plan');
        expect(image).toBeInTheDocument();
      });

      // Simulate image load to ensure it's clickable
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      // Wait a bit for state to update
      await waitFor(() => {
        expect(image).toHaveAttribute('title', 'Click to view full size');
      }, { timeout: 1000 });

      // Click image
      await userEvent.click(image);

      // Should open image in new window
      expect(mockOpen).toHaveBeenCalled();
    });
  });

  describe('Conditional Rendering', () => {
    it('should show booth map when all conditions are met', async () => {
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should show booth map section
      expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
      expect(screen.getByText('Booth Layout')).toBeInTheDocument();
    });

    it('should hide booth map when loadingChecklist is true', () => {
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
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={true}
          onClose={mockOnClose}
        />
      );

      // Should not show booth map when loading
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });

    it('should hide booth map when booth_map_url is null', () => {
      const checklistData = {
        booth_ordered: true,
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

      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should not show booth map when URL is null
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });

    it('should hide booth map when checklistData is null', () => {
      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={null}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should not show booth map when checklistData is null
      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();
    });
  });

  describe('Integration with ChecklistSummary', () => {
    it('should display ChecklistSummary component', () => {
      const checklistData = {
        booth_ordered: true,
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

      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Should show ChecklistSummary
      expect(screen.getByText('Event Checklist')).toBeInTheDocument();
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
    });

    it('should pass correct props to ChecklistSummary', () => {
      const checklistData = {
        booth_ordered: true,
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

      render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // ChecklistSummary should receive correct props
      expect(screen.getByText('Booth Space Ordered')).toBeInTheDocument();
    });
  });
});

