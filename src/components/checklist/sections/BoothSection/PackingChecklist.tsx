import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { boothApi, PackingChecklist as Checklist } from '../../../../utils/boothApi';
import { networkMonitor } from '../../../../utils/networkDetection';
import { syncManager } from '../../../../utils/syncManager';
import { ReportIssueModal } from './ReportIssueModal';

interface Props {
  containerId: string;
  containerName: string;
  eventId: string;
  onClose: () => void;
}

export const PackingChecklist: React.FC<Props> = ({
  containerId, containerName, eventId, onClose,
}) => {
  const [data, setData] = useState<Checklist | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; name: string } | null>(null);
  const [online, setOnline] = useState(networkMonitor.isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refreshPending = async () => {
      const status = await syncManager.getStatus();
      setPendingCount(status.pendingCount);
    };
    void refreshPending();

    const unsubscribeNetwork = networkMonitor.addListener((state) => {
      setOnline(state.isOnline);
    });
    const unsubscribeSync = syncManager.addEventListener(() => {
      void refreshPending();
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await boothApi.getPacking(containerId));
    } catch {
      setError("Couldn't load the packing list. Your changes will still sync when you're back online.");
    }
  }, [containerId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (componentId: string, currentlyPacked: boolean) => {
    setBusy(componentId);
    setError(null);

    if (!networkMonitor.isOnline()) {
      // queueAction(action, entity, data, localId?) — it generates and stores
      // its OWN idempotencyKey on the queue item, which is what syncBoothMovement
      // replays with. Do NOT try to pass one in; there is no options parameter.
      await syncManager.queueAction(
        'CREATE', 'booth_movement',
        { op: currentlyPacked ? 'unpack' : 'pack',
          containerId, componentIds: [componentId], eventId }
      );
      setData((prev) => prev && {
        ...prev,
        items: prev.items.map((i) =>
          i.component_id === componentId ? { ...i, packed: !currentlyPacked } : i),
        packed_count: prev.packed_count + (currentlyPacked ? -1 : 1),
      });
      setBusy(null);
      return;
    }

    // A fresh key per action: the server dedupes replays of THIS action, and a
    // later toggle of the same component is a genuinely new event.
    const idempotency_key = crypto.randomUUID();
    try {
      const payload = { component_ids: [componentId], event_id: eventId, idempotency_key };
      if (currentlyPacked) await boothApi.unpack(containerId, payload);
      else await boothApi.pack(containerId, payload);
      await load();
    } catch {
      setError('That change is queued and will sync when you reconnect.');
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return <p className="p-4 text-sm text-gray-500">Loading packing list…</p>;
  }

  return (
    <div className="rounded border">
      <header className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
        <div>
          <h4 className="font-medium">{containerName}</h4>
          <p className="text-xs text-gray-500">
            {data.packed_count}/{data.expected_count} packed
            {data.stray_count > 0 && <span> · {data.stray_count} stray</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              Offline · {pendingCount} queued
            </span>
          )}
          <button onClick={onClose} aria-label="Close packing list"><X size={18} /></button>
        </div>
      </header>

      {error && <p role="alert" className="bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</p>}

      {data.complete && (
        <p className="flex items-center gap-2 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} /> This crate is fully packed.
        </p>
      )}

      <ul className="divide-y">
        {data.items.map((item) => (
          <li key={item.component_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <label className="flex flex-1 items-center gap-3">
              <input
                type="checkbox"
                aria-label={item.name}
                checked={item.packed}
                disabled={item.stray || busy === item.component_id}
                onChange={() => toggle(item.component_id, item.packed)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={item.packed ? 'text-gray-500 line-through' : ''}>{item.name}</span>
                  {item.asset_tag
                    ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{item.asset_tag}</span>
                    : item.quantity > 1 && <span className="text-xs text-gray-500">×{item.quantity}</span>}
                </span>
                {item.stray && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    In this crate, but belongs in {item.expected_container_name}
                  </span>
                )}
              </span>
            </label>
            <button
              onClick={() => setReporting({ id: item.component_id, name: item.name })}
              className="shrink-0 text-xs text-amber-700"
            >
              Report issue
            </button>
          </li>
        ))}
      </ul>

      {reporting && (
        <ReportIssueModal
          componentId={reporting.id}
          componentName={reporting.name}
          eventId={eventId}
          onClose={() => setReporting(null)}
          onReported={() => { setReporting(null); void load(); }}
        />
      )}
    </div>
  );
};
