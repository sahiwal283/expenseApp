import React, { useState } from 'react';
import { User } from '../../App';
import { LocationsTab } from './LocationsTab';

type Tab = 'catalog' | 'locations' | 'movements';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'catalog', label: 'Booths' },
  { id: 'locations', label: 'Locations' },
  { id: 'movements', label: 'History' },
];

interface Props { user: User; }

export const BoothsPage: React.FC<Props> = ({ user }) => {
  const [tab, setTab] = useState<Tab>('catalog');
  const canManage = ['admin', 'coordinator', 'developer'].includes(user.role);

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
            onClick={() => setTab(t.id)}
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

      {tab === 'locations' && <LocationsTab canManage={canManage} />}
      {tab !== 'locations' && (
        <p className="text-sm text-gray-500">Coming in the next step.</p>
      )}
    </div>
  );
};
