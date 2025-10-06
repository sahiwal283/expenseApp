import { useState, useEffect } from 'react';
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

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      if (api.USE_SERVER) {
        const data = await api.login(username, password);
        const serverUser = data?.user as User | undefined;
        if (data?.token && serverUser) {
          setToken(data.token);
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
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tradeshow_current_user');
  };

  return { user, login, logout };
};