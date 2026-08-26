import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { boothApi, Booth, BOOTH_STATUSES, humanise } from '../../utils/boothApi';

interface Props {
  canManage: boolean;
  onOpenBooth: (boothId: string) => void;
}

export const BoothCatalogTab: React.FC<Props> = ({ canManage, onOpenBooth }) => {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newSize, setNewSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooths(await boothApi.listBooths({ q: q || undefined, status: status || undefined }));
    } catch {
      setError("Couldn't load booths. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError('Name is required'); return; }
    setSaving(true);
    setCreateError(null);
    try {
      await boothApi.createBooth({
        name: newName.trim(),
        brand: newBrand || null,
        size: newSize || null,
      });
      setCreating(false);
      setNewName('');
      setNewBrand('');
      setNewSize('');
      void load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create this booth');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Search booths…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={status}
                onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {BOOTH_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setCreating((v) => !v)}
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white">
            <Plus size={16} /> Add booth
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submitCreate} className="mb-4 rounded border bg-gray-50 p-4">
          {createError && (
            <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{createError}</p>
          )}
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm" htmlFor="new-booth-name">
              <span className="mb-1 block font-medium">Name</span>
              <input id="new-booth-name" className="w-full rounded border px-3 py-2"
                     value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label className="block text-sm" htmlFor="new-booth-brand">
              <span className="mb-1 block font-medium">Brand</span>
              <input id="new-booth-brand" className="w-full rounded border px-3 py-2"
                     value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
            </label>
            <label className="block text-sm" htmlFor="new-booth-size">
              <span className="mb-1 block font-medium">Size</span>
              <input id="new-booth-size" className="w-full rounded border px-3 py-2"
                     placeholder="10x20" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)}
                    className="rounded border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving}
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && booths.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No booths yet. Add the first booth in your inventory.
        </p>
      )}

      <ul className="divide-y rounded border">
        {booths.map((b) => (
          <li key={b.id}>
            <button
              onClick={() => onOpenBooth(b.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-gray-500">
                  {[b.brand, b.size].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p><span>{humanise(b.current_status)}</span> · {b.location_name ?? 'No location'}</p>
                <p>{b.container_count} containers · {b.component_count} pieces</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
