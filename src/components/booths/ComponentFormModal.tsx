import React, { useEffect, useState } from 'react';
import {
  boothApi, BoothComponent, BoothContainer,
  COMPONENT_CATEGORIES, COMPONENT_CONDITIONS, humanise,
} from '../../utils/boothApi';

interface Props {
  boothId: string;
  component?: BoothComponent | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ComponentFormModal: React.FC<Props> = ({ boothId, component, onClose, onSaved }) => {
  // Granularity is an explicit user choice, not a hidden schema detail:
  // a tagged piece is ONE object; an untagged one is a counted pool.
  const [individual, setIndividual] = useState(Boolean(component?.asset_tag));
  const [containers, setContainers] = useState<BoothContainer[]>([]);
  const [form, setForm] = useState({
    name: component?.name ?? '',
    category: component?.category ?? 'other',
    quantity: String(component?.quantity ?? 1),
    asset_tag: component?.asset_tag ?? '',
    condition: component?.condition ?? 'good',
    default_container_id: component?.default_container_id ?? '',
    notes: component?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boothApi.listContainers(boothId).then(setContainers).catch(() => setContainers([]));
  }, [boothId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (individual && !form.asset_tag.trim()) {
      setError('Asset tag is required when tracking a piece individually');
      return;
    }
    const quantity = individual ? 1 : Number(form.quantity);
    if (!individual && (!Number.isInteger(quantity) || quantity < 1)) {
      setError('Quantity must be a whole number of 1 or more');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      condition: form.condition,
      quantity,
      asset_tag: individual ? form.asset_tag.trim() : null,
      default_container_id: form.default_container_id || null,
      notes: form.notes || null,
    };
    try {
      if (component) await boothApi.updateComponent(component.id, payload);
      else await boothApi.createComponent(boothId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this component');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {component ? 'Edit component' : 'Add component'}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm" htmlFor="component-name">
          <span className="mb-1 block font-medium">Name</span>
          <input id="component-name" className="w-full rounded border px-3 py-2"
                 value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Category</span>
          <select className="w-full rounded border px-3 py-2" value={form.category}
                  onChange={(e) => set('category', e.target.value)}>
            {COMPONENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanise(c)}</option>
            ))}
          </select>
        </label>

        <label className="mb-3 flex items-start gap-2 rounded bg-gray-50 p-3 text-sm">
          <input
            id="individual-toggle"
            type="checkbox"
            className="mt-1"
            checked={individual}
            onChange={(e) => setIndividual(e.target.checked)}
          />
          <span>
            <span className="block font-medium">Track this piece individually</span>
            <span className="block text-xs text-gray-500">
              Give it its own tag so you can say exactly which one is damaged or missing.
              Leave off for interchangeable parts you only need a count of.
            </span>
          </span>
        </label>

        {individual ? (
          <label className="mb-3 block text-sm" htmlFor="asset-tag">
            <span className="mb-1 block font-medium">Asset tag</span>
            <input id="asset-tag" className="w-full rounded border px-3 py-2"
                   placeholder="FAB-01" value={form.asset_tag}
                   onChange={(e) => set('asset_tag', e.target.value)} />
          </label>
        ) : (
          <label className="mb-3 block text-sm" htmlFor="quantity">
            <span className="mb-1 block font-medium">Quantity</span>
            <input id="quantity" type="number" min={1} className="w-full rounded border px-3 py-2"
                   value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </label>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Packs into</span>
          <select className="w-full rounded border px-3 py-2" value={form.default_container_id}
                  onChange={(e) => set('default_container_id', e.target.value)}>
            <option value="">— not assigned —</option>
            {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Condition</span>
          <select className="w-full rounded border px-3 py-2" value={form.condition}
                  onChange={(e) => set('condition', e.target.value)}>
            {COMPONENT_CONDITIONS.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
          </select>
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
