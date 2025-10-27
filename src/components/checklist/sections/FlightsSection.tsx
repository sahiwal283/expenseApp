import React, { useState } from 'react';
import { Plane, Plus, CheckCircle2, Circle, Trash2, Save } from 'lucide-react';
import { ChecklistData, FlightData } from '../TradeShowChecklist';
import { TradeShow } from '../../../App';

interface FlightsSectionProps {
  checklist: ChecklistData;
  event: TradeShow;
  onReload: () => void;
}

export const FlightsSection: React.FC<FlightsSectionProps> = ({ checklist, event, onReload }) => {
  const [editingFlights, setEditingFlights] = useState<{ [key: number]: FlightData }>({});
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});

  const participants = event.participants || [];

  const getFlightForAttendee = (attendeeId: string) => {
    return checklist.flights.find(f => f.attendee_id?.toString() === attendeeId);
  };

  const handleFieldChange = (attendeeId: string, field: keyof FlightData, value: any) => {
    const numericId = parseInt(attendeeId);
    const existing = getFlightForAttendee(attendeeId) || {
      attendee_id: numericId,
      attendee_name: participants.find(p => p.id === attendeeId)?.name || '',
      carrier: null,
      confirmation_number: null,
      notes: null,
      booked: false
    };

    setEditingFlights({
      ...editingFlights,
      [numericId]: {
        ...existing,
        ...editingFlights[numericId],
        [field]: value
      }
    });
  };

  const handleSave = async (attendeeId: string) => {
    const numericId = parseInt(attendeeId);
    const flightData = editingFlights[numericId];
    if (!flightData) return;

    setSaving({ ...saving, [numericId]: true });

    try {
      const existingFlight = getFlightForAttendee(attendeeId);
      const url = existingFlight
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/flights/${existingFlight.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${checklist.id}/flights`;

      const method = existingFlight ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendeeId: flightData.attendee_id,
          attendeeName: flightData.attendee_name,
          carrier: flightData.carrier,
          confirmationNumber: flightData.confirmation_number,
          notes: flightData.notes,
          booked: flightData.booked
        })
      });

      // Clear editing state
      const newEditing = { ...editingFlights };
      delete newEditing[numericId];
      setEditingFlights(newEditing);

      onReload();
    } catch (error) {
      console.error('[FlightsSection] Error saving flight:', error);
      alert('Failed to save flight information');
    } finally {
      setSaving({ ...saving, [numericId]: false });
    }
  };

  const toggleBooked = async (attendeeId: string) => {
    const flight = getFlightForAttendee(attendeeId);
    if (!flight || !flight.id) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/flights/${flight.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            carrier: flight.carrier,
            confirmationNumber: flight.confirmation_number,
            notes: flight.notes,
            booked: !flight.booked
          })
        }
      );
      onReload();
    } catch (error) {
      console.error('[FlightsSection] Error toggling flight:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Plane className="w-5 h-5 text-blue-600" />
        Flights ({checklist.flights.filter(f => f.booked).length}/{participants.length})
      </h3>

      {participants.length === 0 ? (
        <p className="text-gray-500 text-sm">No participants added to this event yet.</p>
      ) : (
        <div className="space-y-3">
          {participants.map(participant => {
            const flight = getFlightForAttendee(participant.id);
            const editing = editingFlights[parseInt(participant.id)];
            const currentData = editing || flight;
            const isModified = !!editing;

            return (
              <div
                key={participant.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => flight?.id && toggleBooked(participant.id)}
                      disabled={!flight?.id}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {flight?.booked ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 hover:scale-110 transition-transform" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                    <div>
                      <p className="font-medium text-gray-900">{participant.name}</p>
                      <p className="text-xs text-gray-500">{participant.email}</p>
                    </div>
                  </div>
                  
                  {isModified && (
                    <button
                      onClick={() => handleSave(participant.id)}
                      disabled={saving[parseInt(participant.id)]}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-9">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Carrier
                    </label>
                    <input
                      type="text"
                      value={currentData?.carrier || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'carrier', e.target.value)}
                      placeholder="e.g., Delta, United"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Confirmation Number
                    </label>
                    <input
                      type="text"
                      value={currentData?.confirmation_number || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'confirmation_number', e.target.value)}
                      placeholder="Booking reference"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={currentData?.notes || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'notes', e.target.value)}
                      placeholder="Flight times, layovers, seat preferences, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

