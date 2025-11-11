/**
 * useUserManagement Hook
 * 
 * Handles loading users and roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '../../../../App';
import { api } from '../../../../utils/api';

interface Role {
  id: string;
  name: string;
  label: string;
  color?: string;
}

interface UseUserManagementReturn {
  users: User[];
  roles: Role[];
  loadUsers: () => Promise<void>;
}

export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadUsers = useCallback(async () => {
    if (api.USE_SERVER) {
      try {
        const data = await api.getUsers();
        setUsers(data || []);
        
        // Load roles from database
        const rolesData = await api.getRoles();
        // Filter out 'pending' role from dropdowns (it's for new registrations only)
        setRoles((rolesData || []).filter((r: Role) => r.name !== 'pending'));
      } catch {
        setUsers([]);
      }
    } else {
      const storedUsers = localStorage.getItem('tradeshow_users');
      if (storedUsers) setUsers(JSON.parse(storedUsers));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    roles,
    loadUsers
  };
}

