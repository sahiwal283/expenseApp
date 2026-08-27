import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { boothApi, Booth, humanise } from '../../utils/boothApi';
import { MoveModal } from './MoveModal';
import { PhotoGallery } from './PhotoGallery';
import { BoothContainersTab } from './BoothContainersTab';
import { BoothComponentsTab } from './BoothComponentsTab';
import { BoothMovementsTab } from './BoothMovementsTab';

interface Props {
  boothId: string;
  canManage: boolean;
  onBack: () => void;
}

type SubTab = 'overview' | 'containers' | 'components' | 'history';

const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'containers', label: 'Containers' },
  { id: 'components', label: 'Components' },
  { id: 'history', label: 'History' },
];

export const BoothDetail: React.FC<Props> = ({ boothId, canManage, onBack }) => {
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooth(await boothApi.getBooth(boothId));
    } catch {
      setError("Couldn't load this booth. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [boothId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-gray-600">
        <ArrowLeft size={16} /> Back to booths
      </button>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!error && !loading && booth && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{booth.name}</h2>
              <p className="text-sm text-gray-500">
                <span>{humanise(booth.current_status)}</span>
                {booth.location_name ? ` · ${booth.location_name}` : ''}
              </p>
            </div>
            {canManage && (
              <button onClick={() => setMoving(true)}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
                Move booth
              </button>
            )}
          </div>

          <nav className="mb-4 flex gap-1 border-b" role="tablist">
            {SUB_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={subTab === t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-4 py-2 text-sm ${
                  subTab === t.id
                    ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {subTab === 'overview' && (
            <BoothOverview booth={booth} canManage={canManage} onSaved={load} />
          )}
          {subTab === 'containers' && (
            <BoothContainersTab boothId={boothId} canManage={canManage} />
          )}
          {subTab === 'components' && (
            <BoothComponentsTab boothId={boothId} canManage={canManage} />
          )}
          {subTab === 'history' && <BoothMovementsTab boothId={boothId} />}

          {moving && (
            <MoveModal
              target={{ kind: 'booth', id: booth.id, name: booth.name }}
              onClose={() => setMoving(false)}
              onMoved={() => { setMoving(false); void load(); }}
            />
          )}
        </>
      )}
    </div>
  );
};

interface OverviewProps {
  booth: Booth;
  canManage: boolean;
  onSaved: () => void;
}

const BoothOverview: React.FC<OverviewProps> = ({ booth, canManage, onSaved }) => {
  const [form, setForm] = useState({
    name: booth.name,
    brand: booth.brand ?? '',
    size: booth.size ?? '',
    type: booth.type ?? '',
    manufacturer: booth.manufacturer ?? '',
    year_acquired: booth.year_acquired ? String(booth.year_acquired) : '',
    notes: booth.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: booth.name,
      brand: booth.brand ?? '',
      size: booth.size ?? '',
      type: booth.type ?? '',
      manufacturer: booth.manufacturer ?? '',
      year_acquired: booth.year_acquired ? String(booth.year_acquired) : '',
      notes: booth.notes ?? '',
    });
  }, [booth]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await boothApi.updateBooth(booth.id, {
        name: form.name.trim(),
        brand: form.brand || null,
        size: form.size || null,
        type: form.type || null,
        manufacturer: form.manufacturer || null,
        year_acquired: form.year_acquired ? Number(form.year_acquired) : null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this booth');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="mb-6 max-w-2xl">
        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm" htmlFor="booth-name">
            <span className="mb-1 block font-medium">Name</span>
            <input id="booth-name" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="booth-brand">
            <span className="mb-1 block font-medium">Brand</span>
            <input id="booth-brand" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="booth-size">
            <span className="mb-1 block font-medium">Size</span>
            <input id="booth-size" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.size} onChange={(e) => set('size', e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="booth-type">
            <span className="mb-1 block font-medium">Type</span>
            <input id="booth-type" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.type} onChange={(e) => set('type', e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="booth-manufacturer">
            <span className="mb-1 block font-medium">Manufacturer</span>
            <input id="booth-manufacturer" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="booth-year">
            <span className="mb-1 block font-medium">Year acquired</span>
            <input id="booth-year" type="number" disabled={!canManage} className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                   value={form.year_acquired} onChange={(e) => set('year_acquired', e.target.value)} />
          </label>
        </div>

        <label className="mb-3 block text-sm" htmlFor="booth-notes">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea id="booth-notes" disabled={!canManage} rows={3}
                    className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
                    value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        {canManage && (
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </form>

      <PhotoGallery entityType="booth" entityId={booth.id} canEdit={canManage} />
    </div>
  );
};
