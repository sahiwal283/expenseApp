/**
 * ExpenseModalHeader Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 1082-1098, ~20 lines)
 * Modal header with event name and close button
 */

import React from 'react';
import { X } from 'lucide-react';
import { TradeShow } from '../../../App';

interface ExpenseModalHeaderProps {
  eventName: string | undefined;
  onClose: () => void;
}

export const ExpenseModalHeader: React.FC<ExpenseModalHeaderProps> = ({ eventName, onClose }) => {
  return (
    <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
      <div>
        <h2 className="text-xl font-bold">Expense Details</h2>
        <p className="text-sm text-purple-100">{eventName || 'N/A'}</p>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

