import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { boothApi, ExceptionRow, humanise } from '../../../../utils/boothApi';

interface Props {
  eventId: string;
}

function reportedLine(row: ExceptionRow): string {
  if (!row.reported_by_name && !row.reported_at) return 'Reported anonymously';
  const who = row.reported_by_name ?? 'Someone';
  const when = row.reported_at ? new Date(row.reported_at).toLocaleString() : 'an unknown time';
  return `Reported by ${who} · ${when}`;
}

export const ExceptionsList: React.FC<Props> = ({ eventId }) => {
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await boothApi.getExceptions(eventId));
    } catch {
      setError("Couldn't load reported issues for this show.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 font-medium">
        <AlertTriangle size={16} />
        Exceptions ({rows.length})
      </h4>

      {loading && <p className="text-sm text-gray-500">Loading exceptions…</p>}
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No damaged or missing pieces reported.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="divide-y rounded border">
          {rows.map((row) => (
            <li key={row.component_id} className="px-4 py-3">
              <p className="flex items-center gap-2 font-medium">
                {row.component_name}
                {row.asset_tag && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{row.asset_tag}</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {row.booth_name} · <span>{humanise(row.current_status)}</span>
                {' / '}<span>{humanise(row.condition)}</span>
              </p>
              {row.notes && <p className="mt-1 text-sm">{row.notes}</p>}
              <p className="mt-1 text-xs text-gray-500">{reportedLine(row)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
