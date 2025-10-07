/**
 * useApi Hook
 * Centralized API calls with loading, error, and success states
 * @version 0.8.0
 */

import { useState, useCallback } from 'react';
import { ERROR_MESSAGES } from '../constants/appConstants';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiHook<T> extends ApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for API calls with automatic state management
 * 
 * @example
 * const { data, loading, error, execute } = useApi(api.getExpenses);
 * 
 * useEffect(() => {
 *   execute();
 * }, []);
 */
export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    initialData?: T | null;
  } = {}
): ApiHook<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: options.initialData ?? null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setState({ data: state.data, loading: true, error: null });
        
        const result = await apiFunction(...args);
        
        setState({ data: result, loading: false, error: null });
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : ERROR_MESSAGES.SERVER_ERROR;
        
        setState({ data: state.data, loading: false, error: errorMessage });
        
        if (options.onError && error instanceof Error) {
          options.onError(error);
        }
        
        return null;
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    setState({
      data: options.initialData ?? null,
      loading: false,
      error: null,
    });
  }, [options.initialData]);

  return {
    ...state,
    execute,
    reset,
  };
}

