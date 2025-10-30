/**
 * Filter Utilities
 * 
 * Consolidates common filtering logic used across multiple components.
 * Eliminates duplicate filter implementations in ExpenseSubmission, Approvals,
 * AccountantDashboard, and Reports.
 */

import { Expense } from '../App';

/**
 * Generic filter function for any field
 */
export function filterByField<T>(
  items: T[],
  field: keyof T,
  filterValue: string | number | boolean,
  matchType: 'exact' | 'includes' | 'startsWith' = 'exact'
): T[] {
  if (!filterValue || filterValue === 'all') return items;

  return items.filter(item => {
    const fieldValue = item[field];
    
    if (matchType === 'exact') {
      return fieldValue === filterValue;
    }
    
    if (matchType === 'includes' && typeof fieldValue === 'string' && typeof filterValue === 'string') {
      return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
    }
    
    if (matchType === 'startsWith' && typeof fieldValue === 'string' && typeof filterValue === 'string') {
      return fieldValue.toLowerCase().startsWith(filterValue.toLowerCase());
    }
    
    return fieldValue === filterValue;
  });
}

/**
 * Filter expenses by multiple criteria
 */
export interface ExpenseFilters {
  date?: string;
  event?: string;
  category?: string;
  merchant?: string;
  card?: string;
  status?: string;
  reimbursement?: string;
  entity?: string;
  user?: string;
  search?: string;
}

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  return expenses.filter(expense => {
    // Date filter (supports both full date YYYY-MM-DD and month YYYY-MM)
    if (filters.date && !expense.date.startsWith(filters.date)) {
      return false;
    }

    // Event filter
    if (filters.event && filters.event !== 'all' && expense.tradeShowId !== filters.event) {
      return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'all' && expense.category !== filters.category) {
      return false;
    }

    // Merchant filter (case-insensitive includes)
    if (filters.merchant && !expense.merchant.toLowerCase().includes(filters.merchant.toLowerCase())) {
      return false;
    }

    // Card filter
    if (filters.card && filters.card !== 'all' && expense.cardUsed !== filters.card) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all' && expense.status !== filters.status) {
      return false;
    }

    // Reimbursement filter
    if (filters.reimbursement && filters.reimbursement !== 'all') {
      if (filters.reimbursement === 'required' && !expense.reimbursementRequired) {
        return false;
      }
      if (filters.reimbursement === 'not-required' && expense.reimbursementRequired) {
        return false;
      }
    }

    // Entity filter
    if (filters.entity && filters.entity !== 'all' && expense.zohoEntity !== filters.entity) {
      return false;
    }

    // User filter
    if (filters.user && filters.user !== 'all' && expense.userId !== filters.user && expense.user_id !== filters.user) {
      return false;
    }

    // Search filter (merchant, description, or category)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesMerchant = expense.merchant.toLowerCase().includes(searchLower);
      const matchesDescription = expense.description?.toLowerCase().includes(searchLower);
      const matchesCategory = expense.category.toLowerCase().includes(searchLower);
      
      if (!matchesMerchant && !matchesDescription && !matchesCategory) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort expenses by various criteria
 */
export type ExpenseSortOption =
  | 'default'
  | 'date-newest'
  | 'date-oldest'
  | 'amount-highest'
  | 'amount-lowest'
  | 'merchant-az'
  | 'merchant-za'
  | 'category-az'
  | 'category-za';

export function sortExpenses(expenses: Expense[], sortBy: ExpenseSortOption): Expense[] {
  const sorted = [...expenses];

  switch (sortBy) {
    case 'default':
      // Default: pending expenses at the top, then by date (newest first)
      sorted.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      break;

    case 'date-newest':
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      break;

    case 'date-oldest':
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;

    case 'amount-highest':
      sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0));
      break;

    case 'amount-lowest':
      sorted.sort((a, b) => (a.amount || 0) - (b.amount || 0));
      break;

    case 'merchant-az':
      sorted.sort((a, b) => a.merchant.localeCompare(b.merchant));
      break;

    case 'merchant-za':
      sorted.sort((a, b) => b.merchant.localeCompare(a.merchant));
      break;

    case 'category-az':
      sorted.sort((a, b) => a.category.localeCompare(b.category));
      break;

    case 'category-za':
      sorted.sort((a, b) => b.category.localeCompare(a.category));
      break;
  }

  return sorted;
}

/**
 * Get unique values from an array of objects for a specific field
 */
export function getUniqueValues<T>(items: T[], field: keyof T): string[] {
  const values = items.map(item => String(item[field])).filter(Boolean);
  return Array.from(new Set(values)).sort();
}

/**
 * Get unique categories from expenses
 */
export function getUniqueCategories(expenses: Expense[]): string[] {
  return getUniqueValues(expenses, 'category');
}

/**
 * Get unique cards from expenses
 */
export function getUniqueCards(expenses: Expense[]): string[] {
  return getUniqueValues(expenses, 'cardUsed');
}

/**
 * Get unique merchants from expenses
 */
export function getUniqueMerchants(expenses: Expense[]): string[] {
  return getUniqueValues(expenses, 'merchant');
}

/**
 * Check if any filters are active
 * 
 * @param filters - Filter object to check
 * @returns true if any filter has a non-default value
 * 
 * @example
 * ```typescript
 * const filters = { date: '2024-01', status: 'pending', event: 'all' };
 * hasActiveFilters(filters); // true (date and status are active)
 * ```
 */
export function hasActiveFilters(filters: ExpenseFilters): boolean {
  // Define default/empty values for each filter type
  const isFilterActive = (key: keyof ExpenseFilters, value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (value === '') return false;
    if (value === 'all') return false;
    return true;
  };

  // Check if any filter is active
  return Object.entries(filters).some(([key, value]) => 
    isFilterActive(key as keyof ExpenseFilters, value)
  );
}

/**
 * Clear all filters (returns empty filter object)
 */
export function clearAllFilters(): ExpenseFilters {
  return {
    date: '',
    event: 'all',
    category: 'all',
    merchant: '',
    card: 'all',
    status: 'all',
    reimbursement: 'all',
    entity: 'all',
    user: 'all',
    search: ''
  };
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: ExpenseFilters): number {
  let count = 0;
  
  if (filters.date && filters.date !== '') count++;
  if (filters.event && filters.event !== 'all') count++;
  if (filters.category && filters.category !== 'all') count++;
  if (filters.merchant && filters.merchant !== '') count++;
  if (filters.card && filters.card !== 'all') count++;
  if (filters.status && filters.status !== 'all') count++;
  if (filters.reimbursement && filters.reimbursement !== 'all') count++;
  if (filters.entity && filters.entity !== 'all') count++;
  if (filters.user && filters.user !== 'all') count++;
  if (filters.search && filters.search !== '') count++;
  
  return count;
}

