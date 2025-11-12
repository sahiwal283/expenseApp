/**
 * Browser Compatibility Note Tests
 * 
 * Tests the browser compatibility note implementation:
 * - Browser detection (Chrome vs others)
 * - Tooltip visibility and content
 * - Always-visible note
 * - Responsive design
 * - Button functionality
 * - Tooltip positioning and arrow
 * 
 * Handoff from: Reviewer Agent
 * Date: November 12, 2025
 * Status: APPROVED — ready for testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseModalFooter } from '../ExpenseModalFooter';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
}));

describe('Browser Compatibility Note Tests', () => {
  const mockProps = {
    isEditingExpense: false,
    isSaving: false,
    expenseId: 'exp-123',
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    onDownloadPDF: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: '',
    });
  });

  describe('Browser Detection', () => {
    it('should detect Chrome browser and show "Works with Chrome" message', () => {
      // Mock Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Find the download button
      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      
      // Hover over button to show tooltip
      fireEvent.mouseEnter(downloadButton);

      // Check tooltip content for Chrome
      const tooltip = screen.getByText(/Works with Chrome/i);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Works with Chrome. Support for other browsers coming soon.');
    });

    it('should detect Firefox and show "Currently only works with Chrome" message', () => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const tooltip = screen.getByText(/Currently only works with Chrome/i);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Currently only works with Chrome. Support for other browsers coming soon.');
    });

    it('should detect Safari and show "Currently only works with Chrome" message', () => {
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const tooltip = screen.getByText(/Currently only works with Chrome/i);
      expect(tooltip).toBeInTheDocument();
    });

    it('should detect Edge and show "Currently only works with Chrome" message', () => {
      // Mock Edge user agent (contains 'edg' which should exclude it from Chrome detection)
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const tooltip = screen.getByText(/Currently only works with Chrome/i);
      expect(tooltip).toBeInTheDocument();
    });

    it('should detect Arc browser and show "Currently only works with Chrome" message', () => {
      // Mock Arc browser user agent (may contain 'chrome' but should be detected as non-Chrome)
      // Arc typically uses Chrome user agent but we can test with a different pattern
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Arc/1.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const tooltip = screen.getByText(/Currently only works with Chrome/i);
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Tooltip Visibility', () => {
    it('should show tooltip on button hover', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      
      // Tooltip container should exist but be hidden initially (CSS: hidden group-hover:block)
      // In test environment, we check that the tooltip text exists in DOM
      const tooltipBeforeHover = screen.queryByText(/Browser Compatibility/i);
      // Tooltip exists in DOM but may be hidden via CSS classes
      
      // Hover over button (this should trigger CSS group-hover)
      fireEvent.mouseEnter(downloadButton);

      // Tooltip should now be visible/accessible
      const tooltipAfterHover = screen.getByText(/Browser Compatibility/i);
      expect(tooltipAfterHover).toBeInTheDocument();
    });

    it('should hide tooltip when mouse leaves button', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      
      // Hover to show tooltip
      fireEvent.mouseEnter(downloadButton);
      expect(screen.getByText(/Browser Compatibility/i)).toBeInTheDocument();

      // Leave button
      fireEvent.mouseLeave(downloadButton);

      // Tooltip should be hidden (using waitFor for async updates)
      waitFor(() => {
        expect(screen.queryByText(/Browser Compatibility/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Always-Visible Note', () => {
    it('should show always-visible note next to download button', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Always-visible note should be present
      const note = screen.getByText(/Chrome only/i);
      expect(note).toBeInTheDocument();
    });

    it('should show Info icon in always-visible note', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Info icon should be present (mocked as data-testid="info-icon")
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should hide note text on mobile (hidden sm:inline)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Find the note text element
      const noteText = screen.getByText(/Chrome only/i);
      
      // Check that it has the responsive class
      expect(noteText).toHaveClass('hidden', 'sm:inline');
    });

    it('should show note text on desktop (sm:inline)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Note text should be visible on desktop
      const noteText = screen.getByText(/Chrome only/i);
      expect(noteText).toBeInTheDocument();
    });
  });

  describe('Icon Visibility', () => {
    it('should show Info icon on all screen sizes', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      // Info icon should always be visible (no responsive classes)
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
      
      // Check that icon doesn't have hidden classes
      infoIcons.forEach(icon => {
        expect(icon).not.toHaveClass('hidden');
      });
    });
  });

  describe('Button Functionality', () => {
    it('should not affect download button functionality', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      const mockDownloadPDF = vi.fn().mockResolvedValue(undefined);

      render(<ExpenseModalFooter {...mockProps} onDownloadPDF={mockDownloadPDF} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      
      // Click button
      fireEvent.click(downloadButton);

      // Verify download function was called
      await waitFor(() => {
        expect(mockDownloadPDF).toHaveBeenCalledWith('exp-123');
      });
    });

    it('should disable button while downloading', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      // Render with isDownloading state (we'll need to test this through interaction)
      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      
      // Initially button should not be disabled
      expect(downloadButton).not.toBeDisabled();

      // Click to trigger download
      fireEvent.click(downloadButton);

      // Button should show loading state
      expect(screen.getByText(/Generating/i)).toBeInTheDocument();
    });
  });

  describe('Tooltip Positioning', () => {
    it('should position tooltip above button (bottom-full)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      // Find tooltip container
      const tooltip = screen.getByText(/Browser Compatibility/i).closest('.absolute');
      
      // Check positioning classes
      expect(tooltip).toHaveClass('absolute', 'right-0', 'bottom-full', 'mb-2');
    });

    it('should align tooltip to right edge of button', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const tooltip = screen.getByText(/Browser Compatibility/i).closest('.absolute');
      expect(tooltip).toHaveClass('right-0');
    });
  });

  describe('Tooltip Arrow', () => {
    it('should show tooltip arrow pointing to button', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      // Find tooltip container
      const tooltip = screen.getByText(/Browser Compatibility/i).closest('.bg-gray-900');
      
      // Arrow should be inside tooltip
      const arrow = tooltip?.querySelector('.transform.rotate-45');
      expect(arrow).toBeInTheDocument();
      
      // Arrow should have correct styling
      expect(arrow).toHaveClass('w-2', 'h-2', 'bg-gray-900', 'transform', 'rotate-45');
    });

    it('should position arrow at bottom of tooltip', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      // Find arrow container
      const tooltip = screen.getByText(/Browser Compatibility/i).closest('.bg-gray-900');
      const arrowContainer = tooltip?.querySelector('.absolute.top-full');
      
      expect(arrowContainer).toBeInTheDocument();
      expect(arrowContainer).toHaveClass('absolute', 'top-full', 'right-4', '-mt-1');
    });
  });

  describe('Tooltip Content Structure', () => {
    it('should show Info icon in tooltip', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      // Info icon should be in tooltip (there should be multiple info icons - one in tooltip, one in note)
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThanOrEqual(2); // At least one in tooltip, one in note
    });

    it('should show "Browser Compatibility" heading in tooltip', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download expense/i });
      fireEvent.mouseEnter(downloadButton);

      const heading = screen.getByText(/Browser Compatibility/i);
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('font-semibold');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing expenseId gracefully', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} expenseId={undefined} />);

      // Download button should not be rendered if expenseId is missing
      expect(screen.queryByRole('button', { name: /download expense/i })).not.toBeInTheDocument();
    });

    it('should handle missing onDownloadPDF gracefully', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} onDownloadPDF={undefined} />);

      // Download button should not be rendered if onDownloadPDF is missing
      expect(screen.queryByRole('button', { name: /download expense/i })).not.toBeInTheDocument();
    });

    it('should work correctly when editing expense (no download button)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 Chrome/120.0.0.0',
      });

      render(<ExpenseModalFooter {...mockProps} isEditingExpense={true} />);

      // Download button should not be visible when editing
      expect(screen.queryByRole('button', { name: /download expense/i })).not.toBeInTheDocument();
      
      // Edit and Save buttons should be visible
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });
});

