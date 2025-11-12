import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userChecklistService } from '../../src/services/UserChecklistService';
import { userChecklistRepository } from '../../src/database/repositories/UserChecklistRepository';
import { eventRepository } from '../../src/database/repositories/EventRepository';
import { NotFoundError, AuthorizationError, ValidationError } from '../../src/utils/errors';
import { pool } from '../../src/config/database';

/**
 * User Checklist Service Tests
 * 
 * Tests the service layer for itemType parameter handling:
 * - Database operations with different item types
 * - Validation logic
 * - Authorization checks
 * - Error handling
 */

vi.mock('../../src/database/repositories/UserChecklistRepository');
vi.mock('../../src/database/repositories/EventRepository');
vi.mock('../../src/config/database');

describe('UserChecklistService - itemType Parameter Tests', () => {
  const userId = 'test-user-1';
  const eventId = 'event-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateItemCompletion', () => {
    it('should create new item with guidelines itemType', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const mockItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(null);
      vi.mocked(userChecklistRepository.upsert).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'guidelines',
        true
      );

      expect(result.item_type).toBe('guidelines');
      expect(userChecklistRepository.upsert).toHaveBeenCalledWith({
        userId,
        eventId,
        itemType: 'guidelines',
        completed: true
      });
    });

    it('should update existing item with packing_list itemType', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const existingItem = {
        id: 2,
        user_id: userId,
        event_id: eventId,
        item_type: 'packing_list',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const updatedItem = {
        ...existingItem,
        completed: true,
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(existingItem as any);
      vi.mocked(userChecklistRepository.updateCompletion).mockResolvedValue(updatedItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'packing_list',
        true
      );

      expect(result.item_type).toBe('packing_list');
      expect(result.completed).toBe(true);
      expect(userChecklistRepository.updateCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        'packing_list',
        true
      );
    });

    it('should handle custom_item_* itemType', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const mockItem = {
        id: 3,
        user_id: userId,
        event_id: eventId,
        item_type: 'custom_item_123',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(null);
      vi.mocked(userChecklistRepository.upsert).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'custom_item_123',
        true
      );

      expect(result.item_type).toBe('custom_item_123');
      expect(userChecklistRepository.upsert).toHaveBeenCalledWith({
        userId,
        eventId,
        itemType: 'custom_item_123',
        completed: true
      });
    });

    it('should handle itemType with special characters', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const specialItemType = 'custom_item_@#$%^&*()';
      const mockItem = {
        id: 4,
        user_id: userId,
        event_id: eventId,
        item_type: specialItemType,
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(null);
      vi.mocked(userChecklistRepository.upsert).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        specialItemType,
        true
      );

      expect(result.item_type).toBe(specialItemType);
      expect(userChecklistRepository.upsert).toHaveBeenCalledWith({
        userId,
        eventId,
        itemType: specialItemType,
        completed: true
      });
    });

    it('should handle itemType with unicode characters', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const unicodeItemType = 'custom_item_测试_日本語';
      const mockItem = {
        id: 5,
        user_id: userId,
        event_id: eventId,
        item_type: unicodeItemType,
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(null);
      vi.mocked(userChecklistRepository.upsert).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        unicodeItemType,
        true
      );

      expect(result.item_type).toBe(unicodeItemType);
    });

    it('should validate itemType is not empty', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, '', true)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate itemType is not whitespace-only', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, '   ', true)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      vi.mocked(eventRepository.findById).mockResolvedValue(null);

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, 'guidelines', true)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user is not participant', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, 'guidelines', true)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should allow admin/coordinator/developer to access any event', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const adminUserId = 'admin-user-1';
      const mockItem = {
        id: 6,
        user_id: adminUserId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'admin' }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserEventAndItemType).mockResolvedValue(null);
      vi.mocked(userChecklistRepository.upsert).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        adminUserId,
        eventId,
        'guidelines',
        true
      );

      expect(result).toBeDefined();
      // Admin should be able to access without being a participant
    });
  });

  describe('getUserChecklistItems', () => {
    it('should return items with different itemType values', async () => {
      const mockEvent = { id: eventId, name: 'Test Event' };
      const mockItems = [
        {
          id: 1,
          user_id: userId,
          event_id: eventId,
          item_type: 'guidelines',
          completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          user_id: userId,
          event_id: eventId,
          item_type: 'packing_list',
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          user_id: userId,
          event_id: eventId,
          item_type: 'custom_item_123',
          completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      vi.mocked(eventRepository.findById).mockResolvedValue(mockEvent as any);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any);
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ role: 'salesperson' }],
        rowCount: 1
      } as any).mockResolvedValueOnce({
        rows: [{ user_id: userId, event_id: eventId }],
        rowCount: 1
      } as any);
      vi.mocked(userChecklistRepository.findByUserAndEvent).mockResolvedValue(mockItems as any);

      const result = await userChecklistService.getUserChecklistItems(userId, eventId);

      expect(result).toHaveLength(3);
      expect(result[0].item_type).toBe('guidelines');
      expect(result[1].item_type).toBe('packing_list');
      expect(result[2].item_type).toBe('custom_item_123');
    });
  });
});

