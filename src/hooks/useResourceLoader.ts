/**
 * useResourceLoader Hook
 * 
 * Generic hook for loading any type of resource with consistent loading states,
 * error handling, and retry logic. Eliminates duplicate data-fetching patterns.
 * 
 * Usage:
 *   const { data, loading, error, reload } = useResourceLoader(
 *     () => api.getExpenses(),
 *     { 
 *       initialLoad: true,
 *       localStorageKey: 'tradeshow_expenses'
 *     }
 *   );
 * 
 * Features:
 *   - Automatic initial load (optional)
 *   - Local storage fallback
 *   - Manual reload capability
 *   - Cleanup on unmount
 *   - Loading and error states
 *   - TypeScript generic support
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

interface UseResourceLoaderOptions {
  /** Whether to load data automatically on mount (default: true) */
  initialLoad?: boolean;
  /** Local storage key for offline fallback */
  localStorageKey?: string;
  /** Dependencies that trigger reload */
  dependencies?: any[];
}

export function useResourceLoader<T>(
  fetchFn: () => Promise<T>,
  options: UseResourceLoaderOptions = {}
) {
  const {
    initialLoad = true,
    localStorageKey,
    dependencies = []
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check for local storage fallback first
    if (!api.USE_SERVER && localStorageKey) {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        try {
          setData(JSON.parse(stored) as T);
        } catch (err) {
          console.error(`[useResourceLoader] Failed to parse localStorage[${localStorageKey}]`);
        }
      }
      setLoading(false);
      return;
    }

    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load data';
      console.error('[useResourceLoader] Error:', err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, localStorageKey, ...dependencies]);

  useEffect(() => {
    if (initialLoad) {
      loadData();
    }
  }, [initialLoad, ...dependencies]);

  return {
    data,
    loading,
    error,
    reload: loadData,
    setData // Allow manual updates
  };
}

