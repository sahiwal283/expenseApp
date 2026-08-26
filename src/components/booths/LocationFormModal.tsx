import React, { useState } from 'react';
import { boothApi, InventoryLocation, LOCATION_TYPES, humanise } from '../../utils/boothApi';

interface Props {
  location?: InventoryLocation | null;
  onClose: () => void;
  onSaved: () => void;
}

export const LocationFormModal: React.FC<Props> = ({ location, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: location?.name ?? '',
    type: location?.type ?? 'company_warehouse',
    city: location?.city ?? '',
    state: location?.state ?? '',
    address: location?.address ?? '',
    contact_name: location?.contact_name ?? '',
    contact_phone: location?.contact_phone ?? '',
    notes: location?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (location) await boothApi.updateLocation(location.id, form);
      else await boothApi.createLocation(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {location ? 'Edit location' : 'Add location'}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            className="w-full rounded border px-3 py-2"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Type</span>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>{humanise(t)}</option>
            ))}
          </select>
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">City</span>
            <input className="w-full rounded border px-3 py-2" value={form.city}
                   onChange={(e) => set('city', e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">State</span>
            <input className="w-full rounded border px-3 py-2" value={form.state}
                   onChange={(e) => set('state', e.target.value)} />
          </label>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea className="w-full rounded border px-3 py-2" rows={2} value={form.notes}
                    onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
                  className="rounded border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
