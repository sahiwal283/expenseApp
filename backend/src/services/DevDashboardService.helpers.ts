/**
 * Helper functions for DevDashboardService
 * Extracted to reduce complexity in main service file
 * 
 * @module DevDashboardService.helpers
 * @version 1.0.0
 */

import { pool } from '../config/database';

/**
 * Alert data structure for system health monitoring
 * 
 * @interface Alert
 * @property {string} id - Unique alert identifier
 * @property {'critical' | 'warning' | 'info' | 'success'} severity - Alert severity level
 * @property {string} status - Alert status (e.g., 'active', 'resolved')
 * @property {string} title - Short alert title
 * @property {string} description - Detailed alert description
 * @property {string} message - Brief alert message
 * @property {string | number} metric_value - Current metric value
 * @property {string} threshold_value - Threshold that triggered the alert
 * @property {string} timestamp - ISO timestamp when alert was created
 * @property {boolean} acknowledged - Whether alert has been acknowledged
 */
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  status: string;
  title: string;
  description: string;
  message: string;
  metric_value: string | number;
  threshold_value: string;
  timestamp: string;
  acknowledged: boolean;
}

/**
 * Create a standardized alert object
 * 
 * @param {string} id - Unique alert identifier (e.g., 'alert-error-rate')
 * @param {Alert['severity']} severity - Alert severity: 'critical', 'warning', 'info', or 'success'
 * @param {string} title - Short, descriptive alert title
 * @param {string} description - Detailed explanation of the alert and recommended actions
 * @param {string} message - Brief summary message
 * @param {string | number} metricValue - The current value that triggered this alert
 * @param {string} thresholdValue - The threshold value that was exceeded
 * @param {Date} timestamp - When the alert was created
 * @returns {Alert} Formatted alert object
 * 
 * @example
 * const alert = createAlert(
 *   'alert-high-cpu',
 *   'warning',
 *   'High CPU Usage',
 *   'CPU usage is above 80% for more than 5 minutes',
 *   'CPU at 85%',
 *   85,
 *   '80',
 *   new Date()
 * );
 */
function createAlert(
  id: string,
  severity: Alert['severity'],
  title: string,
  description: string,
  message: string,
  metricValue: string | number,
  thresholdValue: string,
  timestamp: Date
): Alert {
  return {
    id,
    severity,
    status: 'active',
    title,
    description,
    message,
    metric_value: metricValue,
    threshold_value: thresholdValue,
    timestamp: timestamp.toISOString(),
    acknowledged: false
  };
}

/**
 * Check for high error rate in API requests
 * 
 * Monitors the percentage of failed API requests (status >= 400) in the last hour.
 * Triggers a critical alert if error rate exceeds 10% and there are at least 20 requests.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if threshold exceeded, null otherwise
 * 
 * @example
 * const alert = await checkErrorRateAlert(new Date());
 * if (alert) {
 *   console.log(`Error rate alert: ${alert.metric_value}%`);
 * }
 */
export async function checkErrorRateAlert(now: Date): Promise<Alert | null> {
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
  
  if (errorRate > 10 && totalRequests > 20) {
    return createAlert(
      'alert-error-rate',
      'critical',
      'High Error Rate Detected',
      `${errorRate.toFixed(1)}% of API requests are failing (${errorCount}/${totalRequests} requests). Check API Analytics and server logs for details.`,
      `${errorRate.toFixed(1)}% error rate in last hour`,
      errorRate.toFixed(1),
      '10',
      now
    );
  }
  
  return null;
}

/**
 * Check for slow API response times
 * 
 * Identifies endpoints with average response times exceeding 2000ms in the last hour.
 * Requires at least 5 requests to the endpoint to avoid false positives.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if slow endpoint found, null otherwise
 * 
 * @example
 * const alert = await checkSlowResponseAlert(new Date());
 * if (alert) {
 *   console.log(`Slow endpoint: ${alert.message}`);
 * }
 */
export async function checkSlowResponseAlert(now: Date): Promise<Alert | null> {
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
    return createAlert(
      'alert-slow-response',
      'warning',
      'Slow API Response Times',
      `Endpoint ${slowEndpoint.endpoint} is averaging ${avgTime}ms response time. This may indicate database performance issues, external API delays, or resource constraints.`,
      `${slowEndpoint.endpoint} averaging ${avgTime}ms`,
      avgTime.toString(),
      '2000',
      now
    );
  }
  
  return null;
}

