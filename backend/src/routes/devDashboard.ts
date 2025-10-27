import express from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import backendPkg from '../../package.json';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FRONTEND_VERSION } from '../config/version';

const router = express.Router();

// All routes require authentication and admin or developer role
router.use(authenticateToken);
router.use((req: any, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  next();
});

// GET /api/dev-dashboard/version
router.get('/version', async (req, res) => {
  try {
    // Backend version from backend/package.json
    const backendVersion = backendPkg.version;
    
    // Frontend version embedded at build time
    const frontendVersion = FRONTEND_VERSION;
    
    // Get database info
    const dbResult = await pool.query('SELECT version()');
    const dbVersion = dbResult.rows[0].version;
    
    // Get database uptime
    const uptimeResult = await pool.query(`
      SELECT EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) as uptime
    `);
    const dbUptime = Math.floor(uptimeResult.rows[0].uptime);
    
    // Get process uptime (backend server uptime)
    const processUptime = Math.floor(process.uptime());
    
    res.json({
      frontend: {
        version: frontendVersion
      },
      backend: {
        version: backendVersion,
        nodeVersion: process.version
      },
      database: dbVersion.match(/\d+\.\d+/)?.[0] || 'PostgreSQL',
      uptime: processUptime, // Backend process uptime
      dbUptime: dbUptime, // Database uptime
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Version endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch version info' });
  }
});

// GET /api/dev-dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    // Get counts
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const expensesResult = await pool.query('SELECT COUNT(*) as count FROM expenses');
    const eventsResult = await pool.query('SELECT COUNT(*) as count FROM events');
    const pendingExpensesResult = await pool.query(
      `SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'`
    );
    
    // Get active sessions count (valid, non-expired sessions)
    const activeSessionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()`
    );
    
    // Get total expense amount
    const totalAmountResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses'
    );
    
    // Get expenses pushed to Zoho
    const zohoPushedResult = await pool.query(
      `SELECT COUNT(*) as count FROM expenses WHERE zoho_expense_id IS NOT NULL`
    );
    
    // Get recent activity (last 24 hours) from api_requests
    const recentActionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM api_requests WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    
    // Calculate system health (simple metric based on pending expenses)
    const totalExpenses = parseInt(expensesResult.rows[0].count);
    const pendingCount = parseInt(pendingExpensesResult.rows[0].count);
    const healthScore = totalExpenses > 0 
      ? Math.round((1 - (pendingCount / totalExpenses)) * 100)
      : 100;
    
    // Calculate active alerts count (using new developer-focused logic)
    let alertCount = 0;
    
    // Check error rate
    const errorRateResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    const totalRequests = parseInt(errorRateResult.rows[0].total_requests) || 0;
    const errorCount = parseInt(errorRateResult.rows[0].error_count) || 0;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests * 100) : 0;
    if (errorRate > 10 && totalRequests > 20) alertCount++;
    
    // Check for slow endpoints
    const slowEndpointsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT endpoint, AVG(response_time_ms) as avg_time
        FROM api_requests
        WHERE created_at > NOW() - INTERVAL '1 hour'
          AND endpoint NOT LIKE '/api/dev-dashboard%'
        GROUP BY endpoint
        HAVING AVG(response_time_ms) > 2000 AND COUNT(*) >= 5
      ) slow_endpoints
    `);
    if (parseInt(slowEndpointsResult.rows[0].count) > 0) alertCount++;
    
    res.json({
      // Frontend expects these specific field names
      total_users: parseInt(usersResult.rows[0].count),
      active_sessions: parseInt(activeSessionsResult.rows[0].count),
      recent_actions: parseInt(recentActionsResult.rows[0].count),
      active_alerts: alertCount,
      critical_alerts: 0,
      active_events: parseInt(eventsResult.rows[0].count),
      pending_expenses: pendingCount,
      total_expenses: totalExpenses,
      approved_expenses: totalExpenses - pendingCount,
      total_amount: parseFloat(totalAmountResult.rows[0].total),
      pushed_to_zoho: parseInt(zohoPushedResult.rows[0].count),
      health_score: healthScore,
      health_status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      uptime: 'N/A',
      // Also include nested structure for compatibility
      users: {
        total: parseInt(usersResult.rows[0].count),
        active: parseInt(usersResult.rows[0].count)
      },
      expenses: {
        total: totalExpenses,
        pending: pendingCount,
        approved: totalExpenses - pendingCount,
        totalAmount: parseFloat(totalAmountResult.rows[0].total),
        pushedToZoho: parseInt(zohoPushedResult.rows[0].count)
      },
      events: {
        total: parseInt(eventsResult.rows[0].count),
        active: parseInt(eventsResult.rows[0].count)
      },
      activity: {
        last24h: parseInt(recentActionsResult.rows[0].count)
      },
      health: {
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical'
      }
    });
  } catch (error) {
    console.error('Summary endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

// GET /api/dev-dashboard/metrics
router.get('/metrics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Parse time range
    let interval = '24 hours';
    if (timeRange === '7d') interval = '7 days';
    else if (timeRange === '30d') interval = '30 days';
    
    // Get expense trends
    const expenseTrendsResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    // Get category breakdown
    const categoryResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY category
      ORDER BY total DESC
    `);
    
    // Get user activity
    const userActivityResult = await pool.query(`
      SELECT 
        u.username,
        u.role,
        COUNT(e.id) as expense_count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id AND e.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY u.id, u.username, u.role
      ORDER BY expense_count DESC
    `);
    
    // System metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    const loadAverage = os.loadavg();
    const cpuCores = os.cpus().length;
    
    // Database stats
    const dbSizeResult = await pool.query(`
      SELECT 
        pg_database_size(current_database()) as size_bytes,
        pg_size_pretty(pg_database_size(current_database())) as size_pretty
    `);
    
    const connectionResult = await pool.query(`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `);
    
    // Get table sizes
    const tableSizesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);
    
    // Get historical metrics (if metrics table exists)
    let historicalMetrics = [];
    try {
      const historicalResult = await pool.query(`
        SELECT 
          'memory_usage' as metric_type,
          AVG(${memoryUsagePercent}) as avg_value,
          MAX(${memoryUsagePercent}) as max_value,
          MIN(${memoryUsagePercent}) as min_value,
          '%' as metric_unit,
          1 as sample_count
        UNION ALL
        SELECT 
          'cpu_load' as metric_type,
          ${loadAverage[0]} as avg_value,
          ${loadAverage[0]} as max_value,
          ${loadAverage[0]} as min_value,
          '' as metric_unit,
          1 as sample_count
        UNION ALL
        SELECT 
          'db_connections' as metric_type,
          ${parseInt(connectionResult.rows[0].count)} as avg_value,
          ${parseInt(connectionResult.rows[0].count)} as max_value,
          ${parseInt(connectionResult.rows[0].count)} as min_value,
          'connections' as metric_unit,
          1 as sample_count
      `);
      historicalMetrics = historicalResult.rows;
    } catch (err) {
      console.warn('Could not fetch historical metrics:', err);
    }
    
    res.json({
      system: {
        memory: {
          usagePercent: memoryUsagePercent,
          usedGB: parseFloat((usedMemory / 1024 / 1024 / 1024).toFixed(2)),
          totalGB: parseFloat((totalMemory / 1024 / 1024 / 1024).toFixed(2)),
          freeGB: parseFloat((freeMemory / 1024 / 1024 / 1024).toFixed(2))
        },
        cpu: {
          loadAverage: loadAverage,
          cores: cpuCores,
          model: os.cpus()[0]?.model || 'Unknown',
          speed: os.cpus()[0]?.speed || 0
        },
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime()
      },
      database: {
        databaseSize: parseInt(dbSizeResult.rows[0].size_bytes),
        databaseSizePretty: dbSizeResult.rows[0].size_pretty,
        activeConnections: parseInt(connectionResult.rows[0].count),
        totalConnections: 100, // Default PostgreSQL max_connections
        tableSizes: tableSizesResult.rows
      },
      historical: historicalMetrics,
      expenses: {
        trends: expenseTrendsResult.rows,
        categoryBreakdown: categoryResult.rows
      },
      users: {
        activity: userActivityResult.rows
      },
      timeRange: timeRange
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics data' });
  }
});

// GET /api/dev-dashboard/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50, action, search } = req.query;
    
    // Check if audit_log table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log'
      )
    `);
    
    const hasAuditTable = tableCheck.rows[0].exists;
    
    if (hasAuditTable) {
      // Query actual audit log table
      let query = `
        SELECT 
          id,
          user_id,
          user_name,
          user_email,
          user_role,
          action,
          entity_type,
          entity_id,
          status,
          ip_address,
          user_agent,
          request_method,
          request_path,
          changes,
          error_message,
          created_at
        FROM audit_log
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (action && action !== 'all') {
        params.push(action);
        query += ` AND action = $${params.length}`;
      }
      
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (user_name ILIKE $${params.length} OR action ILIKE $${params.length} OR entity_type ILIKE $${params.length})`;
      }
      
      params.push(parseInt(limit as string));
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      
      const result = await pool.query(query, params);
      
      res.json({
        logs: result.rows,
        total: result.rowCount
      });
    } else {
      // Fallback: simulate audit logs from expense activity (for backward compatibility)
      let query = `
        SELECT 
          e.id,
          e.created_at,
          u.username as user_name,
          u.email as user_email,
          u.role as user_role,
          CASE 
            WHEN e.status = 'pending' THEN 'expense_created'
            WHEN e.status = 'approved' THEN 'expense_approved'
            WHEN e.status = 'rejected' THEN 'expense_rejected'
            ELSE 'expense_updated'
          END as action,
          'expense' as entity_type,
          e.id as entity_id,
          'success' as status,
          NULL as ip_address
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (action && action !== 'all') {
        params.push(action);
        query += ` AND CASE 
          WHEN e.status = 'pending' THEN 'expense_created'
          WHEN e.status = 'approved' THEN 'expense_approved'
          WHEN e.status = 'rejected' THEN 'expense_rejected'
          ELSE 'expense_updated'
        END = $${params.length}`;
      }
      
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (e.merchant ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
      }
      
      params.push(parseInt(limit as string));
      query += ` ORDER BY e.created_at DESC LIMIT $${params.length}`;
      
      const result = await pool.query(query, params);
      
      res.json({
        logs: result.rows,
        total: result.rowCount,
        notice: 'Using simulated audit logs. Run migration 004_create_audit_log.sql for full audit logging.'
      });
    }
  } catch (error) {
    console.error('Audit logs endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/dev-dashboard/sessions
router.get('/sessions', async (req, res) => {
  try {
    // Get active user sessions from user_sessions table
    const result = await pool.query(`
      SELECT 
        s.id,
        s.user_id,
        s.ip_address,
        s.user_agent,
        s.created_at as session_start,
        s.last_activity,
        s.expires_at,
        u.username,
        u.email,
        u.role
      FROM user_sessions s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      ORDER BY s.last_activity DESC
    `);
    
    const now = new Date();
    const sessions = result.rows.map(row => {
      const lastActivity = new Date(row.last_activity);
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      
      // Determine status based on last activity
      let status = 'active';
      if (timeSinceActivity > 300000) { // > 5 minutes
        status = 'idle';
      }
      if (timeSinceActivity > 3600000) { // > 1 hour
        status = 'inactive';
      }
      
      return {
        id: row.id,
        user_id: row.user_id,
        user_name: row.username,
        user_email: row.email || 'N/A',
        user_role: row.role,
        ip_address: row.ip_address || 'N/A',
        user_agent: row.user_agent || 'N/A',
        session_start: row.session_start,
        last_activity: row.last_activity,
        expires_at: row.expires_at,
        status,
        duration_minutes: Math.floor((now.getTime() - new Date(row.session_start).getTime()) / 60000)
      };
    });
    
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error('Sessions endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions data' });
  }
});

// GET /api/dev-dashboard/api-analytics
router.get('/api-analytics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let interval = '24 hours';
    if (timeRange === '7d') interval = '7 days';
    else if (timeRange === '30d') interval = '30 days';
    
    // Get actual API request statistics from api_requests table
    const endpointStats = await pool.query(`
      SELECT 
        method,
        endpoint,
        COUNT(*) as call_count,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND endpoint NOT LIKE '/api/dev-dashboard%' -- Exclude dev dashboard self-requests
      GROUP BY method, endpoint
      ORDER BY call_count DESC
      LIMIT 20
    `);
    
    // Get overall statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as total_errors
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND endpoint NOT LIKE '/api/dev-dashboard%'
    `);
    
    const totalRequests = parseInt(overallStats.rows[0].total_requests) || 0;
    const avgResponseTime = Math.round(parseFloat(overallStats.rows[0].avg_response_time) || 0);
    const totalErrors = parseInt(overallStats.rows[0].total_errors) || 0;
    const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00';
    const successRate = totalRequests > 0 ? (100 - parseFloat(errorRate)).toFixed(2) : '100.00';
    
    // Get slowest endpoints
    const slowestEndpoints = await pool.query(`
      SELECT 
        method,
        endpoint,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as call_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND endpoint NOT LIKE '/api/dev-dashboard%'
      GROUP BY method, endpoint
      HAVING COUNT(*) >= 5 -- Only show endpoints with significant traffic
      ORDER BY avg_response_time DESC
      LIMIT 5
    `);
    
    res.json({
      total_requests: totalRequests,
      avg_response_time: avgResponseTime,
      error_rate: parseFloat(errorRate),
      success_rate: parseFloat(successRate),
      endpointStats: endpointStats.rows.map(row => ({
        endpoint: row.endpoint,
        method: row.method,
        call_count: parseInt(row.call_count),
        avg_response_time: Math.round(parseFloat(row.avg_response_time)),
        max_response_time: Math.round(parseFloat(row.max_response_time)),
        error_count: parseInt(row.error_count)
      })),
      slowestEndpoints: slowestEndpoints.rows.map(row => ({
        endpoint: row.endpoint,
        method: row.method,
        avg_response_time: Math.round(parseFloat(row.avg_response_time)),
        call_count: parseInt(row.call_count)
      }))
    });
  } catch (error) {
    console.error('API analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch API analytics' });
  }
});

