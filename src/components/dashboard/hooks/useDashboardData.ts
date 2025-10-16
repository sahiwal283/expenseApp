/**
 * useDashboardData Hook
 * 
 * Handles data fetching for Dashboard component
 */

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { Expense, TradeShow, User } from '../../../App';

export function useDashboardData() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!api.USE_SERVER) {
        setLoading(false);
        return;
      }

      console.log('[Dashboard] Loading data...');

      // Fetch expenses (critical)
      try {
        const ex = await api.getExpenses();
        if (mounted) {
          console.log('[Dashboard] Loaded expenses:', ex?.length || 0);
          setExpenses(ex || []);
        }
      } catch (error: any) {
        console.error('[Dashboard] Error loading expenses:', error);
        // If we get a 401/403, the apiClient unauthorized callback should handle logout
        // But if that fails, we'll at least show empty data instead of crashing
        if (mounted) setExpenses([]);
        
        // Don't continue loading other data if authentication failed
        if (error?.statusCode === 401 || error?.statusCode === 403) {
          console.error('[Dashboard] Authentication failed, stopping data load');
          if (mounted) setLoading(false);
          return;
        }
      }

      // Fetch events (critical)
      try {
        const ev = await api.getEvents();
        if (mounted) {
          console.log('[Dashboard] Loaded events:', ev?.length || 0);
          setEvents(ev || []);
        }
      } catch (error: any) {
        console.error('[Dashboard] Error loading events:', error);
        if (mounted) setEvents([]);
        
        // Don't continue if authentication failed
        if (error?.statusCode === 401 || error?.statusCode === 403) {
          console.error('[Dashboard] Authentication failed, stopping data load');
          if (mounted) setLoading(false);
          return;
        }
      }

      // Fetch users (non-critical)
      try {
        const us = await api.getUsers();
        if (mounted) {
          console.log('[Dashboard] Loaded users:', us?.length || 0);
          setUsers(us || []);
        }
      } catch (error: any) {
        console.error('[Dashboard] Error loading users (non-critical):', error);
        if (mounted) setUsers([]);
      }

      if (mounted) setLoading(false);
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    expenses,
    events,
    users,
    loading
  };
}

