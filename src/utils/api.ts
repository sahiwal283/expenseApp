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
  },
};
