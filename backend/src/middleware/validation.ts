/**
 * Request Validation Middleware
 * Centralized validation for all API endpoints
 * @version 1.3.0
 */

import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export class ValidationError extends Error {
  public statusCode: number;
  public errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

/**
 * Validate a single field
 */
function validateField(value: any, rule: ValidationRule): string | null {
  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    return rule.message || `${rule.field} is required`;
  }

  // Skip other validations if value is not provided and not required
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${rule.field} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `${rule.field} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `${rule.field} must be a boolean`;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return `${rule.field} must be a valid email`;
        }
        break;
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(value))) {
          return `${rule.field} must be a valid UUID`;
        }
        break;
      case 'date':
        if (isNaN(Date.parse(String(value)))) {
          return `${rule.field} must be a valid date`;
        }
        break;
    }
  }

  // String length validation
  if (rule.minLength !== undefined && String(value).length < rule.minLength) {
    return `${rule.field} must be at least ${rule.minLength} characters`;
  }
  if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
    return `${rule.field} must be no more than ${rule.maxLength} characters`;
  }

  // Number range validation
  if (rule.min !== undefined && Number(value) < rule.min) {
    return `${rule.field} must be at least ${rule.min}`;
  }
  if (rule.max !== undefined && Number(value) > rule.max) {
    return `${rule.field} must be no more than ${rule.max}`;
  }

  // Pattern validation
  if (rule.pattern && !rule.pattern.test(String(value))) {
    return rule.message || `${rule.field} format is invalid`;
  }

  // Custom validation
  if (rule.custom && !rule.custom(value)) {
    return rule.message || `${rule.field} validation failed`;
  }

  return null;
}

/**
 * Create validation middleware
 */
export function validate(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];
      const error = validateField(value, rule);
      
      if (error) {
        errors[rule.field] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        errors,
      });
    }

    next();
  };
}

/**
 * Common validation rules
 */
export const commonRules = {
  username: {
    field: 'username',
    required: true,
    type: 'string' as const,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
  },
  password: {
    field: 'password',
    required: true,
    type: 'string' as const,
    minLength: 6,
    message: 'Password must be at least 6 characters',
  },
  email: {
    field: 'email',
    required: true,
    type: 'email' as const,
  },
  uuid: (field: string) => ({
    field,
    required: true,
    type: 'uuid' as const,
  }),
  amount: {
    field: 'amount',
    required: true,
    type: 'number' as const,
    min: 0,
    message: 'Amount must be a positive number',
  },
  date: {
    field: 'date',
    required: true,
    type: 'date' as const,
  },
};

