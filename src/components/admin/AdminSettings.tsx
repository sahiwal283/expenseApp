import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, CreditCard, Building2, Users } from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';
import { UserManagement } from './UserManagement';

interface AdminSettingsProps {
  user: User;
}

interface AppSettings {
  cardOptions: string[];
  entityOptions: string[];
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [settings, setSettings] = useState<AppSettings>({
    cardOptions: [
      'Corporate Amex',
      'Corporate Visa',
      'Personal Card (Reimbursement)',
      'Company Debit',
      'Cash'
    ],
    entityOptions: [
      'Entity A - Main Operations',
      'Entity B - Sales Division',
      'Entity C - Marketing Department',
      'Entity D - International Operations'
    ]
  });

  const [newCardOption, setNewCardOption] = useState('');
  const [newEntityOption, setNewEntityOption] = useState('');

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          const data = await api.getSettings();
          setSettings(data || settings);
        } catch {
          // keep defaults
        }
      } else {
        const storedSettings = localStorage.getItem('app_settings');
        if (storedSettings) setSettings(JSON.parse(storedSettings));
      }
    })();
  }, []);

  const saveSettings = async () => {
    if (api.USE_SERVER) {
      await api.updateSettings(settings as any);
    } else {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    }
    alert('Settings saved successfully!');
  };

  const addCardOption = () => {
    if (newCardOption && !settings.cardOptions.includes(newCardOption)) {
      setSettings({
        ...settings,
        cardOptions: [...settings.cardOptions, newCardOption]
      });
      setNewCardOption('');
    }
  };

  const removeCardOption = (option: string) => {
    setSettings({
      ...settings,
      cardOptions: settings.cardOptions.filter(card => card !== option)
    });
  };

  const addEntityOption = () => {
    if (newEntityOption && !settings.entityOptions.includes(newEntityOption)) {
      setSettings({
        ...settings,
        entityOptions: [...settings.entityOptions, newEntityOption]
      });
      setNewEntityOption('');
    }
  };

  const removeEntityOption = (option: string) => {
    setSettings({
      ...settings,
      entityOptions: settings.entityOptions.filter(entity => entity !== option)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage system settings and user accounts</p>
        </div>
        {activeTab === 'system' && (
          <button
            onClick={saveSettings}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Settings</span>
              </div>
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </div>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <UserManagement user={user} />
      ) : (
        <div className="space-y-6">

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card Options Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Card Options</h3>
              <p className="text-gray-600">Manage available payment card options</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newCardOption}
                onChange={(e) => setNewCardOption(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new card option..."
              />
              <button
                onClick={addCardOption}
                disabled={!newCardOption}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {settings.cardOptions.map((option, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-900">{option}</span>
                  <button
                    onClick={() => removeCardOption(option)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entity Options Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Entity Options</h3>
              <p className="text-gray-600">Manage Zoho entity assignments</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newEntityOption}
                onChange={(e) => setNewEntityOption(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new entity option..."
              />
              <button
                onClick={addEntityOption}
                disabled={!newEntityOption}
                className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {settings.entityOptions.map((option, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-900">{option}</span>
                  <button
                    onClick={() => removeEntityOption(option)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Settings Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Card Options</h4>
            <p className="text-sm text-gray-600">{settings.cardOptions?.length || 0} options configured</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Entity Options</h4>
            <p className="text-sm text-gray-600">{settings.entityOptions?.length || 0} entities configured</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes to these settings will be immediately reflected in all expense forms and dropdowns throughout the application. Remember to save your changes.
          </p>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};