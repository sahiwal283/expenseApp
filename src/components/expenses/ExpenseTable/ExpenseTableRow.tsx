/**
 * ExpenseTableRow Component
 * 
 * Extracted from ExpenseSubmission.tsx (was lines 869-1068, ~200 lines)
 * Single expense row with all columns, approval actions, and entity management
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  DollarSign,
  CheckCircle2,
  Upload,
  Loader2,
  Eye,
  Trash2,
} from 'lucide-react';
import { Expense, TradeShow, User } from '../../../App';
import { formatLocalDate } from '../../../utils/dateUtils';
import {
  getStatusColor,
  getCategoryColor,
  getReimbursementStatusColor,
  formatReimbursementStatus,
} from '../../../constants/appConstants';

interface ExpenseTableRowProps {
  expense: Expense;
  event: TradeShow | undefined;
  userName: string;
  hasApprovalPermission: boolean;
  entityOptions: string[];
  pushingExpenseId: string | null;
  pushedExpenses: Set<string>;
  onReimbursementApproval: (expense: Expense, status: 'approved' | 'rejected') => void;
  onMarkAsPaid: (expense: Expense) => void;
  onAssignEntity: (expense: Expense, entity: string) => void;
  onPushToZoho: (expense: Expense) => void;
  onViewExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  currentUserId: string;
}

export const ExpenseTableRow: React.FC<ExpenseTableRowProps> = ({
  expense,
  event,
  userName,
  hasApprovalPermission,
  entityOptions,
  pushingExpenseId,
  pushedExpenses,
  onReimbursementApproval,
  onMarkAsPaid,
  onAssignEntity,
  onPushToZoho,
  onViewExpense,
  onDeleteExpense,
  currentUserId,
}) => {
  return (
    <tr key={expense.id} className="hover:bg-gray-50">
      {/* Date */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
        {formatLocalDate(expense.date)}
      </td>

      {/* User (Approval Users Only) */}
      {hasApprovalPermission && (
        <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700">{userName}</td>
      )}

      {/* Event */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900">
        {event ? event.name : 'No Event'}
      </td>

      {/* Category */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
        <span
          className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getCategoryColor(expense.category)}`}
        >
          {expense.category}
        </span>
      </td>

      {/* Merchant */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-xs sm:text-sm font-medium text-gray-900">{expense.merchant}</div>
            {expense.duplicateCheck && expense.duplicateCheck.length > 0 && (
              <div className="relative group">
                <div className="flex items-center text-amber-600 cursor-help">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                {/* Tooltip on hover */}
                <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-80 p-3 bg-amber-50 border-2 border-amber-400 rounded-lg shadow-lg">
                  <p className="text-xs font-semibold text-amber-900 mb-2">⚠ Possible Duplicate Expenses:</p>
                  <div className="space-y-1">
                    {expense.duplicateCheck.map((dup, idx) => {
                      const dupDate = new Date(dup.date);
                      const formattedDate = dupDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      return (
                        <div key={idx} className="text-xs text-amber-900">
                          ${dup.amount.toFixed(2)} at {dup.merchant} on {formattedDate}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          {expense.location && <div className="text-xs sm:text-sm text-gray-500">{expense.location}</div>}
        </div>
      </td>

      {/* Amount */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
        ${expense.amount.toFixed(2)}
      </td>

      {/* Card Used */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900">{expense.cardUsed}</td>

      {/* Status */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
        <span
          className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(expense.status)}`}
        >
          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
        </span>
      </td>

      {/* Reimbursement */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
        <div className="space-y-1">
          <span
            className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${
              expense.reimbursementRequired
                ? getReimbursementStatusColor(expense.reimbursementStatus || 'pending review')
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {expense.reimbursementRequired
              ? formatReimbursementStatus(expense.reimbursementStatus)
              : 'Not Required'}
          </span>
          {hasApprovalPermission && expense.reimbursementRequired && (
            <>
              {(!expense.reimbursementStatus || expense.reimbursementStatus === 'pending review') && (
                <div className="flex items-center space-x-1 mt-1">
                  <button
                    onClick={() => onReimbursementApproval(expense, 'approved')}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="Approve Reimbursement"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onReimbursementApproval(expense, 'rejected')}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Reject Reimbursement"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {expense.reimbursementStatus === 'approved' && (
                <div className="flex items-center space-x-1 mt-1">
                  <button
                    onClick={() => onMarkAsPaid(expense)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Mark as Paid"
                  >
                    <DollarSign className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </td>

      {/* Entity (Approval Users Only) */}
      {hasApprovalPermission && (
        <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
          <select
            value={expense.zohoEntity || ''}
            onChange={(e) => onAssignEntity(expense, e.target.value)}
            className={`text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full min-w-[120px] ${
              expense.zohoEntity
                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
            disabled={!!expense.zohoEntity}
            title={expense.zohoEntity ? 'Entity assigned - use View Details to change' : ''}
          >
            <option value="">Unassigned</option>
            {/* If expense has an entity that's not in options, show it first */}
            {expense.zohoEntity && !entityOptions.includes(expense.zohoEntity) && (
              <option value={expense.zohoEntity}>{expense.zohoEntity}</option>
            )}
            {entityOptions.map((entity, index) => (
              <option key={index} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </td>
      )}

      {/* Zoho Push (Approval Users Only) */}
      {hasApprovalPermission && (
        <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
          <div className="flex justify-center">
            {!expense.zohoEntity ? (
              <span className="text-xs text-gray-400 italic">No entity</span>
            ) : expense.zohoExpenseId || pushedExpenses.has(expense.id) ? (
              <div className="flex items-center space-x-1 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Pushed</span>
              </div>
            ) : pushingExpenseId === expense.id ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md cursor-not-allowed"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Pushing...</span>
              </button>
            ) : (
              <button
                onClick={() => onPushToZoho(expense)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                title={`Push to ${expense.zohoEntity} Zoho Books`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Push</span>
              </button>
            )}
          </div>
        </td>
      )}

      {/* Actions */}
      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-right">
        <div className="flex items-center justify-end space-x-2">
          {/* View Details (All Users) */}
          <button
            onClick={() => onViewExpense(expense)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="View Details & Receipt"
          >
            <Eye className="w-4 h-4" />
          </button>
          {/* Delete (Own Expenses OR Approval Users) */}
          {(expense.userId === currentUserId || hasApprovalPermission) && (
            <button
              onClick={() => onDeleteExpense(expense.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

