/**
 * Developer Dashboard Routes
 * Provides system health monitoring, metrics, and analytics for admin/developer roles
 */

import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DevDashboardService } from '../services/DevDashboardService';
import { VersionService, SessionService, OCRMetricsService } from '../services/dashboard';

const router = express.Router();

// All routes require authentication and admin or developer role
router.use(authenticateToken);
router.use((req: AuthRequest, res: Response, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'developer')) {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  next();
});

// GET /api/dev-dashboard/version
router.get('/version', async (req: AuthRequest, res: Response) => {
  try {
    const versionInfo = await VersionService.getVersionInfo();
    res.json(versionInfo);
  } catch (error) {
    console.error('Version endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch version info' });
  }
});

// GET /api/dev-dashboard/summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await DevDashboardService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Summary endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

// GET /api/dev-dashboard/metrics
router.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;
    const metrics = await DevDashboardService.getMetrics(timeRange as string);
    res.json(metrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics data' });
  }
});

// GET /api/dev-dashboard/audit-logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '50', action, search } = req.query;
    const logs = await DevDashboardService.getAuditLogs(
      parseInt(limit as string),
      action as string,
      search as string
    );
    res.json(logs);
  } catch (error) {
    console.error('Audit logs endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/dev-dashboard/sessions
router.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await SessionService.getSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Sessions endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions data' });
  }
});

// GET /api/dev-dashboard/api-analytics
router.get('/api-analytics', async (req: AuthRequest, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;
    const analytics = await DevDashboardService.getAPIAnalytics(timeRange as string);
    res.json(analytics);
  } catch (error) {
    console.error('API analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch API analytics' });
  }
});

// GET /api/dev-dashboard/alerts
router.get('/alerts', async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'active', severity } = req.query;
    const alerts = await DevDashboardService.getAlerts(
      status as string,
      severity as string
    );
    res.json(alerts);
  } catch (error) {
    console.error('Alerts endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/dev-dashboard/alerts/:id/acknowledge
router.post('/alerts/:id/acknowledge', async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you'd store alert acknowledgments
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// POST /api/dev-dashboard/alerts/:id/resolve
router.post('/alerts/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    // In a real implementation, you'd store alert resolutions
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// GET /api/dev-dashboard/page-analytics
router.get('/page-analytics', async (req: AuthRequest, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;
    const analytics = await DevDashboardService.getPageAnalytics(timeRange as string);
    res.json(analytics);
  } catch (error) {
    console.error('Page analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch page analytics' });
  }
});

// GET /api/dev-dashboard/ocr-metrics
router.get('/ocr-metrics', async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await OCRMetricsService.getOCRMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('OCR metrics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch OCR metrics' });
  }
});

export default router;
