/**
 * ExpenseModalDuplicateWarning Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 1102-1124, ~23 lines)
 * Warning banner for possible duplicate expenses
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DuplicateCheck {
  expenseId: string;
  date: string;
  merchant: string;
  amount: number;
}

interface ExpenseModalDuplicateWarningProps {
  duplicateCheck: DuplicateCheck[] | undefined;
}

export const ExpenseModalDuplicateWarning: React.FC<ExpenseModalDuplicateWarningProps> = ({
  duplicateCheck,
}) => {
  if (!duplicateCheck || duplicateCheck.length === 0) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <p className="font-semibold text-amber-900">⚠ Possible Duplicate Expenses</p>
      </div>
      <div className="space-y-2">
        {duplicateCheck.map((dup, index) => {
          const dupDate = new Date(dup.date);
          const formattedDate = dupDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          return (
            <div key={index} className="text-sm text-amber-900 bg-white rounded p-2">
              ⚠ Possible duplicate: Expense #{dup.expenseId} (${dup.amount.toFixed(2)} at {dup.merchant} on{' '}
              {formattedDate})
            </div>
          );
        })}
      </div>
    </div>
  );
};

