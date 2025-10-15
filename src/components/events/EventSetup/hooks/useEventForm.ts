/**
 * useEventForm Hook
 * 
 * Manages event form state, validation, and submission logic.
 * Handles creating/editing events and managing participants.
 */

import { useState } from 'react';
import { TradeShow, User } from '../../../../App';
import { api } from '../../../../utils/api';
import { formatForDateInput } from '../../../../utils/dateUtils';
import { generateUUID } from '../../../../utils/uuid';

interface EventFormData {
  name: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  budget: string;
  participants: User[];
}

interface UseEventFormReturn {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  editingEvent: TradeShow | null;
  selectedUserId: string;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string>>;
  newParticipantName: string;
  setNewParticipantName: React.Dispatch<React.SetStateAction<string>>;
  newParticipantEmail: string;
  setNewParticipantEmail: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent, userId: string, onSuccess: () => void) => Promise<void>;
  handleEdit: (event: TradeShow) => void;
  resetForm: () => void;
  addParticipant: (allUsers: User[]) => void;
  addCustomParticipant: () => void;
  removeParticipant: (participantId: string) => void;
}

const initialFormData: EventFormData = {
  name: '',
  venue: '',
  city: '',
  state: '',
  startDate: '',
  endDate: '',
  budget: '',
  participants: []
};

export function useEventForm(): UseEventFormReturn {
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [editingEvent, setEditingEvent] = useState<TradeShow | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');

  const resetForm = () => {
    setFormData(initialFormData);
    setNewParticipantName('');
    setNewParticipantEmail('');
    setEditingEvent(null);
    setSelectedUserId('');
  };

  const handleSubmit = async (e: React.FormEvent, userId: string, onSuccess: () => void) => {
    e.preventDefault();
    
    const eventData: Omit<TradeShow, 'id'> = {
      name: formData.name,
      venue: formData.venue,
      city: formData.city,
      state: formData.state,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      participants: formData.participants,
      status: 'upcoming',
      coordinatorId: userId
    };

    try {
      if (api.USE_SERVER) {
        if (editingEvent) {
          await api.updateEvent(editingEvent.id, {
            name: eventData.name,
            venue: eventData.venue,
            city: eventData.city,
            state: eventData.state,
            start_date: eventData.startDate,
            end_date: eventData.endDate,
            budget: eventData.budget,
            participant_ids: eventData.participants.map((p) => p.id), // Keep old format for updates
            status: eventData.status || 'upcoming',
          });
        } else {
          await api.createEvent({
            name: eventData.name,
            venue: eventData.venue,
            city: eventData.city,
            state: eventData.state,
            start_date: eventData.startDate,
            end_date: eventData.endDate,
            budget: eventData.budget,
            participants: eventData.participants, // Send full participant objects (includes custom participants)
          });
        }
      }
      
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('[useEventForm] Error submitting event:', error);
      throw error;
    }
  };

  const handleEdit = (event: TradeShow) => {
    setEditingEvent(event);
    
    setFormData({
      name: event.name,
      venue: event.venue,
      city: event.city,
      state: event.state,
      startDate: formatForDateInput(event.startDate),
      endDate: formatForDateInput(event.endDate),
      budget: event.budget?.toString() || '',
      participants: event.participants
    });
  };

  const addParticipant = (allUsers: User[]) => {
    if (selectedUserId && !formData.participants.find(p => p.id === selectedUserId)) {
      const selectedUser = allUsers.find(u => u.id === selectedUserId);
      if (selectedUser) {
        setFormData({
          ...formData,
          participants: [...formData.participants, selectedUser]
        });
        setSelectedUserId('');
      }
    }
  };

  const addCustomParticipant = () => {
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

  return {
    formData,
    setFormData,
    editingEvent,
    selectedUserId,
    setSelectedUserId,
    newParticipantName,
    setNewParticipantName,
    newParticipantEmail,
    setNewParticipantEmail,
    handleSubmit,
    handleEdit,
    resetForm,
    addParticipant,
    addCustomParticipant,
    removeParticipant
  };
}

