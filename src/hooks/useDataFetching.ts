/**
 * Data Fetching Hooks
 * Specialized hooks for fetching common data types
 * @version 0.8.0
 */

import { useEffect } from 'react';
import { useApi } from './useApi';
import { api } from '../utils/api';
import { Expense, TradeShow, User } from '../App';

/**
 * Hook to fetch and manage expenses
 */
export function useExpenses(autoFetch: boolean = true) {
  const {
    data: expenses,
    loading,
    error,
    execute: fetchExpenses,
  } = useApi<Expense[]>(api.getExpenses, { initialData: [] });

  useEffect(() => {
    if (autoFetch && api.USE_SERVER) {
      fetchExpenses();
    }
  }, [autoFetch]);

  return {
    expenses: expenses ?? [],
    loading,
    error,
    refetch: fetchExpenses,
  };
}

/**
 * Hook to fetch and manage events
 */
export function useEvents(autoFetch: boolean = true) {
  const {
    data: events,
    loading,
    error,
    execute: fetchEvents,
  } = useApi<TradeShow[]>(api.getEvents, { initialData: [] });

  useEffect(() => {
    if (autoFetch && api.USE_SERVER) {
      fetchEvents();
    }
  }, [autoFetch]);

  return {
    events: events ?? [],
    loading,
    error,
    refetch: fetchEvents,
  };
}

/**
 * Hook to fetch and manage users
 */
export function useUsers(autoFetch: boolean = true) {
  const {
    data: users,
    loading,
    error,
    execute: fetchUsers,
  } = useApi<User[]>(api.getUsers, { initialData: [] });

  useEffect(() => {
    if (autoFetch && api.USE_SERVER) {
      fetchUsers();
    }
  }, [autoFetch]);

  return {
    users: users ?? [],
    loading,
    error,
    refetch: fetchUsers,
  };
}

/**
 * Hook to fetch and manage app settings
 */
export function useSettings(autoFetch: boolean = true) {
  const {
    data: settings,
    loading,
    error,
    execute: fetchSettings,
  } = useApi<any>(api.getSettings, { initialData: null });

  useEffect(() => {
    if (autoFetch && api.USE_SERVER) {
      fetchSettings();
    }
  }, [autoFetch]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
  };
}

/**
 * Hook to fetch all common data at once
 * Useful for components that need multiple data sources
 */
export function useAppData() {
  const { expenses, loading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const { events, loading: eventsLoading, refetch: refetchEvents } = useEvents();
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { settings, loading: settingsLoading, refetch: refetchSettings } = useSettings();

  const loading = expensesLoading || eventsLoading || usersLoading || settingsLoading;

  const refetchAll = async () => {
    await Promise.all([
      refetchExpenses(),
      refetchEvents(),
      refetchUsers(),
      refetchSettings(),
    ]);
  };

  return {
    expenses,
    events,
    users,
    settings,
    loading,
    refetchAll,
    refetchExpenses,
    refetchEvents,
    refetchUsers,
    refetchSettings,
  };
}

