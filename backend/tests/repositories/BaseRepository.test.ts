import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from '../../src/database/repositories/BaseRepository';
import { query as dbQuery } from '../../src/config/database';
import { DatabaseError } from '../../src/utils/errors';

/**
 * BaseRepository Tests
 * 
 * Tests the repository pattern base class that provides common database operations.
 * All specific repositories extend this class.
 */

// Mock database query function
vi.mock('../../src/config/database', () => ({
  query: vi.fn(),
}));

// Create a concrete implementation for testing
class TestRepository extends BaseRepository<any> {
  protected tableName = 'test_table';
}

describe('BaseRepository', () => {
  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a record by ID', async () => {
      const mockRecord = { id: '123', name: 'Test Item' };
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockRecord],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById('123');

      expect(result).toEqual(mockRecord);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        ['123']
      );
    });

    it('should return null if record not found', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });

    it('should handle numeric IDs', async () => {
      const mockRecord = { id: 42, name: 'Test Item' };
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [mockRecord],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById(42);

      expect(result).toEqual(mockRecord);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        [42]
      );
    });
  });

  describe('findAll', () => {
    it('should return all records ordered by ID descending', async () => {
      const mockRecords = [
        { id: '2', name: 'Item 2' },
        { id: '1', name: 'Item 1' },
      ];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockRecords,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findAll();

      expect(result).toEqual(mockRecords);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table ORDER BY id DESC',
        undefined
      );
    });

    it('should return empty array if no records exist', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findBy', () => {
    it('should find records by column value', async () => {
      const mockRecords = [
        { id: '1', user_id: 'user-123', name: 'Item 1' },
        { id: '2', user_id: 'user-123', name: 'Item 2' },
      ];

      vi.mocked(dbQuery).mockResolvedValue({
        rows: mockRecords,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findBy('user_id', 'user-123');

      expect(result).toEqual(mockRecords);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE user_id = $1',
        ['user-123']
      );
    });

    it('should return empty array if no matches found', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.findBy('status', 'inactive');

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return the count of records', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ count: '42' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.count();

      expect(result).toBe(42);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table',
        undefined
      );
    });

    it('should return 0 for empty table', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true if record exists', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ exists: true }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.exists('123');

      expect(result).toBe(true);
      expect(dbQuery).toHaveBeenCalledWith(
        'SELECT EXISTS(SELECT 1 FROM test_table WHERE id = $1) as exists',
        ['123']
      );
    });

    it('should return false if record does not exist', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [{ exists: false }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.exists('999');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a record and return true', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'DELETE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.delete('123');

      expect(result).toBe(true);
      expect(dbQuery).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1',
        ['123']
      );
    });

    it('should return false if record does not exist', async () => {
      vi.mocked(dbQuery).mockResolvedValue({
        rows: [],
        command: 'DELETE',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.delete('999');

      expect(result).toBe(false);
    });
  });

  describe('buildQuery', () => {
    it('should build a simple SELECT query', async () => {
      const { text, params } = (repository as any).buildQuery({});

      expect(text).toBe('SELECT * FROM test_table');
      expect(params).toEqual([]);
    });

    it('should build query with WHERE clause', async () => {
      const { text, params } = (repository as any).buildQuery({
        where: { user_id: 'user-123', status: 'active' },
      });

      expect(text).toContain('WHERE');
      expect(text).toContain('user_id = $1');
      expect(text).toContain('status = $2');
      expect(params).toEqual(['user-123', 'active']);
    });

    it('should build query with ORDER BY', async () => {
      const { text, params } = (repository as any).buildQuery({
        orderBy: 'created_at DESC',
      });

      expect(text).toBe('SELECT * FROM test_table ORDER BY created_at DESC');
      expect(params).toEqual([]);
    });

    it('should build query with LIMIT', async () => {
      const { text, params } = (repository as any).buildQuery({
        limit: 10,
      });

      expect(text).toContain('LIMIT $1');
      expect(params).toEqual([10]);
    });

    it('should build query with OFFSET', async () => {
      const { text, params } = (repository as any).buildQuery({
        limit: 10,
        offset: 20,
      });

      expect(text).toContain('LIMIT $1 OFFSET $2');
      expect(params).toEqual([10, 20]);
    });

    it('should build complex query with all options', async () => {
      const { text, params } = (repository as any).buildQuery({
        select: ['id', 'name', 'created_at'],
        where: { status: 'active' },
        orderBy: 'created_at DESC',
        limit: 20,
        offset: 40,
      });

      expect(text).toContain('SELECT id, name, created_at FROM test_table');
      expect(text).toContain('WHERE status = $1');
      expect(text).toContain('ORDER BY created_at DESC');
      expect(text).toContain('LIMIT $2 OFFSET $3');
      expect(params).toEqual(['active', 20, 40]);
    });
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const mockResult = {
        rows: [{ id: '1', name: 'Test' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };

      vi.mocked(dbQuery).mockResolvedValue(mockResult);

      const result = await (repository as any).executeQuery(
        'SELECT * FROM test_table WHERE id = $1',
        ['1']
      );

      expect(result).toEqual(mockResult);
    });

    it('should throw DatabaseError on query failure', async () => {
      const dbError = new Error('Connection lost');
      vi.mocked(dbQuery).mockRejectedValue(dbError);

      await expect(
        (repository as any).executeQuery('INVALID SQL')
      ).rejects.toThrow(DatabaseError);

      await expect(
        (repository as any).executeQuery('INVALID SQL')
      ).rejects.toThrow("Query failed on table 'test_table'");
    });
  });
});

