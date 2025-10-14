import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, CreditCard, Building2, Users, Pencil, Check, X, Tag } from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';
import { UserManagement } from './UserManagement';

interface AdminSettingsProps {
  user: User;
}

interface CardOption {
  name: string;
  lastFour: string;
}

interface AppSettings {
  cardOptions: CardOption[];
  entityOptions: string[];
  categoryOptions: string[];
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
  // Access control: Only admins and accountants can access settings
  if (user.role !== 'admin' && user.role !== 'accountant') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Access denied. Only administrators and accountants can access settings.</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [settings, setSettings] = useState<AppSettings>({
    cardOptions: [
      { name: 'Haute Intl USD Debit', lastFour: '0000' },
      { name: 'Haute Inc GBP Amex', lastFour: '0000' },
      { name: 'Haute Inc USD Amex', lastFour: '0000' },
      { name: 'Haute Inc USD Debit', lastFour: '0000' },
      { name: 'Haute LLC GBP Amex', lastFour: '0000' },
      { name: 'Haute LLC USD Amex', lastFour: '0000' },
      { name: 'Haute LLC USD Debit', lastFour: '0000' }
    ],
    entityOptions: [
      'Entity A - Main Operations',
      'Entity B - Sales Division',
      'Entity C - Marketing Department',
      'Entity D - International Operations'
    ],
    categoryOptions: [
      'Booth / Marketing / Tools',
      'Travel - Flight',
      'Accommodation - Hotel',
      'Transportation - Uber / Lyft / Others',
      'Parking Fees',
      'Rental - Car / U-haul',
      'Meal and Entertainment',
      'Gas / Fuel',
      'Show Allowances - Per Diem',
      'Model',
      'Shipping Charges',
      'Other'
    ]
  });

  const [newCardName, setNewCardName] = useState('');
  const [newCardLastFour, setNewCardLastFour] = useState('');
  const [newEntityOption, setNewEntityOption] = useState('');
  const [newCategoryOption, setNewCategoryOption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editCardName, setEditCardName] = useState('');
  const [editCardLastFour, setEditCardLastFour] = useState('');

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

