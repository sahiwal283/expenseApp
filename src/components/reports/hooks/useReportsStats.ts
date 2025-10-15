/**
 * useReportsStats Hook
 * 
 * Calculates statistics for Reports component
 */

import { useMemo } from 'react';
import { Expense } from '../../../App';
import { parseLocalDate } from '../../../utils/dateUtils';

interface UseReportsStatsProps {
  expenses: Expense[];
  selectedEvent: string;
  selectedPeriod: string;
  selectedEntity: string;
  entityOptions: string[];
}

export function useReportsStats({
  expenses,
  selectedEvent,
  selectedPeriod,
  selectedEntity,
  entityOptions
}: UseReportsStatsProps) {
  // Filter expenses based on selections
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const eventMatch = selectedEvent === 'all' || expense.tradeShowId === selectedEvent;
      const entityMatch = selectedEntity === 'all' || expense.zohoEntity === selectedEntity;
      
      let periodMatch = true;
      if (selectedPeriod !== 'all') {
        const expenseDate = parseLocalDate(expense.date);
        const now = new Date();
        
        switch (selectedPeriod) {
          case 'week':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            break;
          case 'quarter':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
            break;
        }
      }
      
      return eventMatch && entityMatch && periodMatch;
    });
  }, [expenses, selectedEvent, selectedEntity, selectedPeriod]);

  // Calculate report statistics
  const reportStats = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const approvedAmount = filteredExpenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const pendingAmount = filteredExpenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAmount,
      approvedAmount,
      pendingAmount,
      expenseCount: filteredExpenses.length,
      categoryBreakdown
    };
  }, [filteredExpenses]);

  // Calculate entity totals (filtered, only active entities)
  const entityTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      // Only include expenses with entities that are in the active entity options
      if (expense.zohoEntity && entityOptions.includes(expense.zohoEntity)) {
        totals[expense.zohoEntity] = (totals[expense.zohoEntity] || 0) + expense.amount;
      }
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1]) // Sort by amount descending
      .map(([entity, amount]) => ({ entity, amount }));
  }, [filteredExpenses, entityOptions]);

  return {
    filteredExpenses,
    reportStats,
    entityTotals
  };
}

