/**
 * Session Service
 * Handles user session management and tracking
 */

import { pool } from '../../config/database';

export class SessionService {
  /**
   * Get active user sessions
   */
  static async getSessions() {
    try {
      // Check if user_sessions table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.warn('[Sessions] user_sessions table does not exist');
        return {
          sessions: [],
          total: 0,
          active: 0
        };
      }

      const result = await pool.query(`
        SELECT 
          s.id,
          s.user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          s.created_at,
          s.expires_at,
          s.last_activity,
          CASE 
            WHEN s.expires_at > NOW() THEN 'active'
            ELSE 'expired'
          END as status
        FROM user_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.last_activity DESC
        LIMIT 100
      `);

      const sessions = result.rows;
      const activeSessions = sessions.filter(s => s.status === 'active');

      return {
        sessions,
        total: sessions.length,
        active: activeSessions.length
      };
    } catch (error) {
      console.error('[Sessions] Error fetching sessions:', error);
      return {
        sessions: [],
        total: 0,
        active: 0
      };
    }
  }
}

