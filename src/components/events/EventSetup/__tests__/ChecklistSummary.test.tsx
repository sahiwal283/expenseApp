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
    it('should display updated booth map URL when checklistData changes', () => {
      const initialData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/old-map.jpg',
        flights: [],
        hotels: [],
        carRentals: [],
      };

      const { rerender } = render(
        <ChecklistSummary
          user={mockUser}
          checklistData={initialData}
          loadingChecklist={false}
        />
      );

      // Initial map should be displayed
      let image = screen.queryByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('old-map.jpg'));

      // Update with new map URL (simulating data refresh)
      const updatedData = {
        ...initialData,
        booth_map_url: '/uploads/booth-maps/new-map.jpg',
      };

      rerender(
        <ChecklistSummary
          user={mockUser}
          checklistData={updatedData}
          loadingChecklist={false}
        />
      );

      // New map should be displayed
      image = screen.queryByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('new-map.jpg'));
    });

    it('should display booth map when it becomes available after refresh', () => {
      const dataWithoutMap = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: null,
        flights: [],
        hotels: [],
        carRentals: [],
      };

      const { rerender } = render(
        <ChecklistSummary
          user={mockUser}
          checklistData={dataWithoutMap}
          loadingChecklist={false}
        />
      );

      // No map should be displayed initially
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();

      // After refresh, map becomes available
      const dataWithMap = {
        ...dataWithoutMap,
        booth_map_url: '/uploads/booth-maps/new-map.jpg',
      };

      rerender(
        <ChecklistSummary
          user={mockUser}
          checklistData={dataWithMap}
          loadingChecklist={false}
        />
      );

      // Map should now be displayed
      const image = screen.queryByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('new-map.jpg'));
    });

    it('should remove booth map when it is deleted after refresh', () => {
      const dataWithMap = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/test-map.jpg',
        flights: [],
        hotels: [],
        carRentals: [],
      };

      const { rerender } = render(
        <ChecklistSummary
          user={mockUser}
          checklistData={dataWithMap}
          loadingChecklist={false}
        />
      );

      // Map should be displayed
      expect(screen.queryByAltText('Booth Map')).toBeInTheDocument();

      // After refresh, map is deleted
      const dataWithoutMap = {
        ...dataWithMap,
        booth_map_url: null,
      };

      rerender(
        <ChecklistSummary
          user={mockUser}
          checklistData={dataWithoutMap}
          loadingChecklist={false}
        />
      );

      // Map should no longer be displayed
      expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
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
    it('should render BoothMapImage when booth_map_url is available', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: '/uploads/booth-maps/test.jpg',
        flights: [],
        hotels: [],
        carRentals: [],
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
    });

    it('should not render BoothMapImage when booth_map_url is null', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: null,
        flights: [],
        hotels: [],
        carRentals: [],
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

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
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      // Empty string should be treated as falsy
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
      // Should show error message for invalid URL
      expect(screen.getByText('Invalid booth map URL')).toBeInTheDocument();
    });

    it('should handle missing flights array', () => {
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: null,
        // flights missing
        hotels: [],
        carRentals: [],
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

  describe('Booth Map URL Handling', () => {
    it('should pass correct booth_map_url to BoothMapImage', () => {
      const boothMapUrl = '/uploads/booth-maps/test-map.jpg';
      const checklistData = {
        booth_ordered: true,
        electricity_ordered: false,
        booth_map_url: boothMapUrl,
        flights: [],
        hotels: [],
        carRentals: [],
      };

      render(
        <ChecklistSummary
          user={mockUser}
          checklistData={checklistData}
          loadingChecklist={false}
        />
      );

      const image = screen.getByAltText('Booth Map');
      expect(image).toHaveAttribute('src', expect.stringContaining(boothMapUrl));
    });
  });
});

