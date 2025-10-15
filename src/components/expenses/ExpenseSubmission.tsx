import React, { useState } from 'react';
import { Plus, Receipt, Search, Filter, Eye, CreditCard as Edit2, Trash2, X, MapPin, FileText, Calendar, DollarSign, CreditCard, User as UserIcon, Clock } from 'lucide-react';
import { User, Expense } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { PendingActions } from '../common/PendingActions';
import { api } from '../../utils/api';
import { formatLocalDate } from '../../utils/dateUtils';
import { getStatusColor, getCategoryColor, getReimbursementStatusColor } from '../../constants/appConstants';
import { useExpenses } from './ExpenseSubmission/hooks/useExpenses';
import { useExpenseFilters } from './ExpenseSubmission/hooks/useExpenseFilters';
import { usePendingSync } from './ExpenseSubmission/hooks/usePendingSync';
import { ReceiptData } from '../../types/types';
import { useToast, ToastContainer } from '../common/Toast';

interface ExpenseSubmissionProps {
  user: User;
}

export const ExpenseSubmission: React.FC<ExpenseSubmissionProps> = ({ user }) => {
  // Use custom hooks
  const { expenses, events, reload: reloadData } = useExpenses();
  const { pendingCount } = usePendingSync();
  const {
    dateFilter, setDateFilter,
    eventFilter, setEventFilter,
    categoryFilter, setCategoryFilter,
    merchantFilter, setMerchantFilter,
    cardFilter, setCardFilter,
    statusFilter, setStatusFilter,
    reimbursementFilter, setReimbursementFilter,
    filteredExpenses,
    hasActiveFilters,
    uniqueCategories,
    uniqueCards,
    clearAllFilters
  } = useExpenseFilters(expenses);

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [showFullReceipt, setShowFullReceipt] = useState(true);
  const [showPendingSync, setShowPendingSync] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>, file?: File) => {
    // Prevent duplicate submissions
    if (isSaving) {
      console.log('[ExpenseSubmission] Already saving, ignoring duplicate submission');
      return;
    }

    setIsSaving(true);

    try {
      console.log('[ExpenseSubmission] Saving expense...', { isEdit: !!editingExpense, hasFile: !!file });
      
      if (api.USE_SERVER) {
        if (editingExpense) {
          console.log('[ExpenseSubmission] Updating expense:', editingExpense.id);
          await api.updateExpense(editingExpense.id, {
            event_id: expenseData.tradeShowId,
            category: expenseData.category,
            merchant: expenseData.merchant,
            amount: expenseData.amount,
            date: expenseData.date,
            description: expenseData.description,
            card_used: expenseData.cardUsed,
            reimbursement_required: expenseData.reimbursementRequired,
            location: expenseData.location,
            zoho_entity: expenseData.zohoEntity,
          }, file || undefined);
          console.log('[ExpenseSubmission] Expense updated successfully');
          addToast('✅ Expense updated successfully!', 'success');
        } else {
          console.log('[ExpenseSubmission] Creating new expense');
          await api.createExpense({
            event_id: expenseData.tradeShowId,
            category: expenseData.category,
            merchant: expenseData.merchant,
            amount: expenseData.amount,
            date: expenseData.date,
            description: expenseData.description,
            card_used: expenseData.cardUsed,
            reimbursement_required: expenseData.reimbursementRequired,
            location: expenseData.location,
          }, file || pendingReceiptFile || undefined);
          console.log('[ExpenseSubmission] Expense created successfully');
          addToast('✅ Expense saved successfully!', 'success');
        }
        setPendingReceiptFile(null);
        
        console.log('[ExpenseSubmission] Refreshing expense list...');
        await reloadData();
        console.log('[ExpenseSubmission] Expense list refreshed');
      } else {
        const newExpense: Expense = {
          ...expenseData,
          id: editingExpense?.id || Date.now().toString(),
          userId: user.id
        };
        const updatedExpenses = editingExpense
          ? expenses.map(expense => expense.id === editingExpense.id ? newExpense : expense)
          : [...expenses, newExpense];
        setExpenses(updatedExpenses);
        localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
        addToast(`✅ Expense ${editingExpense ? 'updated' : 'saved'} successfully!`, 'success');
      }
      
      // Close the form
      console.log('[ExpenseSubmission] Closing form');
      setShowForm(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('[ExpenseSubmission] Error saving expense:', error);
      addToast('❌ Failed to save expense. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditExpense = (expense: Expense, file?: File) => {
    setEditingExpense(expense);
    setShowForm(true);
    if (file) setPendingReceiptFile(file);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (api.USE_SERVER) {
      await api.deleteExpense(expenseId);
      setPendingReceiptFile(null);
      await reloadData();
    } else {
      const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
      localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
      await reloadData();
    }
  };

  const handleReceiptProcessed = (receiptData: ReceiptData, file: File) => {
    const newExpense: Omit<Expense, 'id'> = {
      userId: user.id,
      tradeShowId: '',
      amount: receiptData.total || 0,
      category: receiptData.category || 'Other',
      merchant: receiptData.merchant || '',
      date: receiptData.date || new Date().toISOString().split('T')[0],
      description: receiptData.description || '',
      status: 'pending',
      location: receiptData.location || '',
      extractedData: receiptData
    };

    setEditingExpense(null);
    setShowForm(true);
    setPendingReceiptFile(file);
    setTimeout(() => {
      const event = new CustomEvent('populateExpenseForm', { detail: newExpense });
      window.dispatchEvent(event);
    }, 100);
    setShowReceiptUpload(false);
  };

  // Apply user permission filter and sorting to hook's filtered results
  const finalFilteredExpenses = filteredExpenses
    .filter(expense => {
      // User permission filter (component-specific)
      return user.role === 'admin' || user.role === 'developer' || user.role === 'accountant' || expense.userId === user.id;
    })
    .sort((a, b) => {
      // Sort: pending expenses at the top, then by date
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  if (showForm) {
    return (
      <>
        <ExpenseForm
          expense={editingExpense}
          events={events}
          user={user}
          onSave={handleSaveExpense}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          isSaving={isSaving}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  if (showReceiptUpload) {
    return (
      <ReceiptUpload
        onReceiptProcessed={handleReceiptProcessed}
        onCancel={() => setShowReceiptUpload(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">Submit and track your trade show expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Clear Filters</span>
            </button>
          )}
          {pendingCount > 0 && (
            <button
              onClick={() => setShowPendingSync(true)}
              className="relative bg-orange-50 text-orange-700 border border-orange-200 px-4 py-3 rounded-lg font-medium hover:bg-orange-100 transition-all duration-200 flex items-center space-x-2"
            >
              <Clock className="w-5 h-5" />
              <span>Pending Sync</span>
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            <Receipt className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      {finalFilteredExpenses.length === 0 ? (
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
                onClick={clearAllFilters}
                className="bg-gray-100 text-gray-700 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
            >
              Add Expense
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                {/* Column Headers */}
                <tr>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Date</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Event</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Category</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Merchant</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Card Used</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900">Reimbursement</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                </tr>
                {/* Inline Filters Row */}
                <tr className="bg-gray-50 border-t border-gray-100">
                  {/* Date Filter */}
                  <th className="px-3 py-1.5">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </th>
                  {/* Event Filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="all">All Events</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </th>
                  {/* Category Filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="all">All</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </th>
                  {/* Merchant Filter */}
                  <th className="px-3 py-1.5">
                    <input
                      type="text"
                      value={merchantFilter}
                      onChange={(e) => setMerchantFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                      placeholder="Search..."
                    />
                  </th>
                  {/* Amount - No Filter */}
                  <th className="px-3 py-1.5">
                    <div className="text-xs text-gray-300 text-center">-</div>
                  </th>
                  {/* Card Filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={cardFilter}
                      onChange={(e) => setCardFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="all">All</option>
                      {uniqueCards.map(card => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                  </th>
                  {/* Status Filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </th>
                  {/* Reimbursement Filter */}
                  <th className="px-3 py-1.5">
                    <select
                      value={reimbursementFilter}
                      onChange={(e) => setReimbursementFilter(e.target.value)}
                      className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="all">All</option>
                      <option value="required">Required</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </th>
                  {/* Actions - No filter */}
                  <th className="px-3 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {finalFilteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      {/* Date */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {formatLocalDate(expense.date)}
                      </td>
                      {/* Event */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-xs sm:text-sm text-gray-900">
                        {event ? event.name : 'No Event'}
                      </td>
                      {/* Category */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
                        <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      {/* Merchant */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{expense.merchant}</div>
                          {expense.location && (
                            <div className="text-xs sm:text-sm text-gray-500">{expense.location}</div>
                          )}
                        </div>
                      </td>
                      {/* Amount */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                        ${expense.amount.toFixed(2)}
                      </td>
                      {/* Card Used */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-xs sm:text-sm text-gray-900">
                        {expense.cardUsed}
                      </td>
                      {/* Status */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
                        <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      {/* Reimbursement */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
                        <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${
                          expense.reimbursementRequired 
                            ? getReimbursementStatusColor(expense.reimbursementStatus || 'pending review')
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.reimbursementRequired 
                            ? `Required (${expense.reimbursementStatus || 'pending review'})` 
                            : 'Not Required'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewingExpense(expense)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Details & Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Expense Details</h2>
                <p className="text-sm text-purple-100">
                  {events.find(e => e.id === viewingExpense.tradeShowId)?.name || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewingExpense(null);
                  setShowFullReceipt(true); // Reset to show full receipt next time
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900">{formatLocalDate(viewingExpense.date)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900 text-xl">${viewingExpense.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-semibold text-gray-900">{viewingExpense.category}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Merchant</p>
                    <p className="font-semibold text-gray-900">{viewingExpense.merchant}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Card Used</p>
                    <p className="font-semibold text-gray-900">{viewingExpense.cardUsed}</p>
                  </div>
                </div>

                {viewingExpense.location && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">{viewingExpense.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingExpense.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-900">{viewingExpense.description}</p>
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingExpense.status)}`}>
                    {viewingExpense.status.charAt(0).toUpperCase() + viewingExpense.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Reimbursement</p>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    viewingExpense.reimbursementRequired 
                      ? getReimbursementStatusColor(viewingExpense.reimbursementStatus || 'pending review')
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingExpense.reimbursementRequired 
                      ? viewingExpense.reimbursementStatus || 'Pending Review'
                      : 'Not Required'}
                  </span>
                </div>
                {viewingExpense.zohoEntity && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Entity</p>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      {viewingExpense.zohoEntity}
                    </span>
                  </div>
                )}
              </div>

              {/* Receipt Section */}
              {viewingExpense.receiptUrl && (
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
                        src={viewingExpense.receiptUrl.replace(/^\/uploads/, '/api/uploads')}
                        alt="Receipt"
                        className="w-full h-auto max-h-[600px] object-contain rounded-lg border-2 border-gray-200 shadow-md"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setViewingExpense(null);
                  setShowFullReceipt(true); // Reset to show full receipt next time
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleEditExpense(viewingExpense);
                  setViewingExpense(null);
                  setShowFullReceipt(true); // Reset to show full receipt next time
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Edit Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Sync Modal */}
      {showPendingSync && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowPendingSync(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-50">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Pending Sync</h2>
                <button
                  onClick={() => setShowPendingSync(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <PendingActions user={user} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
