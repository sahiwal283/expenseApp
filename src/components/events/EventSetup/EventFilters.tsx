/**
 * EventFilters Component
 * 
 * Filter toggles for viewing active/past events and all/my events.
 */

import React from 'react';
import { User } from '../../../App';

interface EventFiltersProps {
  user: User;
  viewMode: 'active' | 'past';
  setViewMode: (mode: 'active' | 'past') => void;
  filterMode: 'all' | 'my';
  setFilterMode: (mode: 'all' | 'my') => void;
  activeEventsCount: number;
  pastEventsCount: number;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  user,
  viewMode,
  setViewMode,
  filterMode,
  setFilterMode,
  activeEventsCount,
  pastEventsCount
}) => {
  const showFilterToggle = user.role === 'admin' || user.role === 'developer' || user.role === 'accountant' || user.role === 'coordinator';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setViewMode('active')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
            viewMode === 'active'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Events ({activeEventsCount})
        </button>
        <button
          onClick={() => setViewMode('past')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
            viewMode === 'past'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past Events ({pastEventsCount})
        </button>
      </div>

      {showFilterToggle && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              filterMode === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterMode('my')}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              filterMode === 'my'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Events
          </button>
        </div>
      )}
    </div>
  );
};

