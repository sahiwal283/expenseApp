import { useState, useEffect, useCallback } from 'react';
import { User } from '../App';
import { api, TokenManager } from '../utils/api';

// Demo user credentials
const DEMO_CREDENTIALS = {
  admin: 'admin',
  sarah: 'password',
  mike: 'password',
  lisa: 'password'
};
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('tradeshow_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      if (api.USE_SERVER) {
        const data = await api.login(username, password) as { user?: User; token?: string };
        const serverUser = data?.user;
        if (data?.token && serverUser) {
          TokenManager.setToken(data.token);
          setUser(serverUser);
          localStorage.setItem('tradeshow_current_user', JSON.stringify(serverUser));
          return true;
        }
        return false;
      }

      // Fallback demo mode
      if (DEMO_CREDENTIALS[username as keyof typeof DEMO_CREDENTIALS] !== password) return false;
      const users = JSON.parse(localStorage.getItem('tradeshow_users') || '[]');
      const foundUser = users.find((u: User) => u.username === username);
      if (!foundUser) return false;
      setUser(foundUser);
      localStorage.setItem('tradeshow_current_user', JSON.stringify(foundUser));
      return true;
    } catch (error: unknown) {
      // Log error for debugging
      console.error('[useAuth] Login error:', error);
      
      // Re-throw error so calling component can display appropriate message
      // This allows LoginForm to distinguish between network errors and auth failures
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('tradeshow_current_user');
    TokenManager.removeToken(); // Also clear JWT token
  }, []);

  return { user, login, logout };
};