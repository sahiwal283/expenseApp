/**
 * UserManagementHeader Component
 * 
 * Header section with title and Add User button.
 */

import React from 'react';
import { Plus } from 'lucide-react';

interface UserManagementHeaderProps {
  onAddUser: () => void;
}

export const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({ onAddUser }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage team members and their access levels</p>
      </div>
      <button
        onClick={onAddUser}
        className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Add User</span>
      </button>
    </div>
  );
};

