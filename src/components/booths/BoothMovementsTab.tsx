import React, { useCallback, useEffect, useState } from 'react';
import { boothApi, BoothMovement, humanise } from '../../utils/boothApi';

interface Props { boothId: string; }

function relativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Builds the from→to phrase from whichever pair the event actually populated. */
function transition(m: BoothMovement): string | null {
  if (m.from_location_name || m.to_location_name) {
    return `${m.from_location_name ?? '—'} → ${m.to_location_name ?? '—'}`;
  }
  if (m.from_container_name || m.to_container_name) {
    return `${m.from_container_name ?? '—'} → ${m.to_container_name ?? '—'}`;
  }
  if (m.from_status || m.to_status) {
    return `${humanise(m.from_status)} → ${humanise(m.to_status)}`;
  }
  return null;
}

export const BoothMovementsTab: React.FC<Props> = ({ boothId }) => {
  const [movements, setMovements] = useState<BoothMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await boothApi.boothMovements(boothId, { limit: 100 });
      setMovements(
        [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch {
      setError("Couldn't load movement history. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [boothId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && movements.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No movement recorded yet.
        </p>
      )}

      <ul className="divide-y rounded border">
        {movements.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                <span>{humanise(m.event_type)}</span>
                {' — '}
                {m.component_name ?? m.container_name ?? '—'}
              </p>
              {transition(m) && <p className="text-xs text-gray-500">{transition(m)}</p>}
              {m.notes && <p className="text-xs text-gray-500">{m.notes}</p>}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>{relativeTime(m.created_at)}</p>
              <p>{m.performed_by_name ?? 'Unknown'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
