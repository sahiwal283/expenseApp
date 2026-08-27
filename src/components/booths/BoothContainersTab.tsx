import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { boothApi, BoothContainer, humanise } from '../../utils/boothApi';
import { ContainerFormModal } from './ContainerFormModal';
import { WeightEditModal } from './WeightEditModal';
import { MoveModal } from './MoveModal';

interface Props { boothId: string; canManage: boolean; }

/** Packed weight is measured, never derived — the summary shows both figures
 *  plus their source rather than pretending one number tells the whole story. */
function weightSummary(c: BoothContainer): string {
  if (c.empty_weight_value === null && c.packed_weight_value === null) return 'Weight not recorded';
  const empty = c.empty_weight_value !== null ? `${c.empty_weight_value} ${c.weight_unit}` : 'not recorded';
  const packed = c.packed_weight_value !== null ? `${c.packed_weight_value} ${c.weight_unit}` : 'not recorded';
  const source = c.weight_source ? ` · ${humanise(c.weight_source)}` : '';
  return `Empty: ${empty} / Packed: ${packed}${source}`;
}

export const BoothContainersTab: React.FC<Props> = ({ boothId, canManage }) => {
  const [containers, setContainers] = useState<BoothContainer[]>([]);
  const [componentCounts, setComponentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BoothContainer | null | undefined>(undefined);
  const [weighing, setWeighing] = useState<BoothContainer | null>(null);
  const [moving, setMoving] = useState<BoothContainer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [containerList, componentList] = await Promise.all([
        boothApi.listContainers(boothId),
        boothApi.listComponents(boothId),
      ]);
      setContainers(containerList);
      const counts: Record<string, number> = {};
      componentList.forEach((comp) => {
        if (comp.current_container_id) {
          counts[comp.current_container_id] = (counts[comp.current_container_id] ?? 0) + 1;
        }
      });
      setComponentCounts(counts);
    } catch {
      setError("Couldn't load containers. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [boothId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Containers</h3>
        {canManage && (
          <button onClick={() => setEditing(null)}
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white">
            <Plus size={16} /> Add container
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && containers.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No containers yet. Add the crates, cases and boxes this booth packs into.
        </p>
      )}

      <ul className="divide-y rounded border">
        {containers.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {c.name}
                {c.asset_tag && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{c.asset_tag}</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                <span>{humanise(c.type)}</span>
                {' · '}{componentCounts[c.id] ?? 0} components
                {' · '}{weightSummary(c)}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-3 text-sm">
                <button onClick={() => setWeighing(c)} className="text-gray-600">Weight</button>
                <button onClick={() => setMoving(c)} className="text-gray-600">Move</button>
                <button onClick={() => setEditing(c)} className="text-blue-600">Edit</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <ContainerFormModal
          boothId={boothId}
          container={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); void load(); }}
        />
      )}
      {weighing && (
        <WeightEditModal
          kind="container"
          entity={weighing}
          onClose={() => setWeighing(null)}
          onSaved={() => { setWeighing(null); void load(); }}
        />
      )}
      {moving && (
        <MoveModal
          target={{ kind: 'container', id: moving.id, name: moving.name }}
          onClose={() => setMoving(null)}
          onMoved={() => { setMoving(null); void load(); }}
        />
      )}
    </div>
  );
};
