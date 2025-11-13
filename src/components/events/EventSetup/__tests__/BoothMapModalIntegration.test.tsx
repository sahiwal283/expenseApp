import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventDetailsModal } from '../EventDetailsModal';
import { createMockUser, createMockEvent } from '../../../../test/utils/testHelpers';

/**
 * Booth Map Modal Integration Tests
 * 
 * Tests the integration between EventDetailsModal and BoothMapViewer:
 * - Clicking booth map image opens in-page modal (not new tab)
 * - Modal appears above event details (z-index)
 * - All close methods work
 */

describe('Booth Map Modal Integration Tests', () => {
  const mockUser = createMockUser();
  const mockEvent = createMockEvent();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Opening Modal from Event Details', () => {
    it('should open booth map modal when clicking booth map image', async () => {
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

      // Mock window.open to verify it's NOT called
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

      // Wait for booth map image to render
      await waitFor(() => {
        const image = screen.getByAltText('Booth Floor Plan');
        expect(image).toBeInTheDocument();
      });

      // Simulate image load
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      // Click the image
      await userEvent.click(image);

      // Should open modal (not new tab)
      await waitFor(() => {
        // BoothMapViewer modal should appear (has higher z-index header)
        const modalHeader = screen.getAllByText('Booth Floor Plan');
        expect(modalHeader.length).toBeGreaterThan(1); // One in EventDetailsModal, one in BoothMapViewer
      });

      // window.open should NOT be called
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('should open in-page modal, not new tab', async () => {
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

      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      await userEvent.click(image);

      // Verify modal opened in-page
      await waitFor(() => {
        expect(screen.getAllByText('Booth Floor Plan').length).toBeGreaterThan(1);
      });

      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('Z-Index Layering', () => {
    it('should render booth map modal above event details modal', async () => {
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

      const { container } = render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Event details modal should have z-50
      const eventModal = container.querySelector('.fixed.inset-0.z-50');
      expect(eventModal).toBeInTheDocument();

      // Open booth map modal
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);
      await userEvent.click(image);

      await waitFor(() => {
        // Booth map modal should have z-[9999]
        const boothMapModal = container.querySelector('.fixed.inset-0.z-\\[9999\\]');
        expect(boothMapModal).toBeInTheDocument();
      });
    });
  });

  describe('Closing Modal', () => {
    it('should close booth map modal when clicking backdrop', async () => {
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

      const { container } = render(
        <EventDetailsModal
          event={mockEvent}
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
          onClose={mockOnClose}
        />
      );

      // Open modal
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);
      await userEvent.click(image);

      await waitFor(() => {
        expect(screen.getAllByText('Booth Floor Plan').length).toBeGreaterThan(1);
      });

      // Click backdrop
      const backdrop = container.querySelector('.fixed.inset-0.z-\\[9999\\]');
      await userEvent.click(backdrop as HTMLElement);

      // Modal should close (only one "Booth Floor Plan" remaining - from EventDetailsModal)
      await waitFor(() => {
        const headers = screen.getAllByText('Booth Floor Plan');
        expect(headers.length).toBe(1); // Only the one in EventDetailsModal
      });
    });

    it('should close booth map modal when pressing Escape', async () => {
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

      // Open modal
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);
      await userEvent.click(image);

      await waitFor(() => {
        expect(screen.getAllByText('Booth Floor Plan').length).toBeGreaterThan(1);
      });

      // Press Escape
      await userEvent.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        const headers = screen.getAllByText('Booth Floor Plan');
        expect(headers.length).toBe(1);
      });
    });

    it('should close booth map modal when clicking close button', async () => {
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

      // Open modal
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);
      await userEvent.click(image);

      await waitFor(() => {
        expect(screen.getAllByText('Booth Floor Plan').length).toBeGreaterThan(1);
      });

      // Find and click close button in BoothMapViewer (there are multiple close buttons)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      // The last one should be from BoothMapViewer
      await userEvent.click(closeButtons[closeButtons.length - 1]);

      // Modal should close
      await waitFor(() => {
        const headers = screen.getAllByText('Booth Floor Plan');
        expect(headers.length).toBe(1);
      });
    });
  });
});


