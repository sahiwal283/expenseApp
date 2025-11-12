/**
 * Shared Test Utilities
 * 
 * Common mocks and helpers for backend tests
 * Reduces duplication across test files
 */

import { QueryResult } from 'pg';

/**
 * Create a mock database query result
 */
export function createMockQueryResult<T extends Record<string, any>>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

/**
 * Create a mock empty query result
 */
export function createMockEmptyResult(): QueryResult {
  return createMockQueryResult([]);
}

/**
 * Create a mock file object for upload tests
 */
export interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export function createMockFile(
  filename: string,
  mimetype: string,
  size: number = 1024 * 1024
): MockFile {
  return {
    fieldname: 'boothMap',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    destination: 'uploads/booth-maps',
    filename: `test-${Date.now()}-${filename}`,
    path: `uploads/booth-maps/test-${Date.now()}-${filename}`,
    buffer: Buffer.from('fake-file-data'),
  };
}

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
];

/**
 * Validate MIME type (matches backend logic)
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

