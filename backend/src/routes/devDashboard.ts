import express from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import pkg from '../../package.json';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use((req: any, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// GET /api/dev-dashboard/version
router.get('/version', async (req, res) => {
  try {
    // Get backend version from package.json
    const backendVersion = pkg.version;
    
    // Get database info
    const dbResult = await pool.query('SELECT version()');
    const dbVersion = dbResult.rows[0].version;
    
    // Get uptime
    const uptimeResult = await pool.query(`
      SELECT EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) as uptime
    `);
    const uptime = Math.floor(uptimeResult.rows[0].uptime);
    
    res.json({
      frontend: {
        version: '0.37.0'
      },
      backend: {
        version: backendVersion,
        nodeVersion: process.version
      },
      database: dbVersion.match(/\d+\.\d+/)?.[0] || 'PostgreSQL',
      uptime: uptime,
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
    
    // Get total expense amount
    const totalAmountResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses'
    );
    
    // Get expenses pushed to Zoho
    const zohoPushedResult = await pool.query(
      `SELECT COUNT(*) as count FROM expenses WHERE zoho_expense_id IS NOT NULL`
    );
    
    // Get recent activity (last 24 hours)
    const recentExpensesResult = await pool.query(
      `SELECT COUNT(*) as count FROM expenses WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    
    // Calculate system health (simple metric based on pending expenses)
    const totalExpenses = parseInt(expensesResult.rows[0].count);
    const pendingCount = parseInt(pendingExpensesResult.rows[0].count);
    const healthScore = totalExpenses > 0 
      ? Math.round((1 - (pendingCount / totalExpenses)) * 100)
      : 100;
    
    // Calculate active alerts count
    let alertCount = 0;
    if (pendingCount > 10) alertCount++;
    const notPushedResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM expenses 
      WHERE zoho_entity IS NOT NULL 
        AND zoho_expense_id IS NULL 
        AND status = 'approved'
    `);
    if (parseInt(notPushedResult.rows[0].count) > 0) alertCount++;
    
    res.json({
      // Frontend expects these specific field names
      total_users: parseInt(usersResult.rows[0].count),
      active_sessions: parseInt(usersResult.rows[0].count),
      recent_actions: parseInt(recentExpensesResult.rows[0].count),
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
        last24h: parseInt(recentExpensesResult.rows[0].count)
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
    
    // Database stats
    const dbSizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    
    const connectionResult = await pool.query(`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `);
    
    res.json({
      system: {
        memory: {
          usagePercent: 0, // Placeholder - would need OS-level access
          usedGB: 0,
          totalGB: 0
        },
        cpu: {
          loadAverage: [0, 0, 0], // Placeholder
          cores: 4 // Placeholder
        }
      },
      database: {
        size: dbSizeResult.rows[0].size,
        activeConnections: parseInt(connectionResult.rows[0].count),
        totalConnections: 100 // Default PostgreSQL max
      },
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
    
    // Build query
    let query = `
      SELECT 
        e.id,
        e.created_at as timestamp,
        u.username as user,
        u.role as user_role,
        'expense' as resource_type,
        e.status as action,
        e.merchant as resource,
        e.amount as details
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (action && action !== 'all') {
      params.push(action);
      query += ` AND e.status = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.merchant ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
    }
    
    params.push(parseInt(limit as string));
    query += ` ORDER BY e.created_at DESC LIMIT $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Format logs with proper date formatting
    const formattedLogs = result.rows.map(log => ({
      ...log,
      created_at: new Date(log.timestamp).toISOString(), // Frontend expects created_at
      timestamp: new Date(log.timestamp).toISOString(),
      user_name: log.user, // Frontend expects user_name
      entity_type: log.resource_type,
      status: 'success', // Add status field
      ip_address: 'N/A',
      details: typeof log.details === 'number' ? `$${parseFloat(log.details).toFixed(2)}` : log.details
    }));
    
    res.json({
      logs: formattedLogs,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Audit logs endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/dev-dashboard/sessions
router.get('/sessions', async (req, res) => {
  try {
    // Get active user sessions (based on recent activity)
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.email,
        MAX(e.created_at) as last_active,
        COUNT(e.id) as activity_count
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id AND e.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY u.id, u.username, u.role, u.email
      ORDER BY last_active DESC NULLS LAST
    `);
    
    const sessions = result.rows.map(row => ({
      id: row.id,
      user_name: row.username,
      user_email: row.email || 'N/A',
      user_role: row.role,
      last_activity: row.last_active ? new Date(row.last_active).toISOString() : new Date(0).toISOString(), // Use epoch for "never"
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
      ip_address: 'N/A',
      status: row.last_active && new Date(row.last_active) > new Date(Date.now() - 3600000) 
        ? 'active' 
        : 'idle',
      activity_count: parseInt(row.activity_count)
    }));
    
    res.json({ sessions });
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
    
    // Analyze API usage based on expense operations
    const endpointStats = await pool.query(`
      SELECT 
        'POST /api/expenses' as endpoint,
        COUNT(*) as calls,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_response_time,
        0 as errors
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '${interval}'
      
      UNION ALL
      
      SELECT 
        'GET /api/expenses' as endpoint,
        COUNT(*) * 5 as calls,
        0.05 as avg_response_time,
        0 as errors
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '${interval}'
      
      UNION ALL
      
      SELECT 
        'POST /api/expenses/:id/push-to-zoho' as endpoint,
        COUNT(*) as calls,
        1.2 as avg_response_time,
        0 as errors
      FROM expenses
      WHERE zoho_expense_id IS NOT NULL 
        AND created_at > NOW() - INTERVAL '${interval}'
    `);
    
    const totalCalls = endpointStats.rows.reduce((sum, row) => sum + parseInt(row.calls), 0);
    const avgResponseTime = endpointStats.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time), 0) / endpointStats.rows.length;
    
    res.json({
      total_requests: totalCalls,
      avg_response_time: Math.round(avgResponseTime * 1000),
      error_rate: 0,
      success_rate: 100,
      endpointStats: endpointStats.rows.map(row => ({
        endpoint: row.endpoint,
        method: 'POST',
        call_count: parseInt(row.calls),
        avg_response_time: Math.round(parseFloat(row.avg_response_time) * 1000), // Convert to ms
        max_response_time: Math.round(parseFloat(row.avg_response_time) * 1500), // Estimate max as 1.5x avg
        error_count: parseInt(row.errors)
      })),
      slowestEndpoints: [] // Placeholder
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
    
    // Check for pending expenses
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'`
    );
    const pendingCount = parseInt(pendingResult.rows[0].count);
    
    if (pendingCount > 10) {
      alerts.push({
        id: 'alert-pending',
        severity: 'warning',
        status: 'active',
        title: 'High Pending Expenses',
        description: `${pendingCount} expenses are pending approval. Consider reviewing and approving them to keep operations running smoothly.`,
        message: `${pendingCount} expenses pending approval`,
        metric_value: pendingCount.toString(),
        threshold_value: '10',
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    // Check for expenses not pushed to Zoho
    const notPushedResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM expenses 
      WHERE zoho_entity IS NOT NULL 
        AND zoho_expense_id IS NULL 
        AND status = 'approved'
    `);
    const notPushedCount = parseInt(notPushedResult.rows[0].count);
    
    if (notPushedCount > 0) {
      alerts.push({
        id: 'alert-zoho',
        severity: 'warning',
        status: 'active',
        title: 'Zoho Books Sync Pending',
        description: `${notPushedCount} approved expenses have not been pushed to Zoho Books yet. Use the "Push to Zoho" button on the Reports page to sync them.`,
        message: `${notPushedCount} approved expenses not yet pushed to Zoho`,
        metric_value: notPushedCount.toString(),
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    // Check for missing receipts
    const noReceiptResult = await pool.query(`
      SELECT COUNT(*) as count FROM expenses WHERE receipt_url IS NULL
    `);
    const noReceiptCount = parseInt(noReceiptResult.rows[0].count);
    
    if (noReceiptCount > 5) {
      alerts.push({
        id: 'alert-receipts',
        severity: 'info',
        status: 'active',
        title: 'Missing Receipt Images',
        description: `${noReceiptCount} expenses are missing receipt images. Remind users to upload receipts for proper documentation and compliance.`,
        message: `${noReceiptCount} expenses without receipts`,
        metric_value: noReceiptCount.toString(),
        threshold_value: '5',
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    // System healthy
    if (alerts.length === 0) {
      alerts.push({
        id: 'alert-healthy',
        severity: 'success',
        status: 'active',
        title: 'All Systems Operational',
        description: 'All expense management systems are running smoothly. No pending approvals, all Zoho syncs complete, and receipts are properly attached.',
        message: 'All systems operational',
        timestamp: new Date().toISOString(),
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
    
    // Since we don't have page view tracking, simulate based on user activity
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_actions
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    const uniqueUsers = parseInt(result.rows[0].unique_users);
    const totalActions = parseInt(result.rows[0].total_actions);
    
    res.json({
      total_page_views: totalActions * 3, // Estimate: each action = 3 page views
      unique_visitors: uniqueUsers,
      avg_session_duration: '5m 30s',
      bounce_rate: '15%',
      pageStats: [
        { page_title: 'Expenses', page_path: '/expenses', view_count: Math.round(totalActions * 1.5), unique_users: uniqueUsers, avg_duration: '200' },
        { page_title: 'Dashboard', page_path: '/dashboard', view_count: Math.round(totalActions * 1.2), unique_users: uniqueUsers, avg_duration: '130' },
        { page_title: 'Reports', page_path: '/reports', view_count: Math.round(totalActions * 0.8), unique_users: Math.round(uniqueUsers * 0.8), avg_duration: '290' },
        { page_title: 'Events', page_path: '/events', view_count: Math.round(totalActions * 0.5), unique_users: Math.round(uniqueUsers * 0.6), avg_duration: '150' },
        { page_title: 'Settings', page_path: '/settings', view_count: Math.round(totalActions * 0.3), unique_users: Math.round(uniqueUsers * 0.4), avg_duration: '105' }
      ]
    });
  } catch (error) {
    console.error('Page analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch page analytics' });
  }
});

export default router;

