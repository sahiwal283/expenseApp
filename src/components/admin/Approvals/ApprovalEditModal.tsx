import React from 'react';
import { X } from 'lucide-react';
import { Expense } from '../../../App';
import { formatLocalDate } from '../../../utils/dateUtils';

interface ApprovalEditModalProps {
  expense: Expense;
  editStatus: 'pending' | 'approved' | 'rejected';
  editReimbursementStatus: 'pending review' | 'approved' | 'rejected' | 'paid';
  editEntity: string;
  entityOptions: string[];
  onClose: () => void;
  onSave: () => void;
  onStatusChange: (status: 'pending' | 'approved' | 'rejected') => void;
  onReimbursementStatusChange: (status: 'pending review' | 'approved' | 'rejected' | 'paid') => void;
  onEntityChange: (entity: string) => void;
}

export const ApprovalEditModal: React.FC<ApprovalEditModalProps> = ({
  expense,
  editStatus,
  editReimbursementStatus,
  editEntity,
  entityOptions,
  onClose,
  onSave,
  onStatusChange,
  onReimbursementStatusChange,
  onEntityChange,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-t-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <h2 className="text-xl font-bold">Edit Expense</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Expense Details (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Merchant</p>
                <p className="text-base font-semibold text-gray-900">{expense.merchant}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Amount</p>
                <p className="text-base font-semibold text-gray-900">${expense.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-base font-semibold text-gray-900">{expense.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatLocalDate(expense.date)}
                </p>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Approval Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => onStatusChange(e.target.value as 'pending' | 'approved' | 'rejected')}
                className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Reimbursement Status */}
            {expense.reimbursementRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reimbursement Status
                </label>
                <select
                  value={editReimbursementStatus}
                  onChange={(e) => onReimbursementStatusChange(e.target.value as 'pending review' | 'approved' | 'rejected' | 'paid')}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            )}

            {/* Entity Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoho Entity
              </label>
              <select
                value={editEntity}
                onChange={(e) => onEntityChange(e.target.value)}
                className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {entityOptions.map((entity, index) => (
                  <option key={index} value={entity}>{entity}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gray-50 rounded-b-xl flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

