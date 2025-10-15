/**
 * Base Application Error Class
 * 
 * All custom errors should extend this class for consistent error handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);
    
    // Set prototype explicitly for proper inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      ...(this.context && { context: this.context })
    };
  }
}

/**
 * Validation Error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication Error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 401, true, context);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization Error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 403, true, context);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, 404, true, { resource, identifier });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, true, context);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      `Database operation failed: ${message}`,
      500,
      true,
      originalError ? { originalMessage: originalError.message } : undefined
    );
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External Service Error (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(
      `External service '${service}' error: ${message}`,
      502,
      true,
      {
        service,
        ...(originalError && { originalMessage: originalError.message })
      }
    );
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

