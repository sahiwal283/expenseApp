import { useState, useEffect } from 'react';
import { User } from './App';

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

  const login = (username: string, password: string): boolean => {
    // Check credentials
    if (DEMO_CREDENTIALS[username as keyof typeof DEMO_CREDENTIALS] !== password) {
      return false;
    }

    const users = JSON.parse(localStorage.getItem('tradeshow_users') || '[]');
    const foundUser = users.find((u: User) => u.username === username);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('tradeshow_current_user', JSON.stringify(foundUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tradeshow_current_user');
  };

  return { user, login, logout };
};