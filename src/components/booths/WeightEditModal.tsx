import React, { useState } from 'react';
import { boothApi, BoothContainer, BoothComponent, WEIGHT_SOURCES, humanise } from '../../utils/boothApi';

interface Props {
  kind: 'container' | 'component';
  entity: BoothContainer | BoothComponent;
  onClose: () => void;
  onSaved: () => void;
}

export const WeightEditModal: React.FC<Props> = ({ kind, entity, onClose, onSaved }) => {
  const isContainer = kind === 'container';
  const container = entity as BoothContainer;
  const component = entity as BoothComponent;

  const [form, setForm] = useState({
    empty_weight_value: isContainer ? String(container.empty_weight_value ?? '') : '',
    packed_weight_value: isContainer ? String(container.packed_weight_value ?? '') : '',
    weight_value: !isContainer ? String(component.weight_value ?? '') : '',
    weight_unit: entity.weight_unit ?? 'lb',
    weight_source: entity.weight_source ?? '',
    weight_notes: (isContainer ? container.weight_notes : component.weight_notes) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toNumberOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isContainer) {
        await boothApi.updateContainer(entity.id, {
          empty_weight_value: toNumberOrNull(form.empty_weight_value),
          packed_weight_value: toNumberOrNull(form.packed_weight_value),
          weight_unit: form.weight_unit,
          weight_source: form.weight_source || null,
          weight_notes: form.weight_notes || null,
        });
      } else {
        await boothApi.updateComponent(entity.id, {
          weight_value: toNumberOrNull(form.weight_value),
          weight_unit: form.weight_unit,
          weight_source: form.weight_source || null,
          weight_notes: form.weight_notes || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this weight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          Weight — {entity.name}
        </h2>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        {isContainer ? (
          <>
            <label className="mb-3 block text-sm" htmlFor="empty-weight">
              <span className="mb-1 block font-medium">Empty weight</span>
              <input id="empty-weight" type="number" step="0.01" className="w-full rounded border px-3 py-2"
                     value={form.empty_weight_value}
                     onChange={(e) => set('empty_weight_value', e.target.value)} />
            </label>

            <label className="mb-1 block text-sm" htmlFor="packed-weight">
              <span className="mb-1 block font-medium">Packed weight</span>
              <input id="packed-weight" type="number" step="0.01" className="w-full rounded border px-3 py-2"
                     value={form.packed_weight_value}
                     onChange={(e) => set('packed_weight_value', e.target.value)} />
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Enter the measured packed weight — it is never calculated from component weights,
              because packing material and arrangement change it.
            </p>
          </>
        ) : (
          <label className="mb-3 block text-sm" htmlFor="weight-value">
            <span className="mb-1 block font-medium">Weight</span>
            <input id="weight-value" type="number" step="0.01" className="w-full rounded border px-3 py-2"
                   value={form.weight_value}
                   onChange={(e) => set('weight_value', e.target.value)} />
          </label>
        )}

        <label className="mb-3 block text-sm" htmlFor="weight-unit">
          <span className="mb-1 block font-medium">Unit</span>
          <select id="weight-unit" className="w-full rounded border px-3 py-2" value={form.weight_unit}
                  onChange={(e) => set('weight_unit', e.target.value)}>
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </label>

        <label className="mb-3 block text-sm" htmlFor="weight-source">
          <span className="mb-1 block font-medium">Source</span>
          <select id="weight-source" className="w-full rounded border px-3 py-2" value={form.weight_source}
                  onChange={(e) => set('weight_source', e.target.value)}>
            <option value="">— not set —</option>
            {WEIGHT_SOURCES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
          </select>
        </label>

        <label className="mb-4 block text-sm" htmlFor="weight-notes">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea id="weight-notes" className="w-full rounded border px-3 py-2" rows={2}
                    value={form.weight_notes} onChange={(e) => set('weight_notes', e.target.value)} />
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
