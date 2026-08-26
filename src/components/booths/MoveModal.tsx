import React, { useEffect, useState } from 'react';
import {
  boothApi, InventoryLocation, BulkMoveResult,
  BOOTH_STATUSES, CONTAINER_STATUSES, humanise,
} from '../../utils/boothApi';

interface MoveTarget {
  kind: 'booth' | 'container' | 'component';
  id: string;
  name: string;
}

interface Props {
  target: MoveTarget;
  eventId?: string | null;
  onClose: () => void;
  onMoved: () => void;
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** Builds the "what happened" sentence from the server's move counts — never
 *  silently drop the moved count, and never silently drop stranded ones either. */
function summarize(result: BulkMoveResult, destinationName: string): string {
  const parts: string[] = [];
  if (result.movedBooths > 0) parts.push(pluralize(result.movedBooths, 'booth'));
  if (result.movedContainers > 0) parts.push(pluralize(result.movedContainers, 'container'));
  if (result.movedComponents > 0) parts.push(pluralize(result.movedComponents, 'component'));
  if (parts.length === 0) return `Nothing moved to ${destinationName}.`;
  return `Moved ${parts.join(' and ')} to ${destinationName}.`;
}

export const MoveModal: React.FC<Props> = ({ target, eventId, onClose, onMoved }) => {
  // Generated once, on mount — a fresh key per render would defeat the
  // server-side deduplication that keeps a double-click from double-moving.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkMoveResult | null>(null);

  const statusOptions = target.kind === 'booth' ? BOOTH_STATUSES : CONTAINER_STATUSES;

  useEffect(() => {
    boothApi.listLocations({ is_active: true }).then(setLocations).catch(() => setLocations([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId && !status) {
      setError('Choose a destination location or a new status');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      to_location_id: locationId || null,
      to_status: status || null,
      event_id: eventId ?? null,
      notes: notes || null,
      idempotency_key: idempotencyKey,
    };
    try {
      let moveResult: BulkMoveResult;
      if (target.kind === 'booth') moveResult = await boothApi.moveBooth(target.id, payload);
      else if (target.kind === 'container') moveResult = await boothApi.moveContainer(target.id, payload);
      else moveResult = await boothApi.moveComponent(target.id, payload);
      setResult(moveResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete this move');
    } finally {
      setSaving(false);
    }
  };

  const destinationName = locations.find((l) => l.id === locationId)?.name ?? 'the selected destination';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Move — {target.name}</h2>

        {result ? (
          <div>
            <p className="mb-3 rounded bg-green-50 p-3 text-sm text-green-800">
              {summarize(result, destinationName)}
            </p>
            {result.strandedComponents > 0 && (
              <p role="alert" className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">
                {pluralize(result.strandedComponents, 'component')} belonging to this booth{' '}
                {result.strandedComponents === 1 ? 'is' : 'are'} in other containers and did not move.
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={onMoved}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
            )}

            <label className="mb-3 block text-sm" htmlFor="move-location">
              <span className="mb-1 block font-medium">Destination location</span>
              <select id="move-location" className="w-full rounded border px-3 py-2"
                      value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">— no change —</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>

            <label className="mb-3 block text-sm" htmlFor="move-status">
              <span className="mb-1 block font-medium">New status</span>
              <select id="move-status" className="w-full rounded border px-3 py-2"
                      value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">— no change —</option>
                {statusOptions.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </label>

            <label className="mb-4 block text-sm" htmlFor="move-notes">
              <span className="mb-1 block font-medium">Note</span>
              <textarea id="move-notes" className="w-full rounded border px-3 py-2" rows={2}
                        value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                      className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? 'Moving…' : 'Move'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
