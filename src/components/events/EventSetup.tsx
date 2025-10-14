import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Users, DollarSign, Trash2, X } from 'lucide-react';
import { User, TradeShow } from '../../App';
import { api } from '../../utils/api';
import { parseLocalDate, formatForDateInput, formatDateRange } from '../../utils/dateUtils';

interface EventSetupProps {
  user: User;
}

export const EventSetup: React.FC<EventSetupProps> = ({ user }) => {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TradeShow | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'past'>('active');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    city: '',
    state: '',
    startDate: '',
    endDate: '',
    budget: '',
    participants: [] as User[]
  });

  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');


  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          console.log('[EventSetup] Fetching events from API...');
          const ev = await api.getEvents();
          console.log('[EventSetup] Received events:', ev?.length || 0, 'events');
          console.log('[EventSetup] First event:', ev?.[0]);
          setEvents(ev || []);
          setLoadError(null);
          const users = await api.getUsers();
          console.log('[EventSetup] Received users:', users?.length || 0, 'users');
          setAllUsers(users || []);
        } catch (error: any) {
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          console.error('[EventSetup] Error fetching data:', error);
          setLoadError(`Failed to load events: ${errorMsg}`);
          setEvents([]);
          setAllUsers([]);
        }
      } else {
        const storedEvents = localStorage.getItem('tradeshow_events');
        const storedUsers = localStorage.getItem('tradeshow_users');
        if (storedEvents) setEvents(JSON.parse(storedEvents));
        if (storedUsers) setAllUsers(JSON.parse(storedUsers));
      }
    })();
  }, []);
  const resetForm = () => {
    setFormData({
      name: '',
      venue: '',
      city: '',
      state: '',
      startDate: '',
      endDate: '',
      budget: '',
      participants: []
    });
    setNewParticipantName('');
    setNewParticipantEmail('');
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData: Omit<TradeShow, 'id'> = {
      name: formData.name,
      venue: formData.venue,
      city: formData.city,
      state: formData.state,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      participants: formData.participants,
      status: 'upcoming',
      coordinatorId: user.id
    };

    if (api.USE_SERVER) {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, {
          name: eventData.name,
          venue: eventData.venue,
          city: eventData.city,
          state: eventData.state,
          start_date: eventData.startDate,
          end_date: eventData.endDate,
          budget: eventData.budget,
          participant_ids: eventData.participants.map((p: any) => p.id),
          status: eventData.status || 'upcoming',
        });
      } else {
        await api.createEvent({
          name: eventData.name,
          venue: eventData.venue,
          city: eventData.city,
          state: eventData.state,
          start_date: eventData.startDate,
          end_date: eventData.endDate,
          budget: eventData.budget,
          participant_ids: eventData.participants.map((p: any) => p.id),
        });
      }
      const refreshed = await api.getEvents();
      setEvents(refreshed || []);
    } else {
      let updatedEvents: TradeShow[];
      if (editingEvent) {
        const updatedEvent: TradeShow = { ...eventData, id: editingEvent.id } as TradeShow;
        updatedEvents = events.map(event => event.id === editingEvent.id ? updatedEvent : event);
      } else {
        const newEvent: TradeShow = { ...eventData, id: Date.now().toString() } as TradeShow;
        updatedEvents = [...events, newEvent];
      }
      setEvents(updatedEvents);
      localStorage.setItem('tradeshow_events', JSON.stringify(updatedEvents));
    }
    setShowForm(false);
    resetForm();
  };

  const handleEdit = (event: TradeShow) => {
    setEditingEvent(event);
    
    setFormData({
      name: event.name,
      venue: event.venue,
      city: event.city,
      state: event.state,
      startDate: formatForDateInput(event.startDate),
      endDate: formatForDateInput(event.endDate),
      budget: event.budget?.toString() || '',
      participants: event.participants
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (api.USE_SERVER) {
      await api.deleteEvent(eventId);
      const refreshed = await api.getEvents();
      setEvents(refreshed || []);
    } else {
      const updatedEvents = events.filter(event => event.id !== eventId);
      setEvents(updatedEvents);
      localStorage.setItem('tradeshow_events', JSON.stringify(updatedEvents));
    }
  };

  const addParticipant = () => {
    if (selectedUserId && !formData.participants.find(p => p.id === selectedUserId)) {
      const selectedUser = allUsers.find(u => u.id === selectedUserId);
      if (selectedUser) {
        setFormData({
          ...formData,
          participants: [...formData.participants, selectedUser]
        });
        setSelectedUserId('');
      }
    }
  };

  const addCustomParticipant = () => {
    if (newParticipantName && newParticipantEmail && !formData.participants.find(p => p.email === newParticipantEmail)) {
      const newParticipant: User = {
        id: Date.now().toString(),
        name: newParticipantName,
        username: newParticipantEmail.split('@')[0].toLowerCase(),
        email: newParticipantEmail,
        role: 'salesperson'
      };
      
      setFormData({
        ...formData,
        participants: [...formData.participants, newParticipant]
      });
      setNewParticipantName('');
      setNewParticipantEmail('');
    }
  };

  const removeParticipant = (participantId: string) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter(p => p.id !== participantId)
    });
  };

  // Filter events based on end date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter events based on user role and permissions
  const filteredEvents = events.filter(event => {
    // Admin and coordinator can see all events
    if (user.role === 'admin' || user.role === 'coordinator') {
      return true;
    }
    // Other users can only see events they're assigned to as participants
    return event.participants.some(p => p.id === user.id);
  });

  console.log('[EventSetup] Total events:', events.length);
  console.log('[EventSetup] After role filter:', filteredEvents.length);
  console.log('[EventSetup] Today:', today.toISOString());

  const activeEvents = filteredEvents.filter(event => {
    try {
      const endDate = parseLocalDate(event.endDate);
      console.log(`[EventSetup] Event "${event.name}": endDate=${event.endDate}, parsed=${endDate.toISOString()}, isActive=${endDate >= today}`);
      return endDate >= today;
    } catch (error) {
      console.error(`[EventSetup] Error parsing date for event "${event.name}":`, error);
      return false;
    }
  });

  const pastEvents = filteredEvents.filter(event => {
    try {
      const endDate = parseLocalDate(event.endDate);
      return endDate < today;
    } catch (error) {
      console.error(`[EventSetup] Error parsing date for event "${event.name}":`, error);
      return false;
    }
  });

  console.log('[EventSetup] Active events:', activeEvents.length);
  console.log('[EventSetup] Past events:', pastEvents.length);

  const displayedEvents = viewMode === 'active' ? activeEvents : pastEvents;

  // Only admins and coordinators can create/edit events
  const canManageEvents = user.role === 'admin' || user.role === 'coordinator';

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error Loading Events</p>
          <p className="text-sm mt-1">{loadError}</p>
          <p className="text-xs mt-2 text-red-600">Check browser console (F12) for more details</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {canManageEvents ? 'Event Management' : 'My Events'}
          </h1>
          <p className="text-gray-600 mt-1">
            {canManageEvents 
              ? 'Create and manage trade show events' 
              : 'View events you are assigned to'}
          </p>
        </div>
        {canManageEvents && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setViewMode('active')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
            viewMode === 'active'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Events ({activeEvents.length})
        </button>
        <button
          onClick={() => setViewMode('past')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
            viewMode === 'past'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past Events ({pastEvents.length})
        </button>
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <p className="text-gray-600">Set up your trade show details and invite participants</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., CES 2025"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Las Vegas Convention Center"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Las Vegas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Nevada"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Budget field - Admin and Accountant only */}
              {(user.role === 'admin' || user.role === 'accountant') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter budget amount"
                  />
                </div>
              )}
              
              {/* Participants Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select from existing users
                    </label>
                    <div className="flex gap-3">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a user...</option>
                        {allUsers
                          .filter(u => !formData.participants.find(p => p.id === u.id))
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={addParticipant}
                        disabled={!selectedUserId}
                        className="bg-blue-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or add new participant</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full name"
                    />
                    <input
                      type="email"
                      value={newParticipantEmail}
                      onChange={(e) => setNewParticipantEmail(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addCustomParticipant}
                      disabled={!newParticipantName || !newParticipantEmail}
                      className="bg-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add New</span>
                    </button>
                  </div>
                </div>

                {(formData.participants?.length || 0) > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {formData.participants.map((participant) => (
                        <div key={participant.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-white p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{participant.name}</p>
                              <p className="text-sm text-gray-600">{participant.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeParticipant(participant.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="grid gap-4 md:gap-5 lg:gap-6">
        {displayedEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {viewMode === 'active' ? 'No active events' : 'No past events'}
            </h3>
            <p className="text-gray-500">
              {viewMode === 'active' 
                ? 'Create your first trade show event to get started.' 
                : 'Past events will appear here once their end date has passed.'}
            </p>
          </div>
        ) : (
          displayedEvents.map((event) => (
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
                  {event.budget && (user.role === 'admin' || user.role === 'accountant') && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">${event.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {canManageEvents && (
                    <>
                      <button
                        onClick={() => handleEdit(event)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{event.participants?.length || 0} participants</span>
              </div>
              
              {event.participants?.length || 0 > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {event.participants.map((participant, index) => (
                      <span
                        key={index}
                        className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm"
                      >
                        {participant.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};