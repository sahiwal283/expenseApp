import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DevDashboardService } from '../../src/services/DevDashboardService';
import { pool } from '../../src/config/database';

/**
 * DevDashboard Service Tests
 * 
 * Tests business logic for developer dashboard functionality including:
 * - Version information
 * - Dashboard summary statistics
 * - System metrics
 * - Audit logs
 * - Active sessions
 * - API analytics
 * - Alerts
 */

// Mock database pool
vi.mock('../../src/config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock repositories
vi.mock('../../src/database/repositories', () => ({
  auditLogRepository: {
    findWithFilters: vi.fn(),
  },
  apiRequestRepository: {
    getStats: vi.fn(),
  },
}));

// Mock axios for OCR service
vi.mock('axios');

describe('DevDashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVersionInfo', () => {
    it('should return version information', async () => {
      const mockDbVersion = 'PostgreSQL 15.3 on x86_64-pc-linux-gnu';
      const mockUptime = 86400; // 1 day in seconds

      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ version: mockDbVersion }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ uptime: mockUptime }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await DevDashboardService.getVersionInfo();

      expect(result).toMatchObject({
        frontend: {
          version: expect.any(String),
        },
        backend: {
          version: expect.any(String),
          nodeVersion: expect.stringContaining('v'),
        },
        database: '15.3',
        uptime: expect.any(Number),
        dbUptime: mockUptime,
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle database version extraction correctly', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 14.2' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ uptime: 100 }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await DevDashboardService.getVersionInfo();

      expect(result.database).toBe('14.2');
    });
  });

  describe('getSummary', () => {
    it('should return dashboard summary with correct statistics', async () => {
      // Mock all database queries for summary
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ count: '10' }], command: '', rowCount: 1, oid: 0, fields: [] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '100' }], command: '', rowCount: 1, oid: 0, fields: [] }) // expenses
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] }) // events
        .mockResolvedValueOnce({ rows: [{ count: '15' }], command: '', rowCount: 1, oid: 0, fields: [] }) // pending expenses
        .mockResolvedValueOnce({ rows: [{ count: '3' }], command: '', rowCount: 1, oid: 0, fields: [] }) // active sessions
        .mockResolvedValueOnce({ rows: [{ total: '5000.50' }], command: '', rowCount: 1, oid: 0, fields: [] }) // total amount
        .mockResolvedValueOnce({ rows: [{ count: '80' }], command: '', rowCount: 1, oid: 0, fields: [] }) // zoho pushed
        .mockResolvedValueOnce({ rows: [{ total_requests: '50', error_count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] }) // error rate
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] }); // slow endpoints

      // Mock API request repository
      const { apiRequestRepository } = await import('../../src/database/repositories');
      vi.mocked(apiRequestRepository.getStats).mockResolvedValue({
        totalRequests: 150,
        avgResponseTime: 200,
        errorRate: 2.5,
        successRate: 97.5,
      });

      const result = await DevDashboardService.getSummary();

      expect(result).toMatchObject({
        total_users: 10,
        active_sessions: 3,
        recent_actions: 150,
        active_events: 5,
        pending_expenses: 15,
        total_expenses: 100,
        approved_expenses: 85,
        total_amount: 5000.50,
        pushed_to_zoho: 80,
        health_score: expect.any(Number),
        health_status: expect.stringMatching(/healthy|warning|critical/),
      });

      expect(result.health_score).toBe(85); // 1 - (15/100) = 0.85 * 100 = 85
      expect(result.health_status).toBe('healthy');
    });

    it('should calculate health score correctly with no expenses', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] }) // no expenses
        .mockResolvedValueOnce({ rows: [{ count: '2' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total_requests: '10', error_count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const { apiRequestRepository } = await import('../../src/database/repositories');
      vi.mocked(apiRequestRepository.getStats).mockResolvedValue({
        totalRequests: 50,
        avgResponseTime: 100,
        errorRate: 0,
        successRate: 100,
      });

      const result = await DevDashboardService.getSummary();

      expect(result.health_score).toBe(100);
      expect(result.health_status).toBe('healthy');
    });

    it('should set health status to warning when score is between 50-80', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '35' }], command: '', rowCount: 1, oid: 0, fields: [] }) // 35% pending
        .mockResolvedValueOnce({ rows: [{ count: '2' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '1000' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total_requests: '100', error_count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const { apiRequestRepository } = await import('../../src/database/repositories');
      vi.mocked(apiRequestRepository.getStats).mockResolvedValue({
        totalRequests: 100,
        avgResponseTime: 200,
        errorRate: 5,
        successRate: 95,
      });

      const result = await DevDashboardService.getSummary();

      expect(result.health_score).toBe(65); // 1 - (35/100) = 0.65
      expect(result.health_status).toBe('warning');
    });
  });

  describe('getMetrics', () => {
    it('should return system and database metrics', async () => {
      // Mock expense trends
      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [
            { date: '2025-11-01', count: '10', total: '500' },
            { date: '2025-11-02', count: '15', total: '750' },
          ],
          command: '', rowCount: 2, oid: 0, fields: []
        })
        // Mock category breakdown
        .mockResolvedValueOnce({
          rows: [
            { category: 'Food', count: '20', total: '800' },
            { category: 'Travel', count: '15', total: '1500' },
          ],
          command: '', rowCount: 2, oid: 0, fields: []
        })
        // Mock user activity
        .mockResolvedValueOnce({
          rows: [
            { username: 'john', role: 'admin', expense_count: '25', total_amount: '2000' },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock database size
        .mockResolvedValueOnce({
          rows: [{ size_bytes: '104857600', size_pretty: '100 MB' }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock connection count
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock table sizes
        .mockResolvedValueOnce({
          rows: [
            { schemaname: 'public', tablename: 'expenses', size: '50 MB', size_bytes: '52428800' },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock historical metrics
        .mockResolvedValueOnce({
          rows: [
            { metric_type: 'memory_usage', avg_value: 50, max_value: 70, min_value: 30, metric_unit: '%', sample_count: 1 },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        });

      const result = await DevDashboardService.getMetrics('24h');

      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('expenses');
      expect(result).toHaveProperty('users');
      expect(result.timeRange).toBe('24h');

      expect(result.system).toMatchObject({
        memory: {
          usagePercent: expect.any(Number),
          usedGB: expect.any(Number),
          totalGB: expect.any(Number),
          freeGB: expect.any(Number),
        },
        cpu: {
          loadAverage: expect.any(Array),
          cores: expect.any(Number),
        },
      });

      expect(result.database).toMatchObject({
        databaseSize: 104857600,
        databaseSizePretty: '100 MB',
        activeConnections: 5,
      });
    });

    it('should handle different time ranges', async () => {
      // Setup mock for 7d timeRange with all required queries
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // expense trends
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // category breakdown
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // user activity
        .mockResolvedValueOnce({ rows: [{ size_bytes: '100', size_pretty: '100 MB' }], command: '', rowCount: 1, oid: 0, fields: [] }) // db size
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] }) // connections
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // table sizes
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }); // historical

      const result = await DevDashboardService.getMetrics('7d');

      // Verify the result has the correct timeRange
      expect(result.timeRange).toBe('7d');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('database');
      
      // Verify at least one query was made with '7 days' interval
      const calls = vi.mocked(pool.query).mock.calls;
      const has7DaysInterval = calls.some(call => 
        typeof call[0] === 'string' && call[0].includes("INTERVAL '7 days'")
      );
      expect(has7DaysInterval).toBe(true);
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch audit logs using repository', async () => {
      const mockLogs = [
        {
          id: 1,
          user_name: 'john',
          action: 'expense_created',
          entity_type: 'expense',
          created_at: '2025-11-01T10:00:00Z',
        },
      ];

      const { auditLogRepository } = await import('../../src/database/repositories');
      vi.mocked(auditLogRepository.findWithFilters).mockResolvedValue(mockLogs as any);

      const result = await DevDashboardService.getAuditLogs(50, 'expense_created');

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
      expect(auditLogRepository.findWithFilters).toHaveBeenCalledWith({
        action: 'expense_created',
        limit: 50,
      });
    });

    it('should filter logs by search term locally', async () => {
      const mockLogs = [
        {
          id: 1,
          user_name: 'john',
          action: 'expense_created',
          entity_type: 'expense',
        },
        {
          id: 2,
          user_name: 'jane',
          action: 'expense_approved',
          entity_type: 'expense',
        },
      ];

      const { auditLogRepository } = await import('../../src/database/repositories');
      vi.mocked(auditLogRepository.findWithFilters).mockResolvedValue(mockLogs as any);

      const result = await DevDashboardService.getAuditLogs(50, undefined, 'john');

      expect(result.logs.length).toBe(1);
      expect(result.logs[0].user_name).toBe('john');
    });

    it('should fallback to simulated logs if repository fails', async () => {
      const { auditLogRepository } = await import('../../src/database/repositories');
      vi.mocked(auditLogRepository.findWithFilters).mockRejectedValue(new Error('Table not found'));

      vi.mocked(pool.query).mockResolvedValue({
        rows: [
          {
            id: '123',
            created_at: '2025-11-01',
            user_name: 'john',
            user_email: 'john@example.com',
            user_role: 'admin',
            action: 'expense_created',
            entity_type: 'expense',
            entity_id: '456',
            status: 'success',
            ip_address: null,
          },
        ],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await DevDashboardService.getAuditLogs(50);

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.notice).toContain('Using simulated audit logs');
    });
  });

  describe('getSessions', () => {
    it('should return active user sessions with correct status', async () => {
      const now = new Date();
      const recentActivity = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
      const idleActivity = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      vi.mocked(pool.query).mockResolvedValue({
        rows: [
          {
            id: '1',
            user_id: 'user-1',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            session_start: new Date(now.getTime() - 30 * 60 * 1000),
            last_activity: recentActivity,
            expires_at: new Date(now.getTime() + 60 * 60 * 1000),
            username: 'john',
            email: 'john@example.com',
            role: 'admin',
          },
          {
            id: '2',
            user_id: 'user-2',
            ip_address: '192.168.1.2',
            user_agent: 'Chrome',
            session_start: new Date(now.getTime() - 120 * 60 * 1000),
            last_activity: idleActivity,
            expires_at: new Date(now.getTime() + 30 * 60 * 1000),
            username: 'jane',
            email: 'jane@example.com',
            role: 'coordinator',
          },
        ],
        command: '',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await DevDashboardService.getSessions();

      expect(result.sessions.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.sessions[0].status).toBe('active');
      expect(result.sessions[1].status).toBe('idle');
    });
  });

  describe('getAPIAnalytics', () => {
    it('should return API request statistics', async () => {
      // Mock endpoint stats
      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [
            {
              method: 'GET',
              endpoint: '/api/expenses',
              call_count: '100',
              avg_response_time: '150.5',
              max_response_time: '500',
              error_count: '2',
            },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock overall stats
        .mockResolvedValueOnce({
          rows: [{
            total_requests: '1000',
            avg_response_time: '200.5',
            total_errors: '50',
          }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        // Mock slowest endpoints
        .mockResolvedValueOnce({
          rows: [
            {
              method: 'POST',
              endpoint: '/api/ocr/process',
              avg_response_time: '3000',
              call_count: '10',
            },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        });

      const result = await DevDashboardService.getAPIAnalytics('24h');

      expect(result).toMatchObject({
        total_requests: 1000,
        avg_response_time: 201,
        error_rate: 5,
        success_rate: 95,
      });

      expect(result.endpointStats.length).toBeGreaterThan(0);
      expect(result.slowestEndpoints.length).toBeGreaterThan(0);
    });
  });

  describe('getAlerts', () => {
    it('should return "all systems operational" when no issues detected', async () => {
      // Mock all alert checks to pass
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ total_requests: '100', error_count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] }) // Low error rate
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // No slow endpoints
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] }) // Few stale sessions
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] }) // No repeated failures
        .mockResolvedValueOnce({ rows: [{ recent_count: '100', previous_count: '95' }], command: '', rowCount: 1, oid: 0, fields: [] }) // Normal traffic
        .mockResolvedValueOnce({ rows: [{ count: '10' }], command: '', rowCount: 1, oid: 0, fields: [] }); // Low auth failures

      const result = await DevDashboardService.getAlerts();

      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0]).toMatchObject({
        severity: 'success',
        title: 'All Systems Operational',
      });
    });

    it('should detect high error rate alert', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ total_requests: '100', error_count: '25' }], command: '', rowCount: 1, oid: 0, fields: [] }) // 25% error rate
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ recent_count: '100', previous_count: '95' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await DevDashboardService.getAlerts();

      const errorAlert = result.alerts.find(a => a.title === 'High Error Rate Detected');
      expect(errorAlert).toBeDefined();
      expect(errorAlert?.severity).toBe('critical');
    });

    it('should detect slow endpoint alert', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [{ total_requests: '100', error_count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ endpoint: '/api/slow', avg_response_time: '5000', request_count: '10' }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ recent_count: '100', previous_count: '95' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await DevDashboardService.getAlerts();

      const slowAlert = result.alerts.find(a => a.title === 'Slow API Response Times');
      expect(slowAlert).toBeDefined();
      expect(slowAlert?.severity).toBe('warning');
    });
  });

  describe('getPageAnalytics', () => {
    it('should return page analytics with user stats', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [{
            unique_users: '25',
            total_requests: '500',
            avg_response_time: '180.5',
          }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        .mockResolvedValueOnce({
          rows: [
            {
              page: 'Expenses',
              path: '/expenses',
              view_count: '250',
              unique_users: '20',
              avg_duration: '200',
            },
          ],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ avg_duration: '300' }],
          command: '', rowCount: 1, oid: 0, fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ bounce_rate: '25.5' }],
          command: '', rowCount: 1, oid: 0, fields: []
        });

      const result = await DevDashboardService.getPageAnalytics('24h');

      expect(result).toMatchObject({
        total_page_views: 500,
        unique_visitors: 25,
        avg_session_duration: expect.stringMatching(/\d+m \d+s/),
        bounce_rate: expect.stringMatching(/\d+\.\d+%/),
      });

      expect(result.pageStats.length).toBeGreaterThan(0);
    });
  });
});

