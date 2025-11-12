import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userChecklistRepository } from '../../src/database/repositories/UserChecklistRepository';
import { query as dbQuery } from '../../src/config/database';
import { NotFoundError } from '../../src/utils/errors';

/**
 * User Checklist Repository Tests
 * 
 * Tests database operations with itemType parameter:
 * - Different item types (guidelines, packing_list, custom_*)
 * - Database queries with itemType
 * - Upsert operations
 * - Update operations
 */

vi.mock('../../src/config/database', () => ({
  pool: {
    query: vi.fn()
  },
  query: vi.fn() // Mock dbQuery function
}));

describe('UserChecklistRepository - itemType Parameter Tests', () => {
  const userId = 'test-user-1';
  const eventId = 'event-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByUserEventAndItemType', () => {
    it('should find item with guidelines itemType', async () => {
      const mockItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        'guidelines'
      );

      expect(result).toBeDefined();
      expect(result?.item_type).toBe('guidelines');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, 'guidelines']
      );
    });

    it('should find item with packing_list itemType', async () => {
      const mockItem = {
        id: 2,
        user_id: userId,
        event_id: eventId,
        item_type: 'packing_list',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        'packing_list'
      );

      expect(result).toBeDefined();
      expect(result?.item_type).toBe('packing_list');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, 'packing_list']
      );
    });

    it('should find item with custom_item_* itemType', async () => {
      const mockItem = {
        id: 3,
        user_id: userId,
        event_id: eventId,
        item_type: 'custom_item_123',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        'custom_item_123'
      );

      expect(result).toBeDefined();
      expect(result?.item_type).toBe('custom_item_123');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, 'custom_item_123']
      );
    });

    it('should handle itemType with special characters', async () => {
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

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        specialItemType
      );

      expect(result).toBeDefined();
      expect(result?.item_type).toBe(specialItemType);
      // Verify special characters are passed correctly to database
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, specialItemType]
      );
    });

    it('should handle itemType with unicode characters', async () => {
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

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        unicodeItemType
      );

      expect(result).toBeDefined();
      expect(result?.item_type).toBe(unicodeItemType);
      // Verify unicode characters are passed correctly to database
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, unicodeItemType]
      );
    });

    it('should return null if item not found', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        rowCount: 0
      } as any);

      const result = await userChecklistRepository.findByUserEventAndItemType(
        userId,
        eventId,
        'nonexistent_item'
      );

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should create item with guidelines itemType', async () => {
      const mockItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.upsert({
        userId,
        eventId,
        itemType: 'guidelines',
        completed: true
      });

      expect(result.item_type).toBe('guidelines');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type'),
        [userId, eventId, 'guidelines', true]
      );
    });

    it('should create item with packing_list itemType', async () => {
      const mockItem = {
        id: 2,
        user_id: userId,
        event_id: eventId,
        item_type: 'packing_list',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.upsert({
        userId,
        eventId,
        itemType: 'packing_list',
        completed: false
      });

      expect(result.item_type).toBe('packing_list');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type'),
        [userId, eventId, 'packing_list', false]
      );
    });

    it('should create item with custom_item_* itemType', async () => {
      const mockItem = {
        id: 3,
        user_id: userId,
        event_id: eventId,
        item_type: 'custom_item_123',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.upsert({
        userId,
        eventId,
        itemType: 'custom_item_123',
        completed: true
      });

      expect(result.item_type).toBe('custom_item_123');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, event_id, item_type)'),
        [userId, eventId, 'custom_item_123', true]
      );
    });

    it('should update existing item on conflict', async () => {
      const existingItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const updatedItem = {
        ...existingItem,
        completed: true,
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [updatedItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.upsert({
        userId,
        eventId,
        itemType: 'guidelines',
        completed: true
      });

      expect(result.completed).toBe(true);
      // Verify ON CONFLICT clause handles item_type correctly
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, event_id, item_type)'),
        [userId, eventId, 'guidelines', true]
      );
    });
  });

  describe('updateCompletion', () => {
    it('should update item with guidelines itemType', async () => {
      const mockItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockItem],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.updateCompletion(
        userId,
        eventId,
        'guidelines',
        true
      );

      expect(result.item_type).toBe('guidelines');
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $4'),
        [true, userId, eventId, 'guidelines']
      );
    });

    it('should throw NotFoundError if item does not exist', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        rowCount: 0
      } as any);

      await expect(
        userChecklistRepository.updateCompletion(userId, eventId, 'nonexistent', true)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteItem', () => {
    it('should delete item with specific itemType', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        rowCount: 1
      } as any);

      const result = await userChecklistRepository.deleteItem(
        userId,
        eventId,
        'guidelines'
      );

      expect(result).toBe(true);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('item_type = $3'),
        [userId, eventId, 'guidelines']
      );
    });

    it('should return false if item does not exist', async () => {
      // Mock successful query with 0 rows (item doesn't exist)
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        rowCount: 0
      } as any);

      // BaseRepository.executeQuery wraps dbQuery, so we need to ensure it doesn't throw
      const result = await userChecklistRepository.deleteItem(
        userId,
        eventId,
        'nonexistent'
      );

      // deleteItem returns true if rowCount > 0, false otherwise
      expect(result).toBe(false);
      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        [userId, eventId, 'nonexistent']
      );
    });
  });
});

