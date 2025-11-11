/**
 * ExpenseSubmissionHeader Component
 * 
 * Header section with title, description, and action buttons.
 */

import React from 'react';
import { Receipt, X, Clock } from 'lucide-react';

interface ExpenseSubmissionHeaderProps {
  hasApprovalPermission: boolean;
  hasActiveFilters: boolean;
  pendingCount: number;
  onClearFilters: () => void;
  onShowPendingSync: () => void;
  onAddExpense: () => void;
}

export const ExpenseSubmissionHeader: React.FC<ExpenseSubmissionHeaderProps> = ({
  hasApprovalPermission,
  hasActiveFilters,
  pendingCount,
  onClearFilters,
  onShowPendingSync,
  onAddExpense
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expense Management</h1>
        <p className="text-gray-600 mt-1">
          {hasApprovalPermission 
            ? 'Review, approve, and manage expense submissions'
            : 'Submit and track your trade show expenses'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span>Clear Filters</span>
          </button>
        )}
        {pendingCount > 0 && (
          <button
            onClick={onShowPendingSync}
            className="relative bg-orange-50 text-orange-700 border border-orange-200 px-4 py-3 rounded-lg font-medium hover:bg-orange-100 transition-all duration-200 flex items-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>Pending Sync</span>
            <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
              {pendingCount}
            </span>
          </button>
        )}
        <button
          onClick={onAddExpense}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/30"
        >
          <Receipt className="w-5 h-5" />
          <span>Add Expense</span>
        </button>
      </div>
    </div>
  );
};

