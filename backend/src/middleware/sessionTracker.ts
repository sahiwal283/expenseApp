/**
 * Session Tracker Middleware
 * 
 * Updates user_sessions.last_activity on every authenticated API request
 * This provides real-time session tracking for the Dev Dashboard
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { pool } from '../config/database';
import crypto from 'crypto';

/**
 * Extract token hash from Authorization header
 */
function getTokenHash(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIp(req: AuthRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Middleware to track session activity
 * Call this AFTER authenticateToken middleware
 */
export const sessionTracker = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Only track authenticated requests
  if (!req.user) {
    return next();
  }

  try {
    const tokenHash = getTokenHash(req);
    
    if (tokenHash) {
      // Update last_activity timestamp for this session
      await pool.query(
        `UPDATE user_sessions 
         SET last_activity = NOW()
         WHERE token_hash = $1`,
        [tokenHash]
      );
      
      // Note: We don't await this or handle errors to avoid slowing down requests
      // If the update fails, it's not critical - the session will just show stale data
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('[SessionTracker] Failed to update session activity:', error);
  }

  next();
};

/**
 * Create a new session record on login
 */
export async function createSession(
  userId: string,
  token: string,
  req: AuthRequest,
  expiresIn: number = 86400 // 24 hours in seconds
): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (token_hash) DO UPDATE
     SET last_activity = NOW(), expires_at = EXCLUDED.expires_at`,
    [userId, tokenHash, ipAddress, userAgent, expiresAt]
  );
}

/**
 * Delete session record on logout
 */
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await pool.query(
    `DELETE FROM user_sessions WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Cleanup expired sessions (call periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING id`
  );
  
  return result.rowCount || 0;
}

