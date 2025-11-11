/**
 * ExpenseSubmissionEmptyState Component
 * 
 * Empty state displayed when no expenses are found.
 */

import React from 'react';
import { Receipt } from 'lucide-react';

interface ExpenseSubmissionEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onAddExpense: () => void;
}

export const ExpenseSubmissionEmptyState: React.FC<ExpenseSubmissionEmptyStateProps> = ({
  hasActiveFilters,
  onClearFilters,
  onAddExpense
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Expenses Found</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasActiveFilters
          ? 'Try adjusting your filters to see more expenses.'
          : 'Start by submitting your first expense with automatic OCR extraction from receipts.'
        }
      </p>
      <div className="flex justify-center space-x-4">
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="bg-gray-100 text-gray-700 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
          >
            Clear Filters
          </button>
        )}
        <button
          onClick={onAddExpense}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
        >
          Add Expense
        </button>
      </div>
    </div>
  );
};

