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
  // True once a load has come back 501: this deployment has messaging
  // switched off entirely, as opposed to a thread that is simply empty. The
  // component uses this to render nothing rather than a half-working panel.
  const [messagingUnavailable, setMessagingUnavailable] = useState(false);
  // Which expense the messages currently in state actually belong to. React
  // does not reset state on a prop change alone, so when expenseId changes
  // while the hook stays mounted (e.g. a notification deep link swaps the
  // modal from expense A to B without unmounting), `messages`/`fromCache`
  // still describe the previous expense for at least one render. Gating the
  // mark-read effect and cache-fallback purely on `expenseId` let it fire
  // `POST /expenses/B/messages/read` using A's stale (non-empty) message
  // list — clearing B's unread badge before the user ever saw B's thread.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    // addListener returns its own unsubscribe; true = fire immediately so the
    // composer is not briefly enabled while offline on first render.
    return networkMonitor.addListener((state) => setIsOffline(!state.isOnline), true);
  }, []);

  // Stale messages from a previous expense must never drive the read
  // receipt (or be shown under the new expense's header, even for a single
  // render). Clear everything the instant the id changes, before the load
  // effect below has a chance to fetch/re-populate it for the new id.
  useEffect(() => {
    setMessages([]);
    setFromCache(false);
    setLoadedFor(null);
    setError(null);
    setMessagingUnavailable(false);
  }, [expenseId]);

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
      setLoadedFor(expenseId);
      setMessagingUnavailable(false);
      void offlineDb.setCachedExpenseMessages(expenseId, next);
    } catch (e: unknown) {
      const status = e instanceof AppError ? e.statusCode : undefined;
      if (status === 501) {
        // Messaging is switched off for this deployment — distinct from a
        // thread that is merely empty. The component checks this flag and
        // renders nothing at all, rather than a live composer whose Send
        // always fails.
        setMessages([]);
        setLoadedFor(expenseId);
        setMessagingUnavailable(true);
      } else {
        setMessagingUnavailable(false);
        const cached = await offlineDb.getCachedExpenseMessages(expenseId);
        if (cached) {
          setMessages(cached.messages as ExpenseMessage[]);
          setFromCache(true);
          setLoadedFor(expenseId);
        } else {
          setError('Could not load messages');
          // Nothing valid loaded for this id — leave loadedFor as-is.
        }
      }
    } finally {
      setLoading(false);
    }
  }, [expenseId, enabled]);

  useEffect(() => { void load(); }, [load]);

  // Mark read only once the thread has actually rendered with content for
  // THIS expense — never on a background cache fill, and never using
  // another expense's still-in-state messages, either of which would clear
  // the badge for messages the user never saw.
  useEffect(() => {
    if (!expenseId || !enabled || fromCache) return;
    if (loadedFor !== expenseId) return; // messages in state are not this expense's yet
    if (messages.length === 0) return;
    if (markedRef.current === expenseId) return;
    markedRef.current = expenseId;
    apiClient.post(`/expenses/${expenseId}/messages/read`).catch(() => undefined);
  }, [expenseId, enabled, fromCache, loadedFor, messages.length]);

  const send = useCallback(async (body: string, requestType?: string | null) => {
    if (!expenseId) return false;
    setSending(true);
    setError(null);
    try {
      await apiClient.post(`/expenses/${expenseId}/messages`, { body, requestType: requestType ?? null });
      await load();
      return true;
    } catch (e: unknown) {
      // e.code is always 'API_ERROR' — apiClient.handleResponse hardcodes it
      // on every failure. The real upstream code (propagated by the backend
      // fail() helper) rides in the parsed response body instead, which
      // handleResponse stores verbatim as AppError.details.
      const code =
        e instanceof AppError
          ? (e.details as { error?: { code?: string } } | undefined)?.error?.code
          : undefined;
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

  return {
    messages, loading, error, fromCache, isOffline, send, sending,
    messagingUnavailable, reload: load,
  };
}
