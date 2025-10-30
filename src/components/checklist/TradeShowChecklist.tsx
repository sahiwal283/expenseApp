import React, { useState, useEffect } from 'react';
import { User, TradeShow } from '../../App';
import { api } from '../../utils/api';
import { CheckCircle2, Circle, Plane, Hotel, Car, Package, Zap, Building2, AlertCircle } from 'lucide-react';
import { BoothSection } from './sections/BoothSection';
import { FlightsSection } from './sections/FlightsSection';
import { HotelsSection } from './sections/HotelsSection';
import { CarRentalsSection } from './sections/CarRentalsSection';
import { CustomItemsSection } from './sections/CustomItemsSection';

export interface ChecklistData {
  id: number;
  event_id: number;
  booth_ordered: boolean;
  booth_notes: string | null;
  booth_map_url: string | null;
  electricity_ordered: boolean;
  electricity_notes: string | null;
  flights: FlightData[];
  hotels: HotelData[];
  carRentals: CarRentalData[];
  boothShipping: BoothShippingData[];
  customItems: CustomItemData[];
}

export interface FlightData {
  id?: number;
  attendee_id: string | null;
  attendee_name: string;
  carrier: string | null;
  confirmation_number: string | null;
  notes: string | null;
  booked: boolean;
}

export interface HotelData {
  id?: number;
  attendee_id: string | null;
  attendee_name: string;
  property_name: string | null;
  confirmation_number: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  notes: string | null;
  booked: boolean;
}

export interface CarRentalData {
  id?: number;
  provider: string | null;
  confirmation_number: string | null;
  pickup_date: string | null;
  return_date: string | null;
  notes: string | null;
  booked: boolean;
  rental_type?: 'individual' | 'group';
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
}

export interface BoothShippingData {
  id?: number;
  shipping_method: 'manual' | 'carrier';
  carrier_name: string | null;
  tracking_number: string | null;
  shipping_date: string | null;
  delivery_date: string | null;
  notes: string | null;
  shipped: boolean;
}

export interface CustomItemData {
  id?: number;
  checklist_id: number;
  title: string;
  description: string | null;
  completed: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

interface TradeShowChecklistProps {
  user: User;
}

export const TradeShowChecklist: React.FC<TradeShowChecklistProps> = ({ user }) => {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadChecklist(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      if (api.USE_SERVER) {
        console.log('[Checklist] Fetching events...');
        const data = await api.getEvents();
        console.log('[Checklist] API response:', data);
        
        if (!data) {
          console.error('[Checklist] API returned null/undefined');
          return;
        }
        
        console.log('[Checklist] Loaded events:', data.length, 'events');
        setEvents(data || []);
        
        if (data.length > 0 && !selectedEventId) {
          console.log('[Checklist] Auto-selecting first event:', data[0].id);
          setSelectedEventId(data[0].id);
        }
      }
    } catch (error) {
      console.error('[Checklist] Error loading events:', error);
    }
  };

  const loadChecklist = async (eventId: string) => {
    setLoading(true);
    try {
      if (api.USE_SERVER) {
        console.log('[Checklist] Loading checklist for event:', eventId);
        const data = await api.checklist.getChecklist(eventId);
        console.log('[Checklist] Checklist loaded:', data);
        setChecklist(data);
      }
    } catch (error) {
      console.error('[Checklist] Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChecklist = async (updates: Partial<ChecklistData>) => {
    if (!checklist) return;
    
    setSaving(true);
    try {
      if (api.USE_SERVER) {
        await api.checklist.updateChecklist(checklist.id, {
          boothOrdered: updates.booth_ordered ?? checklist.booth_ordered,
          boothNotes: updates.booth_notes ?? checklist.booth_notes,
          electricityOrdered: updates.electricity_ordered ?? checklist.electricity_ordered,
          electricityNotes: updates.electricity_notes ?? checklist.electricity_notes
        });
        setChecklist({ ...checklist, ...updates });
      }
    } catch (error) {
      console.error('[Checklist] Error updating checklist:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  const getProgress = () => {
    if (!checklist) return 0;
    
    let completed = 0;
    let total = 0;
    
    // Booth (1 item)
    total += 1;
    if (checklist.booth_ordered) completed += 1;
    
    // Electricity (1 item)
    total += 1;
    if (checklist.electricity_ordered) completed += 1;
    
    // Flights (count booked)
    total += checklist.flights.length;
    completed += checklist.flights.filter(f => f.booked).length;
    
    // Hotels (count booked)
    total += checklist.hotels.length;
    completed += checklist.hotels.filter(h => h.booked).length;
    
    // Car rentals (count booked)
    total += checklist.carRentals.length;
    completed += checklist.carRentals.filter(c => c.booked).length;
    
    // Booth shipping (1 item)
    total += 1;
    if (checklist.boothShipping.length > 0 && checklist.boothShipping[0].shipped) completed += 1;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading checklist...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trade Show Checklist</h1>
          <p className="text-gray-600 mt-1">Manage logistics and preparations for each event</p>
        </div>
        
        {/* Event Selector */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {events.length === 0 ? (
              <option value="">No events available</option>
            ) : (
              events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.startDate).toLocaleDateString()}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {!selectedEvent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">No Event Selected</p>
              <p className="text-sm text-yellow-700 mt-1">
                Please select an event from the dropdown above to manage its checklist.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && checklist && (
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
              <span className="text-2xl font-bold text-blue-600">{getProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Checklist Sections */}
          <div className="space-y-4">
            <BoothSection 
              checklist={checklist} 
              user={user}
              event={selectedEvent}
              onUpdate={updateChecklist}
              onReload={() => loadChecklist(selectedEventId!)}
              saving={saving}
            />
            
            <FlightsSection 
              checklist={checklist}
              user={user}
              event={selectedEvent}
              onReload={() => loadChecklist(selectedEventId!)}
            />
            
            <HotelsSection 
              checklist={checklist}
              user={user}
              event={selectedEvent}
              onReload={() => loadChecklist(selectedEventId!)}
            />
            
            <CarRentalsSection 
              checklist={checklist}
              user={user}
              event={selectedEvent}
              onReload={() => loadChecklist(selectedEventId!)}
            />
            
            <CustomItemsSection 
              checklist={checklist}
              onReload={() => loadChecklist(selectedEventId!)}
              canEdit={user.role === 'admin' || user.role === 'coordinator' || user.role === 'developer'}
              isAdmin={user.role === 'admin' || user.role === 'developer'}
            />
          </div>
        </>
      )}
    </div>
  );
};

