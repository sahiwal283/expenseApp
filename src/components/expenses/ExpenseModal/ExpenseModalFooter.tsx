/**
 * ExpenseModalFooter Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 1659-1710, ~62 lines)
 * Modal footer with Close/Edit/Download or Cancel/Save buttons
 */

import React, { useState } from 'react';
import { CheckCircle, Loader2, Download } from 'lucide-react';

interface ExpenseModalFooterProps {
  isEditingExpense: boolean;
  isSaving: boolean;
  expenseId?: string;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDownloadPDF?: (expenseId: string) => Promise<void>;
}

export const ExpenseModalFooter: React.FC<ExpenseModalFooterProps> = ({
  isEditingExpense,
  isSaving,
  expenseId,
  onClose,
  onEdit,
  onCancel,
  onSave,
  onDownloadPDF,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!expenseId || !onDownloadPDF) return;
    
    setIsDownloading(true);
    try {
      await onDownloadPDF(expenseId);
    } catch (error) {
      console.error('[ExpenseModalFooter] Error downloading PDF:', error);
      // Error handling is done in parent component via toast
    } finally {
      setIsDownloading(false);
    }
  };

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
          {expenseId && onDownloadPDF && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Download expense PDF"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Expense</span>
                </>
              )}
            </button>
          )}
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

