/**
 * useChecklistSummary Hook
 * 
 * Handles loading and managing checklist summary data for events.
 */

import { useState } from 'react';
import { api } from '../../../../utils/api';

export interface ChecklistSummary {
  booth_ordered: boolean;
  booth_map_url: string | null;
  electricity_ordered: boolean;
  flights_booked: number;
  flights_total: number;
  hotels_booked: number;
  hotels_total: number;
  car_rentals_booked: number;
  car_rentals_total: number;
  booth_shipped: boolean;
  flights?: Array<{
    id: number;
    attendee_id: string;
    attendee_name: string;
    carrier: string | null;
    confirmation_number: string | null;
    notes: string | null;
    booked: boolean;
  }>;
  hotels?: Array<{
    id: number;
    attendee_id: string;
    attendee_name: string;
    property_name: string | null;
    confirmation_number: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
    notes: string | null;
    booked: boolean;
  }>;
  carRentals?: Array<{
    id: number;
    provider: string | null;
    confirmation_number: string | null;
    pickup_date: string | null;
    return_date: string | null;
    notes: string | null;
    booked: boolean;
  }>;
}

interface UseChecklistSummaryReturn {
  checklistData: ChecklistSummary | null;
  loadingChecklist: boolean;
  loadChecklistSummary: (eventId: string, participantCount: number) => Promise<void>;
}

export function useChecklistSummary(): UseChecklistSummaryReturn {
  const [checklistData, setChecklistData] = useState<ChecklistSummary | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const loadChecklistSummary = async (eventId: string, participantCount: number) => {
    setLoadingChecklist(true);
    try {
      const data = await api.checklist.getChecklist(eventId) as unknown;
      console.log('[useChecklistSummary] Raw API response:', data);
      
      // Defensive normalization: ensure data is valid
      if (!data || typeof data !== 'object') {
        console.warn('[useChecklistSummary] Invalid data received from API');
        setChecklistData(null);
        return;
      }
      
      const dataObj = data as Record<string, unknown>;
      
      // Extract booth_map_url with proper type checking
      const boothMapUrl = typeof dataObj.booth_map_url === 'string' && dataObj.booth_map_url.trim() !== '' 
        ? dataObj.booth_map_url 
        : null;
      
      console.log('[useChecklistSummary] Extracted booth_map_url:', boothMapUrl);
      
      setChecklistData({
        booth_ordered: typeof dataObj.booth_ordered === 'boolean' ? dataObj.booth_ordered : false,
        electricity_ordered: typeof dataObj.electricity_ordered === 'boolean' ? dataObj.electricity_ordered : false,
        flights_booked: Array.isArray(dataObj.flights) 
          ? dataObj.flights.filter((f: { booked: boolean }) => f.booked).length 
          : 0,
        flights_total: participantCount,  // Use participant count, not flight record count
        hotels_booked: Array.isArray(dataObj.hotels) 
          ? dataObj.hotels.filter((h: { booked: boolean }) => h.booked).length 
          : 0,
        hotels_total: participantCount,  // Use participant count, not hotel record count
        car_rentals_booked: Array.isArray(dataObj.carRentals) 
          ? dataObj.carRentals.filter((c: { booked: boolean }) => c.booked).length 
          : 0,
        car_rentals_total: Array.isArray(dataObj.carRentals) ? dataObj.carRentals.length : 0,  // Car rentals are shared, so use actual count
        booth_shipped: Array.isArray(dataObj.boothShipping) && dataObj.boothShipping.length > 0
          ? (dataObj.boothShipping[0] as { shipped: boolean }).shipped || false
          : false,
        booth_map_url: boothMapUrl,
        flights: Array.isArray(dataObj.flights) ? dataObj.flights as ChecklistSummary['flights'] : [],
        hotels: Array.isArray(dataObj.hotels) ? dataObj.hotels as ChecklistSummary['hotels'] : [],
        carRentals: Array.isArray(dataObj.carRentals) ? dataObj.carRentals as ChecklistSummary['carRentals'] : []
      });
      
      console.log('[useChecklistSummary] Normalized checklist data:', {
        booth_map_url: boothMapUrl,
        booth_ordered: typeof dataObj.booth_ordered === 'boolean' ? dataObj.booth_ordered : false
      });
    } catch (error) {
      console.error('[useChecklistSummary] Error loading checklist:', error);
      setChecklistData(null);
    } finally {
      setLoadingChecklist(false);
    }
  };

  return {
    checklistData,
    loadingChecklist,
    loadChecklistSummary
  };
}

