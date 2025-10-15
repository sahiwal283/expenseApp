/**
 * useDashboardStats Hook
 * 
 * Calculates dashboard statistics based on user role and permissions
 */

import { useMemo } from 'react';
import { Expense, TradeShow, User } from '../../../App';
import { parseLocalDate } from '../../../utils/dateUtils';

interface DashboardStatsInput {
  expenses: Expense[];
  events: TradeShow[];
  users: User[];
  currentUser: User;
}

export function useDashboardStats({ expenses, events, users, currentUser }: DashboardStatsInput) {
  const stats = useMemo(() => {
    // Filter data based on user role
    const isAdminOrAccountant = currentUser.role === 'admin' || 
                                 currentUser.role === 'developer' || 
                                 currentUser.role === 'accountant';
    
    // For non-admin/accountant users, only show their own expenses
    const userExpenses = isAdminOrAccountant 
      ? expenses 
      : expenses.filter(e => e.userId === currentUser.id);
    
    // For non-admin/coordinator users, only show events they're assigned to
    const userEvents = (currentUser.role === 'admin' || 
                        currentUser.role === 'developer' || 
                        currentUser.role === 'coordinator')
      ? events
      : events.filter(event => event.participants.some(p => p.id === currentUser.id));
    
    const totalExpenses = userExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const pendingExpenses = userExpenses.filter(e => e.status === 'pending').length;
    
    // Calculate active events based on end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeEvents = userEvents.filter(event => {
      const endDate = parseLocalDate(event.endDate);
      return endDate >= today;
    }).length;

    return {
      totalExpenses,
      pendingExpenses,
      upcomingEvents: activeEvents,
      activeEvents,
      totalEvents: userEvents.length,
      averageExpense: userExpenses.length > 0 ? totalExpenses / userExpenses.length : 0,
      teamMembers: users.length,
      userExpenses, // Pass filtered expenses
      userEvents    // Pass filtered events
    };
  }, [expenses, events, users, currentUser.id, currentUser.role]);

  return stats;
}

