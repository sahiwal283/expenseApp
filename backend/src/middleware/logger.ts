/**
 * Logging Middleware
 * Request/response logging for debugging and monitoring
 * @version 1.3.0
 */

import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  userId?: string;
}

/**
 * Simple logger utility
 */
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  },
};

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
  };

  // Log response
  res.on('finish', () => {
    logEntry.statusCode = res.statusCode;
    logEntry.duration = Date.now() - startTime;

    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    if (logLevel === 'error') {
      logger.error(`${req.method} ${req.path}`, logEntry);
    } else if (logLevel === 'warn') {
      logger.warn(`${req.method} ${req.path}`, logEntry);
    } else {
      logger.info(`${req.method} ${req.path}`, logEntry);
    }
  });

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(err: any, req: Request, res: Response, next: NextFunction) {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message || 'Unknown error',
    userId: (req as any).user?.id,
  };

  logger.error(`Error in ${req.method} ${req.path}`, {
    ...logEntry,
    stack: err.stack,
  });

  next(err);
}

