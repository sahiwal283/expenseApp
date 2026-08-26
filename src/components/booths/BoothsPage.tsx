import React, { useCallback, useEffect, useState } from 'react';
import { User } from '../../App';
import { boothApi, Booth } from '../../utils/boothApi';
import { LocationsTab } from './LocationsTab';
import { BoothCatalogTab } from './BoothCatalogTab';
import { BoothDetail } from './BoothDetail';
import { BoothMovementsTab } from './BoothMovementsTab';

type Tab = 'catalog' | 'locations' | 'movements';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'catalog', label: 'Booths' },
  { id: 'locations', label: 'Locations' },
  { id: 'movements', label: 'History' },
];

interface Props { user: User; }

/** Lists all booths and shows the movement history for whichever one is
 *  selected, defaulting to the first — a booth-scoped view of the same
 *  timeline BoothDetail's History sub-tab renders for a single booth. */
const AllMovementsTab: React.FC = () => {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await boothApi.listBooths({});
      setBooths(rows);
      setSelected((current) => current || rows[0]?.id || '');
    } catch {
      setError("Couldn't load booths. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && !loading && booths.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No booths yet — add one from the Booths tab to see its history here.
        </p>
      )}
      {!error && !loading && booths.length > 0 && (
        <>
          <label className="mb-4 block max-w-sm text-sm" htmlFor="movements-booth">
            <span className="mb-1 block font-medium">Booth</span>
            <select id="movements-booth" className="w-full rounded border px-3 py-2"
                    value={selected} onChange={(e) => setSelected(e.target.value)}>
              {booths.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          {selected && <BoothMovementsTab boothId={selected} />}
        </>
      )}
    </div>
  );
};

export const BoothsPage: React.FC<Props> = ({ user }) => {
  const [tab, setTab] = useState<Tab>('catalog');
  const [openBoothId, setOpenBoothId] = useState<string | null>(null);
  const canManage = ['admin', 'coordinator', 'developer'].includes(user.role);

  const selectTab = (t: Tab) => {
    if (t !== tab) setOpenBoothId(null);
    setTab(t);
  };

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Booth Inventory</h1>
        <p className="text-sm text-gray-500">
          Every booth, crate and piece — what it is, where it is, and which show it is going to.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 border-b" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={`px-4 py-2 text-sm ${
              tab === t.id
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'catalog' && !openBoothId && (
        <BoothCatalogTab canManage={canManage} onOpenBooth={setOpenBoothId} />
      )}
      {tab === 'catalog' && openBoothId && (
        <BoothDetail
          boothId={openBoothId}
          canManage={canManage}
          onBack={() => setOpenBoothId(null)}
        />
      )}
      {tab === 'locations' && <LocationsTab canManage={canManage} />}
      {tab === 'movements' && <AllMovementsTab />}
    </div>
  );
};
