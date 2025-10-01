// Application Constants
// Version: 0.5.1-alpha

// Version Information
export const APP_VERSION = '0.5.1-alpha';
export const APP_NAME = 'Trade Show Expense Management App';

// Demo User Credentials
export const DEMO_CREDENTIALS: Record<string, string> = {
  admin: 'admin',
  sarah: 'password',
  mike: 'password',
  lisa: 'password'
};

// localStorage Keys
export const STORAGE_KEYS = {
  USERS: 'tradeshow_users',
  EVENTS: 'tradeshow_events',
  EXPENSES: 'tradeshow_expenses',
  CURRENT_USER: 'tradeshow_current_user',
  SETTINGS: 'app_settings'
} as const;

// Role Labels
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  coordinator: 'Show Coordinator',
  salesperson: 'Sales Person',
  accountant: 'Accountant'
};

// Role Colors for UI
export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  coordinator: 'bg-blue-100 text-blue-800',
  salesperson: 'bg-emerald-100 text-emerald-800',
  accountant: 'bg-orange-100 text-orange-800'
};

// Status Colors
export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
};

// Category Colors
export const CATEGORY_COLORS: Record<string, string> = {
  Flights: 'bg-blue-100 text-blue-800',
  Hotels: 'bg-emerald-100 text-emerald-800',
  Meals: 'bg-orange-100 text-orange-800',
  Supplies: 'bg-purple-100 text-purple-800',
  Transportation: 'bg-yellow-100 text-yellow-800',
  Other: 'bg-gray-100 text-gray-800'
};

// File Upload Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
export const FILE_TYPE_EXTENSIONS = '.jpg,.jpeg,.png,.pdf';
