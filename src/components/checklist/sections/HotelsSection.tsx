import React, { useState } from 'react';
import { Hotel, CheckCircle2, Circle, Save } from 'lucide-react';
import { ChecklistData, HotelData } from '../TradeShowChecklist';
import { TradeShow } from '../../../App';

interface HotelsSectionProps {
  checklist: ChecklistData;
  event: TradeShow;
  onReload: () => void;
}

export const HotelsSection: React.FC<HotelsSectionProps> = ({ checklist, event, onReload }) => {
  const [editingHotels, setEditingHotels] = useState<{ [key: number]: HotelData }>({});
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});

  const participants = event.participants || [];

  const getHotelForAttendee = (attendeeId: string) => {
    return checklist.hotels.find(h => h.attendee_id?.toString() === attendeeId);
  };

  const handleFieldChange = (attendeeId: string, field: keyof HotelData, value: any) => {
    const numericId = parseInt(attendeeId);
    const existing = getHotelForAttendee(attendeeId) || {
      attendee_id: numericId,
      attendee_name: participants.find(p => p.id === attendeeId)?.name || '',
      property_name: null,
      confirmation_number: null,
      check_in_date: null,
      check_out_date: null,
      notes: null,
      booked: false
    };

    setEditingHotels({
      ...editingHotels,
      [numericId]: {
        ...existing,
        ...editingHotels[numericId],
        [field]: value
      }
    });
  };

  const handleSave = async (attendeeId: string) => {
    const numericId = parseInt(attendeeId);
    const hotelData = editingHotels[numericId];
    if (!hotelData) return;

    setSaving({ ...saving, [numericId]: true });

    try {
      const existingHotel = getHotelForAttendee(attendeeId);
      const url = existingHotel
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/hotels/${existingHotel.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${checklist.id}/hotels`;

      const method = existingHotel ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendeeId: hotelData.attendee_id,
          attendeeName: hotelData.attendee_name,
          propertyName: hotelData.property_name,
          confirmationNumber: hotelData.confirmation_number,
          checkInDate: hotelData.check_in_date,
          checkOutDate: hotelData.check_out_date,
          notes: hotelData.notes,
          booked: hotelData.booked
        })
      });

      const newEditing = { ...editingHotels };
      delete newEditing[numericId];
      setEditingHotels(newEditing);

      onReload();
    } catch (error) {
      console.error('[HotelsSection] Error saving hotel:', error);
      alert('Failed to save hotel information');
    } finally {
      setSaving({ ...saving, [numericId]: false });
    }
  };

  const toggleBooked = async (attendeeId: string) => {
    const hotel = getHotelForAttendee(attendeeId);
    if (!hotel || !hotel.id) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/hotels/${hotel.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            propertyName: hotel.property_name,
            confirmationNumber: hotel.confirmation_number,
            checkInDate: hotel.check_in_date,
            checkOutDate: hotel.check_out_date,
            notes: hotel.notes,
            booked: !hotel.booked
          })
        }
      );
      onReload();
    } catch (error) {
      console.error('[HotelsSection] Error toggling hotel:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Hotel className="w-5 h-5 text-emerald-600" />
        Hotels ({checklist.hotels.filter(h => h.booked).length}/{participants.length})
      </h3>

      {participants.length === 0 ? (
        <p className="text-gray-500 text-sm">No participants added to this event yet.</p>
      ) : (
        <div className="space-y-3">
          {participants.map(participant => {
            const hotel = getHotelForAttendee(participant.id);
            const editing = editingHotels[parseInt(participant.id)];
            const currentData = editing || hotel;
            const isModified = !!editing;

            return (
              <div
                key={participant.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => hotel?.id && toggleBooked(participant.id)}
                      disabled={!hotel?.id}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hotel?.booked ? (
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-9">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Property Name
                    </label>
                    <input
                      type="text"
                      value={currentData?.property_name || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'property_name', e.target.value)}
                      placeholder="e.g., Marriott Downtown"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
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
                      placeholder="Reservation number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      value={currentData?.check_in_date || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'check_in_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      value={currentData?.check_out_date || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'check_out_date', e.target.value)}
                      min={currentData?.check_in_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={currentData?.notes || ''}
                      onChange={(e) => handleFieldChange(participant.id, 'notes', e.target.value)}
                      placeholder="Room type, special requests, loyalty numbers, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
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

