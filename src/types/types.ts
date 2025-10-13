// Shared Type Definitions
// Version: 0.5.1-alpha

export type UserRole = 'admin' | 'coordinator' | 'salesperson' | 'accountant';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole | null;
  avatar?: string;
  registration_pending?: boolean;
  registration_date?: string;
}

export interface TradeShow {
  id: string;
  name: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  participants: User[];
  budget?: number;
  status: 'upcoming' | 'active' | 'completed';
  coordinatorId: string;
}

export interface Expense {
  id: string;
  userId: string;
  tradeShowId: string;
  amount: number;
  category: string;
  merchant: string;
  date: string;
  description: string;
  cardUsed: string;
  reimbursementRequired: boolean;
  reimbursementStatus?: 'pending review' | 'approved' | 'rejected' | 'paid';
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  zohoEntity?: string;
  location?: string;
  ocrText?: string;
  extractedData?: {
    total: number;
    category: string;
    merchant: string;
    date: string;
    location: string;
  };
}

export interface AppSettings {
  cardOptions: string[];
  entityOptions: string[];
}

// Constants
export const EXPENSE_CATEGORIES = ['Flights', 'Hotels', 'Meals', 'Supplies', 'Transportation', 'Other'] as const;
export const EXPENSE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const EVENT_STATUSES = ['upcoming', 'active', 'completed'] as const;

export const DEFAULT_CARD_OPTIONS = [
  'Corporate Amex',
  'Corporate Visa',
  'Personal Card (Reimbursement)',
  'Company Debit',
  'Cash'
];

export const DEFAULT_ENTITY_OPTIONS = [
  'Entity A - Main Operations',
  'Entity B - Sales Division',
  'Entity C - Marketing Department',
  'Entity D - International Operations'
];
