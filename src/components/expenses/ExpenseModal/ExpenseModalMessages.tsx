/**
 * Expense message thread.
 *
 * Threads are owned by Midas; this panel reads and appends. The composer warns
 * before a reply that will move the expense out of "Needs Further Review",
 * because that is a real state change the user is triggering.
 */

import React from 'react';
import { MessageSquare, AlertCircle, WifiOff } from 'lucide-react';
import { useExpenseMessages } from '../../../hooks/useExpenseMessages';

const PRIVILEGED_ROLES = ['admin', 'accountant', 'coordinator', 'developer'];
const MAX_BODY = 2000;

interface Props {
  expenseId: string;
  currentUserRole: string;
  expenseStatus: string;
  /** Called after a reply sends successfully. A reply can flip the expense's
   *  status upstream (e.g. out of "needs further review"), and this panel
   *  has no other way to tell the modal/list that happened. */
  onSent?: () => void;
}

export const ExpenseModalMessages: React.FC<Props> = ({
  expenseId, currentUserRole, expenseStatus, onSent,
}) => {
  const { messages, loading, error, fromCache, isOffline, send, sending, messagingUnavailable } =
    useExpenseMessages(expenseId, true);
  const [draft, setDraft] = React.useState('');
  const [requestType, setRequestType] = React.useState<string>('');

  const isPrivileged = PRIVILEGED_ROLES.includes(currentUserRole);
  const willSendBackForReview = expenseStatus === 'needs further review' && !isPrivileged;

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    const ok = await send(body, requestType || null);
    if (ok) {
      setDraft('');
      setRequestType('');
      onSent?.();
    }
  };

  // Messaging is switched off for this deployment — show nothing rather than
  // a panel whose composer always fails.
  if (messagingUnavailable) return null;

  return (
    <div className="rounded-card border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-stone-500" />
        <h3 className="font-display font-semibold tracking-tight text-stone-900">Messages</h3>
        {fromCache && (
          <span className="chip px-2 py-0.5 text-[11px] bg-stone-100 text-stone-600">
            Showing saved messages
          </span>
        )}
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-stone-500">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-stone-500">No messages on this expense yet.</p>
        )}

        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <p key={m.id} className="text-center text-xs italic text-stone-400">{m.body}</p>
            );
          }
          const mine = m.isMine;
          const needsResponse = !!m.requestType && !m.isResolved;
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={[
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  mine ? 'bg-brand-50 text-stone-900' : 'bg-stone-100 text-stone-900',
                  needsResponse ? 'ring-1 ring-amber-300' : '',
                ].join(' ')}
              >
                {!mine && (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {m.sender.name}{m.sender.role ? ` · ${m.sender.role}` : ''}
                  </p>
                )}
                {needsResponse && (
                  <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                    <AlertCircle className="h-3 w-3" /> Needs your response
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[11px] text-stone-400">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-stone-100 p-4">
        {isOffline ? (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <WifiOff className="h-4 w-4" />
            You are offline — reply when you reconnect.
          </p>
        ) : (
          <>
            {willSendBackForReview && (
              <p className="mb-2 text-xs text-amber-700">
                Replying will send this back for review.
              </p>
            )}
            {isPrivileged && (
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="">Comment (no action required)</option>
                <option value="info_request">Request more information</option>
                <option value="missing_receipt">Missing receipt</option>
                <option value="missing_category">Missing category</option>
                <option value="missing_payment_method">Missing payment method</option>
              </select>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
              rows={3}
              placeholder="Write a message…"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">{draft.length}/{MAX_BODY}</span>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || draft.trim().length === 0}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};
