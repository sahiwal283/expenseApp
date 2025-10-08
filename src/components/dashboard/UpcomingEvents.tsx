import React from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { TradeShow } from '../../App';

interface UpcomingEventsProps {
  onPageChange: (page: string) => void;
  events: TradeShow[];
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onPageChange }) => {
  // Filter events: only show if end date hasn't passed yet
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight
  
  const upcomingEvents = events
    .filter(event => {
      const endDate = new Date(event.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today; // Include events that end today or later
    })
    .slice(0, 3);

  const getDaysUntil = (dateString: string) => {
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0); // Normalize to midnight
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - todayMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const getDaysUntilLabel = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
        <button onClick={() => onPageChange('events')} className="text-blue-600 hover:text-blue-700 font-medium">View All</button>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No upcoming events</p>
          <p className="text-sm text-gray-400 mt-1">Create your first trade show event</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.map((event) => {
            const daysUntil = getDaysUntil(event.startDate);
            
            return (
              <div key={event.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{event.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    daysUntil === 0 ? 'bg-orange-100 text-orange-800' : 
                    daysUntil <= 7 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {getDaysUntilLabel(daysUntil)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.venue}, {event.city}, {event.state}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.participants?.length || 0} participants</span>
                  </div>
                </div>

                {event.budget && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-medium text-gray-900">${event.budget.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};