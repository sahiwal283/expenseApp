/**
 * useEventData Hook
 * 
 * Handles data fetching for events and users in EventSetup component.
 * Separates data loading logic from UI logic.
 */

import { useState, useEffect } from 'react';
import { TradeShow, User } from '../../../../App';
import { api } from '../../../../utils/api';

interface UseEventDataReturn {
  events: TradeShow[];
  allUsers: User[];
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
}

export function useEventData(): UseEventDataReturn {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    
    if (api.USE_SERVER) {
      // Fetch events and users separately so one failure doesn't clear both
      try {
        console.log('[EventSetup] Fetching events from API...');
        const ev = await api.getEvents();
        console.log('[EventSetup] Received events:', ev?.length || 0, 'events');
        setEvents(ev || []);
        setLoadError(null);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[EventSetup] Error fetching events:', error);
        setLoadError(`Failed to load events: ${errorMsg}`);
        setEvents([]);
      }

      // Fetch users separately - if this fails, events are still shown
      try {
        console.log('[EventSetup] Fetching users from API...');
        const users = await api.getUsers();
        console.log('[EventSetup] Received users:', users?.length || 0, 'users');
        
        if (!users || users.length === 0) {
          console.warn('[EventSetup] ⚠️ NO USERS RETURNED FROM API!');
        }
        setAllUsers(users || []);
        console.log('[EventSetup] allUsers state updated with', users?.length || 0, 'users');
      } catch (error: unknown) {
        console.error('[EventSetup] ❌ ERROR fetching users:', error);
        // Don't show error to user, just log it
        setAllUsers([]);
      }
    } else {
      // Local storage fallback
      const storedEvents = localStorage.getItem('tradeshow_events');
      const storedUsers = localStorage.getItem('tradeshow_users');
      if (storedEvents) setEvents(JSON.parse(storedEvents));
      if (storedUsers) setAllUsers(JSON.parse(storedUsers));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    events,
    allUsers,
    loading,
    loadError,
    reload: loadData
  };
}

