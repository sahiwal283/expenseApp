/**
 * useReportsData Hook
 * 
 * Handles data fetching for Reports component
 */

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { Expense, TradeShow } from '../../../App';

export function useReportsData() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    if (api.USE_SERVER) {
      try {
        const [ev, ex, settings] = await Promise.all([
          api.getEvents(),
          api.getExpenses(),
          api.getSettings()
        ]);
        setEvents(ev || []);
        setExpenses(ex || []);
        setEntityOptions(settings?.entityOptions || []);
      } catch (error) {
        console.error('[Reports] Error loading data:', error);
        setEvents([]);
        setExpenses([]);
        setEntityOptions([]);
      }
    } else {
      // Local storage fallback
      const storedEvents = localStorage.getItem('tradeshow_events');
      const storedExpenses = localStorage.getItem('tradeshow_expenses');
      const storedSettings = localStorage.getItem('app_settings');
      
      if (storedEvents) setEvents(JSON.parse(storedEvents));
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setEntityOptions(settings.entityOptions || []);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    expenses,
    events,
    entityOptions,
    loading,
    reload: loadData,
    setExpenses // Expose for updates from child components
  };
}

