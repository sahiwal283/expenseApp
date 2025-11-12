import { describe, it, expect } from 'vitest';
import {
  createMockQueryResult,
  createMockEmptyResult,
  createMockFile,
  isValidMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './testHelpers';

/**
 * Test Shared Utilities
 * 
 * Verifies shared test utilities work correctly
 */

describe('Shared Test Utilities', () => {
  describe('createMockQueryResult', () => {
    it('should create mock query result with rows', () => {
      const rows = [{ id: 1, name: 'Test' }];
      const result = createMockQueryResult(rows);

      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
      expect(result.command).toBe('SELECT');
    });

    it('should create empty query result', () => {
      const result = createMockEmptyResult();

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });

  describe('createMockFile', () => {
    it('should create mock file with correct structure', () => {
      const file = createMockFile('booth-map.jpg', 'image/jpeg');

      expect(file.fieldname).toBe('boothMap');
      expect(file.originalname).toBe('booth-map.jpg');
      expect(file.mimetype).toBe('image/jpeg');
      expect(file.destination).toBe('uploads/booth-maps');
      expect(file.path).toContain('booth-maps');
    });

    it('should create mock file with custom size', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 5 * 1024 * 1024);

      expect(file.size).toBe(5 * 1024 * 1024);
      expect(file.mimetype).toBe('application/pdf');
    });
  });

  describe('isValidMimeType', () => {
    it('should validate allowed MIME types', () => {
      expect(isValidMimeType('image/jpeg')).toBe(true);
      expect(isValidMimeType('image/png')).toBe(true);
      expect(isValidMimeType('application/pdf')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isValidMimeType('IMAGE/JPEG')).toBe(true);
      expect(isValidMimeType('Image/Png')).toBe(true);
      expect(isValidMimeType('APPLICATION/PDF')).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(isValidMimeType('application/x-msdownload')).toBe(false);
      expect(isValidMimeType('text/plain')).toBe(false);
      expect(isValidMimeType('application/zip')).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct ALLOWED_MIME_TYPES', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES.length).toBe(5);
    });

    it('should have correct MAX_FILE_SIZE', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });
  });
});

