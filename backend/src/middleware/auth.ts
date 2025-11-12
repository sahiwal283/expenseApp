import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log(`[Auth:Middleware] Authentication check`, {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    path: req.path,
    method: req.method,
    origin: req.get('origin'),
    ip: req.ip || req.socket.remoteAddress
  });

  if (!token) {
    console.log(`[Auth:Middleware] No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production') as any;
    req.user = decoded;
    console.log(`[Auth:Middleware] Token verified successfully`, {
      userId: decoded.id,
      username: decoded.username,
      role: decoded.role,
      path: req.path
    });
    next();
  } catch (error: any) {
    // 401 = Authentication failed (token invalid/expired)
    // This is different from 403 which means authenticated but lacks permission
    console.error(`[Auth:Middleware] Token verification failed:`, {
      error: error.message,
      name: error.name,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log(`[Auth] Authorization check:`, {
      user: req.user,
      requiredRoles: roles,
      hasUser: !!req.user,
      userRole: req.user?.role,
      isAuthorized: req.user && roles.includes(req.user.role)
    });
    
    if (!req.user) {
      console.log(`[Auth] FAILED: No user in request`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[Auth] FAILED: User role "${req.user.role}" not in allowed roles:`, roles);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log(`[Auth] SUCCESS: User authorized`);
    next();
  };
};

// Alias for convenience
export const authenticate = authenticateToken;
