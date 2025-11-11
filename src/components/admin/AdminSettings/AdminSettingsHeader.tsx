/**
 * AdminSettingsHeader Component
 * 
 * Header section for Admin Settings page.
 */

import React from 'react';

export const AdminSettingsHeader: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-gray-600 mt-1">Manage system settings and user accounts</p>
    </div>
  );
};

