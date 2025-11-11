/**
 * ChecklistSummary Component
 * 
 * Displays event checklist summary with travel details.
 */

import React from 'react';
import { CheckCircle2, Circle, Plane, Hotel, Car, Map, Users2, Loader2 } from 'lucide-react';
import { User } from '../../../App';
import { formatLocalDate } from '../../../utils/dateUtils';
import { ChecklistSummary as ChecklistSummaryType } from './hooks';

interface ChecklistSummaryProps {
  user: User;
  checklistData: ChecklistSummaryType | null;
  loadingChecklist: boolean;
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({
  user,
  checklistData,
  loadingChecklist
}) => {
  if (loadingChecklist) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!checklistData) {
    return <p className="text-gray-500 text-sm italic">Checklist not available</p>;
  }

  const userFlight = checklistData.flights?.find(f => f.attendee_id === user.id);
  const userHotel = checklistData.hotels?.find(h => h.attendee_id === user.id);
  const carRentals = checklistData.carRentals || [];

  return (
    <div className="space-y-4">
      {/* Overall Checklist Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Overall Status</h4>
        
        {/* Booth & Electricity */}
        <div className="flex items-center gap-3">
          {checklistData.booth_ordered ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm text-gray-700">Booth Space Ordered</span>
        </div>

        {/* Booth Map Preview */}
        {checklistData.booth_map_url && (
          <div className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Map className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-700">Booth Floor Plan</span>
            </div>
            <img
              src={`${import.meta.env.VITE_API_BASE_URL || '/api'}${checklistData.booth_map_url}`}
              alt="Booth Map"
              className="w-full h-48 object-contain bg-gray-50 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || '/api'}${checklistData.booth_map_url}`, '_blank')}
              title="Click to view full size"
            />
            <p className="text-xs text-gray-500 mt-1 text-center">Click image to view full size</p>
          </div>
        )}

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

      {/* Personal Travel Details - Only show if user is a participant */}
      {(userFlight || userHotel || carRentals.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Users2 className="w-4 h-4" />
            Your Travel Details
          </h4>

          {/* User's Flight Info */}
          {userFlight && (
            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900 text-sm">Flight</span>
                {userFlight.booked && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                )}
              </div>
              {userFlight.carrier && (
                <div className="text-sm">
                  <span className="text-gray-500">Carrier:</span>
                  <span className="text-gray-900 ml-2">{userFlight.carrier}</span>
                </div>
              )}
              {userFlight.confirmation_number && (
                <div className="text-sm">
                  <span className="text-gray-500">Confirmation:</span>
                  <span className="text-gray-900 ml-2 font-mono">{userFlight.confirmation_number}</span>
                </div>
              )}
              {userFlight.notes && (
                <div className="text-sm">
                  <span className="text-gray-500">Notes:</span>
                  <span className="text-gray-900 ml-2">{userFlight.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* User's Hotel Info */}
          {userHotel && (
            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Hotel className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-gray-900 text-sm">Hotel</span>
                {userHotel.booked && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                )}
              </div>
              {userHotel.property_name && (
                <div className="text-sm">
                  <span className="text-gray-500">Property:</span>
                  <span className="text-gray-900 ml-2">{userHotel.property_name}</span>
                </div>
              )}
              {userHotel.confirmation_number && (
                <div className="text-sm">
                  <span className="text-gray-500">Confirmation:</span>
                  <span className="text-gray-900 ml-2 font-mono">{userHotel.confirmation_number}</span>
                </div>
              )}
              {(userHotel.check_in_date || userHotel.check_out_date) && (
                <div className="text-sm">
                  <span className="text-gray-500">Dates:</span>
                  <span className="text-gray-900 ml-2">
                    {userHotel.check_in_date ? formatLocalDate(userHotel.check_in_date) : '—'} to {userHotel.check_out_date ? formatLocalDate(userHotel.check_out_date) : '—'}
                  </span>
                </div>
              )}
              {userHotel.notes && (
                <div className="text-sm">
                  <span className="text-gray-500">Notes:</span>
                  <span className="text-gray-900 ml-2">{userHotel.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Car Rentals - Shared by all attendees */}
          {carRentals.map((rental) => (
            <div key={rental.id} className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-gray-900 text-sm">Car Rental</span>
                {rental.booked && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                )}
              </div>
              {rental.provider && (
                <div className="text-sm">
                  <span className="text-gray-500">Provider:</span>
                  <span className="text-gray-900 ml-2">{rental.provider}</span>
                </div>
              )}
              {rental.confirmation_number && (
                <div className="text-sm">
                  <span className="text-gray-500">Confirmation:</span>
                  <span className="text-gray-900 ml-2 font-mono">{rental.confirmation_number}</span>
                </div>
              )}
              {(rental.pickup_date || rental.return_date) && (
                <div className="text-sm">
                  <span className="text-gray-500">Dates:</span>
                  <span className="text-gray-900 ml-2">
                    {rental.pickup_date ? formatLocalDate(rental.pickup_date) : '—'} to {rental.return_date ? formatLocalDate(rental.return_date) : '—'}
                  </span>
                </div>
              )}
              {rental.notes && (
                <div className="text-sm">
                  <span className="text-gray-500">Notes:</span>
                  <span className="text-gray-900 ml-2">{rental.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