/**
 * Check for stale user sessions
 * 
 * Detects user sessions that haven't been active in 24+ hours but are still valid.
 * Suggests session cleanup or reduced token expiry times if count exceeds 10.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if too many stale sessions, null otherwise
 * 
 * @example
 * const alert = await checkStaleSessionsAlert(new Date());
 * if (alert) {
 *   console.log(`${alert.metric_value} stale sessions detected`);
 * }
 */
export async function checkStaleSessionsAlert(now: Date): Promise<Alert | null> {
  const staleSessions = await pool.query(`
    SELECT COUNT(*) as count
    FROM user_sessions
    WHERE expires_at > NOW()
      AND last_activity < NOW() - INTERVAL '24 hours'
  `);
  
  const staleCount = parseInt(staleSessions.rows[0].count) || 0;
  if (staleCount > 10) {
    return createAlert(
      'alert-stale-sessions',
      'info',
      'Stale Sessions Detected',
      `${staleCount} sessions haven't been active in 24+ hours but are still valid. Consider implementing session cleanup or reducing token expiry time.`,
      `${staleCount} stale sessions`,
      staleCount.toString(),
      '10',
      now
    );
  }
  
  return null;
}

/**
 * Check for repeated endpoint failures
 * 
 * Monitors for endpoints returning 5xx errors repeatedly (5+ times) in the last hour.
 * Critical alert indicating likely server-side bug or service outage.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if endpoint failing repeatedly, null otherwise
 * 
 * @example
 * const alert = await checkEndpointFailureAlert(new Date());
 * if (alert) {
 *   console.log(`Critical: ${alert.message}`);
 * }
 */
export async function checkEndpointFailureAlert(now: Date): Promise<Alert | null> {
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
    return createAlert(
      'alert-endpoint-failure',
      'critical',
      'Endpoint Repeatedly Failing',
      `${failure.method} ${failure.endpoint} has failed ${failure.failure_count} times in the last hour with 5xx errors. This likely indicates a server-side bug or service outage.`,
      `${failure.method} ${failure.endpoint} failing (${failure.failure_count}x)`,
      failure.failure_count,
      '5',
      now
    );
  }
  
  return null;
}

/**
 * Check for API request volume spike
 * 
 * Compares current hour's traffic to previous hour. Triggers warning if traffic
 * increased by more than 200% and exceeds 100 requests. Helps detect DDoS or unusual usage.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if traffic spike detected, null otherwise
 * 
 * @example
 * const alert = await checkTrafficSpikeAlert(new Date());
 * if (alert) {
 *   console.log(`Traffic spike: ${alert.metric_value}% increase`);
 * }
 */
export async function checkTrafficSpikeAlert(now: Date): Promise<Alert | null> {
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
  const previousCount = parseInt(volumeCheckResult.rows[0].previous_count) || 1;
  const volumeIncrease = ((recentCount - previousCount) / previousCount * 100);
  
  if (volumeIncrease > 200 && recentCount > 100) {
    return createAlert(
      'alert-traffic-spike',
      'warning',
      'Unusual Traffic Spike',
      `API traffic increased by ${volumeIncrease.toFixed(0)}% in the last hour (${recentCount} requests vs ${previousCount} previous hour). Monitor for potential DDoS or unusual usage patterns.`,
      `+${volumeIncrease.toFixed(0)}% traffic increase`,
      volumeIncrease.toFixed(0),
      '200',
      now
    );
  }
  
  return null;
}

/**
 * Check for high authentication failures
 * 
 * Monitors 401 Unauthorized responses in the last hour. Alert triggered if more than
 * 50 failed auth attempts. May indicate expired tokens, credential attacks, or integration issues.
 * 
 * @param {Date} now - Current timestamp for the alert
 * @returns {Promise<Alert | null>} Alert object if auth failures exceed threshold, null otherwise
 * 
 * @example
 * const alert = await checkAuthFailuresAlert(new Date());
 * if (alert) {
 *   console.log(`${alert.metric_value} failed auth attempts`);
 * }
 */
