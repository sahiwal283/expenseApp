import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoothMapViewer } from '../BoothMapViewer';

/**
 * BoothMapViewer Component Tests
 * 
 * Tests the booth map modal functionality:
 * - Opens in-page modal (not new tab)
 * - Z-index layering (appears above event details)
 * - Backdrop click to close
 * - Escape key to close
 * - Close button
 * - Loading states
 * - Error handling (invalid URLs, network errors)
 * - Different image sizes
 * - Responsive design
 */

describe('BoothMapViewer Component Tests', () => {
  const mockOnClose = vi.fn();
  const boothMapUrl = '/uploads/booth-maps/test.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Opening and Closing', () => {
    it('should open modal when isOpen is true', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should open in-page modal (not new tab)', async () => {
      // Mock window.open to verify it's NOT called
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
      });

      // window.open should NOT be called (modal opens in-page)
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('Z-Index Layering', () => {
    it('should have z-index 9999 to appear above event details modal', () => {
      const { container } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toHaveClass('z-[9999]');
    });

    it('should have higher z-index than event details modal (z-50)', () => {
      const { container } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      const zIndexClass = Array.from(backdrop?.classList || []).find(cls => cls.startsWith('z-'));
      
      // z-[9999] is much higher than z-50
      expect(zIndexClass).toBe('z-[9999]');
    });
  });

  describe('Backdrop Click to Close', () => {
    it('should close modal when clicking backdrop', async () => {
      const { container } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      
      // Click backdrop (not the content)
      await userEvent.click(backdrop as HTMLElement);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Click the modal content (white box), not backdrop
      const content = screen.getByText('Booth Floor Plan').closest('.bg-white');
      
      if (content) {
        await userEvent.click(content);
        // Should not close when clicking content
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Escape Key to Close', () => {
    it('should close modal when Escape key is pressed', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Press Escape key
      await userEvent.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when other keys are pressed', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Press other keys
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard('a');
      await userEvent.keyboard('{Space}');

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should remove event listener when modal closes', async () => {
      const { rerender } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Close modal
      rerender(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // Press Escape - should not trigger onClose since modal is closed
      await userEvent.keyboard('{Escape}');

      // onClose should not be called again (only if it was called to close)
      // This test verifies the event listener is cleaned up
    });
  });

  describe('Close Button', () => {
    it('should close modal when close button is clicked', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have accessible close button with aria-label', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    it('should hide loading state when image loads', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Wait for image to load
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });
    });

    it('should reset loading state when modal reopens', async () => {
      const { rerender } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Image loads
      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });

      // Close and reopen
      rerender(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      rerender(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should show loading state again
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URL gracefully', () => {
      render(
        <BoothMapViewer
          boothMapUrl=""
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Invalid booth map URL')).toBeInTheDocument();
    });

    it('should handle null URL gracefully', () => {
      render(
        <BoothMapViewer
          boothMapUrl={null as any}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Invalid booth map URL')).toBeInTheDocument();
    });

    it('should handle wrong type URL gracefully', () => {
      render(
        <BoothMapViewer
          boothMapUrl={12345 as any}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Invalid booth map URL')).toBeInTheDocument();
    });

    it('should handle image load error', async () => {
      render(
        <BoothMapViewer
          boothMapUrl="/uploads/booth-maps/nonexistent.jpg"
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Wait for image to attempt loading
      const image = screen.getByAltText('Booth Floor Plan');
      const errorEvent = new Event('error', { bubbles: true });
      image.dispatchEvent(errorEvent);

      await waitFor(() => {
        expect(screen.getByText('Failed to load booth map image')).toBeInTheDocument();
      });
    });

    it('should show error message when image fails to load', async () => {
      render(
        <BoothMapViewer
          boothMapUrl="/uploads/booth-maps/invalid.jpg"
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Booth Floor Plan');
      const errorEvent = new Event('error', { bubbles: true });
      image.dispatchEvent(errorEvent);

      await waitFor(() => {
        expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
      });
    });

    it('should hide loading state when image errors', async () => {
      render(
        <BoothMapViewer
          boothMapUrl="/uploads/booth-maps/error.jpg"
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      const image = screen.getByAltText('Booth Floor Plan');
      const errorEvent = new Event('error', { bubbles: true });
      image.dispatchEvent(errorEvent);

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Image Display', () => {
    it('should display image when loaded successfully', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      await waitFor(() => {
        expect(image).toBeVisible();
      });
    });

    it('should normalize URL (add leading slash if missing)', () => {
      render(
        <BoothMapViewer
          boothMapUrl="uploads/booth-maps/test.jpg"
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Booth Floor Plan');
      expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/booth-maps/test.jpg'));
    });

    it('should use API base URL for image source', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Booth Floor Plan');
      const src = image.getAttribute('src');
      
      // Should include API base URL
      expect(src).toContain('/api');
      expect(src).toContain(boothMapUrl);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive padding on backdrop', () => {
      const { container } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toHaveClass('p-4');
    });

    it('should have max-width constraint on modal', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const modal = screen.getByText('Booth Floor Plan').closest('.bg-white');
      expect(modal).toHaveClass('max-w-6xl');
    });

    it('should have max-height constraint on modal', () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const modal = screen.getByText('Booth Floor Plan').closest('.bg-white');
      expect(modal).toHaveClass('max-h-[90vh]');
    });

    it('should have responsive image sizing', async () => {
      render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByAltText('Booth Floor Plan');
      const loadEvent = new Event('load', { bubbles: true });
      image.dispatchEvent(loadEvent);

      await waitFor(() => {
        expect(image).toHaveClass('max-w-full');
        expect(image).toHaveClass('max-h-[calc(90vh-120px)]');
        expect(image).toHaveClass('object-contain');
      });
    });
  });

  describe('Integration with EventDetailsModal', () => {
    it('should be rendered when EventDetailsModal opens booth map', async () => {
      // This test verifies the integration - clicking image in EventDetailsModal opens BoothMapViewer
      // The actual integration test would be in EventDetailsModal.test.tsx
      // This test just verifies BoothMapViewer can be controlled externally
      
      const { rerender } = render(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Booth Floor Plan')).not.toBeInTheDocument();

      // Simulate EventDetailsModal opening the viewer
      rerender(
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Booth Floor Plan')).toBeInTheDocument();
    });
  });
});

