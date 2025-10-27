/**
 * useApiError Hook
 * 
 * Centralized error handling for API calls. Provides consistent error formatting
 * and automatic cleanup of error messages.
 * 
 * Usage:
 *   const { error, setError, clearError, wrapAsync } = useApiError();
 * 
 *   // Option 1: Manual error setting
 *   try {
 *     await someApiCall();
 *   } catch (err) {
 *     setError(err);
 *   }
 * 
 *   // Option 2: Automatic wrapping
 *   const result = await wrapAsync(async () => {
 *     return await someApiCall();
 *   });
 * 
 * Features:
 *   - Consistent error message formatting
 *   - Automatic auth error detection (401/403)
 *   - Optional auto-clear timeout
 *   - User-friendly error messages
 */

import { useState, useCallback } from 'react';

interface ApiError {
  message: string;
  statusCode?: number;
  isAuthError?: boolean;
}

export function useApiError(autoClearMs?: number) {
  const [error, setErrorState] = useState<string | null>(null);

  const setError = useCallback((err: any) => {
    let errorMessage = 'An unexpected error occurred';
    let statusCode: number | undefined;
    let isAuthError = false;

    if (typeof err === 'string') {
      errorMessage = err;
    } else if (err?.message) {
      errorMessage = err.message;
    } else if (err?.error) {
      errorMessage = err.error;
    }

    if (err?.statusCode) {
      statusCode = err.statusCode;
      isAuthError = statusCode === 401 || statusCode === 403;
    }

    // Format user-friendly messages
    if (statusCode === 401 || statusCode === 403) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (statusCode === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (statusCode === 429) {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (statusCode && statusCode >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    console.error('[useApiError] Error:', { message: errorMessage, statusCode, isAuthError });
    setErrorState(errorMessage);

    // Auto-clear if specified
    if (autoClearMs) {
      setTimeout(() => {
        setErrorState(null);
      }, autoClearMs);
    }
  }, [autoClearMs]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  /**
   * Wraps an async function with automatic error handling
   * Returns the result if successful, undefined if error
   */
  const wrapAsync = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      clearError();
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    }
  }, [setError, clearError]);

  return {
    error,
    setError,
    clearError,
    wrapAsync
  };
}