// GET /api/dev-dashboard/alerts
router.get('/alerts', async (req, res) => {
  try {
    const { status = 'active', severity } = req.query;
    
    const alerts: any[] = [];
    const now = new Date();
    
    // 1. Check for high error rate (last 1 hour)
    const errorRateResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    
    const totalRequests = parseInt(errorRateResult.rows[0].total_requests) || 0;
    const errorCount = parseInt(errorRateResult.rows[0].error_count) || 0;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests * 100) : 0;
    
    if (errorRate > 10 && totalRequests > 20) { // Only alert if significant traffic
      alerts.push({
        id: 'alert-error-rate',
        severity: 'critical',
        status: 'active',
        title: 'High Error Rate Detected',
        description: `${errorRate.toFixed(1)}% of API requests are failing (${errorCount}/${totalRequests} requests). Check API Analytics and server logs for details.`,
        message: `${errorRate.toFixed(1)}% error rate in last hour`,
        metric_value: errorRate.toFixed(1),
        threshold_value: '10',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // 2. Check for slow response times (last 1 hour)
    const slowEndpointsResult = await pool.query(`
      SELECT 
        endpoint,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as request_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND endpoint NOT LIKE '/api/dev-dashboard%'
      GROUP BY endpoint
      HAVING AVG(response_time_ms) > 2000 AND COUNT(*) >= 5
      ORDER BY avg_response_time DESC
      LIMIT 1
    `);
    
    if (slowEndpointsResult.rows.length > 0) {
      const slowEndpoint = slowEndpointsResult.rows[0];
      const avgTime = Math.round(parseFloat(slowEndpoint.avg_response_time));
      alerts.push({
        id: 'alert-slow-response',
        severity: 'warning',
        status: 'active',
        title: 'Slow API Response Times',
        description: `Endpoint ${slowEndpoint.endpoint} is averaging ${avgTime}ms response time. This may indicate database performance issues, external API delays, or resource constraints.`,
        message: `${slowEndpoint.endpoint} averaging ${avgTime}ms`,
        metric_value: avgTime.toString(),
        threshold_value: '2000',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // 3. Check for database connection issues (stale sessions)
    const staleSessions = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE expires_at > NOW()
        AND last_activity < NOW() - INTERVAL '24 hours'
    `);
    
    const staleCount = parseInt(staleSessions.rows[0].count) || 0;
    if (staleCount > 10) {
      alerts.push({
        id: 'alert-stale-sessions',
        severity: 'info',
        status: 'active',
        title: 'Stale Sessions Detected',
        description: `${staleCount} sessions haven't been active in 24+ hours but are still valid. Consider implementing session cleanup or reducing token expiry time.`,
        message: `${staleCount} stale sessions`,
        metric_value: staleCount.toString(),
        threshold_value: '10',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // 4. Check for repeated endpoint failures (potential bug)
    const repeatedFailuresResult = await pool.query(`
      SELECT 
        endpoint,
        method,
        COUNT(*) as failure_count,
        MAX(error_message) as latest_error
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND status_code >= 500
      GROUP BY endpoint, method
      HAVING COUNT(*) >= 5
      ORDER BY failure_count DESC
      LIMIT 1
    `);
    
    if (repeatedFailuresResult.rows.length > 0) {
      const failure = repeatedFailuresResult.rows[0];
      alerts.push({
        id: 'alert-endpoint-failure',
        severity: 'critical',
        status: 'active',
        title: 'Endpoint Repeatedly Failing',
        description: `${failure.method} ${failure.endpoint} has failed ${failure.failure_count} times in the last hour with 5xx errors. This likely indicates a server-side bug or service outage.`,
        message: `${failure.method} ${failure.endpoint} failing (${failure.failure_count}x)`,
        metric_value: failure.failure_count,
        threshold_value: '5',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // 5. Check API request volume spike (potential DDoS or traffic surge)
    const volumeCheckResult = await pool.query(`
      SELECT 
        COUNT(*) as recent_count,
        (
          SELECT COUNT(*) 
          FROM api_requests 
          WHERE created_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '1 hour'
        ) as previous_count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    
    const recentCount = parseInt(volumeCheckResult.rows[0].recent_count) || 0;
    const previousCount = parseInt(volumeCheckResult.rows[0].previous_count) || 1; // Avoid division by zero
    const volumeIncrease = ((recentCount - previousCount) / previousCount * 100);
    
    if (volumeIncrease > 200 && recentCount > 100) { // 200% increase and significant volume
      alerts.push({
        id: 'alert-traffic-spike',
        severity: 'warning',
        status: 'active',
        title: 'Unusual Traffic Spike',
        description: `API traffic increased by ${volumeIncrease.toFixed(0)}% in the last hour (${recentCount} requests vs ${previousCount} previous hour). Monitor for potential DDoS or unusual usage patterns.`,
        message: `+${volumeIncrease.toFixed(0)}% traffic increase`,
        metric_value: volumeIncrease.toFixed(0),
        threshold_value: '200',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // 6. Check for authentication failures (potential security issue)
    const authFailuresResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND status_code = 401
    `);
    
    const authFailures = parseInt(authFailuresResult.rows[0].count) || 0;
    if (authFailures > 50) {
      alerts.push({
        id: 'alert-auth-failures',
        severity: 'warning',
        status: 'active',
        title: 'High Authentication Failures',
        description: `${authFailures} failed authentication attempts in the last hour. This could indicate expired tokens, credential attacks, or integration issues.`,
        message: `${authFailures} auth failures`,
        metric_value: authFailures.toString(),
        threshold_value: '50',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // All systems operational
    if (alerts.length === 0) {
      alerts.push({
        id: 'alert-healthy',
        severity: 'success',
        status: 'active',
        title: 'All Systems Operational',
        description: 'API performance is healthy, error rates are low, and no anomalies detected. All services are running smoothly.',
        message: 'All systems operational',
        timestamp: now.toISOString(),
        acknowledged: false
      });
    }
    
    // Format all alert timestamps
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      created_at: alert.timestamp // Frontend expects created_at
    }));
    
    res.json({ alerts: formattedAlerts });
  } catch (error) {
    console.error('Alerts endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/dev-dashboard/alerts/:id/acknowledge
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    // In a real implementation, you'd store alert acknowledgments
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// POST /api/dev-dashboard/alerts/:id/resolve
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    // In a real implementation, you'd store alert resolutions
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// GET /api/dev-dashboard/page-analytics
router.get('/page-analytics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let interval = '24 hours';
    if (timeRange === '7d') interval = '7 days';
    else if (timeRange === '30d') interval = '30 days';
    
    // Get actual API request data grouped by endpoint
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND endpoint NOT LIKE '/api/dev-dashboard%'
        AND user_id IS NOT NULL
    `);
    
    const uniqueUsers = parseInt(result.rows[0].unique_users) || 0;
    const totalRequests = parseInt(result.rows[0].total_requests) || 0;
    const avgResponseTime = Math.round(parseFloat(result.rows[0].avg_response_time) || 0);
    
    // Get page-specific stats (group API endpoints into logical pages)
    const pageStatsResult = await pool.query(`
      SELECT 
        CASE 
          WHEN endpoint LIKE '/api/expenses%' THEN 'Expenses'
          WHEN endpoint LIKE '/api/quick-actions%' THEN 'Dashboard'
          WHEN endpoint LIKE '/api/settings%' THEN 'Settings'
          WHEN endpoint LIKE '/api/events%' THEN 'Events'
          WHEN endpoint LIKE '/api/users%' OR endpoint LIKE '/api/roles%' THEN 'Users'
          ELSE 'Other'
        END as page,
        CASE 
          WHEN endpoint LIKE '/api/expenses%' THEN '/expenses'
          WHEN endpoint LIKE '/api/quick-actions%' THEN '/dashboard'
          WHEN endpoint LIKE '/api/settings%' THEN '/settings'
          WHEN endpoint LIKE '/api/events%' THEN '/events'
          WHEN endpoint LIKE '/api/users%' OR endpoint LIKE '/api/roles%' THEN '/users'
          ELSE '/other'
        END as path,
        COUNT(*) as view_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(response_time_ms) as avg_duration
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND endpoint NOT LIKE '/api/dev-dashboard%'
        AND user_id IS NOT NULL
      GROUP BY page, path
      ORDER BY view_count DESC
    `);
    
    // Calculate session duration (average time between first and last activity per user)
    const sessionDurationResult = await pool.query(`
      SELECT 
        AVG(duration_seconds) as avg_duration
      FROM (
        SELECT 
          user_id,
          EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_seconds
        FROM api_requests
        WHERE created_at > NOW() - INTERVAL '${interval}'
          AND user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) > 1
      ) session_durations
    `);
    
    const avgSessionSeconds = parseFloat(sessionDurationResult.rows[0]?.avg_duration) || 0;
    const minutes = Math.floor(avgSessionSeconds / 60);
    const seconds = Math.round(avgSessionSeconds % 60);
    const avgSessionDuration = avgSessionSeconds > 0 ? `${minutes}m ${seconds}s` : '0m 0s';
    
    // Calculate bounce rate (users with only 1 request)
    const bounceRateResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN request_count = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as bounce_rate
      FROM (
        SELECT user_id, COUNT(*) as request_count
        FROM api_requests
        WHERE created_at > NOW() - INTERVAL '${interval}'
          AND user_id IS NOT NULL
        GROUP BY user_id
      ) user_requests
    `);
    
    const bounceRate = parseFloat(bounceRateResult.rows[0]?.bounce_rate) || 0;
    
    res.json({
      total_page_views: totalRequests,
      unique_visitors: uniqueUsers,
      avg_session_duration: avgSessionDuration,
      bounce_rate: `${bounceRate.toFixed(1)}%`,
      pageStats: pageStatsResult.rows.map(row => ({
        page_title: row.page,
        page_path: row.path,
        view_count: parseInt(row.view_count),
        unique_users: parseInt(row.unique_users),
        avg_duration: Math.round(parseFloat(row.avg_duration) || 0).toString()
      }))
    });
  } catch (error) {
    console.error('Page analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch page analytics' });
  }
});

export default router;

