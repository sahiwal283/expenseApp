/**
 * ExpenseModalFooter Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 1659-1710, ~62 lines)
 * Modal footer with Close/Edit or Cancel/Save buttons
 */

import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ExpenseModalFooterProps {
  isEditingExpense: boolean;
  isSaving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ExpenseModalFooter: React.FC<ExpenseModalFooterProps> = ({
  isEditingExpense,
  isSaving,
  onClose,
  onEdit,
  onCancel,
  onSave,
}) => {
  return (
    <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end space-x-3">
      {!isEditingExpense ? (
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Edit Expense
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};

