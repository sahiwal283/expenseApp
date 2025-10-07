/**
 * Error Handler Middleware
 * Centralized error handling for all API endpoints
 * @version 1.3.0
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  errors?: Record<string, string>;
}

/**
 * Centralized error handler
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error
  logger.error(`API Error: ${message}`, {
    statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Send error response
  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(err.errors && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
}

