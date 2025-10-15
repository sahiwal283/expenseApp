/**
 * useExpenses Hook
 * 
 * Handles expense and event data fetching for ExpenseSubmission
 */

import { useState, useEffect } from 'react';
import { api } from '../../../../utils/api';
import { Expense, TradeShow } from '../../../../App';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    
    if (api.USE_SERVER) {
      try {
        const [ev, ex] = await Promise.all([
          api.getEvents(),
          api.getExpenses(),
        ]);
        setEvents(ev || []);
        setExpenses(ex || []);
      } catch (error) {
        console.error('[useExpenses] Failed to load data:', error);
        setEvents([]);
        setExpenses([]);
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
  }, []);

  return {
    expenses,
    events,
    loading,
    reload: loadData
  };
}

