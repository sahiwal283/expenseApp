// Lightweight API client for server-backed mode

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const USE_SERVER: boolean = ((import.meta as any).env?.VITE_USE_SERVER || 'true') === 'true';

function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}

export function setToken(token: string) {
  localStorage.setItem('jwt_token', token);
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  USE_SERVER,
  login: async (username: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data?.token) setToken(data.token);
    return data;
  },
  getUsers: async () => apiFetch('/users'),
  getEvents: async () => apiFetch('/events'),
  getExpenses: async (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : '';
    return apiFetch(`/expenses${qs}`);
  },
  createExpense: async (payload: Record<string, any>, receipt?: File) => {
    if (receipt) {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
      form.append('receipt', receipt);
      const token = getToken();
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(`Create expense failed: ${res.status}`);
      return res.json();
    }
    return apiFetch('/expenses', { method: 'POST', body: JSON.stringify(payload) });
  },
  deleteExpense: async (id: string) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
  getSettings: async () => apiFetch('/settings'),
};


