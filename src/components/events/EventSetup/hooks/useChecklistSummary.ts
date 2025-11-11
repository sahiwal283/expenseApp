/**
 * useChecklistSummary Hook
 * 
 * Handles loading and managing checklist summary data for events.
 */

import { useState, useEffect } from 'react';
import { TradeShow } from '../../../../App';
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
      const data = await api.checklist.getChecklist(eventId);
      
      setChecklistData({
        booth_ordered: data.booth_ordered || false,
        electricity_ordered: data.electricity_ordered || false,
        flights_booked: data.flights?.filter((f: { booked: boolean }) => f.booked).length || 0,
        flights_total: participantCount,  // Use participant count, not flight record count
        hotels_booked: data.hotels?.filter((h: { booked: boolean }) => h.booked).length || 0,
        hotels_total: participantCount,  // Use participant count, not hotel record count
        car_rentals_booked: data.carRentals?.filter((c: { booked: boolean }) => c.booked).length || 0,
        car_rentals_total: data.carRentals?.length || 0,  // Car rentals are shared, so use actual count
        booth_shipped: data.boothShipping?.[0]?.shipped || false,
        booth_map_url: data.booth_map_url || null,
        flights: data.flights || [],
        hotels: data.hotels || [],
        carRentals: data.carRentals || []
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

