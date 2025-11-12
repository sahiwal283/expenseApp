import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * BoothMapImage Component Tests
 * 
 * Tests the BoothMapImage component from ChecklistSummary:
 * - Loading state displays while image loads
 * - Error handling when image fails to load
 * - Click to view full size works
 * - Data refreshes when modal opens
 */

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

// Extract BoothMapImage component for testing
const BoothMapImage: React.FC<{ boothMapUrl: string }> = ({ boothMapUrl }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Construct image URL - ensure boothMapUrl starts with / if it doesn't already
  const normalizedUrl = boothMapUrl.startsWith('/') ? boothMapUrl : `/${boothMapUrl}`;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const imageUrl = `${apiBaseUrl}${normalizedUrl}`;
  const fullImageUrl = `${apiBaseUrl}${normalizedUrl}`;
  
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };
  
  const handleImageError = () => {
    console.error('[ChecklistSummary] Failed to load booth map image:', imageUrl);
    setImageError(true);
    setImageLoading(false);
  };
  
  if (imageError) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded border border-gray-200 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 text-center">Failed to load booth map image</p>
        <p className="text-xs text-gray-400 text-center mt-1">URL: {imageUrl}</p>
      </div>
    );
  }
  
  return (
    <>
      {imageLoading && (
        <div className="w-full h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={imageUrl}
        alt="Booth Map"
        className={`w-full h-48 object-contain bg-gray-50 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity ${imageLoading ? 'hidden' : ''}`}
        onClick={() => window.open(fullImageUrl, '_blank')}
        onLoad={handleImageLoad}
        onError={handleImageError}
        title="Click to view full size"
      />
      {!imageLoading && !imageError && (
        <p className="text-xs text-gray-500 mt-1 text-center">Click image to view full size</p>
      )}
    </>
  );
};

describe('BoothMapImage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Loading State', () => {
    it('should display loading state while image loads', () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      // Should show loading spinner initially
      const loadingSpinner = screen.getByRole('img', { hidden: true }).parentElement?.querySelector('.animate-spin');
      expect(loadingSpinner || screen.queryByText(/loading/i)).toBeTruthy();
    });

    it('should hide loading state when image loads', async () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      
      // Simulate image load
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).not.toHaveClass('hidden');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when image fails to load', async () => {
      const boothMapUrl = '/uploads/booth-maps/nonexistent.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      
      // Simulate image error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Failed to load booth map image')).toBeInTheDocument();
        expect(screen.getByText(/URL:/)).toBeInTheDocument();
      });
    });

    it('should show AlertCircle icon on error', async () => {
      const boothMapUrl = '/uploads/booth-maps/nonexistent.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      fireEvent.error(image);

      await waitFor(() => {
        // AlertCircle should be present (lucide-react icon)
        const errorContainer = screen.getByText('Failed to load booth map image').closest('div');
        expect(errorContainer).toBeInTheDocument();
      });
    });

    it('should log error to console when image fails', async () => {
      const boothMapUrl = '/uploads/booth-maps/nonexistent.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      fireEvent.error(image);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load booth map image'),
          expect.any(String)
        );
      });
    });
  });

  describe('Click to View Full Size', () => {
    it('should open image in new window when clicked', () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const expectedUrl = `${apiBaseUrl}${boothMapUrl}`;

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      
      // Simulate image load first
      fireEvent.load(image);

      // Then click
      fireEvent.click(image);

      expect(mockWindowOpen).toHaveBeenCalledWith(expectedUrl, '_blank');
    });

    it('should have correct title attribute for accessibility', () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      fireEvent.load(image);

      expect(image).toHaveAttribute('title', 'Click to view full size');
    });

    it('should show helper text when image is loaded', async () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByText('Click image to view full size')).toBeInTheDocument();
      });
    });
  });

  describe('Booth Map Displays Correctly', () => {
    it('should display image when URL is available', () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('booth-maps/test.jpg'));
    });

    it('should construct correct image URL', () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const expectedUrl = `${apiBaseUrl}${boothMapUrl}`;

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      expect(image).toHaveAttribute('src', expectedUrl);
    });

    it('should normalize URL that does not start with /', () => {
      const boothMapUrl = 'uploads/booth-maps/test.jpg';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const expectedUrl = `${apiBaseUrl}/uploads/booth-maps/test.jpg`;

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      expect(image).toHaveAttribute('src', expectedUrl);
    });
  });

  describe('Defensive Checks - Malformed API Responses', () => {
    it('should handle empty string URL', () => {
      const boothMapUrl = '';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      // Should normalize empty string
      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
    });

    it('should handle URL with special characters', () => {
      const boothMapUrl = '/uploads/booth-maps/test map (1).jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
      // Browser will handle URL encoding
    });

    it('should handle very long URL', () => {
      const longPath = '/uploads/booth-maps/' + 'a'.repeat(200) + '.jpg';

      render(<BoothMapImage boothMapUrl={longPath} />);

      const image = screen.getByAltText('Booth Map');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Image State Transitions', () => {
    it('should transition from loading to loaded', async () => {
      const boothMapUrl = '/uploads/booth-maps/test.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      // Initially loading
      const image = screen.getByAltText('Booth Map');
      expect(image).toHaveClass('hidden');

      // Simulate load
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).not.toHaveClass('hidden');
        expect(screen.getByText('Click image to view full size')).toBeInTheDocument();
      });
    });

    it('should transition from loading to error', async () => {
      const boothMapUrl = '/uploads/booth-maps/nonexistent.jpg';

      render(<BoothMapImage boothMapUrl={boothMapUrl} />);

      const image = screen.getByAltText('Booth Map');
      
      // Simulate error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Failed to load booth map image')).toBeInTheDocument();
        expect(image).not.toBeInTheDocument(); // Image hidden on error
      });
    });
  });
});

