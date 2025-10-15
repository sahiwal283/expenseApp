/**
 * useExpenseFilters Hook
 * 
 * Manages filter state for ExpenseSubmission
 */

import { useState, useMemo } from 'react';
import { Expense } from '../../../../App';

export function useExpenseFilters(expenses: Expense[]) {
  const [dateFilter, setDateFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [cardFilter, setCardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reimbursementFilter, setReimbursementFilter] = useState('all');

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesDate = !dateFilter || expense.date === dateFilter;
      const matchesEvent = eventFilter === 'all' || expense.tradeShowId === eventFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesMerchant = !merchantFilter || expense.merchant.toLowerCase().includes(merchantFilter.toLowerCase());
      const matchesCard = cardFilter === 'all' || expense.cardUsed === cardFilter;
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesReimbursement = reimbursementFilter === 'all' || 
        (reimbursementFilter === 'required' && expense.reimbursementRequired) ||
        (reimbursementFilter === 'not-required' && !expense.reimbursementRequired);

      return matchesDate && matchesEvent && matchesCategory && matchesMerchant && 
             matchesCard && matchesStatus && matchesReimbursement;
    });
  }, [expenses, dateFilter, eventFilter, categoryFilter, merchantFilter, cardFilter, statusFilter, reimbursementFilter]);

  // Check if filters are active
  const hasActiveFilters = dateFilter !== '' || eventFilter !== 'all' || categoryFilter !== 'all' ||
    merchantFilter !== '' || cardFilter !== 'all' || statusFilter !== 'all' || reimbursementFilter !== 'all';

  // Clear all filters
  const clearAllFilters = () => {
    setDateFilter('');
    setEventFilter('all');
    setCategoryFilter('all');
    setMerchantFilter('');
    setCardFilter('all');
    setStatusFilter('all');
    setReimbursementFilter('all');
  };

  // Get unique values for filter options
  const uniqueCategories = useMemo(() => [...new Set(expenses.map(e => e.category))], [expenses]);
  const uniqueCards = useMemo(() => [...new Set(expenses.map(e => e.cardUsed))], [expenses]);

  return {
    // State
    dateFilter, setDateFilter,
    eventFilter, setEventFilter,
    categoryFilter, setCategoryFilter,
    merchantFilter, setMerchantFilter,
    cardFilter, setCardFilter,
    statusFilter, setStatusFilter,
    reimbursementFilter, setReimbursementFilter,
    
    // Computed
    filteredExpenses,
    hasActiveFilters,
    uniqueCategories,
    uniqueCards,
    clearAllFilters
  };
}

