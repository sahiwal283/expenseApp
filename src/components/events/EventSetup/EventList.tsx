/**
 * EventList Component
 * 
 * Displays the list of events with participant information.
 */

import React from 'react';
import { Calendar, MapPin, DollarSign, Users, Info } from 'lucide-react';
import { TradeShow, User } from '../../../App';
import { formatDateRange } from '../../../utils/dateUtils';

interface EventListProps {
  events: TradeShow[];
  user: User;
  canManageEvents: boolean;
  onViewDetails: (event: TradeShow) => void;
  onEdit: (event: TradeShow) => void;
  onDelete: (eventId: string) => void;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  user,
  canManageEvents,
  onViewDetails,
  onEdit,
  onDelete
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
        <p className="text-gray-500">Create your first trade show event to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-5 lg:gap-6">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.venue}, {event.city}, {event.state}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateRange(event.startDate, event.endDate)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {event.budget && (user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">${event.budget.toLocaleString()}</span>
                </div>
              )}
              <button
                onClick={() => onViewDetails(event)}
                className="px-3 py-1 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                Details
              </button>
              {canManageEvents && (
                <>
                  <button
                    onClick={() => onEdit(event)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Participants with hover popup */}
          <div className="relative inline-block group">
            <div className="flex items-center gap-1 text-sm text-gray-600 cursor-help">
              <Users className="w-4 h-4" />
              <span>{event.participants?.length || 0} participants</span>
            </div>
            
            {/* Popup on hover */}
            {event.participants && event.participants.length > 0 && (
              <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px]">
                <div className="text-xs font-semibold text-gray-700 mb-2">Participants:</div>
                <div className="space-y-1">
                  {event.participants.map((participant, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {participant.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

