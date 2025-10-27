import React from 'react';
import {
  Calendar,
  User as UserIcon,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Upload,
  Eye,
  Edit,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Expense } from '../../../App';
import { StatusBadge, CategoryBadge } from '../../common';
import { formatLocalDate } from '../../../utils/dateUtils';
import { getReimbursementStatusColor } from '../../../constants/appConstants';

interface ApprovalTableRowProps {
  expense: Expense;
  eventName: string;
  userName: string;
  entityOptions: string[];
  pushingExpenseId: string | null;
  pushedExpenses: Set<string>;
  onApprove: (expense: Expense) => void;
  onReject: (expense: Expense) => void;
  onReimbursementApproval: (expense: Expense, status: 'approved' | 'rejected') => void;
  onAssignEntity: (expense: Expense, entity: string) => void;
  onPushToZoho: (expense: Expense) => void;
  onViewDetails: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
}

export const ApprovalTableRow: React.FC<ApprovalTableRowProps> = ({
  expense,
  eventName,
  userName,
  entityOptions,
  pushingExpenseId,
  pushedExpenses,
  onApprove,
  onReject,
  onReimbursementApproval,
  onAssignEntity,
  onPushToZoho,
  onViewDetails,
  onEdit,
}) => {
  return (
    <tr key={expense.id} className="hover:bg-gray-50">
      {/* Date & User */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 whitespace-nowrap">
        <div>
          <div className="flex items-center text-xs sm:text-sm text-gray-900">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
            {formatLocalDate(expense.date)}
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <UserIcon className="w-3 h-3 mr-1" />
            {userName}
          </div>
        </div>
      </td>

      {/* Merchant & Event */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-xs sm:text-sm font-medium text-gray-900">{expense.merchant}</div>
            {expense.duplicateCheck && expense.duplicateCheck.length > 0 && (
              <div 
                className="flex items-center text-amber-600" 
                title={`Possible duplicate: ${expense.duplicateCheck.length} similar expense(s) found`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {eventName}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
        <CategoryBadge category={expense.category} size="sm" />
      </td>

      {/* Amount */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 whitespace-nowrap">
        <div className="flex items-center text-sm font-semibold text-gray-900">
          <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
          {expense.amount.toFixed(2)}
        </div>
      </td>

      {/* Status */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 whitespace-nowrap">
        <StatusBadge status={expense.status} size="sm" />
      </td>

      {/* Reimbursement */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 whitespace-nowrap">
        <div className="space-y-1">
          <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full ${
            expense.reimbursementRequired 
              ? getReimbursementStatusColor(expense.reimbursementStatus || 'pending review')
              : 'bg-gray-100 text-gray-800'
          }`}>
            {expense.reimbursementRequired 
              ? `Required (${expense.reimbursementStatus || 'pending review'})` 
              : 'Not Required'}
          </span>
          {expense.reimbursementRequired && expense.reimbursementStatus === 'pending review' && (
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
        </div>
      </td>

      {/* Entity */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
        <select
          value={expense.zohoEntity || ''}
          onChange={(e) => onAssignEntity(expense, e.target.value)}
          className={`text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full ${
            expense.zohoEntity 
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
              : 'border-gray-300 bg-white text-gray-900'
          }`}
          disabled={!!expense.zohoEntity}
          title={expense.zohoEntity ? 'Entity assigned - use View Details to change' : ''}
        >
          <option value="">Unassigned</option>
          {entityOptions.map((entity, index) => (
            <option key={index} value={entity}>{entity}</option>
          ))}
        </select>
      </td>

      {/* Zoho */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
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
              <span>Push to Zoho</span>
            </button>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          {expense.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(expense)}
                className="p-1.5 sm:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Approve Expense"
              >
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => onReject(expense)}
                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject Expense"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => onViewDetails(expense)}
            className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="View Details & Receipt"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => onEdit(expense)}
            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Expense"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

