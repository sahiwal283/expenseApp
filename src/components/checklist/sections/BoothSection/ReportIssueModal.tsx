import React, { useRef, useState } from 'react';
import { boothApi } from '../../../../utils/boothApi';
import { networkMonitor } from '../../../../utils/networkDetection';
import { offlineDb } from '../../../../utils/offlineDb';
import { syncManager } from '../../../../utils/syncManager';
import { generateUUID } from '../../../../utils/uuid';

interface Props {
  componentId: string;
  componentName: string;
  eventId: string;
  onClose: () => void;
  onReported: () => void;
}

export const ReportIssueModal: React.FC<Props> = ({
  componentId, componentName, eventId, onClose, onReported,
}) => {
  const [kind, setKind] = useState<'damage' | 'missing'>('damage');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    if (!networkMonitor.isOnline()) {
      try {
        // queueAction generates its own idempotencyKey and never returns it —
        // it returns the queue item's own id instead, which is what the photo
        // placeholder below correlates against (see syncManager's
        // resolvePendingPhotoTarget).
        const movementQueueId = await syncManager.queueAction('CREATE', 'booth_movement', {
          op: 'report', componentId, kind, notes: notes || undefined, eventId,
        });

        if (file) {
          const photoId = generateUUID();
          await offlineDb.putPendingBoothPhoto({
            id: photoId,
            entityType: 'movement',
            entityId: `pending_movement:${movementQueueId}`,
            blob: file,
            createdAt: Date.now(),
          });
          await syncManager.queueAction('CREATE', 'booth_photo', { photoId });
        }

        setNotice("Issue queued and will sync when you're back online.");
        onReported();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not queue this report');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      const movement = await boothApi.reportComponent(componentId, {
        kind, notes: notes || undefined, event_id: eventId, idempotency_key: crypto.randomUUID(),
      });

      if (file) {
        try {
          await boothApi.uploadAttachment('movement', movement.id, file);
        } catch {
          // The report already succeeded — never lose it because the photo
          // failed. But don't just SAY the photo will upload later — actually
          // queue it via the same path the offline branch above uses. The
          // movement already has a real id (the report succeeded), so the
          // photo can reference it directly with no placeholder to resolve.
          try {
            const photoId = generateUUID();
            await offlineDb.putPendingBoothPhoto({
              id: photoId,
              entityType: 'movement',
              entityId: movement.id,
              blob: file,
              createdAt: Date.now(),
            });
            await syncManager.queueAction('CREATE', 'booth_photo', { photoId });
            setNotice("Issue recorded. The photo will upload when you're back online.");
          } catch {
            setError('Issue recorded, but the photo could not be saved. Please add it again later.');
          }
          onReported();
          return;
        }
      }

      onReported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Report issue — {componentName}</h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p role="status" className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{notice}</p>
        )}

        <form onSubmit={submit}>
          <fieldset className="mb-3">
            <legend className="mb-1 block text-sm font-medium">What's wrong?</legend>
            <label className="mr-4 inline-flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="issue-kind"
                value="damage"
                checked={kind === 'damage'}
                onChange={() => setKind('damage')}
              />
              Damaged
            </label>
            <label className="inline-flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="issue-kind"
                value="missing"
                checked={kind === 'missing'}
                onChange={() => setKind('missing')}
              />
              Missing
            </label>
          </fieldset>

          <label className="mb-3 block text-sm" htmlFor="issue-notes">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              id="issue-notes"
              className="w-full rounded border px-3 py-2"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="mb-4 block text-sm" htmlFor="issue-photo">
            <span className="mb-1 block font-medium">Photo (optional)</span>
            <input
              id="issue-photo"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block text-sm"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-amber-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Reporting…' : 'Report issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
