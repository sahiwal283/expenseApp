import React, { useCallback, useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  boothApi, BoothComponent, BoothContainer,
  COMPONENT_CATEGORIES, humanise,
} from '../../utils/boothApi';
import { ComponentFormModal } from './ComponentFormModal';
import { WeightEditModal } from './WeightEditModal';

interface Props { boothId: string; canManage: boolean; }

/** Pooled parts show a per-unit weight times their count; instances show their own. */
function weightLabel(c: BoothComponent): string {
  if (c.weight_value === null) return 'Not recorded';
  const total = c.weight_value * (c.quantity || 1);
  const each = c.quantity > 1 ? ` (${c.weight_value} ${c.weight_unit} each)` : '';
  return `${total} ${c.weight_unit}${each}`;
}

export const BoothComponentsTab: React.FC<Props> = ({ boothId, canManage }) => {
  const [components, setComponents] = useState<BoothComponent[]>([]);
  const [containers, setContainers] = useState<BoothContainer[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BoothComponent | null | undefined>(undefined);
  const [weighing, setWeighing] = useState<BoothComponent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComponents(await boothApi.listComponents(boothId, {
        q: q || undefined, category: category || undefined,
      }));
    } catch {
      setError("Couldn't load components. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [boothId, q, category]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  useEffect(() => {
    boothApi.listContainers(boothId).then(setContainers).catch(() => setContainers([]));
  }, [boothId]);

  const containerName = (id: string | null) =>
    containers.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Search components…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={category}
                onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {COMPONENT_CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setEditing(null)}
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white">
            <Plus size={16} /> Add component
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && components.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No components yet. Add the frame, fabric and hardware that make up this booth.
        </p>
      )}

      <ul className="divide-y rounded border">
        {components.map((c) => (
          <li
            key={c.id}
            data-testid={`component-row-${c.id}`}
            className={`flex flex-wrap items-center justify-between gap-2 py-3 pr-4 ${
              c.parent_component_id ? 'pl-8' : 'pl-4'
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {c.name}
                {c.asset_tag
                  ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{c.asset_tag}</span>
                  : c.quantity > 1 && <span className="text-sm text-gray-500">×{c.quantity}</span>}
                {(c.condition === 'damaged' || c.current_status === 'missing') && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    {humanise(c.current_status === 'missing' ? 'missing' : c.condition)}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {humanise(c.category)} · Packs into {containerName(c.default_container_id)}
                {' · '}{weightLabel(c)}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-3 text-sm">
                <button onClick={() => setWeighing(c)} className="text-gray-600">Weight</button>
                <button onClick={() => setEditing(c)} className="text-blue-600">Edit</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <ComponentFormModal
          boothId={boothId}
          component={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); void load(); }}
        />
      )}
      {weighing && (
        <WeightEditModal
          kind="component"
          entity={weighing}
          onClose={() => setWeighing(null)}
          onSaved={() => { setWeighing(null); void load(); }}
        />
      )}
    </div>
  );
};
