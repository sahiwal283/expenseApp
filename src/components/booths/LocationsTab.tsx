import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { boothApi, InventoryLocation, humanise } from '../../utils/boothApi';
import { LocationFormModal } from './LocationFormModal';

interface Props { canManage: boolean; }

export const LocationsTab: React.FC<Props> = ({ canManage }) => {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryLocation | null | undefined>(undefined);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await boothApi.listLocations({ q: search || undefined, is_active: true }));
    } catch {
      setError("Couldn't load locations. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(q); }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [q, load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Search locations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canManage && (
          <button
            onClick={() => setEditing(null)}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white"
          >
            <Plus size={16} /> Add location
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!error && !loading && locations.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No locations yet. Add the warehouse or storage unit your booths live in.
        </p>
      )}

      <ul className="divide-y rounded border">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-gray-400" />
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-gray-500">
                  <span>{humanise(l.type)}</span>
                  {l.city ? ` · ${l.city}${l.state ? `, ${l.state}` : ''}` : ''}
                </p>
              </div>
            </div>
            {canManage && (
              <button onClick={() => setEditing(l)} className="text-sm text-blue-600">Edit</button>
            )}
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <LocationFormModal
          location={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); void load(q); }}
        />
      )}
    </div>
  );
};
