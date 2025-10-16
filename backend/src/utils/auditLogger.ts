import { pool } from '../config/database';

export interface AuditLogEntry {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  status?: 'success' | 'failure' | 'warning';
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  changes?: any;
  errorMessage?: string;
}

/**
 * Logs an audit event to the database
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (
        user_id, user_name, user_email, user_role, action, 
        entity_type, entity_id, status, ip_address, user_agent,
        request_method, request_path, changes, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        entry.userId || null,
        entry.userName || null,
        entry.userEmail || null,
        entry.userRole || null,
        entry.action,
        entry.entityType || null,
        entry.entityId || null,
        entry.status || 'success',
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.requestMethod || null,
        entry.requestPath || null,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    // Don't let audit logging failures crash the app
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Express middleware to automatically log API requests
 */
export function auditMiddleware(action: string, entityType?: string) {
  return async (req: any, res: any, next: any) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to capture response
    res.send = function (data: any) {
      // Determine status based on HTTP status code
      let status: 'success' | 'failure' | 'warning' = 'success';
      if (res.statusCode >= 400) {
        status = res.statusCode >= 500 ? 'failure' : 'warning';
      }
      
      // Log the audit event
      logAudit({
        userId: req.user?.id,
        userName: req.user?.username,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        action,
        entityType,
        entityId: req.params?.id || req.body?.id,
        status,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method,
        requestPath: req.originalUrl || req.url,
        changes: req.body,
      }).catch(err => console.error('Audit middleware error:', err));
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Log authentication events
 */
export async function logAuth(
  action: 'login_success' | 'login_failed' | 'logout' | 'token_refresh' | 'unauthorized_access',
  user: { id?: string; username?: string; email?: string; role?: string } | null,
  ipAddress?: string,
  errorMessage?: string
): Promise<void> {
  await logAudit({
    userId: user?.id,
    userName: user?.username,
    userEmail: user?.email,
    userRole: user?.role,
    action,
    status: action.includes('failed') ? 'failure' : 'success',
    ipAddress,
    errorMessage,
  });
}

