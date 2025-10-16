import React, { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Search, Filter, Eye, CreditCard as Edit2, Trash2, X, MapPin, FileText, 
  Calendar, DollarSign, CreditCard, User as UserIcon, Clock, CheckCircle, Upload, 
  Loader2, CheckCircle2 
} from 'lucide-react';
import { User, Expense } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { PendingActions } from '../common/PendingActions';
import { ApprovalCards } from './ApprovalCards';
import { api } from '../../utils/api';
import { formatLocalDate, getTodayLocalDateString } from '../../utils/dateUtils';
import { getStatusColor, getCategoryColor, getReimbursementStatusColor, formatReimbursementStatus } from '../../constants/appConstants';
import { useExpenses } from './ExpenseSubmission/hooks/useExpenses';
import { useExpenseFilters } from './ExpenseSubmission/hooks/useExpenseFilters';
import { usePendingSync } from './ExpenseSubmission/hooks/usePendingSync';
import { ReceiptData } from '../../types/types';
import { useToast, ToastContainer } from '../common/Toast';

interface ExpenseSubmissionProps {
  user: User;
}

export const ExpenseSubmission: React.FC<ExpenseSubmissionProps> = ({ user }) => {
  // Check if user has approval permissions
  const hasApprovalPermission = ['admin', 'accountant', 'developer'].includes(user.role);
  
  // Use custom hooks (enhanced with approval data when needed)
  const { expenses, events, users, entityOptions, reload: reloadData } = useExpenses({ 
    hasApprovalPermission 
  });
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

  // Approval-specific state (only used when hasApprovalPermission is true)
  const [pushingExpenseId, setPushingExpenseId] = useState<string | null>(null);
  const [pushedExpenses, setPushedExpenses] = useState<Set<string>>(new Set());

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Update pushedExpenses set when expenses data changes
  useEffect(() => {
    if (hasApprovalPermission) {
      const pushed = new Set(expenses.filter(e => e.zohoExpenseId).map(e => e.id));
      setPushedExpenses(pushed);
    }
  }, [expenses, hasApprovalPermission]);

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
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    const userName = expense.user_name || users.find(u => u.id === expense.userId)?.name || 'Unknown User';
    const event = events.find(e => e.id === expense.tradeShowId);
    
    const confirmed = window.confirm(
      `⚠️ DELETE EXPENSE?\n\n` +
      `User: ${userName}\n` +
      `Amount: $${expense.amount.toFixed(2)}\n` +
      `Merchant: ${expense.merchant}\n` +
      `Category: ${expense.category}\n` +
      `Event: ${event?.name || 'Unknown'}\n` +
      `Date: ${formatLocalDate(expense.date, 'DISPLAY')}\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      if (api.USE_SERVER) {
        await api.deleteExpense(expenseId);
        addToast('✅ Expense deleted successfully', 'success');
      } else {
        const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
        localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
      }
      setPendingReceiptFile(null);
      await reloadData();
    } catch (error) {
      console.error('[ExpenseSubmission] Error deleting expense:', error);
      addToast('❌ Failed to delete expense', 'error');
    }
  };

  const handleReceiptProcessed = (receiptData: ReceiptData, file: File) => {
    const newExpense: Omit<Expense, 'id'> = {
      userId: user.id,
      tradeShowId: '',
      amount: receiptData.total || 0,
      category: receiptData.category || 'Other',
      merchant: receiptData.merchant || '',
      date: receiptData.date || getTodayLocalDateString(),
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

  // === REIMBURSEMENT HANDLERS (Only used when hasApprovalPermission is true) ===
  // NOTE: Manual expense approval removed - status now auto-updates based on:
  //       1. Reimbursement status changes (pending review → approved/rejected)
  //       2. Entity assignment

  const handleReimbursementApproval = async (expense: Expense, status: 'approved' | 'rejected') => {
    // Confirmation before changing reimbursement status
    const confirmed = window.confirm(
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this reimbursement?\n\n` +
      `Expense: $${expense.amount.toFixed(2)} - ${expense.merchant}\n` +
      `${status === 'approved' ? 'The user will be notified of approval.' : 'The user will be notified of rejection.'}`
    );
    
    if (!confirmed) return;
    
    try {
      if (api.USE_SERVER) {
        await api.setExpenseReimbursement(expense.id, { reimbursement_status: status });
        addToast(`✅ Reimbursement ${status}!`, 'success');
      }
      await reloadData();
    } catch (error) {
      console.error('Error updating reimbursement:', error);
      addToast('❌ Failed to update reimbursement status. Please try again.', 'error');
    }
  };

  const handleMarkAsPaid = async (expense: Expense) => {
    // Confirmation before marking as paid
    const confirmed = window.confirm(
      `Mark this reimbursement as PAID?\n\n` +
      `Expense: $${expense.amount.toFixed(2)} - ${expense.merchant}\n` +
      `User: ${users.find(u => u.id === expense.userId)?.name || 'Unknown'}\n\n` +
      `This indicates the reimbursement has been processed and paid to the user.`
    );
    
    if (!confirmed) return;
    
    try {
      if (api.USE_SERVER) {
        await api.setExpenseReimbursement(expense.id, { reimbursement_status: 'paid' });
        addToast(`✅ Reimbursement marked as paid!`, 'success');
      }
      await reloadData();
    } catch (error) {
      console.error('Error marking reimbursement as paid:', error);
      addToast('❌ Failed to mark reimbursement as paid. Please try again.', 'error');
    }
  };

  const handleAssignEntity = async (expense: Expense, entity: string) => {
    // Warn if changing entity on an already-pushed expense
    const wasPushed = expense.zohoExpenseId || pushedExpenses.has(expense.id);
    const isChangingEntity = expense.zohoEntity && expense.zohoEntity !== entity;
    
    if (wasPushed && isChangingEntity) {
      const confirmed = window.confirm(
        `⚠️ This expense has already been pushed to "${expense.zohoEntity}" Zoho Books.\n\n` +
        `Changing the entity will allow you to push it to "${entity || 'Unassigned'}" instead, ` +
        `but it will NOT remove it from "${expense.zohoEntity}" Zoho Books.\n\n` +
        `Are you sure you want to change entities?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      if (api.USE_SERVER) {
        await api.assignEntity(expense.id, { zoho_entity: entity });
      }

      // Remove from pushedExpenses set to allow re-push
      if (expense.zohoEntity !== entity) {
        setPushedExpenses(prev => {
          const newSet = new Set(prev);
          newSet.delete(expense.id);
          return newSet;
        });
      }

      await reloadData();
      
      if (expense.zohoExpenseId) {
        addToast('✅ Entity changed. You can now push to the new entity.', 'success');
      } else {
        addToast('✅ Entity assigned!', 'success');
      }
    } catch (error) {
      console.error('Failed to assign entity:', error);
      addToast('❌ Failed to assign entity. Please try again.', 'error');
    }
  };

  const handlePushToZoho = async (expense: Expense) => {
    if (!expense.zohoEntity) {
      addToast('⚠️ No entity assigned to this expense. Please assign an entity first.', 'warning');
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
      await reloadData();
    } catch (error: any) {
      console.error('Failed to push to Zoho:', error);
      
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      
      if (errorMsg.includes('does not have Zoho Books integration configured')) {
        addToast(
          `🕐 Zoho Books integration for "${expense.zohoEntity}" is coming soon. Please try again later or add manually.`,
          'info'
        );
      } else {
        addToast(`❌ Failed to push to Zoho Books: ${errorMsg}`, 'error');
      }
    } finally {
      setPushingExpenseId(null);
    }
  };

  // Apply user permission filter and sorting to hook's filtered results
  const finalFilteredExpenses = filteredExpenses
    .filter(expense => {
      // User permission filter:
      // - Users with approval permission see ALL expenses
      // - Regular users see only their own expenses
      return hasApprovalPermission || expense.userId === user.id;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">
            {hasApprovalPermission 
              ? 'Review, approve, and manage expense submissions'
              : 'Submit and track your trade show expenses'}
          </p>
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

      {/* Approval Workflow Cards (Only visible to admin/accountant/developer) */}
      {hasApprovalPermission && <ApprovalCards expenses={expenses} />}

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
            <table className="w-full min-w-max">
              <thead className="bg-gray-50">
                {/* Column Headers */}
                <tr>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Date</th>
                  {hasApprovalPermission && (
                    <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">User</th>
                  )}
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Event</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Category</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Merchant</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Amount</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Card Used</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Status</th>
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Reimbursement</th>
                  {hasApprovalPermission && (
                    <>
                      <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Entity</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Zoho</th>
                    </>
                  )}
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-right text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Actions</th>
                </tr>
                {/* Compact Inline Filters Row */}
                <tr className="border-t border-gray-100">
                  {/* Date Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    />
                  </th>
                  {/* User Filter Placeholder (Approval Users) */}
                  {hasApprovalPermission && (
                    <th className="px-2 sm:px-3 lg:px-4 py-0.5"></th>
                  )}
                  {/* Event Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    >
                      <option value="all">All Events</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </th>
                  {/* Category Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    >
                      <option value="all">All</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </th>
                  {/* Merchant Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <input
                      type="text"
                      value={merchantFilter}
                      onChange={(e) => setMerchantFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 placeholder-gray-300 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                      placeholder="Search..."
                    />
                  </th>
                  {/* Amount - No Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5"></th>
                  {/* Card Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <select
                      value={cardFilter}
                      onChange={(e) => setCardFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    >
                      <option value="all">All</option>
                      {uniqueCards.map(card => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                  </th>
                  {/* Status Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </th>
                  {/* Reimbursement Filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5">
                    <select
                      value={reimbursementFilter}
                      onChange={(e) => setReimbursementFilter(e.target.value)}
                      className="w-full px-1 py-0 text-[10px] bg-white/50 border border-gray-100 rounded text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                    >
                      <option value="all">All</option>
                      <option value="required">Required</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </th>
                  {/* Entity and Zoho Filter Placeholders (Approval Users) */}
                  {hasApprovalPermission && (
                    <>
                      <th className="px-2 sm:px-3 lg:px-4 py-0.5"></th>
                      <th className="px-2 sm:px-3 lg:px-4 py-0.5"></th>
                    </>
                  )}
                  {/* Actions - No filter */}
                  <th className="px-2 sm:px-3 lg:px-4 py-0.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {finalFilteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  const userName = expense.user_name || users.find(u => u.id === expense.userId)?.name || 'Unknown User';
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      {/* Date */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {formatLocalDate(expense.date)}
                      </td>
                      {/* User (Approval Users Only) */}
                      {hasApprovalPermission && (
                        <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700">
                          {userName}
                        </td>
                      )}
                      {/* Event */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900">
                        {event ? event.name : 'No Event'}
                      </td>
                      {/* Category */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
                        <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      {/* Merchant */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{expense.merchant}</div>
                          {expense.location && (
                            <div className="text-xs sm:text-sm text-gray-500">{expense.location}</div>
                          )}
                        </div>
                      </td>
                      {/* Amount */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                        ${expense.amount.toFixed(2)}
                      </td>
                      {/* Card Used */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900">
                        {expense.cardUsed}
                      </td>
                      {/* Status */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
                        <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      {/* Reimbursement */}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
                        <div className="space-y-1">
                          <span className={`px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs font-medium rounded-full whitespace-nowrap ${
                            expense.reimbursementRequired 
                              ? getReimbursementStatusColor(expense.reimbursementStatus || 'pending review')
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {expense.reimbursementRequired 
                              ? formatReimbursementStatus(expense.reimbursementStatus)
                              : 'Not Required'}
                          </span>
                          {hasApprovalPermission && expense.reimbursementRequired && (
                            <>
                              {(!expense.reimbursementStatus || expense.reimbursementStatus === 'pending review') && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <button
                                    onClick={() => handleReimbursementApproval(expense, 'approved')}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                    title="Approve Reimbursement"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleReimbursementApproval(expense, 'rejected')}
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
                                    onClick={() => handleMarkAsPaid(expense)}
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
                            onChange={(e) => handleAssignEntity(expense, e.target.value)}
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
                              <option key={index} value={entity}>{entity}</option>
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
                                onClick={() => handlePushToZoho(expense)}
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
                          {/* Manual approval removed - expenses auto-approve via reimbursement/entity assignment */}
                          {/* View Details (All Users) */}
                          <button
                            onClick={() => setViewingExpense(expense)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Details & Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Delete (Own Expenses OR Approval Users) */}
                          {(expense.userId === user.id || hasApprovalPermission) && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
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

              {/* Status Badges / Editable Fields */}
              <div className="flex flex-wrap gap-6">
                {/* Status - Read-only (auto-updates based on reimbursement/entity) */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingExpense.status)}`}>
                      {viewingExpense.status === 'needs further review' 
                        ? 'Needs Further Review' 
                        : viewingExpense.status.charAt(0).toUpperCase() + viewingExpense.status.slice(1)}
                    </span>
                    {hasApprovalPermission && (
                      <span className="text-xs text-gray-400 italic">
                        (auto-updates)
                      </span>
                    )}
                  </div>
                </div>

                {/* Reimbursement Status */}
                {viewingExpense.reimbursementRequired && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Reimbursement</p>
                    {hasApprovalPermission ? (
                      <select
                        value={viewingExpense.reimbursementStatus || 'pending review'}
                        onChange={async (e) => {
                          const newStatus = e.target.value as 'pending review' | 'approved' | 'rejected' | 'paid';
                          
                          // Confirmation before changing reimbursement status
                          const statusText = formatReimbursementStatus(newStatus);
                          const confirmed = window.confirm(
                            `Change reimbursement status to "${statusText}"?\n\n` +
                            `Expense: $${viewingExpense.amount.toFixed(2)} - ${viewingExpense.merchant}\n` +
                            (newStatus === 'paid' ? `\nThis indicates the reimbursement has been processed and paid to the user.` : '')
                          );
                          
                          if (!confirmed) {
                            // Reset the select to previous value
                            e.target.value = viewingExpense.reimbursementStatus || 'pending review';
                            return;
                          }
                          
                          try {
                            await api.setExpenseReimbursement(viewingExpense.id, { reimbursement_status: newStatus });
                            await reloadData();
                            setViewingExpense({...viewingExpense, reimbursementStatus: newStatus});
                            addToast(`✅ Reimbursement status updated to ${statusText}`, 'success');
                          } catch (error) {
                            console.error('[ExpenseSubmission] Error updating reimbursement:', error);
                            addToast('❌ Failed to update reimbursement status', 'error');
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                      >
                        <option value="pending review">Pending Review</option>
                        <option value="approved">Approved (pending payment)</option>
                        <option value="rejected">Rejected</option>
                        {(viewingExpense.status === 'approved' || viewingExpense.reimbursementStatus === 'paid') && (
                          <option value="paid">Paid</option>
                        )}
                      </select>
                    ) : (
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        getReimbursementStatusColor(viewingExpense.reimbursementStatus || 'pending review')
                      }`}>
                        {formatReimbursementStatus(viewingExpense.reimbursementStatus)}
                      </span>
                    )}
                  </div>
                )}
                {!viewingExpense.reimbursementRequired && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Reimbursement</p>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                      Not Required
                    </span>
                  </div>
                )}

                {/* Entity */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Entity</p>
                  {hasApprovalPermission ? (
                    <select
                      value={viewingExpense.zohoEntity || ''}
                      onChange={async (e) => {
                        const newEntity = e.target.value;
                        
                        // If entity is already assigned and changing it, confirm
                        if (viewingExpense.zohoEntity && viewingExpense.zohoExpenseId && newEntity !== viewingExpense.zohoEntity) {
                          if (!confirm(`This expense was already pushed to Zoho under "${viewingExpense.zohoEntity}". Changing the entity will clear the Zoho ID. Continue?`)) {
                            return;
                          }
                        }
                        
                        try {
                          await api.assignEntity(viewingExpense.id, { zoho_entity: newEntity });
                          await reloadData();
                          setViewingExpense({
                            ...viewingExpense, 
                            zohoEntity: newEntity,
                            zohoExpenseId: newEntity !== viewingExpense.zohoEntity ? undefined : viewingExpense.zohoExpenseId
                          });
                          addToast(`✅ Entity ${newEntity ? `set to ${newEntity}` : 'cleared'}`, 'success');
                        } catch (error) {
                          console.error('[ExpenseSubmission] Error updating entity:', error);
                          addToast('❌ Failed to update entity', 'error');
                        }
                      }}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Unassigned</option>
                      {viewingExpense.zohoEntity && !entityOptions.includes(viewingExpense.zohoEntity) && (
                        <option value={viewingExpense.zohoEntity}>{viewingExpense.zohoEntity}</option>
                      )}
                      {entityOptions.map((entity, index) => (
                        <option key={index} value={entity}>{entity}</option>
                      ))}
                    </select>
                  ) : (
                    viewingExpense.zohoEntity ? (
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                        {viewingExpense.zohoEntity}
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
                        Unassigned
                      </span>
                    )
                  )}
                </div>
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
