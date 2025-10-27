import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Users, DollarSign, Trash2, X, Loader2, Info, Users2, CheckCircle2, Circle, Plane, Hotel, Car, Package } from 'lucide-react';
import { User, TradeShow } from '../../App';
import { api } from '../../utils/api';
import { parseLocalDate, formatDateRange, formatLocalDate } from '../../utils/dateUtils';
import { useEventData, useEventForm } from './EventSetup/hooks';

interface ChecklistSummary {
  booth_ordered: boolean;
  electricity_ordered: boolean;
  flights_booked: number;
  flights_total: number;
  hotels_booked: number;
  hotels_total: number;
  car_rentals_booked: number;
  car_rentals_total: number;
  booth_shipped: boolean;
}

interface EventSetupProps {
  user: User;
}

export const EventSetup: React.FC<EventSetupProps> = ({ user }) => {
  // Custom hooks for data fetching and form management
  const { events, allUsers, loading, loadError, reload } = useEventData();
  const {
    formData,
    setFormData,
    editingEvent,
    selectedUserId,
    setSelectedUserId,
    newParticipantName,
    setNewParticipantName,
    newParticipantEmail,
    setNewParticipantEmail,
    handleSubmit: submitForm,
    handleEdit,
    resetForm,
    addParticipant: addParticipantHook,
    addCustomParticipant,
    removeParticipant
  } = useEventForm();

  // UI state (keep these in component)
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'past'>('active');
  const [filterMode, setFilterMode] = useState<'all' | 'my'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<TradeShow | null>(null);
  const [checklistData, setChecklistData] = useState<ChecklistSummary | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  // Load checklist when viewing event details
  useEffect(() => {
    if (viewingEvent) {
      loadChecklistSummary(viewingEvent.id);
    } else {
      setChecklistData(null);
    }
  }, [viewingEvent]);

  const loadChecklistSummary = async (eventId: string) => {
    setLoadingChecklist(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      const data = await response.json();
      
      setChecklistData({
        booth_ordered: data.booth_ordered || false,
        electricity_ordered: data.electricity_ordered || false,
        flights_booked: data.flights?.filter((f: any) => f.booked).length || 0,
        flights_total: data.flights?.length || 0,
        hotels_booked: data.hotels?.filter((h: any) => h.booked).length || 0,
        hotels_total: data.hotels?.length || 0,
        car_rentals_booked: data.carRentals?.filter((c: any) => c.booked).length || 0,
        car_rentals_total: data.carRentals?.length || 0,
        booth_shipped: data.boothShipping?.[0]?.shipped || false
      });
    } catch (error) {
      console.error('[EventSetup] Error loading checklist:', error);
      setChecklistData(null);
    } finally {
      setLoadingChecklist(false);
    }
  };


  // Wrapper functions to handle hook integration
  const handleSubmit = async (e: React.FormEvent) => {
    if (isSaving) return; // Prevent duplicate submissions
    
    setIsSaving(true);
    try {
      await submitForm(e, user.id, async () => {
        await reload(); // Reload data after successful submission
        setShowForm(false);
      });
    } catch (error) {
      console.error('[EventSetup] Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (api.USE_SERVER) {
      await api.deleteEvent(eventId);
      await reload(); // Reload data after deletion
    }
  };

  const handleEditClick = (event: TradeShow) => {
    handleEdit(event);
    setShowForm(true);
  };

  const addParticipant = () => {
    addParticipantHook(allUsers);
  };

  // Filter events based on end date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter events based on user role and permissions
  const filteredEvents = events.filter(event => {
    // Admin & Developer can see all events for transparency, with filter option
    if (user.role === 'admin' || user.role === 'developer') {
      if (filterMode === 'all') {
        return true; // Show all events
      }
      // Show only events they're assigned to
      return event.participants.some(p => p.id === user.id);
    }
    // Coordinator can see all events (no filter needed, they manage everything)
    if (user.role === 'coordinator') {
      return true;
    }
    // Accountant can see all events for transparency, but can filter to "My Events"
    if (user.role === 'accountant') {
      if (filterMode === 'all') {
        return true; // Show all events
      }
      // Show only events they're assigned to
      return event.participants.some(p => p.id === user.id);
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

  // Only admins, developers, and coordinators can create/edit events
  const canManageEvents = user.role === 'admin' || user.role === 'developer' || user.role === 'coordinator';

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
            {user.role === 'coordinator' ? 'Event Management' : 'Events'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user.role === 'coordinator'
              ? 'Create and manage trade show events' 
              : user.role === 'admin' || user.role === 'developer'
                ? 'View all events and participants, manage settings'
                : user.role === 'accountant'
                  ? 'View all events and participants for transparency'
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

        {/* Admin, Developer & Accountant Filter Toggle */}
        {(user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
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
                
                {/* Show Dates */}
                <div className="col-span-2">
                  <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Show Dates
                  </h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Show Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.showStartDate}
                    onChange={(e) => setFormData({ ...formData, showStartDate: e.target.value, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Show End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.showEndDate}
                    min={formData.showStartDate}
                    onChange={(e) => setFormData({ ...formData, showEndDate: e.target.value, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.showStartDate && formData.showEndDate && formData.showEndDate < formData.showStartDate && (
                    <p className="mt-1 text-sm text-red-600">Show end date cannot be before show start date</p>
                  )}
                </div>

                {/* Travel Dates */}
                <div className="col-span-2">
                  <h3 className="text-md font-semibold text-gray-800 mb-3 mt-2 flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Travel Dates
                  </h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.travelStartDate}
                    onChange={(e) => setFormData({ ...formData, travelStartDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.travelEndDate}
                    min={formData.travelStartDate}
                    onChange={(e) => setFormData({ ...formData, travelEndDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {formData.travelStartDate && formData.travelEndDate && formData.travelEndDate < formData.travelStartDate && (
                    <p className="mt-1 text-sm text-red-600">Travel end date cannot be before travel start date</p>
                  )}
                </div>
              </div>
              
              {/* Budget field - Admin, Developer and Accountant only */}
              {(user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
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
                        {(() => {
                          console.log('[EventSetup] 🔍 RENDERING DROPDOWN - allUsers:', allUsers.length, 'users');
                          console.log('[EventSetup] 🔍 allUsers array:', allUsers);
                          
                          if (allUsers.length === 0) {
                            console.error('[EventSetup] ⚠️ allUsers is EMPTY when rendering dropdown!');
                          }
                          
                          const availableUsers = allUsers.filter(u => !formData.participants.find(p => p.id === u.id));
                          console.log('[EventSetup] All users:', allUsers.length, allUsers.map(u => u.name));
                          console.log('[EventSetup] Current participants:', formData.participants.length, formData.participants.map(p => p.name));
                          console.log('[EventSetup] Available users for dropdown:', availableUsers.length, availableUsers.map(u => u.name));
                          
                          return availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ));
                        })()}
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
                  disabled={isSaving}
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingEvent ? 'Update Event' : 'Create Event'}</span>
                  )}
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
                  {event.budget && (user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">${event.budget.toLocaleString()}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setViewingEvent(event)}
                    className="px-3 py-1 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <Info className="w-4 h-4" />
                    Details
                  </button>
                  {canManageEvents && (
                    <>
                      <button
                        onClick={() => handleEditClick(event)}
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
              
              {/* Participants with hover popup */}
              <div className="relative inline-block group">
                <div className="flex items-center gap-1 text-sm text-gray-600 cursor-help">
                  <Users className="w-4 h-4" />
                  <span>{event.participants?.length || 0} participants</span>
                </div>
                
                {/* Popup on hover */}
                {event.participants?.length > 0 && (
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
          ))
        )}
      </div>

      {/* Event Details Modal */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{viewingEvent.name}</h2>
              <button
                onClick={() => setViewingEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Location */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Location</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">{viewingEvent.venue}</p>
                    <p className="text-gray-600">{viewingEvent.city}, {viewingEvent.state}</p>
                  </div>
                </div>
              </div>

              {/* Show Dates */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  Show Dates
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">
                      {formatLocalDate(viewingEvent.showStartDate || viewingEvent.startDate)} - {formatLocalDate(viewingEvent.showEndDate || viewingEvent.endDate)}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">Actual event/trade show dates</p>
                </div>
              </div>

              {/* Travel Dates */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  Travel Dates
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-900">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">
                      {formatLocalDate(viewingEvent.travelStartDate || viewingEvent.startDate)} - {formatLocalDate(viewingEvent.travelEndDate || viewingEvent.endDate)}
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">When team members travel for the event</p>
                </div>
              </div>

              {/* Budget */}
              {viewingEvent.budget && (user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Budget</h3>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-2xl font-bold">${viewingEvent.budget.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Participants */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Participants ({viewingEvent.participants?.length || 0})
                </h3>
                {viewingEvent.participants && viewingEvent.participants.length > 0 ? (
                  <div className="space-y-2">
                    {viewingEvent.participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                          <p className="text-sm text-gray-600 truncate">{participant.email}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium capitalize flex-shrink-0">
                          {participant.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No participants assigned yet</p>
                )}
              </div>

              {/* Checklist Summary */}
              {(user.role === 'admin' || user.role === 'coordinator' || user.role === 'developer') && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Event Checklist
                  </h3>
                  {loadingChecklist ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : checklistData ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      {/* Booth & Electricity */}
                      <div className="flex items-center gap-3">
                        {checklistData.booth_ordered ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700">Booth Space Ordered</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {checklistData.electricity_ordered ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700">Electricity Ordered</span>
                      </div>

                      {/* Flights */}
                      <div className="flex items-center gap-3">
                        <Plane className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          Flights: {checklistData.flights_booked}/{checklistData.flights_total} booked
                        </span>
                      </div>

                      {/* Hotels */}
                      <div className="flex items-center gap-3">
                        <Hotel className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          Hotels: {checklistData.hotels_booked}/{checklistData.hotels_total} booked
                        </span>
                      </div>

                      {/* Car Rentals */}
                      {checklistData.car_rentals_total > 0 && (
                        <div className="flex items-center gap-3">
                          <Car className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            Car Rentals: {checklistData.car_rentals_booked}/{checklistData.car_rentals_total} booked
                          </span>
                        </div>
                      )}

                      {/* Booth Shipping */}
                      <div className="flex items-center gap-3">
                        {checklistData.booth_shipped ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700">Booth Shipped</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">Checklist not available</p>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingEvent(null)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};