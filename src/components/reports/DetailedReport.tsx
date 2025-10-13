import React, { useState } from 'react';
import { FileText, Calendar, MapPin, User, DollarSign, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Expense, TradeShow } from '../../App';
import { formatLocalDate } from '../../utils/dateUtils';
import { getStatusColor, getCategoryColor } from '../../constants/appConstants';
import { api } from '../../utils/api';
import { useToast, ToastContainer } from '../common/Toast';

interface DetailedReportProps {
  expenses: Expense[];
  events: TradeShow[];
  onReimbursementApproval?: (expense: Expense, status: 'approved' | 'rejected') => void;
}

export const DetailedReport: React.FC<DetailedReportProps> = ({ 
  expenses, 
  events, 
  onReimbursementApproval 
}) => {
  const { toasts, addToast, removeToast } = useToast();
  const [pushingExpenseId, setPushingExpenseId] = useState<string | null>(null);
  const [pushedExpenses, setPushedExpenses] = useState<Set<string>>(
    new Set(expenses.filter(e => e.zohoExpenseId).map(e => e.id))
  );

  const handlePushToZoho = async (expense: Expense) => {
    if (!expense.zohoEntity) {
      addToast('No entity assigned to this expense. Please assign an entity first.', 'warning');
      return;
    }

    if (expense.zohoExpenseId || pushedExpenses.has(expense.id)) {
      return; // Already pushed
    }

    setPushingExpenseId(expense.id);
    try {
      await api.pushToZoho(expense.id);
      setPushedExpenses(prev => new Set(prev).add(expense.id));
      addToast(`✅ Expense successfully pushed to ${expense.zohoEntity} Zoho Books!`, 'success');
    } catch (error: any) {
      console.error('Failed to push to Zoho:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      addToast(`❌ Failed to push to Zoho Books: ${errorMsg}`, 'error');
    } finally {
      setPushingExpenseId(null);
    }
  };
  const getCategoryBarColor = (category: string) => {
    const colors = {
      'Flights': 'bg-blue-500',
      'Hotels': 'bg-emerald-500',
      'Meals': 'bg-orange-500',
      'Supplies': 'bg-purple-500',
      'Transportation': 'bg-yellow-500',
      'Other': 'bg-gray-500'
    };
    return colors[category as keyof typeof colors] || colors['Other'];
  };

  // Calculate category breakdown
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.keys(categoryBreakdown);
  const maxAmount = Math.max(...Object.values(categoryBreakdown));

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Detailed Data Available</h3>
        <p className="text-gray-600">
          Apply filters to see detailed expense reports or submit some expenses to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
          <p className="text-sm text-gray-600 mt-1">For selected filters</p>
        </div>
        
        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((category) => {
              const amount = categoryBreakdown[category];
              const percentage = (amount / maxAmount) * 100;
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getCategoryBarColor(category)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No category data available</p>
          </div>
        )}
      </div>

      {/* Detailed Expense Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Detailed Expense Report</h3>
          </div>
          <div className="text-sm text-gray-600">
            {expenses.length} entries • ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()} total
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Merchant & Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Card Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reimbursement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zoho Push
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => {
              const event = events.find(e => e.id === expense.tradeShowId);
              
              return (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatLocalDate(expense.date)}
                      </div>
                      {event && (
                        <div className="text-xs text-gray-500 mt-1">
                          {event.name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expense.merchant}</div>
                      {expense.location && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {expense.location}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.cardUsed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-semibold text-gray-900">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {expense.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      expense.reimbursementRequired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {expense.reimbursementRequired ? 
                        `Required (${expense.reimbursementStatus || 'pending review'})` : 
                        'Not Required'
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.zohoEntity || (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={expense.description}>
                      {expense.description || (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
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
                          onClick={() => handlePushToZoho(expense)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          title={`Push to ${expense.zohoEntity} Zoho Books`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Push to Zoho</span>
                        </button>
                      )}
                    </div>
                  </td>
                  {onReimbursementApproval && (
                    <td className="px-6 py-4 text-right">
                      {expense.reimbursementRequired && expense.reimbursementStatus === 'pending review' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onReimbursementApproval(expense, 'approved')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Approve Reimbursement"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onReimbursementApproval(expense, 'rejected')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Reject Reimbursement"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="text-gray-600">Total Expenses:</span>
              <span className="ml-1 font-semibold text-gray-900">
                {expenses.length}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600">Approved:</span>
              <span className="ml-1 font-semibold text-emerald-600">
                {expenses.filter(e => e.status === 'approved').length}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600">Pending:</span>
              <span className="ml-1 font-semibold text-yellow-600">
                {expenses.filter(e => e.status === 'pending').length}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600">Reimbursement Required:</span>
              <span className="ml-1 font-semibold text-orange-600">
                {expenses.filter(e => e.reimbursementRequired).length}
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600">Total Amount:</span>
            <span className="ml-1 font-bold text-lg text-gray-900">
              ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
      </div>
    </>
  );
};