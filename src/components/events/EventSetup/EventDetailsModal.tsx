/**
 * EventDetailsModal Component
 * 
 * Modal displaying detailed event information including checklist.
 */

import React, { useState } from 'react';
import { X, MapPin, Calendar, DollarSign, Map, Loader2, AlertCircle } from 'lucide-react';
import { TradeShow, User } from '../../../App';
import { formatLocalDate } from '../../../utils/dateUtils';
import { ChecklistSummary } from './ChecklistSummary';
import { ChecklistSummary as ChecklistSummaryType } from './hooks';

interface EventDetailsModalProps {
  event: TradeShow;
  user: User;
  checklistData: ChecklistSummaryType | null;
  loadingChecklist: boolean;
  onClose: () => void;
}

// Booth Map Image Component with error handling
const BoothMapImage: React.FC<{ boothMapUrl: string }> = ({ boothMapUrl }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Defensive check: ensure boothMapUrl is a string
  if (!boothMapUrl || typeof boothMapUrl !== 'string') {
    return (
      <div className="w-full h-48 bg-gray-50 rounded border border-gray-200 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 text-center">Invalid booth map URL</p>
      </div>
    );
  }
  
  // Construct image URL - ensure boothMapUrl starts with / if it doesn't already
  const normalizedUrl = boothMapUrl.startsWith('/') ? boothMapUrl : `/${boothMapUrl}`;
  // Use same pattern as appConstants.ts - Vite handles this at build time
  // @ts-ignore - Vite provides this at build time
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const imageUrl = `${apiBaseUrl}${normalizedUrl}`;
  const fullImageUrl = `${apiBaseUrl}${normalizedUrl}`;
  
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };
  
  const handleImageError = () => {
    console.error('[EventDetailsModal] Failed to load booth map image:', imageUrl);
    setImageError(true);
    setImageLoading(false);
  };
  
  if (imageError) {
    return (
      <div className="w-full h-48 bg-gray-50 rounded border border-gray-200 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 text-center">Failed to load booth map image</p>
      </div>
    );
  }
  
  return (
    <>
      {imageLoading && (
        <div className="w-full h-48 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={imageUrl}
        alt="Booth Floor Plan"
        className={`w-full h-48 object-contain bg-gray-50 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity ${imageLoading ? 'hidden' : ''}`}
        onClick={() => window.open(fullImageUrl, '_blank')}
        onLoad={handleImageLoad}
        onError={handleImageError}
        title="Click to view full size"
      />
      {!imageLoading && !imageError && (
        <p className="text-xs text-gray-500 mt-1 text-center">Click image to view full size</p>
      )}
    </>
  );
};

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  user,
  checklistData,
  loadingChecklist,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
          <button
            onClick={onClose}
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
                <p className="text-gray-900 font-medium">{event.venue}</p>
                <p className="text-gray-600">{event.city}, {event.state}</p>
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
                  {formatLocalDate(event.showStartDate || event.startDate)} - {formatLocalDate(event.showEndDate || event.endDate)}
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
                  {formatLocalDate(event.travelStartDate || event.startDate)} - {formatLocalDate(event.travelEndDate || event.endDate)}
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">When team members travel for the event</p>
            </div>
          </div>

          {/* Budget */}
          {event.budget && (user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Budget</h3>
              <div className="flex items-center gap-2 text-emerald-600">
                <DollarSign className="w-5 h-5" />
                <span className="text-2xl font-bold">${event.budget.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Participants ({event.participants?.length || 0})
            </h3>
            {event.participants && event.participants.length > 0 ? (
              <div className="space-y-2">
                {event.participants.map((participant) => (
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

          {/* Booth Floor Plan */}
          {!loadingChecklist && checklistData?.booth_map_url && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                Booth Floor Plan
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Map className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Booth Layout</span>
                </div>
                <BoothMapImage boothMapUrl={checklistData.booth_map_url} />
              </div>
            </div>
          )}

          {/* Checklist Summary */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Event Checklist
            </h3>
            <ChecklistSummary
              user={user}
              checklistData={checklistData}
              loadingChecklist={loadingChecklist}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

