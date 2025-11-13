/**
 * Error Handling Utilities
 * Centralized error handling and reporting
 * @version 0.8.0
 */

import { ERROR_MESSAGES } from '../constants/appConstants';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): string {
  // Check for network errors first (fetch failures, CORS, connection refused, etc.)
  // Network errors don't have a response object and typically have:
  // - message: "Failed to fetch" or "NetworkError when attempting to fetch resource"
  // - name: "TypeError" or "NetworkError"
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Check for network-related error messages
    if (
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('cors') ||
      errorName === 'typeerror' ||
      errorName === 'networkerror'
    ) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
  }
  
  // Check for AppError instances (from apiClient)
  if (error instanceof AppError) {
    // Network-related error codes
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return error.code === 'TIMEOUT' 
        ? 'Request timeout. Please check your connection and try again.'
        : ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    // HTTP status codes
    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
          return ERROR_MESSAGES.UNAUTHORIZED;
        case 404:
          return ERROR_MESSAGES.NOT_FOUND;
        case 400:
          return error.message || ERROR_MESSAGES.VALIDATION_ERROR;
        case 500:
        case 502:
        case 503:
          return ERROR_MESSAGES.SERVER_ERROR;
        default:
          return error.message || ERROR_MESSAGES.SERVER_ERROR;
      }
    }
    
    // Return AppError message if available
    if (error.message) {
      return error.message;
    }
  }
  
  // Check for legacy error format with response object
  if (error.response) {
    const status = error.response?.status;
    switch (status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 400:
        return error.response?.data?.error || ERROR_MESSAGES.VALIDATION_ERROR;
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return error.response?.data?.error || error.message || ERROR_MESSAGES.SERVER_ERROR;
    }
  }
  
  // Fallback: check for error message
  if (error?.message) {
    return error.message;
  }
  
  // Final fallback
  return ERROR_MESSAGES.SERVER_ERROR;
}

/**
 * Log error to console and external logging service in production
 * 
 * @param error - Error object to log
 * @param context - Optional context string for categorization
 * 
 * @remarks
 * In production, errors should be sent to a logging service like:
 * - Sentry: https://sentry.io
 * - LogRocket: https://logrocket.com  
 * - Custom logging endpoint
 * 
 * Implementation example:
 * ```typescript
 * if (import.meta.env.PROD && window.Sentry) {
 *   window.Sentry.captureException(error, {
 *     tags: { context },
 *     extra: error instanceof AppError ? {
 *       code: error.code,
 *       statusCode: error.statusCode,
 *       details: error.details
 *     } : {}
 *   });
 * }
 * ```
 */
export function logError(error: Error | AppError, context?: string) {
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }),
  });

  // NOTE: External logging service integration ready when needed
  // Uncomment and configure when adding Sentry/LogRocket/custom solution
  /*
  if (import.meta.env.PROD) {
    sendToLoggingService(error, context);
  }
  */
}

/**
 * Handle error and return user-friendly message
 */
export function handleError(error: any, context?: string): string {
  logError(error, context);
  return parseApiError(error);
}

/**
 * Create a user-friendly error message
 */
export function createErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return ERROR_MESSAGES.SERVER_ERROR;
}

/**
 * Validate form data and return errors
 */
export function validateFormData<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, (value: any) => string | null>>
): Record<keyof T, string> | null {
  const errors: any = {};
  let hasErrors = false;

  for (const [field, validator] of Object.entries(rules)) {
    // Skip if validator is undefined
    if (!validator) continue;
    
    const error = validator(data[field as keyof T]);
    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  }

  return hasErrors ? errors : null;
}

/**
 * Common validators
 */
export const validators = {
  required: (fieldName: string) => (value: any) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Invalid email address';
    }
    return null;
  },
  
  minLength: (min: number) => (value: string) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },
  
  min: (min: number) => (value: number) => {
    if (value !== null && value !== undefined && value < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },
  
  max: (max: number) => (value: number) => {
    if (value !== null && value !== undefined && value > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },
  
  positive: (value: number) => {
    if (value !== null && value !== undefined && value <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },
};

