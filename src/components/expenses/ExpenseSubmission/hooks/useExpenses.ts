/**
 * useExpenses Hook
 * 
 * Handles expense and event data fetching for ExpenseSubmission
 * Enhanced to support approval workflows when hasApprovalPermission is true
 */

import { useState, useEffect } from 'react';
import { api } from '../../../../utils/api';
import { Expense, TradeShow, User } from '../../../../App';

interface UseExpensesOptions {
  hasApprovalPermission?: boolean;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const { hasApprovalPermission = false } = options;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    
    if (api.USE_SERVER) {
      try {
        // Base data for all users
        const promises: Promise<any>[] = [
          api.getEvents(),
          api.getExpenses(),
        ];
        
        // Additional data for approval users
        if (hasApprovalPermission) {
          promises.push(api.getUsers());
          promises.push(api.getSettings());
        }
        
        const results = await Promise.all(promises);
        setEvents(results[0] || []);
        setExpenses(results[1] || []);
        
        if (hasApprovalPermission) {
          setUsers(results[2] || []);
          const settings = results[3];
          setEntityOptions(settings?.entityOptions || []);
        }
      } catch (error) {
        console.error('[useExpenses] Failed to load data:', error);
        setEvents([]);
        setExpenses([]);
        if (hasApprovalPermission) {
          setUsers([]);
          setEntityOptions([]);
        }
      }
    } else {
      // Local storage fallback
      const storedExpenses = localStorage.getItem('tradeshow_expenses');
      const storedEvents = localStorage.getItem('tradeshow_events');
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
      if (storedEvents) setEvents(JSON.parse(storedEvents));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [hasApprovalPermission]);

  return {
    expenses,
    events,
    users,
    entityOptions,
    loading,
    reload: loadData
  };
}

