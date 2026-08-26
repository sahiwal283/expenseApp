import React, { useCallback, useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { boothApi, Booth, ManifestAssignment, humanise } from '../../../../utils/boothApi';

interface Props {
  eventId: string;
  canManage: boolean;
  onOpenPacking: (containerId: string, containerName: string) => void;
}

/**
 * Never present a partial weight total as if it were complete — freight quotes
 * get made from this number.
 */
function weightLine(a: ManifestAssignment): string {
  if (a.weight_units_mixed) {
    // Two different reasons produce a null total; say which one this is.
    return `${a.weighed_container_count} containers weighed, but in mixed units — set one unit to see a total`;
  }
  if (a.weight_total === null) {
    return `No weights recorded for ${a.included_container_count} container${
      a.included_container_count === 1 ? '' : 's'}`;
  }
  const complete = a.weighed_container_count === a.included_container_count;
  return complete
    ? `${a.weight_total} ${a.weight_unit} total`
    : `${a.weight_total} ${a.weight_unit} so far · ${a.weighed_container_count} of ${
        a.included_container_count} containers weighed`;
}

export const ManifestView: React.FC<Props> = ({ eventId, canManage, onOpenPacking }) => {
  const [assignments, setAssignments] = useState<ManifestAssignment[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await boothApi.getManifest(eventId));
    } catch {
      setError("Couldn't load the booth manifest for this show.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (canManage) boothApi.listBooths({}).then(setBooths).catch(() => setBooths([]));
  }, [canManage]);

  const toggleContainer = async (assignmentId: string, containerId: string, included: boolean) => {
    await boothApi.setContainerIncluded(assignmentId, containerId, included);
    await load();
  };

  const assign = async (boothId: string) => {
    setAdding(false);
    await boothApi.assignBooth(eventId, { booth_id: boothId });
    await load();
  };

  const resolveDrift = async (assignmentId: string) => {
    await boothApi.syncManifestDrift(assignmentId);
    await load();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading manifest…</p>;
  if (error) return <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      {assignments.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No booth assigned to this show yet.
        </p>
      )}

      {assignments.map((a) => (
        <section key={a.id} className="rounded border">
          <header className="border-b bg-gray-50 px-4 py-3">
            <h4 className="flex items-center gap-2 font-medium">
              <Package size={16} /> {a.booth_name}
            </h4>
            <p className="text-xs text-gray-500">
              <span>{humanise(a.status)}</span>
              {a.needed_by_date && ` · needed by ${a.needed_by_date}`}
              {' · '}<span>{weightLine(a)}</span>
            </p>
          </header>

          {a.drift.length > 0 && canManage && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <span>
                {a.drift.length} container{a.drift.length === 1 ? '' : 's'} on this booth{' '}
                {a.drift.length === 1 ? "isn't" : "aren't"} on this manifest
                {' '}({a.drift.map((d) => d.container_name).join(', ')}).
              </span>
              <button onClick={() => resolveDrift(a.id)} className="shrink-0 font-medium underline">
                {a.drift.length === 1 ? 'Add it' : 'Add them'}
              </button>
            </div>
          )}

          <ul className="divide-y">
            {a.containers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={c.container_name}
                    checked={c.included}
                    disabled={!canManage}
                    onChange={(e) => toggleContainer(a.id, c.container_id, e.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      {c.container_name}
                      {c.is_extra && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                          added
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500">
                      <span>{humanise(c.container_type)}</span> · {c.component_count} pieces
                      {c.packed_weight_value !== null
                        ? <> · <span>{c.packed_weight_value}</span>{' '}<span>{c.weight_unit}</span></>
                        : ' · weight not recorded'}
                    </span>
                  </span>
                </label>
                <button
                  onClick={() => onOpenPacking(c.container_id, c.container_name)}
                  className="shrink-0 text-sm text-blue-600"
                >
                  Pack
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {canManage && (
        adding ? (
          <select
            autoFocus
            className="w-full rounded border px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => e.target.value && assign(e.target.value)}
          >
            <option value="" disabled>Choose a booth…</option>
            {booths
              .filter((b) => !assignments.some((a) => a.booth_id === b.id))
              .map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded border px-3 py-2 text-sm"
          >
            <Plus size={16} /> Assign a booth
          </button>
        )
      )}
    </div>
  );
};
