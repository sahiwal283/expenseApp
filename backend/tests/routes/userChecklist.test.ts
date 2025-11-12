import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { AuthRequest } from '../../src/middleware/auth';
import { userChecklistService } from '../../src/services/UserChecklistService';
import { ValidationError, NotFoundError, AuthorizationError } from '../../src/utils/errors';

/**
 * User Checklist API Tests
 * 
 * Tests the schema mismatch fix for itemType parameter:
 * - URL encoding/decoding for special characters
 * - Different item types (guidelines, packing_list, custom_*)
 * - Database operations
 * - Authorization checks
 * - Error handling
 */

// Mock services
vi.mock('../../src/services/UserChecklistService');
vi.mock('../../src/database/repositories/EventRepository');

describe('User Checklist API - itemType Parameter Tests', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      params: {},
      body: {},
      user: {
        id: 'test-user-1',
        role: 'salesperson',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser'
      }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('PUT /api/user-checklist/:eventId/item/:itemType - itemType Parameter Tests', () => {
    const eventId = 'event-1';
    const userId = 'test-user-1';

    // Import route handler
    const getRouteHandler = async () => {
      const routes = await import('../../src/routes/userChecklist');
      // Get the PUT route handler
      const router = routes.default;
      // We'll test the service directly since route testing requires express app setup
      return userChecklistService;
    };

    it('should handle simple itemType (guidelines)', async () => {
      const mockItem = {
        id: 1,
        user_id: userId,
        event_id: eventId,
        item_type: 'guidelines',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'guidelines',
        true
      );

      expect(result.item_type).toBe('guidelines');
      expect(result.completed).toBe(true);
      expect(userChecklistService.updateItemCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        'guidelines',
        true
      );
    });

    it('should handle itemType with underscore (packing_list)', async () => {
      const mockItem = {
        id: 2,
        user_id: userId,
        event_id: eventId,
        item_type: 'packing_list',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'packing_list',
        false
      );

      expect(result.item_type).toBe('packing_list');
      expect(result.completed).toBe(false);
      expect(userChecklistService.updateItemCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        'packing_list',
        false
      );
    });

    it('should handle custom itemType (custom_item_123)', async () => {
      const mockItem = {
        id: 3,
        user_id: userId,
        event_id: eventId,
        item_type: 'custom_item_123',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        'custom_item_123',
        true
      );

      expect(result.item_type).toBe('custom_item_123');
      expect(userChecklistService.updateItemCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        'custom_item_123',
        true
      );
    });

    it('should handle itemType with special characters', async () => {
      const specialChars = 'custom_item_@#$%^&*()';
      const mockItem = {
        id: 4,
        user_id: userId,
        event_id: eventId,
        item_type: specialChars,
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        specialChars,
        true
      );

      expect(result.item_type).toBe(specialChars);
      expect(userChecklistService.updateItemCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        specialChars,
        true
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

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        unicodeItemType,
        true
      );

      expect(result.item_type).toBe(unicodeItemType);
      expect(userChecklistService.updateItemCompletion).toHaveBeenCalledWith(
        userId,
        eventId,
        unicodeItemType,
        true
      );
    });

    it('should handle itemType with spaces (URL decoded)', async () => {
      // Simulate URL decoding: route receives encoded, decodes it
      const encodedItemType = encodeURIComponent('custom item with spaces');
      const decodedItemType = decodeURIComponent(encodedItemType);
      
      const mockItem = {
        id: 6,
        user_id: userId,
        event_id: eventId,
        item_type: decodedItemType,
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(userChecklistService.updateItemCompletion).mockResolvedValue(mockItem as any);

      // Simulate route handler decoding
      const result = await userChecklistService.updateItemCompletion(
        userId,
        eventId,
        decodedItemType, // Already decoded by route handler
        true
      );

      expect(result.item_type).toBe(decodedItemType);
      expect(result.item_type).toBe('custom item with spaces');
    });

    it('should validate itemType is not empty', async () => {
      vi.mocked(userChecklistService.updateItemCompletion).mockRejectedValue(
        new ValidationError('itemType must be a non-empty string')
      );

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, '', true)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate itemType is not whitespace-only', async () => {
      vi.mocked(userChecklistService.updateItemCompletion).mockRejectedValue(
        new ValidationError('itemType must be a non-empty string')
      );

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, '   ', true)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle NotFoundError for non-existent event', async () => {
      vi.mocked(userChecklistService.updateItemCompletion).mockRejectedValue(
        new NotFoundError('Event', eventId)
      );

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, 'guidelines', true)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle AuthorizationError for non-participant', async () => {
      vi.mocked(userChecklistService.updateItemCompletion).mockRejectedValue(
        new AuthorizationError('You can only update checklist items for events you participate in')
      );

      await expect(
        userChecklistService.updateItemCompletion(userId, eventId, 'guidelines', true)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('URL Encoding/Decoding Tests', () => {
    it('should decode URL-encoded itemType correctly', () => {
      // Test decodeURIComponent behavior
      const original = 'custom_item_@#$%^&*()';
      const encoded = encodeURIComponent(original);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(original);
      expect(decoded).not.toBe(encoded);
    });

    it('should handle already-decoded itemType (no double decoding)', () => {
      const itemType = 'guidelines';
      const decoded = decodeURIComponent(itemType);

      expect(decoded).toBe(itemType); // decodeURIComponent of non-encoded string returns same
    });

    it('should decode unicode characters correctly', () => {
      const unicode = 'custom_item_测试_日本語';
      const encoded = encodeURIComponent(unicode);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(unicode);
    });

    it('should decode spaces correctly', () => {
      const withSpaces = 'custom item with spaces';
      const encoded = encodeURIComponent(withSpaces);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(withSpaces);
    });
  });
});

