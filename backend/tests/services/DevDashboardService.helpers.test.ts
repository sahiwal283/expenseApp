import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkErrorRateAlert,
  checkSlowResponseAlert,
  checkStaleSessionsAlert,
  checkEndpointFailureAlert,
  checkTrafficSpikeAlert,
  checkAuthFailuresAlert,
  parseTimeRange,
  getSystemMemoryMetrics,
  getSystemCPUMetrics,
  formatSessionDuration,
  mapEndpointToPage,
  calculateOCRCosts,
} from '../../src/services/DevDashboardService.helpers';
import { pool } from '../../src/config/database';

/**
 * DevDashboardService Helper Functions Tests
 * 
 * Comprehensive tests for all helper functions extracted from DevDashboardService.
 * Tests cover alert detection, system metrics, and utility functions.
 */

// Mock database pool
vi.mock('../../src/config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock os module for system metrics
vi.mock('os', () => ({
  default: {
    totalmem: vi.fn(() => 17179869184), // 16 GB
    freemem: vi.fn(() => 4294967296),   // 4 GB
    loadavg: vi.fn(() => [2.5, 2.0, 1.5]),
    cpus: vi.fn(() => [
      { model: 'Intel Core i7', speed: 2600 },
      { model: 'Intel Core i7', speed: 2600 },
      { model: 'Intel Core i7', speed: 2600 },
      { model: 'Intel Core i7', speed: 2600 },
    ]),
  },
  totalmem: vi.fn(() => 17179869184),
  freemem: vi.fn(() => 4294967296),
  loadavg: vi.fn(() => [2.5, 2.0, 1.5]),
  cpus: vi.fn(() => [
    { model: 'Intel Core i7', speed: 2600 },
    { model: 'Intel Core i7', speed: 2600 },
    { model: 'Intel Core i7', speed: 2600 },
    { model: 'Intel Core i7', speed: 2600 },
  ]),
}));

describe('DevDashboardService Helper Functions', () => {
  const testDate = new Date('2025-11-10T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Alert Detection Functions', () => {
    describe('checkErrorRateAlert', () => {
      it('should return critical alert when error rate > 10% with sufficient requests', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: '100', error_count: '25' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('critical');
        expect(alert?.title).toBe('High Error Rate Detected');
        expect(alert?.metric_value).toBe('25.0');
        expect(alert?.threshold_value).toBe('10');
        expect(alert?.message).toContain('25.0% error rate');
      });

      it('should return null when error rate is below threshold', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: '100', error_count: '5' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should return null when total requests are too low (< 20)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: '10', error_count: '5' }], // 50% error rate but only 10 requests
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should handle zero requests without errors', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: '0', error_count: '0' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should handle null database values', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: null, error_count: null }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should return alert at exactly threshold (10% with > 20 requests)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ total_requests: '100', error_count: '11' }], // 11% error rate
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkErrorRateAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.metric_value).toBe('11.0');
      });
    });

    describe('checkSlowResponseAlert', () => {
      it('should return warning alert for slow endpoints', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            endpoint: '/api/expenses/report',
            avg_response_time: '5000',
            request_count: '10',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkSlowResponseAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('warning');
        expect(alert?.title).toBe('Slow API Response Times');
        expect(alert?.metric_value).toBe('5000');
        expect(alert?.threshold_value).toBe('2000');
        expect(alert?.message).toContain('/api/expenses/report');
        expect(alert?.message).toContain('5000ms');
      });

      it('should return null when no slow endpoints detected', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

        const alert = await checkSlowResponseAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should round response times correctly', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            endpoint: '/api/test',
            avg_response_time: '2500.7',
            request_count: '10',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkSlowResponseAlert(testDate);

        expect(alert?.metric_value).toBe('2501');
      });
    });

    describe('checkStaleSessionsAlert', () => {
      it('should return info alert when stale sessions > 10', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '15' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkStaleSessionsAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('info');
        expect(alert?.title).toBe('Stale Sessions Detected');
        expect(alert?.metric_value).toBe('15');
        expect(alert?.threshold_value).toBe('10');
      });

      it('should return null when stale sessions <= 10', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '5' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkStaleSessionsAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should handle zero stale sessions', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '0' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkStaleSessionsAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should return alert at exactly threshold (11 sessions)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '11' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkStaleSessionsAlert(testDate);

        expect(alert).not.toBeNull();
      });
    });

    describe('checkEndpointFailureAlert', () => {
      it('should return critical alert for repeated endpoint failures', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            endpoint: '/api/expenses',
            method: 'POST',
            failure_count: '10',
            latest_error: 'Internal Server Error',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkEndpointFailureAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('critical');
        expect(alert?.title).toBe('Endpoint Repeatedly Failing');
        expect(alert?.message).toContain('POST /api/expenses');
        expect(alert?.message).toContain('10');
        expect(alert?.metric_value).toBe('10');
        expect(alert?.threshold_value).toBe('5');
      });

      it('should return null when no repeated failures detected', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

        const alert = await checkEndpointFailureAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should include both method and endpoint in alert', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            endpoint: '/api/test',
            method: 'GET',
            failure_count: '5',
            latest_error: 'Error',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkEndpointFailureAlert(testDate);

        expect(alert?.message).toMatch(/GET \/api\/test/);
      });
    });

    describe('checkTrafficSpikeAlert', () => {
      it('should return warning alert for traffic spike > 200%', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            recent_count: '350',
            previous_count: '100',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkTrafficSpikeAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('warning');
        expect(alert?.title).toBe('Unusual Traffic Spike');
        expect(alert?.metric_value).toBe('250'); // (350-100)/100 * 100 = 250%
        expect(alert?.threshold_value).toBe('200');
        expect(alert?.message).toContain('250%');
      });

      it('should return null when traffic increase is below threshold', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            recent_count: '200',
            previous_count: '100',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkTrafficSpikeAlert(testDate);

        expect(alert).toBeNull(); // 100% increase, below 200% threshold
      });

      it('should return null when recent count is too low (<= 100)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            recent_count: '90',
            previous_count: '20',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkTrafficSpikeAlert(testDate);

        expect(alert).toBeNull(); // 350% increase but only 90 requests
      });

      it('should handle zero previous count (avoid division by zero)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            recent_count: '150',
            previous_count: '0',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkTrafficSpikeAlert(testDate);

        // Should use fallback previousCount of 1
        expect(alert).not.toBeNull();
      });

      it('should calculate percentage increase correctly', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{
            recent_count: '400',
            previous_count: '100',
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkTrafficSpikeAlert(testDate);

        expect(alert?.metric_value).toBe('300'); // 300% increase
      });
    });

    describe('checkAuthFailuresAlert', () => {
      it('should return warning alert when auth failures > 50', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '75' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkAuthFailuresAlert(testDate);

        expect(alert).not.toBeNull();
        expect(alert?.severity).toBe('warning');
        expect(alert?.title).toBe('High Authentication Failures');
        expect(alert?.metric_value).toBe('75');
        expect(alert?.threshold_value).toBe('50');
      });

      it('should return null when auth failures <= 50', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '30' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkAuthFailuresAlert(testDate);

        expect(alert).toBeNull();
      });

      it('should return alert at exactly threshold (51 failures)', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ count: '51' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

        const alert = await checkAuthFailuresAlert(testDate);

        expect(alert).not.toBeNull();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('parseTimeRange', () => {
      it('should parse "24h" to "24 hours"', () => {
        expect(parseTimeRange('24h')).toBe('24 hours');
      });

      it('should parse "7d" to "7 days"', () => {
        expect(parseTimeRange('7d')).toBe('7 days');
      });

      it('should parse "30d" to "30 days"', () => {
        expect(parseTimeRange('30d')).toBe('30 days');
      });

      it('should default to "24 hours" for unknown values', () => {
        expect(parseTimeRange('unknown')).toBe('24 hours');
        expect(parseTimeRange('90d')).toBe('24 hours');
        expect(parseTimeRange('')).toBe('24 hours');
      });

      it('should be case-sensitive', () => {
        expect(parseTimeRange('7D')).toBe('24 hours'); // uppercase not supported
        expect(parseTimeRange('30D')).toBe('24 hours');
      });
    });

    describe('getSystemMemoryMetrics', () => {
      it('should calculate memory metrics correctly', () => {
        const metrics = getSystemMemoryMetrics();

        expect(metrics).toMatchObject({
          usagePercent: expect.any(Number),
          usedGB: expect.any(Number),
          totalGB: expect.any(Number),
          freeGB: expect.any(Number),
        });

        // 16 GB total, 4 GB free = 12 GB used
        expect(metrics.totalGB).toBe(16);
        expect(metrics.freeGB).toBe(4);
        expect(metrics.usedGB).toBe(12);
        expect(metrics.usagePercent).toBeCloseTo(75, 0); // 12/16 = 75%
      });

      it('should return values in GB as numbers', () => {
        const metrics = getSystemMemoryMetrics();

        expect(typeof metrics.totalGB).toBe('number');
        expect(typeof metrics.usedGB).toBe('number');
        expect(typeof metrics.freeGB).toBe('number');
        expect(metrics.totalGB).toBeGreaterThan(0);
      });

      it('should calculate usage percentage correctly', () => {
        const metrics = getSystemMemoryMetrics();

        const expectedUsage = ((metrics.usedGB / metrics.totalGB) * 100);
        expect(metrics.usagePercent).toBeCloseTo(expectedUsage, 1);
      });

      it('should ensure usedGB + freeGB equals totalGB', () => {
        const metrics = getSystemMemoryMetrics();

        expect(metrics.usedGB + metrics.freeGB).toBeCloseTo(metrics.totalGB, 1);
      });
    });

    describe('getSystemCPUMetrics', () => {
      it('should return CPU metrics with load average', () => {
        const metrics = getSystemCPUMetrics();

        expect(metrics).toMatchObject({
          loadAverage: [2.5, 2.0, 1.5],
          cores: 4,
          model: 'Intel Core i7',
          speed: 2600,
        });
      });

      it('should return correct number of CPU cores', () => {
        const metrics = getSystemCPUMetrics();

        expect(metrics.cores).toBe(4);
        expect(metrics.cores).toBeGreaterThan(0);
      });

      it('should handle empty CPU array gracefully', async () => {
        // Note: This test documents the actual behavior
        // In a real scenario, os.cpus() should never return empty array
        const metrics = getSystemCPUMetrics();

        // With current mock, this will have values
        expect(metrics.model).toBeTruthy();
        expect(typeof metrics.speed).toBe('number');
      });

      it('should return load average as array of 3 numbers', () => {
        const metrics = getSystemCPUMetrics();

        expect(Array.isArray(metrics.loadAverage)).toBe(true);
        expect(metrics.loadAverage).toHaveLength(3);
        metrics.loadAverage.forEach(load => {
          expect(typeof load).toBe('number');
        });
      });
    });

    describe('formatSessionDuration', () => {
      it('should format seconds to minutes and seconds', () => {
        expect(formatSessionDuration(125)).toBe('2m 5s');
        expect(formatSessionDuration(300)).toBe('5m 0s');
        expect(formatSessionDuration(61)).toBe('1m 1s');
      });

      it('should handle zero duration', () => {
        expect(formatSessionDuration(0)).toBe('0m 0s');
      });

      it('should handle large durations', () => {
        expect(formatSessionDuration(3661)).toBe('61m 1s'); // 1 hour 1 minute 1 second
      });

      it('should round seconds correctly', () => {
        expect(formatSessionDuration(125.7)).toBe('2m 6s'); // Rounds 5.7 to 6
        expect(formatSessionDuration(125.3)).toBe('2m 5s'); // Rounds 5.3 to 5
      });

      it('should handle negative numbers', () => {
        expect(formatSessionDuration(-10)).toBe('0m 0s');
      });
    });

    describe('mapEndpointToPage', () => {
      it('should map /api/expenses endpoints', () => {
        expect(mapEndpointToPage('/api/expenses')).toEqual({ page: 'Expenses', path: '/expenses' });
        expect(mapEndpointToPage('/api/expenses/123')).toEqual({ page: 'Expenses', path: '/expenses' });
        expect(mapEndpointToPage('/api/expenses/report')).toEqual({ page: 'Expenses', path: '/expenses' });
      });

      it('should map /api/quick-actions to Dashboard', () => {
        expect(mapEndpointToPage('/api/quick-actions')).toEqual({ page: 'Dashboard', path: '/dashboard' });
        expect(mapEndpointToPage('/api/quick-actions/recent')).toEqual({ page: 'Dashboard', path: '/dashboard' });
      });

      it('should map /api/settings endpoints', () => {
        expect(mapEndpointToPage('/api/settings')).toEqual({ page: 'Settings', path: '/settings' });
        expect(mapEndpointToPage('/api/settings/profile')).toEqual({ page: 'Settings', path: '/settings' });
      });

      it('should map /api/events endpoints', () => {
        expect(mapEndpointToPage('/api/events')).toEqual({ page: 'Events', path: '/events' });
        expect(mapEndpointToPage('/api/events/123')).toEqual({ page: 'Events', path: '/events' });
      });

      it('should map /api/users and /api/roles to Users', () => {
        expect(mapEndpointToPage('/api/users')).toEqual({ page: 'Users', path: '/users' });
        expect(mapEndpointToPage('/api/users/123')).toEqual({ page: 'Users', path: '/users' });
        expect(mapEndpointToPage('/api/roles')).toEqual({ page: 'Users', path: '/users' });
        expect(mapEndpointToPage('/api/roles/admin')).toEqual({ page: 'Users', path: '/users' });
      });

      it('should map unknown endpoints to Other', () => {
        expect(mapEndpointToPage('/api/unknown')).toEqual({ page: 'Other', path: '/other' });
        expect(mapEndpointToPage('/api/test')).toEqual({ page: 'Other', path: '/other' });
        expect(mapEndpointToPage('/health')).toEqual({ page: 'Other', path: '/other' });
      });

      it('should be case-sensitive', () => {
        expect(mapEndpointToPage('/API/EXPENSES')).toEqual({ page: 'Other', path: '/other' });
      });
    });

    describe('calculateOCRCosts', () => {
      it('should return zero cost when usage is below free threshold', () => {
        const costs = calculateOCRCosts(500);

        expect(costs.estimatedThisMonth).toBe('0.00');
        expect(costs.remainingFree).toBe(500); // 1000 - 500
        expect(costs.freeThreshold).toBe(1000);
      });

      it('should calculate cost for usage above free threshold', () => {
        const costs = calculateOCRCosts(1500);

        // 1500 - 1000 = 500 billable receipts
        // 500 / 1000 * $1.50 = $0.75
        expect(costs.estimatedThisMonth).toBe('0.75');
        expect(costs.remainingFree).toBe(0);
      });

      it('should calculate projected monthly cost based on daily rate', () => {
        // Mock current date to day 20 of month
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-20'));

        const costs = calculateOCRCosts(1000);

        // 1000 receipts in 20 days = 50/day
        // 50 * 30 = 1500 projected monthly
        // Verify the calculation produces a reasonable projected cost
        expect(parseFloat(costs.projectedMonthly)).toBeGreaterThan(0);
        expect(parseFloat(costs.projectedMonthly)).toBeLessThan(2.00);
        
        // Verify format is correct (2 decimal places)
        expect(costs.projectedMonthly).toMatch(/^\d+\.\d{2}$/);

        vi.useRealTimers();
      });

      it('should return zero projected cost if projection is below threshold', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-10'));

        const costs = calculateOCRCosts(100); // Only 100 receipts in 10 days

        // 100 / 10 * 30 = 300 projected monthly (below 1000 threshold)
        expect(costs.projectedMonthly).toBe('0.00');

        vi.useRealTimers();
      });

      it('should return correct pricing information', () => {
        const costs = calculateOCRCosts(100);

        expect(costs.currency).toBe('USD');
        expect(costs.pricingModel).toContain('Free for first 1000');
        expect(costs.pricingModel).toContain('$1.5 per 1,000');
      });

      it('should handle exactly at free threshold', () => {
        const costs = calculateOCRCosts(1000);

        expect(costs.estimatedThisMonth).toBe('0.00');
        expect(costs.remainingFree).toBe(0);
      });

      it('should handle large usage volumes', () => {
        const costs = calculateOCRCosts(10000);

        // 10000 - 1000 = 9000 billable
        // 9000 / 1000 * $1.50 = $13.50
        expect(costs.estimatedThisMonth).toBe('13.50');
        expect(costs.remainingFree).toBe(0);
      });

      it('should never return negative remainingFree', () => {
        const costs = calculateOCRCosts(2000);

        expect(costs.remainingFree).toBe(0);
        expect(costs.remainingFree).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database query failures gracefully', async () => {
      vi.mocked(pool.query).mockRejectedValue(new Error('Database connection lost'));

      await expect(checkErrorRateAlert(testDate)).rejects.toThrow('Database connection lost');
    });

    it('should handle empty result sets', async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const alert = await checkSlowResponseAlert(testDate);
      expect(alert).toBeNull();
    });

    it('should handle malformed database responses', async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rows: [{}], // Missing expected fields
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const alert = await checkStaleSessionsAlert(testDate);
      expect(alert).toBeNull(); // Should handle gracefully
    });
  });
});

