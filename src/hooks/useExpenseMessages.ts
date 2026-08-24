/**
 * Expense message thread data.
 *
 * Reading falls back to the Dexie cache, so a user on a show floor can still
 * see what their accountant asked. Replying does not queue offline: a queued
 * reply that fails on replay is silent, and the user would believe they had
 * answered while the expense stayed parked in awaiting_info.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../utils/apiClient';
import { AppError } from '../utils/errorHandler';
import { offlineDb } from '../utils/offlineDb';
import { networkMonitor } from '../utils/networkDetection';

export interface ExpenseMessage {
  id: string;
  body: string;
  sender: { id: string | null; name: string; role: string | null; email: string | null };
  /** Set by the BFF — the frontend cannot compute this (see ExpenseMessageService). */
  isMine: boolean;
  isSystem: boolean;
  requestType: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export function useExpenseMessages(expenseId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<ExpenseMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    // addListener returns its own unsubscribe; true = fire immediately so the
    // composer is not briefly enabled while offline on first render.
    return networkMonitor.addListener((state) => setIsOffline(!state.isOnline), true);
  }, []);

  const load = useCallback(async () => {
    if (!expenseId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      // apiClient returns the parsed body directly — there is no axios-style
      // { data } envelope on this client.
      const res = await apiClient.get<{ messages: ExpenseMessage[] }>(
        `/expenses/${expenseId}/messages`
      );
      const next = res.messages || [];
      setMessages(next);
      setFromCache(false);
      void offlineDb.setCachedExpenseMessages(expenseId, next);
    } catch (e: unknown) {
      const status = e instanceof AppError ? e.statusCode : undefined;
      if (status === 501) {
        // Messaging is switched off for this deployment; an empty thread is
        // the honest answer, not an error.
        setMessages([]);
      } else {
        const cached = await offlineDb.getCachedExpenseMessages(expenseId);
        if (cached) {
          setMessages(cached.messages as ExpenseMessage[]);
          setFromCache(true);
        } else {
          setError('Could not load messages');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [expenseId, enabled]);

  useEffect(() => { void load(); }, [load]);

  // Mark read only once the thread has actually rendered with content — never
  // on a background cache fill, which would clear the badge unseen.
  useEffect(() => {
    if (!expenseId || !enabled || fromCache) return;
    if (messages.length === 0) return;
    if (markedRef.current === expenseId) return;
    markedRef.current = expenseId;
    apiClient.post(`/expenses/${expenseId}/messages/read`).catch(() => undefined);
  }, [expenseId, enabled, fromCache, messages.length]);

  const send = useCallback(async (body: string, requestType?: string | null) => {
    if (!expenseId) return false;
    setSending(true);
    setError(null);
    try {
      await apiClient.post(`/expenses/${expenseId}/messages`, { body, requestType: requestType ?? null });
      await load();
      return true;
    } catch (e: unknown) {
      const code = e instanceof AppError ? e.code : undefined;
      setError(
        code === 'SUBMITTER_AMBIGUOUS'
          ? 'Your account could not be matched in Midas. Ask an admin to check your email and username.'
          : code === 'MISSING_SCOPE'
            ? 'Messaging is not authorised for this deployment yet.'
            : code === 'USER_NOT_FOUND'
              ? 'Your account does not exist in Midas yet. Submit an expense first, or ask an admin.'
              : 'Could not send your reply. Please try again.'
      );
      return false;
    } finally {
      setSending(false);
    }
  }, [expenseId, load]);

  return { messages, loading, error, fromCache, isOffline, send, sending, reload: load };
}
