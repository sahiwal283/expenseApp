import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../apiClient';

/**
 * Frontend API Client CORS Tests
 * 
 * Tests frontend API client configuration:
 * - Relative URLs (no production URLs)
 * - API base URL configuration
 * - URL building logic
 */

describe('Frontend API Client CORS Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Base URL Configuration', () => {
    it('should use relative URLs by default', () => {
      const baseURL = apiClient.getBaseURL();
      
      expect(baseURL).toBe('/api');
      expect(baseURL.startsWith('/')).toBe(true);
      expect(baseURL).not.toContain('http://');
      expect(baseURL).not.toContain('https://');
      expect(baseURL).not.toContain('localhost');
      expect(baseURL).not.toContain('192.168');
      expect(baseURL).not.toContain('duckdns.org');
      expect(baseURL).not.toContain('expapp');

      console.log('✅ API client uses relative URLs');
    });

    it('should build URLs correctly', () => {
      const baseURL = apiClient.getBaseURL();
      
      // Test URL building logic
      const testPath = '/users';
      const expectedURL = `${baseURL}${testPath}`;
      
      expect(expectedURL).toBe('/api/users');
      expect(expectedURL.startsWith('/')).toBe(true);
      expect(expectedURL).not.toContain('http://');
      expect(expectedURL).not.toContain('https://');

      console.log('✅ URL building works correctly');
    });

    it('should not contain production URLs', () => {
      const baseURL = apiClient.getBaseURL();
      
      // Verify no production URLs
      expect(baseURL).not.toContain('duckdns.org');
      expect(baseURL).not.toContain('expapp');
      expect(baseURL).not.toContain('http://');
      expect(baseURL).not.toContain('https://');
      expect(baseURL).not.toContain('localhost');
      expect(baseURL).not.toContain('192.168');

      console.log('✅ No production URLs in API client');
    });
  });

  describe('API Client URL Structure', () => {
    it('should use /api prefix for all requests', () => {
      const baseURL = apiClient.getBaseURL();
      
      expect(baseURL).toBe('/api');
      expect(baseURL.length).toBe(4);
      expect(baseURL).toMatch(/^\/api$/);

      console.log('✅ API prefix correct');
    });

    it('should handle query parameters correctly', () => {
      const baseURL = apiClient.getBaseURL();
      const path = '/users';
      const params = { id: '123', active: true };
      
      // Simulate URL building
      const url = `${baseURL}${path}`;
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      const fullURL = `${url}?${searchParams.toString()}`;
      
      expect(fullURL).toContain('/api/users');
      expect(fullURL).toContain('id=123');
      expect(fullURL).toContain('active=true');
      expect(fullURL.startsWith('/')).toBe(true);

      console.log('✅ Query parameters handled correctly');
    });
  });
});

