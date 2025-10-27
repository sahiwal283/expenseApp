/**
 * ExpenseModalReceipt Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 1517-1544, ~27 lines)
 * Displays receipt image with toggle for full-size view
 */

import React, { useState } from 'react';
import { Receipt, Eye } from 'lucide-react';

interface ExpenseModalReceiptProps {
  receiptUrl: string;
}

export const ExpenseModalReceipt: React.FC<ExpenseModalReceiptProps> = ({ receiptUrl }) => {
  const [showFullReceipt, setShowFullReceipt] = useState(true);

  if (!receiptUrl) return null;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Receipt className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Receipt</h3>
        </div>
        <button
          onClick={() => setShowFullReceipt(!showFullReceipt)}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
        >
          <Eye className="w-4 h-4" />
          <span>{showFullReceipt ? 'Hide' : 'View Full Size'}</span>
        </button>
      </div>

      {showFullReceipt && (
        <div className="bg-white rounded-lg p-4">
          <img
            src={receiptUrl.replace(/^\/uploads/, '/api/uploads')}
            alt="Receipt"
            className="w-full h-auto max-h-[600px] object-contain rounded-lg border-2 border-gray-200 shadow-md"
          />
        </div>
      )}
    </div>
  );
};

