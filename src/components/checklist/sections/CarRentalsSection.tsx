import React, { useState } from 'react';
import { Car, Plus, CheckCircle2, Circle, Trash2, Save } from 'lucide-react';
import { ChecklistData, CarRentalData } from '../TradeShowChecklist';

interface CarRentalsSectionProps {
  checklist: ChecklistData;
  onReload: () => void;
}

export const CarRentalsSection: React.FC<CarRentalsSectionProps> = ({ checklist, onReload }) => {
  const [editingRentals, setEditingRentals] = useState<{ [key: number]: CarRentalData }>({});
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRental, setNewRental] = useState<CarRentalData>({
    provider: null,
    confirmation_number: null,
    pickup_date: null,
    return_date: null,
    notes: null,
    booked: false
  });

  const handleFieldChange = (rentalId: number, field: keyof CarRentalData, value: any) => {
    const existing = checklist.carRentals.find(r => r.id === rentalId);
    if (!existing) return;

    setEditingRentals({
      ...editingRentals,
      [rentalId]: {
        ...existing,
        ...editingRentals[rentalId],
        [field]: value
      }
    });
  };

  const handleSave = async (rentalId: number) => {
    const rentalData = editingRentals[rentalId];
    if (!rentalData) return;

    setSaving({ ...saving, [rentalId]: true });

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/car-rentals/${rentalId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: rentalData.provider,
            confirmationNumber: rentalData.confirmation_number,
            pickupDate: rentalData.pickup_date,
            returnDate: rentalData.return_date,
            notes: rentalData.notes,
            booked: rentalData.booked
          })
        }
      );

      const newEditing = { ...editingRentals };
      delete newEditing[rentalId];
      setEditingRentals(newEditing);

      onReload();
    } catch (error) {
      console.error('[CarRentalsSection] Error saving rental:', error);
      alert('Failed to save car rental information');
    } finally {
      setSaving({ ...saving, [rentalId]: false });
    }
  };

  const handleAddRental = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${checklist.id}/car-rentals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: newRental.provider,
            confirmationNumber: newRental.confirmation_number,
            pickupDate: newRental.pickup_date,
            returnDate: newRental.return_date,
            notes: newRental.notes,
            booked: newRental.booked
          })
        }
      );

      setNewRental({
        provider: null,
        confirmation_number: null,
        pickup_date: null,
        return_date: null,
        notes: null,
        booked: false
      });
      setShowAddForm(false);
      onReload();
    } catch (error) {
      console.error('[CarRentalsSection] Error adding rental:', error);
      alert('Failed to add car rental');
    }
  };

  const handleDeleteRental = async (rentalId: number) => {
    if (!confirm('Delete this car rental?')) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/car-rentals/${rentalId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      onReload();
    } catch (error) {
      console.error('[CarRentalsSection] Error deleting rental:', error);
      alert('Failed to delete car rental');
    }
  };

  const toggleBooked = async (rentalId: number) => {
    const rental = checklist.carRentals.find(r => r.id === rentalId);
    if (!rental) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/car-rentals/${rentalId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: rental.provider,
            confirmationNumber: rental.confirmation_number,
            pickupDate: rental.pickup_date,
            returnDate: rental.return_date,
            notes: rental.notes,
            booked: !rental.booked
          })
        }
      );
      onReload();
    } catch (error) {
      console.error('[CarRentalsSection] Error toggling rental:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Car className="w-5 h-5 text-orange-600" />
          Car Rentals ({checklist.carRentals.filter(r => r.booked).length}/{checklist.carRentals.length})
        </h3>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Rental
        </button>
      </div>

      {/* Add New Rental Form */}
      {showAddForm && (
        <div className="border border-orange-200 rounded-lg p-4 mb-3 bg-orange-50">
          <h4 className="font-medium text-gray-900 mb-3">New Car Rental</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Provider
              </label>
              <input
                type="text"
                value={newRental.provider || ''}
                onChange={(e) => setNewRental({ ...newRental, provider: e.target.value })}
                placeholder="e.g., Enterprise, Hertz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirmation Number
              </label>
              <input
                type="text"
                value={newRental.confirmation_number || ''}
                onChange={(e) => setNewRental({ ...newRental, confirmation_number: e.target.value })}
                placeholder="Reservation number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pickup Date
              </label>
              <input
                type="date"
                value={newRental.pickup_date || ''}
                onChange={(e) => setNewRental({ ...newRental, pickup_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={newRental.return_date || ''}
                onChange={(e) => setNewRental({ ...newRental, return_date: e.target.value })}
                min={newRental.pickup_date || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={newRental.notes || ''}
                onChange={(e) => setNewRental({ ...newRental, notes: e.target.value })}
                placeholder="Vehicle type, pickup/return locations, insurance, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddRental}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Rentals */}
      {checklist.carRentals.length === 0 ? (
        <p className="text-gray-500 text-sm">No car rentals added yet.</p>
      ) : (
        <div className="space-y-3">
          {checklist.carRentals.map(rental => {
            const editing = editingRentals[rental.id!];
            const currentData = editing || rental;
            const isModified = !!editing;

            return (
              <div
                key={rental.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBooked(rental.id!)}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rental.booked ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 hover:scale-110 transition-transform" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                    <div>
                      <p className="font-medium text-gray-900">{currentData.provider || 'Unnamed Rental'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isModified && (
                      <button
                        onClick={() => handleSave(rental.id!)}
                        disabled={saving[rental.id!]}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRental(rental.id!)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-9">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provider
                    </label>
                    <input
                      type="text"
                      value={currentData.provider || ''}
                      onChange={(e) => handleFieldChange(rental.id!, 'provider', e.target.value)}
                      placeholder="e.g., Enterprise, Hertz"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Confirmation Number
                    </label>
                    <input
                      type="text"
                      value={currentData.confirmation_number || ''}
                      onChange={(e) => handleFieldChange(rental.id!, 'confirmation_number', e.target.value)}
                      placeholder="Reservation number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={currentData.pickup_date || ''}
                      onChange={(e) => handleFieldChange(rental.id!, 'pickup_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={currentData.return_date || ''}
                      onChange={(e) => handleFieldChange(rental.id!, 'return_date', e.target.value)}
                      min={currentData.pickup_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={currentData.notes || ''}
                      onChange={(e) => handleFieldChange(rental.id!, 'notes', e.target.value)}
                      placeholder="Vehicle type, pickup/return locations, insurance, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
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