  const saveSettings = async (updatedSettings?: AppSettings) => {
    const settingsToSave = updatedSettings || settings;
    setIsSaving(true);
    try {
      if (api.USE_SERVER) {
        await api.updateSettings(settingsToSave as any);
      } else {
        localStorage.setItem('app_settings', JSON.stringify(settingsToSave));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addCardOption = async () => {
    if (newCardName && newCardLastFour && newCardLastFour.length === 4) {
      const isDuplicate = settings.cardOptions.some(
        card => card.name === newCardName && card.lastFour === newCardLastFour
      );
      
      if (!isDuplicate) {
        const updatedSettings = {
          ...settings,
          cardOptions: [...settings.cardOptions, { name: newCardName, lastFour: newCardLastFour }]
        };
        setSettings(updatedSettings);
        setNewCardName('');
        setNewCardLastFour('');
        await saveSettings(updatedSettings);
      } else {
        alert('This card already exists.');
      }
    } else if (newCardLastFour && newCardLastFour.length !== 4) {
      alert('Last 4 digits must be exactly 4 characters.');
    }
  };

  const removeCardOption = async (option: CardOption) => {
    const updatedSettings = {
      ...settings,
      cardOptions: settings.cardOptions.filter(
        card => !(card.name === option.name && card.lastFour === option.lastFour)
      )
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const startEditCard = (index: number) => {
    setEditingCardIndex(index);
    setEditCardName(settings.cardOptions[index].name);
    setEditCardLastFour(settings.cardOptions[index].lastFour);
  };

  const cancelEditCard = () => {
    setEditingCardIndex(null);
    setEditCardName('');
    setEditCardLastFour('');
  };

  const saveEditCard = async (index: number) => {
    if (editCardName && editCardLastFour && editCardLastFour.length === 4) {
      const updatedCards = [...settings.cardOptions];
      updatedCards[index] = { name: editCardName, lastFour: editCardLastFour };
      const updatedSettings = {
        ...settings,
        cardOptions: updatedCards
      };
      setSettings(updatedSettings);
      setEditingCardIndex(null);
      setEditCardName('');
      setEditCardLastFour('');
      await saveSettings(updatedSettings);
    } else if (editCardLastFour && editCardLastFour.length !== 4) {
      alert('Last 4 digits must be exactly 4 characters.');
    }
  };

  const addEntityOption = async () => {
    if (newEntityOption && !settings.entityOptions.includes(newEntityOption)) {
      const updatedSettings = {
        ...settings,
        entityOptions: [...settings.entityOptions, newEntityOption]
      };
      setSettings(updatedSettings);
      setNewEntityOption('');
      await saveSettings(updatedSettings);
    }
  };

  const removeEntityOption = async (option: string) => {
    const updatedSettings = {
      ...settings,
      entityOptions: settings.entityOptions.filter(entity => entity !== option)
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const addCategoryOption = async () => {
    if (newCategoryOption && !settings.categoryOptions.includes(newCategoryOption)) {
      const updatedSettings = {
        ...settings,
        categoryOptions: [...settings.categoryOptions, newCategoryOption]
      };
      setSettings(updatedSettings);
      setNewCategoryOption('');
      await saveSettings(updatedSettings);
    }
  };

  const removeCategoryOption = async (option: string) => {
    const updatedSettings = {
      ...settings,
      categoryOptions: settings.categoryOptions.filter(category => category !== option)
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system settings and user accounts</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        {/* Card Options Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
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
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCardOption()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Card name (e.g., Haute Inc USD Amex)"
              />
              <input
                type="text"
                value={newCardLastFour}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewCardLastFour(value);
                }}
                onKeyPress={(e) => e.key === 'Enter' && addCardOption()}
                className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Last 4"
                maxLength={4}
              />
              <button
                onClick={addCardOption}
                disabled={!newCardName || !newCardLastFour || newCardLastFour.length !== 4 || isSaving}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {settings.cardOptions.map((option, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg">
                  {editingCardIndex === index ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editCardName}
                          onChange={(e) => setEditCardName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Card name"
                        />
                        <input
                          type="text"
                          value={editCardLastFour}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setEditCardLastFour(value);
                          }}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Last 4"
                          maxLength={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditCard(index)}
                          disabled={isSaving || !editCardName || !editCardLastFour || editCardLastFour.length !== 4}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditCard}
                          disabled={isSaving}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-900">{option.name} | {option.lastFour}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCard(index)}
                          disabled={isSaving}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeCardOption(option)}
                          disabled={isSaving}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entity Options Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
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
                onKeyPress={(e) => e.key === 'Enter' && addEntityOption()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new entity option..."
              />
              <button
                onClick={addEntityOption}
                disabled={!newEntityOption || isSaving}
                className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {settings.entityOptions.map((option, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-900">{option}</span>
                  <button
                    onClick={() => removeEntityOption(option)}
                    disabled={isSaving}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Options Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Expense Categories</h3>
              <p className="text-gray-600">Manage expense category options</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newCategoryOption}
                onChange={(e) => setNewCategoryOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCategoryOption()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new category option..."
              />
              <button
                onClick={addCategoryOption}
                disabled={!newCategoryOption || isSaving}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {settings.categoryOptions.map((option, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-900">{option}</span>
                  <button
                    onClick={() => removeCategoryOption(option)}
                    disabled={isSaving}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Settings Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Card Options</h4>
            <p className="text-sm text-gray-600">{settings.cardOptions?.length || 0} options configured</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Entity Options</h4>
            <p className="text-sm text-gray-600">{settings.entityOptions?.length || 0} entities configured</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Category Options</h4>
            <p className="text-sm text-gray-600">{settings.categoryOptions?.length || 0} categories configured</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes to these settings are automatically saved to the database and will be immediately reflected in all expense forms and dropdowns throughout the application.
          </p>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

