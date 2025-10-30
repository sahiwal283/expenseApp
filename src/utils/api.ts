/**
 * API Client - Backward Compatible Version
 * @version 0.8.0
 */

import { TokenManager, apiClient } from './apiClient';

const USE_SERVER = (import.meta.env.VITE_USE_SERVER || 'true') === 'true';

export { TokenManager, apiClient };

export const api = {
  USE_SERVER,
  
  login: async (username: string, password: string) => {
    const data = await apiClient.post('/auth/login', { username, password });
    if (data?.token) TokenManager.setToken(data.token);
    return data;
  },

  logout: () => {
    TokenManager.removeToken();
  },

  // Users
  getUsers: () => apiClient.get('/users'),
  createUser: (payload: Record<string, any>) => apiClient.post('/users', payload),
  updateUser: (id: string, payload: Record<string, any>) => apiClient.put(`/users/${id}`, payload),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),

  // Roles
  getRoles: () => apiClient.get('/roles'),
  createRole: (payload: Record<string, any>) => apiClient.post('/roles', payload),
  updateRole: (id: string, payload: Record<string, any>) => apiClient.put(`/roles/${id}`, payload),
  deleteRole: (id: string) => apiClient.delete(`/roles/${id}`),

  // Events
  getEvents: () => apiClient.get('/events'),
  createEvent: (payload: Record<string, any>) => apiClient.post('/events', payload),
  updateEvent: (id: string, payload: Record<string, any>) => apiClient.put(`/events/${id}`, payload),
  deleteEvent: (id: string) => apiClient.delete(`/events/${id}`),

  // Expenses
  getExpenses: (params?: Record<string, string | number | boolean>) => 
    apiClient.get('/expenses', { params }),
  
  createExpense: async (payload: Record<string, any>, receipt?: File) => {
    if (receipt) {
      return apiClient.upload('/expenses', payload, receipt, 'receipt');
    }
    return apiClient.post('/expenses', payload);
  },

  updateExpense: async (id: string, payload: Record<string, any>, receipt?: File) => {
    if (receipt) {
      return apiClient.upload(`/expenses/${id}`, payload, receipt, 'receipt', 'PUT');
    }
    return apiClient.put(`/expenses/${id}`, payload);
  },
  
  // Update expense status (pending/approved/rejected/needs further review)
  updateExpenseStatus: (id: string, payload: { status: 'pending' | 'approved' | 'rejected' | 'needs further review' }) =>
    apiClient.patch(`/expenses/${id}/status`, payload),
  
  // Legacy review endpoint (kept for backwards compatibility)
  reviewExpense: (id: string, payload: { status: 'approved' | 'rejected'; comments?: string }) =>
    apiClient.patch(`/expenses/${id}/review`, payload),
  
  assignEntity: (id: string, payload: { zoho_entity: string }) =>
    apiClient.patch(`/expenses/${id}/entity`, payload),
  
  pushToZoho: (id: string) =>
    apiClient.post(`/expenses/${id}/push-to-zoho`, {}),
  
  setExpenseReimbursement: (id: string, payload: { reimbursement_status: 'pending review' | 'approved' | 'rejected' | 'paid' }) =>
    apiClient.patch(`/expenses/${id}/reimbursement`, payload),
  
  deleteExpense: (id: string) => apiClient.delete(`/expenses/${id}`),

  // Settings
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (payload: Record<string, any>) => apiClient.put('/settings', payload),

  // OCR
  processReceiptWithOCR: async (formData: FormData) => {
    const token = TokenManager.getToken();
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await fetch(`${apiClient.getBaseURL()}/ocr/v2/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OCR] Processing failed:', errorText);
      throw new Error('OCR processing failed');
    }

    return await response.json();
  },

  // Helper to get base URL
  getBaseURL: () => apiClient.getBaseURL(),

  // Authentication & Registration
  register: (data: { name: string; email: string; username: string; password: string }) =>
    apiClient.post('/auth/register', data),
  checkAvailability: (data: { username?: string; email?: string }) =>
    apiClient.post('/auth/check-availability', data),

  // Quick Actions / Pending Tasks
  quickActions: {
    getTasks: () => apiClient.get('/quick-actions'),
  },

  // Developer Dashboard
  devDashboard: {
    getVersion: () => apiClient.get('/dev-dashboard/version'),
    getMetrics: (timeRange?: string) => apiClient.get('/dev-dashboard/metrics', { params: { timeRange } }),
    getAuditLogs: (params?: Record<string, any>) => apiClient.get('/dev-dashboard/audit-logs', { params }),
    getSessions: () => apiClient.get('/dev-dashboard/sessions'),
    getApiAnalytics: (timeRange?: string) => apiClient.get('/dev-dashboard/api-analytics', { params: { timeRange } }),
    getAlerts: (status?: string, severity?: string) => apiClient.get('/dev-dashboard/alerts', { params: { status, severity } }),
    acknowledgeAlert: (id: string) => apiClient.post(`/dev-dashboard/alerts/${id}/acknowledge`),
    resolveAlert: (id: string) => apiClient.post(`/dev-dashboard/alerts/${id}/resolve`),
    getPageAnalytics: (timeRange?: string) => apiClient.get('/dev-dashboard/page-analytics', { params: { timeRange } }),
    getSummary: () => apiClient.get('/dev-dashboard/summary'),
    getOcrMetrics: () => apiClient.get('/dev-dashboard/ocr-metrics'),
  },

  // Checklist
  checklist: {
    getChecklist: (eventId: string) => apiClient.get(`/checklist/${eventId}`),
    updateChecklist: (checklistId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/${checklistId}`, payload),
    uploadBoothMap: async (checklistId: number, file: File) => {
      const formData = new FormData();
      formData.append('boothMap', file);
      
      // Use fetch directly because apiClient.post() sets Content-Type: application/json
      const token = TokenManager.getToken();
      const response = await fetch(`${apiClient.getBaseURL()}/checklist/${checklistId}/booth-map`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload booth map');
      }
      
      return await response.json();
    },
    deleteBoothMap: (checklistId: number) => 
      apiClient.delete(`/checklist/${checklistId}/booth-map`),
    
    // Flights
    createFlight: (checklistId: number, payload: Record<string, any>) => 
      apiClient.post(`/checklist/${checklistId}/flights`, payload),
    updateFlight: (flightId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/flights/${flightId}`, payload),
    deleteFlight: (flightId: number) => 
      apiClient.delete(`/checklist/flights/${flightId}`),
    
    // Hotels
    createHotel: (checklistId: number, payload: Record<string, any>) => 
      apiClient.post(`/checklist/${checklistId}/hotels`, payload),
    updateHotel: (hotelId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/hotels/${hotelId}`, payload),
    deleteHotel: (hotelId: number) => 
      apiClient.delete(`/checklist/hotels/${hotelId}`),
    
    // Car Rentals
    createCarRental: (checklistId: number, payload: Record<string, any>) => 
      apiClient.post(`/checklist/${checklistId}/car-rentals`, payload),
    updateCarRental: (carRentalId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/car-rentals/${carRentalId}`, payload),
    deleteCarRental: (carRentalId: number) => 
      apiClient.delete(`/checklist/car-rentals/${carRentalId}`),
    
    // Booth Shipping
    createBoothShipping: (checklistId: number, payload: Record<string, any>) => 
      apiClient.post(`/checklist/${checklistId}/booth-shipping`, payload),
    updateBoothShipping: (shippingId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/booth-shipping/${shippingId}`, payload),
    deleteBoothShipping: (shippingId: number) => 
      apiClient.delete(`/checklist/booth-shipping/${shippingId}`),
    
    // Custom Items
    getCustomItems: (checklistId: number) => 
      apiClient.get(`/checklist/${checklistId}/custom-items`),
    createCustomItem: (checklistId: number, payload: Record<string, any>) => 
      apiClient.post(`/checklist/${checklistId}/custom-items`, payload),
    updateCustomItem: (itemId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/custom-items/${itemId}`, payload),
    deleteCustomItem: (itemId: number) => 
      apiClient.delete(`/checklist/custom-items/${itemId}`),
    
    // Templates
    getTemplates: () => 
      apiClient.get('/checklist/templates'),
    createTemplate: (payload: Record<string, any>) => 
      apiClient.post('/checklist/templates', payload),
    updateTemplate: (templateId: number, payload: Record<string, any>) => 
      apiClient.put(`/checklist/templates/${templateId}`, payload),
    deleteTemplate: (templateId: number) => 
      apiClient.delete(`/checklist/templates/${templateId}`),
    applyTemplates: (checklistId: number) => 
      apiClient.post(`/checklist/${checklistId}/apply-templates`, {}),
  },
};