export async function checkAuthFailuresAlert(now: Date): Promise<Alert | null> {
  const authFailuresResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM api_requests
    WHERE created_at > NOW() - INTERVAL '1 hour'
      AND status_code = 401
  `);
  
  const authFailures = parseInt(authFailuresResult.rows[0].count) || 0;
  if (authFailures > 50) {
    return createAlert(
      'alert-auth-failures',
      'warning',
      'High Authentication Failures',
      `${authFailures} failed authentication attempts in the last hour. This could indicate expired tokens, credential attacks, or integration issues.`,
      `${authFailures} auth failures`,
      authFailures.toString(),
      '50',
      now
    );
  }
  
  return null;
}

/**
 * Parse time range string to PostgreSQL interval format
 * 
 * Converts shorthand time range strings to PostgreSQL INTERVAL syntax.
 * Defaults to 24 hours for unrecognized values.
 * 
 * @param {string} timeRange - Time range string: '24h', '7d', or '30d'
 * @returns {string} PostgreSQL interval string: '24 hours', '7 days', or '30 days'
 * 
 * @example
 * const interval = parseTimeRange('7d');  // Returns: '7 days'
 * const query = `WHERE created_at > NOW() - INTERVAL '${interval}'`;
 */
export function parseTimeRange(timeRange: string): string {
  if (timeRange === '7d') return '7 days';
  if (timeRange === '30d') return '30 days';
  return '24 hours';
}

import * as os from 'os';

/**
 * Get system memory metrics from Node.js OS module
 * 
 * Calculates memory usage statistics including percentage used, and values in GB.
 * Uses Node.js os.totalmem() and os.freemem() for platform-independent metrics.
 * 
 * @returns {{usagePercent: number, usedGB: number, totalGB: number, freeGB: number}} Memory metrics object
 * 
 * @example
 * const memory = getSystemMemoryMetrics();
 * console.log(`Memory: ${memory.usedGB}GB / ${memory.totalGB}GB (${memory.usagePercent.toFixed(1)}%)`);
 */
export function getSystemMemoryMetrics() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;
  
  return {
    usagePercent: memoryUsagePercent,
    usedGB: parseFloat((usedMemory / 1024 / 1024 / 1024).toFixed(2)),
    totalGB: parseFloat((totalMemory / 1024 / 1024 / 1024).toFixed(2)),
    freeGB: parseFloat((freeMemory / 1024 / 1024 / 1024).toFixed(2))
  };
}

/**
 * Get system CPU metrics from Node.js OS module
 * 
 * Retrieves CPU load average, core count, model, and speed. Load average represents
 * the number of processes in the run queue averaged over 1, 5, and 15 minutes.
 * 
 * @returns {{loadAverage: number[], cores: number, model: string, speed: number}} CPU metrics object
 * 
 * @example
 * const cpu = getSystemCPUMetrics();
 * console.log(`CPU: ${cpu.model} (${cpu.cores} cores)`);
 * console.log(`Load: ${cpu.loadAverage[0].toFixed(2)} (1min avg)`);
 */
export function getSystemCPUMetrics() {
  const loadAverage = os.loadavg();
  const cpuCores = os.cpus().length;
  
  return {
    loadAverage,
    cores: cpuCores,
    model: os.cpus()[0]?.model || 'Unknown',
    speed: os.cpus()[0]?.speed || 0
  };
}

/**
 * Calculate session duration in friendly format
 * 
 * Converts seconds to human-readable "Xm Ys" format for session duration display.
 * 
 * @param {number} avgSessionSeconds - Average session duration in seconds
 * @returns {string} Formatted duration string (e.g., "5m 30s" or "0m 0s")
 * 
 * @example
 * const duration = formatSessionDuration(330);  // Returns: "5m 30s"
 * const zeroDuration = formatSessionDuration(0);  // Returns: "0m 0s"
 */
export function formatSessionDuration(avgSessionSeconds: number): string {
  const minutes = Math.floor(avgSessionSeconds / 60);
  const seconds = Math.round(avgSessionSeconds % 60);
  return avgSessionSeconds > 0 ? `${minutes}m ${seconds}s` : '0m 0s';
}

/**
 * Map API endpoints to logical page groupings for analytics
 * 
 * Groups API endpoints by logical frontend pages to provide meaningful page-level analytics.
 * Used for page view tracking and user navigation analysis.
 * 
 * @param {string} endpoint - API endpoint path (e.g., '/api/expenses/123')
 * @returns {{page: string, path: string}} Object with friendly page name and frontend path
 * 
 * @example
 * const mapping = mapEndpointToPage('/api/expenses/create');
 * // Returns: { page: 'Expenses', path: '/expenses' }
 * 
 * const unknown = mapEndpointToPage('/api/unknown');
 * // Returns: { page: 'Other', path: '/other' }
 */
export function mapEndpointToPage(endpoint: string): { page: string; path: string } {
  if (endpoint.includes('/api/expenses')) return { page: 'Expenses', path: '/expenses' };
  if (endpoint.includes('/api/quick-actions')) return { page: 'Dashboard', path: '/dashboard' };
  if (endpoint.includes('/api/settings')) return { page: 'Settings', path: '/settings' };
  if (endpoint.includes('/api/events')) return { page: 'Events', path: '/events' };
  if (endpoint.includes('/api/users') || endpoint.includes('/api/roles')) return { page: 'Users', path: '/users' };
  return { page: 'Other', path: '/other' };
}

/**
 * Check OCR service health and provider configuration
 * 
 * Queries the external OCR service for health status and available providers.
 * Returns null if service is unavailable. Used for monitoring OCR service uptime.
 * 
 * @param {string} ocrServiceUrl - Base URL of the OCR service (e.g., 'http://192.168.1.195:8000')
 * @returns {Promise<{health: any, providers: object} | null>} Service health data or null if unavailable
 * 
 * @example
 * const health = await checkOCRServiceHealth('http://192.168.1.195:8000');
 * if (health) {
 *   console.log(`Primary OCR: ${health.providers.primary}`);
 *   console.log(`Fallback: ${health.providers.fallback}`);
 * } else {
 *   console.log('OCR service offline');
 * }
 */
export async function checkOCRServiceHealth(ocrServiceUrl: string) {
  try {
    const [healthResponse, providersResponse] = await Promise.all([
      axios.get(`${ocrServiceUrl}/health/ready`, { timeout: 5000 }),
      axios.get(`${ocrServiceUrl}/ocr/providers`, { timeout: 5000 })
    ]);
    
    const providersData = providersResponse.data;
    return {
      health: healthResponse.data,
      providers: {
        primary: providersData.providers?.primary || 'unknown',
        fallback: providersData.providers?.fallback || 'unknown',
        availability: providersData.providers?.availability || {},
        languages: providersData.languages || [],
        confidenceThreshold: providersData.confidenceThreshold || 0.6
      }
    };
  } catch (error) {
    console.warn('[DevDashboard] OCR service not available:', (error as any).message);
    return null;
  }
}

import axios from 'axios';

/**
 * Calculate Google Vision OCR costs based on usage
 * 
 * Computes actual and projected costs for Google Vision API usage. First 1,000 requests
 * per month are free, then $1.50 per 1,000 images. Projects monthly cost based on current daily rate.
 * 
 * @param {number} googleReceiptsThisMonth - Total Google Vision requests this month
 * @returns {{freeThreshold: number, estimatedThisMonth: string, projectedMonthly: string, remainingFree: number, currency: string, pricingModel: string}} Cost breakdown object
 * 
 * @example
 * const costs = calculateOCRCosts(1250);
 * console.log(`Cost this month: $${costs.estimatedThisMonth}`);
 * console.log(`Projected monthly: $${costs.projectedMonthly}`);
 * console.log(`Free tier remaining: ${costs.remainingFree} requests`);
 */
export function calculateOCRCosts(googleReceiptsThisMonth: number) {
  const freeThreshold = 1000;
  const costPer1000 = 1.50;
  
  let estimatedCostThisMonth = 0;
  if (googleReceiptsThisMonth > freeThreshold) {
    const billedReceipts = googleReceiptsThisMonth - freeThreshold;
    estimatedCostThisMonth = (billedReceipts / 1000) * costPer1000;
  }
  
  // Calculate projected monthly cost based on current daily rate
  const currentDay = new Date().getDate();
  const projectedMonthly = (googleReceiptsThisMonth / currentDay) * 30;
  const projectedCost = projectedMonthly > freeThreshold
    ? ((projectedMonthly - freeThreshold) / 1000 * costPer1000)
    : 0;
  
  return {
    freeThreshold,
    estimatedThisMonth: estimatedCostThisMonth.toFixed(2),
    projectedMonthly: projectedCost.toFixed(2),
    remainingFree: Math.max(0, freeThreshold - googleReceiptsThisMonth),
    currency: 'USD',
    pricingModel: `Free for first ${freeThreshold}/month, then $${costPer1000} per 1,000 images`
  };
}

