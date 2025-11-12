import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventSetup } from '../../EventSetup';
import { api } from '../../../../utils/api';
import { createMockUser, createMockEvent } from '../../../../test/utils/testHelpers';
import * as useChecklistSummaryHook from '../hooks/useChecklistSummary';
import * as useEventDataHook from '../hooks/useEventData';
import * as useEventFormHook from '../hooks/useEventForm';

/**
 * Checklist Loading Integration Tests
 * 
 * Tests the checklist loading fix in EventSetup component:
 * - Checklist loads when opening event details modal (loadChecklistSummary called)
 * - No infinite loops occur (useCallback stability)
 * - Loading function called with correct parameters
 * 
 * Note: Booth map display tests are in EventDetailsModal.test.tsx
 * Note: Hook behavior tests are in useChecklistSummary.test.ts
 */

// Mock the hooks
vi.mock('../hooks/useChecklistSummary');
vi.mock('../hooks/useEventData');
vi.mock('../hooks/useEventForm');
vi.mock('../../../../utils/api', () => ({
  api: {
    USE_SERVER: true,
    getEvents: vi.fn(),
    getUsers: vi.fn(),
    checklist: {
      getChecklist: vi.fn(),
    },
  },
}));

describe('Checklist Loading - Event Details Modal Integration Tests', () => {
  const mockUser = createMockUser({ role: 'admin' });
  let mockLoadChecklistSummary: ReturnType<typeof vi.fn>;
  let mockChecklistData: any;
  let mockLoadingChecklist: boolean;
  let mockSetChecklistData: ReturnType<typeof vi.fn>;
  let mockSetLoadingChecklist: ReturnType<typeof vi.fn>;
  let apiCallCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    apiCallCount = 0;

    // Setup mock checklist hook
    mockLoadChecklistSummary = vi.fn(async (eventId: string, participantCount: number) => {
      apiCallCount++;
      mockSetLoadingChecklist(true);
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
      mockSetLoadingChecklist(false);
    });

    mockSetChecklistData = vi.fn();
    mockSetLoadingChecklist = vi.fn();
    mockLoadingChecklist = false;
    mockChecklistData = null;

    vi.mocked(useChecklistSummaryHook.useChecklistSummary).mockReturnValue({
      checklistData: mockChecklistData,
      loadingChecklist: mockLoadingChecklist,
      loadChecklistSummary: mockLoadChecklistSummary,
    });

    // Setup mock event data hook
    vi.mocked(useEventDataHook.useEventData).mockReturnValue({
      events: [],
      allUsers: [],
      loading: false,
      loadError: null,
      reload: vi.fn(),
    });

    // Setup mock event form hook
    vi.mocked(useEventFormHook.useEventForm).mockReturnValue({
      formData: {},
      setFormData: vi.fn(),
      editingEvent: null,
      selectedUserId: null,
      setSelectedUserId: vi.fn(),
      newParticipantName: '',
      setNewParticipantName: vi.fn(),
      newParticipantEmail: '',
      setNewParticipantEmail: vi.fn(),
      handleSubmit: vi.fn(),
      handleEdit: vi.fn(),
      resetForm: vi.fn(),
      addParticipant: vi.fn(),
      addCustomParticipant: vi.fn(),
      removeParticipant: vi.fn(),
    });

    // Mock console methods to track calls
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Checklist Loads When Opening Event Details Modal', () => {
    it('should call loadChecklistSummary when event details modal opens', async () => {
      // Create event with future dates so it shows in active events
      const event = createMockEvent({ 
        id: 'event-1', 
        name: 'Test Event',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        showStartDate: '2026-01-01',
        showEndDate: '2026-01-03',
        travelStartDate: '2025-12-31',
        travelEndDate: '2026-01-04',
      });
      
      vi.mocked(useEventDataHook.useEventData).mockReturnValue({
        events: [event],
        allUsers: [],
        loading: false,
        loadError: null,
        reload: vi.fn(),
      });

      render(<EventSetup user={mockUser} />);

      // Find and click "Details" button
      const detailsButton = screen.getByRole('button', { name: /details/i });
      await userEvent.click(detailsButton);

      // Wait for modal to open and checklist loading function to be called
      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalledWith('event-1', event.participants?.length || 0);
      }, { timeout: 1000 });
    });

    it('should load checklist with correct participant count', async () => {
      const event = createMockEvent({
        id: 'event-1',
        name: 'Test Event',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        showStartDate: '2026-01-01',
        showEndDate: '2026-01-03',
        travelStartDate: '2025-12-31',
        travelEndDate: '2026-01-04',
        participants: [
          { id: 'user-1', name: 'User 1', email: 'user1@test.com', role: 'admin', username: 'user1' },
          { id: 'user-2', name: 'User 2', email: 'user2@test.com', role: 'salesperson', username: 'user2' },
        ],
      });

      vi.mocked(useEventDataHook.useEventData).mockReturnValue({
        events: [event],
        allUsers: [],
        loading: false,
        loadError: null,
        reload: vi.fn(),
      });

      render(<EventSetup user={mockUser} />);

      const detailsButton = screen.getByRole('button', { name: /details/i });
      await userEvent.click(detailsButton);

      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalledWith('event-1', 2);
      });
    });
  });

  describe('No Infinite Loops', () => {
    it('should not cause infinite loop when opening modal', async () => {
      const event = createMockEvent({ 
        id: 'event-1', 
        name: 'Test Event',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        showStartDate: '2026-01-01',
        showEndDate: '2026-01-03',
        travelStartDate: '2025-12-31',
        travelEndDate: '2026-01-04',
      });

      vi.mocked(useEventDataHook.useEventData).mockReturnValue({
        events: [event],
        allUsers: [],
        loading: false,
        loadError: null,
        reload: vi.fn(),
      });

      render(<EventSetup user={mockUser} />);

      const detailsButton = screen.getByRole('button', { name: /details/i });
      await userEvent.click(detailsButton);

      // Wait for initial load
      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalled();
      });

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only be called once (not in infinite loop)
      expect(mockLoadChecklistSummary).toHaveBeenCalledTimes(1);
    });

    it('should not reload checklist when modal stays open', async () => {
      const event = createMockEvent({ id: 'event-1', name: 'Test Event' });

      vi.mocked(useEventDataHook.useEventData).mockReturnValue({
        events: [event],
        allUsers: [],
        loading: false,
        loadError: null,
        reload: vi.fn(),
      });

      const { rerender } = render(<EventSetup user={mockUser} />);

      const detailsButton = screen.getByRole('button', { name: /details/i });
      await userEvent.click(detailsButton);

      // Wait for initial load
      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalledTimes(1);
      });

      // Rerender without changing viewingEvent
      rerender(<EventSetup user={mockUser} />);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still only be called once
      expect(mockLoadChecklistSummary).toHaveBeenCalledTimes(1);
    });

    it('should reload checklist when switching to different event', async () => {
      const event1 = createMockEvent({ 
        id: 'event-1', 
        name: 'Event One',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        showStartDate: '2026-01-01',
        showEndDate: '2026-01-03',
        travelStartDate: '2025-12-31',
        travelEndDate: '2026-01-04',
      });
      const event2 = createMockEvent({ 
        id: 'event-2', 
        name: 'Event Two',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        showStartDate: '2026-02-01',
        showEndDate: '2026-02-03',
        travelStartDate: '2026-01-31',
        travelEndDate: '2026-02-04',
      });

      vi.mocked(useEventDataHook.useEventData).mockReturnValue({
        events: [event1, event2],
        allUsers: [],
        loading: false,
        loadError: null,
        reload: vi.fn(),
      });

      const { rerender } = render(<EventSetup user={mockUser} />);

      // Open first event
      const detailsButtons = screen.getAllByRole('button', { name: /details/i });
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalledWith('event-1', expect.any(Number));
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      // Open second event
      await waitFor(() => {
        const newDetailsButtons = screen.getAllByRole('button', { name: /details/i });
        expect(newDetailsButtons.length).toBeGreaterThan(0);
      });

      const newDetailsButtons = screen.getAllByRole('button', { name: /details/i });
      await userEvent.click(newDetailsButtons[1]);

      await waitFor(() => {
        expect(mockLoadChecklistSummary).toHaveBeenCalledWith('event-2', expect.any(Number));
      });

      // Should be called twice (once for each event)
      expect(mockLoadChecklistSummary).toHaveBeenCalledTimes(2);
    });
  });

  // Note: Booth map display tests are covered in EventDetailsModal.test.tsx
  // Note: Loading state transition tests are covered in useChecklistSummary.test.ts
  // Note: Error handling tests are covered in useChecklistSummary.test.ts
  // This test file focuses on integration behavior (checklist loading when modal opens)
});
