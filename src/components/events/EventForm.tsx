import React, { useState } from 'react';
import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react';
import { TradeShow, User } from '../../App';
import { generateUUID } from '../../utils/uuid';

interface EventFormProps {
  event?: TradeShow | null;
  onSave: (event: Omit<TradeShow, 'id'>) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: event?.name || '',
    venue: event?.venue || '',
    city: event?.city || '',
    state: event?.state || '',
    startDate: event?.startDate || '',
    endDate: event?.endDate || '',
    budget: event?.budget || '',
    status: event?.status || 'upcoming' as const,
    participants: event?.participants || []
  });

  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addParticipant = () => {
    if (newParticipantName && newParticipantEmail && !formData.participants.find(p => p.email === newParticipantEmail)) {
      const newParticipant: User = {
        id: generateUUID(), // Generate proper UUID for database
        name: newParticipantName,
        username: newParticipantEmail.split('@')[0].toLowerCase(),
        email: newParticipantEmail,
        role: 'temporary' // Custom participants are temporary attendees
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {event ? 'Edit Event' : 'Create New Event'}
              </h1>
              <p className="text-gray-600">Set up your trade show details and invite participants</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., CES 2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Las Vegas Convention Center"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Las Vegas"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Nevada"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseInt(e.target.value) : '' })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50000"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Participants Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                className="px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Full name"
              />
              <input
                type="email"
                value={newParticipantEmail}
                onChange={(e) => setNewParticipantEmail(e.target.value)}
                className="px-3 py-2.5 sm:px-4 sm:py-3 border min-h-[44px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email address"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addParticipant}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            {formData.participants?.length || 0 > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {formData.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
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

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{event ? 'Update Event' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};