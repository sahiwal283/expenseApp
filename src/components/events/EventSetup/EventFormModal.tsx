/**
 * EventFormModal Component
 * 
 * Modal form for creating and editing events.
 */

import React from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { User, TradeShow } from '../../../App';

interface EventFormData {
  name: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  showStartDate: string;
  showEndDate: string;
  travelStartDate: string;
  travelEndDate: string;
  budget: string;
  participants: User[];
}

interface EventFormModalProps {
  user: User;
  allUsers: User[];
  showForm: boolean;
  isSaving: boolean;
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  editingEvent: TradeShow | null;
  selectedUserId: string;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string>>;
  newParticipantName: string;
  setNewParticipantName: React.Dispatch<React.SetStateAction<string>>;
  newParticipantEmail: string;
  setNewParticipantEmail: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onAddParticipant: () => void;
  onAddCustomParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onResetForm: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  user,
  allUsers,
  showForm,
  isSaving,
  formData,
  setFormData,
  editingEvent,
  selectedUserId,
  setSelectedUserId,
  newParticipantName,
  setNewParticipantName,
  newParticipantEmail,
  setNewParticipantEmail,
  onClose,
  onSubmit,
  onAddParticipant,
  onAddCustomParticipant,
  onRemoveParticipant,
  onResetForm
}) => {

  if (!showForm) return null;

  return (
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
              onClose();
              onResetForm();
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-8">
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
                    onClick={onAddParticipant}
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
                  onClick={onAddCustomParticipant}
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
                        onClick={() => onRemoveParticipant(participant.id)}
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
                onClose();
                onResetForm();
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
  );
};

