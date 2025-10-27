/**
 * useUsers Hook
 * 
 * Centralized hook for fetching and managing user data across the application.
 * Eliminates duplicate user-fetching logic found in 5+ components.
 * 
 * Usage:
 *   const { users, loading, error, reload } = useUsers();
 * 
 * Features:
 *   - Automatic initial load
 *   - Error handling with user-friendly messages
 *   - Manual reload capability
 *   - Local storage fallback
 *   - Cleanup on unmount
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../App';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    if (!api.USE_SERVER) {
      // Local storage fallback
      const storedUsers = localStorage.getItem('app_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }
      setLoading(false);
      return;
    }

    try {
      console.log('[useUsers] Fetching users...');
      const fetchedUsers = await api.getUsers();
      console.log('[useUsers] Received users:', fetchedUsers?.length || 0);
      
      if (!fetchedUsers || fetchedUsers.length === 0) {
        console.warn('[useUsers] ⚠️ No users returned from API');
      }
      
      setUsers(fetchedUsers || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load users';
      console.error('[useUsers] Error fetching users:', err);
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await loadUsers();
      if (!mounted) {
        setUsers([]);
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    users,
    loading,
    error,
    reload: loadUsers
  };
}

