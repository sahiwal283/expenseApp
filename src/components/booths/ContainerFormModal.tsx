import React, { useState } from 'react';
import { boothApi, BoothContainer, CONTAINER_TYPES, humanise } from '../../utils/boothApi';

interface Props {
  boothId: string;
  container?: BoothContainer | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ContainerFormModal: React.FC<Props> = ({ boothId, container, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: container?.name ?? '',
    label: container?.label ?? '',
    type: container?.type ?? 'box',
    asset_tag: container?.asset_tag ?? '',
    dimensions: container?.dimensions ?? '',
    notes: container?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      label: form.label || null,
      type: form.type,
      asset_tag: form.asset_tag || null,
      dimensions: form.dimensions || null,
      notes: form.notes || null,
    };
    try {
      if (container) await boothApi.updateContainer(container.id, payload);
      else await boothApi.createContainer(boothId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this container');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {container ? 'Edit container' : 'Add container'}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm" htmlFor="container-name">
          <span className="mb-1 block font-medium">Name</span>
          <input id="container-name" className="w-full rounded border px-3 py-2"
                 value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>

        <label className="mb-3 block text-sm" htmlFor="container-label">
          <span className="mb-1 block font-medium">Label</span>
          <input id="container-label" className="w-full rounded border px-3 py-2"
                 value={form.label} onChange={(e) => set('label', e.target.value)} />
        </label>

        <label className="mb-3 block text-sm" htmlFor="container-type">
          <span className="mb-1 block font-medium">Type</span>
          <select id="container-type" className="w-full rounded border px-3 py-2" value={form.type}
                  onChange={(e) => set('type', e.target.value)}>
            {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{humanise(t)}</option>)}
          </select>
        </label>

        <label className="mb-1 block text-sm" htmlFor="container-asset-tag">
          <span className="mb-1 block font-medium">Asset tag</span>
          <input id="container-asset-tag" className="w-full rounded border px-3 py-2"
                 value={form.asset_tag} onChange={(e) => set('asset_tag', e.target.value)} />
        </label>
        <p className="mb-3 text-xs text-gray-500">Used for QR labels later.</p>

        <label className="mb-3 block text-sm" htmlFor="container-dimensions">
          <span className="mb-1 block font-medium">Dimensions</span>
          <input id="container-dimensions" className="w-full rounded border px-3 py-2"
                 placeholder="24in x 18in x 12in" value={form.dimensions}
                 onChange={(e) => set('dimensions', e.target.value)} />
        </label>

        <label className="mb-4 block text-sm" htmlFor="container-notes">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea id="container-notes" className="w-full rounded border px-3 py-2" rows={2}
                    value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
