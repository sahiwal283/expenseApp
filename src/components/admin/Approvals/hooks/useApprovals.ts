/**
 * useApprovals Hook
 * 
 * Handles data fetching and management for the Approvals page
 */

import { useState, useEffect } from 'react';
import { api } from '../../../../utils/api';
import { User, TradeShow, Expense } from '../../../../App';

export function useApprovals() {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cardOptions, setCardOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    
    if (api.USE_SERVER) {
      // Fetch data independently so one failure doesn't clear everything
      console.log('[Approvals] Loading data...');
      
      // Fetch expenses (critical)
      try {
        const ex = await api.getExpenses();
        console.log('[Approvals] Loaded expenses:', ex?.length || 0);
        setExpenses(ex || []);
      } catch (error) {
        console.error('[Approvals] Error loading expenses:', error);
        setExpenses([]);
      }

      // Fetch events (important but non-critical)
      try {
        const ev = await api.getEvents();
        console.log('[Approvals] Loaded events:', ev?.length || 0);
        setEvents(ev || []);
      } catch (error) {
        console.error('[Approvals] Error loading events:', error);
        setEvents([]);
      }

      // Fetch users (non-critical)
      try {
        const us = await api.getUsers();
        console.log('[Approvals] Loaded users:', us?.length || 0);
        setUsers(us || []);
      } catch (error) {
        console.error('[Approvals] Error loading users (non-critical):', error);
        setUsers([]);
      }

      // Fetch card options (non-critical)
      try {
        const cards = await api.getCardOptions();
        console.log('[Approvals] Loaded card options:', cards?.length || 0);
        setCardOptions(cards || []);
      } catch (error) {
        console.error('[Approvals] Error loading card options (non-critical):', error);
        setCardOptions([]);
      }

      // Fetch entity options (non-critical)
      try {
        const entities = await api.getEntityOptions();
        console.log('[Approvals] Loaded entity options:', entities?.length || 0);
        setEntityOptions(entities || []);
      } catch (error) {
        console.error('[Approvals] Error loading entity options (non-critical):', error);
        setEntityOptions([]);
      }
    } else {
      // Mock data for local development
      console.log('[Approvals] Using mock data (api.USE_SERVER = false)');
      setExpenses([]);
      setEvents([]);
      setUsers([]);
      setCardOptions([]);
      setEntityOptions([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    events,
    expenses,
    users,
    cardOptions,
    entityOptions,
    loading,
    reload: loadData
  };
}

