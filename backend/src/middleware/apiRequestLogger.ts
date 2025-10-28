import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthRequest } from './auth';

/**
 * Normalize endpoint paths to group similar requests
 * e.g., /api/expenses/123 -> /api/expenses/:id
 */
function normalizeEndpoint(path: string): string {
  return path
    // UUID patterns
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Multiple consecutive :id
    .replace(/(:id\/)+:id/g, ':id');
}

/**
 * Middleware to log API requests for analytics
 * Tracks method, endpoint, response time, status codes, and errors
 */
export const apiRequestLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  const originalJson = res.json;
  
  let responseBody: any = null;
  
  // Override res.json to capture response
  res.json = function(body: any): Response {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Override res.end to log the request after response is sent
  res.end = function(chunk?: any, encoding?: any, callback?: any): Response {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user?.id || null;
    const method = req.method;
    // Use originalUrl to get the full path (including mounted router base path)
    const fullPath = req.originalUrl.split('?')[0]; // Remove query params
    const endpoint = normalizeEndpoint(fullPath);
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;
    
    // Extract error message if response is an error
    let errorMessage = null;
    if (statusCode >= 400 && responseBody && responseBody.error) {
      errorMessage = typeof responseBody.error === 'string' 
        ? responseBody.error 
        : JSON.stringify(responseBody.error);
    }
    
    // Log to database asynchronously (don't block response)
    query(
      `INSERT INTO api_requests 
        (user_id, method, endpoint, status_code, response_time_ms, ip_address, user_agent, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, method, endpoint, statusCode, responseTime, ipAddress, userAgent, errorMessage]
    ).catch(err => {
      console.error('[APIRequestLogger] Failed to log request:', err);
    });
    
    return originalEnd.call(res, chunk, encoding, callback);
  };
  
  next();
};

/**
 * Cleanup function to be called periodically (e.g., daily cron job)
 * Removes API request logs older than 30 days
 */
export async function cleanupOldApiRequests(): Promise<void> {
  try {
    const result = await query('SELECT cleanup_old_api_requests()');
    console.log('[APIRequestLogger] Cleaned up old API request logs');
  } catch (error) {
    console.error('[APIRequestLogger] Failed to cleanup old logs:', error);
  }
}

