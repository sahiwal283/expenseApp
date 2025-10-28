import React from 'react';
import { Clock, DollarSign, MapPin, Calendar } from 'lucide-react';
import { Expense } from '../../App';
import { formatLocalDate } from '../../utils/dateUtils';
import { StatusBadge, CategoryBadge } from '../common';

interface RecentExpensesProps {
  onPageChange: (page: string) => void;
  expenses: Expense[];
}

export const RecentExpenses: React.FC<RecentExpensesProps> = ({ expenses, onPageChange }) => {
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Expenses</h3>
        <button onClick={() => onPageChange('expenses')} className="text-blue-600 hover:text-blue-700 font-medium">View All</button>
      </div>

      {recentExpenses.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No expenses yet</p>
          <p className="text-sm text-gray-400 mt-1">Submit your first expense to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{expense.merchant}</p>
                    {expense.event_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Calendar className="w-3 h-3" />
                        {expense.event_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatLocalDate(expense.date)}</span>
                    {expense.location && (
                      <>
                        <MapPin className="w-3 h-3 ml-2" />
                        <span>{expense.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CategoryBadge category={expense.category} size="sm" />
                <StatusBadge status={expense.status} size="sm" />
                <p className="font-semibold text-gray-900">${expense.amount.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};