/**
 * useApprovalFilters Hook
 * 
 * Manages filter state and filtered expense list for Approvals page
 */

import { useState, useMemo } from 'react';
import { Expense } from '../../../../App';

export interface ApprovalFilters {
  searchTerm: string;
  category: string;
  user: string;
  event: string;
  status: string;
  reimbursement: string;
  entity: string;
}

export function useApprovalFilters(expenses: Expense[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReimbursement, setFilterReimbursement] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  // Filter and sort expenses (pending items at top)
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(expense => {
      const matchesSearch = searchTerm === '' || 
        expense.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
      const matchesUser = filterUser === 'all' || expense.user_id === filterUser;
      const matchesEvent = filterEvent === 'all' || expense.tradeShowId === filterEvent;
      const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
      
      const matchesReimbursement = filterReimbursement === 'all' || 
        (filterReimbursement === 'required' && expense.reimbursementRequired) ||
        (filterReimbursement === 'not-required' && !expense.reimbursementRequired);

      const matchesEntity = filterEntity === 'all' || expense.zohoEntity === filterEntity;

      return matchesSearch && matchesCategory && matchesUser && matchesEvent && 
             matchesStatus && matchesReimbursement && matchesEntity;
    });

    // Sort: pending first, then by date (newest first)
    filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return filtered;
  }, [expenses, searchTerm, filterCategory, filterUser, filterEvent, filterStatus, filterReimbursement, filterEntity]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || 
    filterCategory !== 'all' || 
    filterUser !== 'all' || 
    filterEvent !== 'all' || 
    filterStatus !== 'all' || 
    filterReimbursement !== 'all' ||
    filterEntity !== 'all';

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterUser('all');
    setFilterEvent('all');
    setFilterStatus('all');
    setFilterReimbursement('all');
    setFilterEntity('all');
  };

  return {
    // State
    searchTerm,
    filterCategory,
    filterUser,
    filterEvent,
    filterStatus,
    filterReimbursement,
    filterEntity,
    
    // Setters
    setSearchTerm,
    setFilterCategory,
    setFilterUser,
    setFilterEvent,
    setFilterStatus,
    setFilterReimbursement,
    setFilterEntity,
    
    // Computed
    filteredExpenses,
    hasActiveFilters,
    clearAllFilters
  };
}

