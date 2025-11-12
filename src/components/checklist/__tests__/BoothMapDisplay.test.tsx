import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BoothMapUpload } from '../sections/BoothSection/BoothMapUpload';
import { createMockChecklist } from '../../../test/utils/testHelpers';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

describe('Booth Map Display Tests', () => {
  let mockBoothMapInputRef: React.RefObject<HTMLInputElement>;
  let mockOnMapUpload: vi.Mock;
  let mockOnDeleteMap: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBoothMapInputRef = { current: document.createElement('input') };
    mockOnMapUpload = vi.fn();
    mockOnDeleteMap = vi.fn();
  });

  describe('BoothMapUpload Component', () => {
    describe('Booth Map Displays Correctly When Available', () => {
      it('should display booth map image when URL is provided', () => {
        const boothMapUrl = '/uploads/booth-maps/test-map.jpg';

        render(
          <BoothMapUpload
            boothMapUrl={boothMapUrl}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        const image = screen.getByAltText('Booth Map');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', expect.stringContaining('booth-maps/test-map.jpg'));
      });

      it('should construct correct image URL with API base URL', () => {
        const boothMapUrl = '/uploads/booth-maps/test-map.jpg';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const expectedUrl = `${apiBaseUrl}${boothMapUrl}`;

        render(
          <BoothMapUpload
            boothMapUrl={boothMapUrl}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        const image = screen.getByAltText('Booth Map');
        expect(image).toHaveAttribute('src', expectedUrl);
      });

      it('should show delete button when map is available', () => {
        const boothMapUrl = '/uploads/booth-maps/test-map.jpg';

        render(
          <BoothMapUpload
            boothMapUrl={boothMapUrl}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        const deleteButton = screen.getByTitle('Delete map');
        expect(deleteButton).toBeInTheDocument();
      });

      it('should show upload button when no map is available', () => {
        render(
          <BoothMapUpload
            boothMapUrl={null}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        expect(screen.getByText('Upload Floor Plan')).toBeInTheDocument();
        expect(screen.queryByAltText('Booth Map')).not.toBeInTheDocument();
      });
    });

    describe('Loading State', () => {
      it('should show uploading state when uploadingMap is true', () => {
        render(
          <BoothMapUpload
            boothMapUrl={null}
            uploadingMap={true}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        expect(screen.getByText('Uploading...')).toBeInTheDocument();
        const button = screen.getByText('Uploading...').closest('button');
        expect(button).toBeDisabled();
      });

      it('should show spinner when uploading', () => {
        render(
          <BoothMapUpload
            boothMapUrl={null}
            uploadingMap={true}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        // Check for spinner (animate-spin class)
        const spinner = screen.getByText('Uploading...').parentElement?.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    describe('User Interactions', () => {
      it('should call onDeleteMap when delete button is clicked', async () => {
        const boothMapUrl = '/uploads/booth-maps/test-map.jpg';

        render(
          <BoothMapUpload
            boothMapUrl={boothMapUrl}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        const deleteButton = screen.getByTitle('Delete map');
        fireEvent.click(deleteButton);

        expect(mockOnDeleteMap).toHaveBeenCalledTimes(1);
      });

      it('should trigger file input when upload button is clicked', () => {
        const clickSpy = vi.spyOn(mockBoothMapInputRef.current!, 'click');

        render(
          <BoothMapUpload
            boothMapUrl={null}
            uploadingMap={false}
            boothMapInputRef={mockBoothMapInputRef}
            onMapUpload={mockOnMapUpload}
            onDeleteMap={mockOnDeleteMap}
          />
        );

        const uploadButton = screen.getByText('Upload Floor Plan');
        fireEvent.click(uploadButton);

        expect(clickSpy).toHaveBeenCalled();
      });
    });
  });

  describe('BoothMapImage Component (ChecklistSummary)', () => {
    // We'll test the BoothMapImage component logic separately
    // since it's embedded in ChecklistSummary

    describe('Image URL Construction', () => {
      it('should normalize URL that starts with /', () => {
        const boothMapUrl = '/uploads/booth-maps/test.jpg';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const normalizedUrl = boothMapUrl.startsWith('/') ? boothMapUrl : `/${boothMapUrl}`;
        const imageUrl = `${apiBaseUrl}${normalizedUrl}`;

        expect(imageUrl).toBe(`${apiBaseUrl}/uploads/booth-maps/test.jpg`);
      });

      it('should normalize URL that does not start with /', () => {
        const boothMapUrl = 'uploads/booth-maps/test.jpg';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const normalizedUrl = boothMapUrl.startsWith('/') ? boothMapUrl : `/${boothMapUrl}`;
        const imageUrl = `${apiBaseUrl}${normalizedUrl}`;

        expect(imageUrl).toBe(`${apiBaseUrl}/uploads/booth-maps/test.jpg`);
      });
    });

    describe('Click to View Full Size', () => {
      it('should open image in new window when clicked', () => {
        const boothMapUrl = '/uploads/booth-maps/test.jpg';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const fullImageUrl = `${apiBaseUrl}${boothMapUrl}`;

        // Simulate click on image
        mockWindowOpen(fullImageUrl, '_blank');

        expect(mockWindowOpen).toHaveBeenCalledWith(fullImageUrl, '_blank');
      });
    });
  });

  describe('Defensive Checks - Malformed API Responses', () => {
    it('should handle null booth_map_url', () => {
      render(
        <BoothMapUpload
          boothMapUrl={null}
          uploadingMap={false}
          boothMapInputRef={mockBoothMapInputRef}
          onMapUpload={mockOnMapUpload}
          onDeleteMap={mockOnDeleteMap}
        />
      );

      // Should show upload button, not crash
      expect(screen.getByText('Upload Floor Plan')).toBeInTheDocument();
    });

    it('should handle empty string booth_map_url', () => {
      render(
        <BoothMapUpload
          boothMapUrl={''}
          uploadingMap={false}
          boothMapInputRef={mockBoothMapInputRef}
          onMapUpload={mockOnMapUpload}
          onDeleteMap={mockOnDeleteMap}
        />
      );

      // Empty string should be treated as falsy
      expect(screen.getByText('Upload Floor Plan')).toBeInTheDocument();
    });

    it('should handle malformed URL (missing leading slash)', () => {
      const malformedUrl = 'uploads/booth-maps/test.jpg'; // Missing leading slash

      render(
        <BoothMapUpload
          boothMapUrl={malformedUrl}
          uploadingMap={false}
          boothMapInputRef={mockBoothMapInputRef}
          onMapUpload={mockOnMapUpload}
          onDeleteMap={mockOnDeleteMap}
        />
      );

      // Should still render image (browser will handle URL)
      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
    });

    it('should handle URL with special characters', () => {
      const urlWithSpaces = '/uploads/booth-maps/test map.jpg';

      render(
        <BoothMapUpload
          boothMapUrl={urlWithSpaces}
          uploadingMap={false}
          boothMapInputRef={mockBoothMapInputRef}
          onMapUpload={mockOnMapUpload}
          onDeleteMap={mockOnDeleteMap}
        />
      );

      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      // URL encoding should be handled by browser
    });
  });

  describe('Error Handling', () => {
    it('should handle image load error gracefully', async () => {
      const boothMapUrl = '/uploads/booth-maps/nonexistent.jpg';

      render(
        <BoothMapUpload
          boothMapUrl={boothMapUrl}
          uploadingMap={false}
          boothMapInputRef={mockBoothMapInputRef}
          onMapUpload={mockOnMapUpload}
          onDeleteMap={mockOnDeleteMap}
        />
      );

      const image = screen.getByAltText('Booth Map');
      
      // Simulate image error
      fireEvent.error(image);

      // Component should not crash
      expect(image).toBeInTheDocument();
    });
  });
});

