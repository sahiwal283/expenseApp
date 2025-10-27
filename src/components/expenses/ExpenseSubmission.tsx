import React, { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Search, Filter, X, Loader2
} from 'lucide-react';
import { User, Expense, TradeShow } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { PendingActions } from '../common/PendingActions';
import { ApprovalCards } from './ApprovalCards';
import { api } from '../../utils/api';
import { formatLocalDate, getTodayLocalDateString, formatForDateInput } from '../../utils/dateUtils';
import { formatReimbursementStatus } from '../../constants/appConstants';
import { useExpenses } from './ExpenseSubmission/hooks/useExpenses';
import { useExpenseFilters } from './ExpenseSubmission/hooks/useExpenseFilters';
import { usePendingSync } from './ExpenseSubmission/hooks/usePendingSync';
import { ReceiptData } from '../../types/types';
import { useToast, ToastContainer } from '../common/Toast';
import { sendOCRCorrection, detectCorrections } from '../../utils/ocrCorrections';

// ✅ REFACTORED: Imported extracted components
import { ExpenseTableFilters, ExpenseTableRow } from './ExpenseTable';
import {
  ExpenseModalHeader,
  ExpenseModalFooter,
  ExpenseModalReceipt,
  ExpenseModalAuditTrail,
  ExpenseModalDuplicateWarning,
  ExpenseModalDetailsView,
  ExpenseModalDetailsEdit,
  ExpenseModalStatusManagement,
} from './ExpenseModal';

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
    sortBy, setSortBy,
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
  const [showFilters, setShowFilters] = useState(false);

  // Approval-specific state (only used when hasApprovalPermission is true)
  const [pushingExpenseId, setPushingExpenseId] = useState<string | null>(null);
  const [pushedExpenses, setPushedExpenses] = useState<Set<string>>(new Set());

  // OCR correction tracking
  const [ocrV2Data, setOcrV2Data] = useState<any>(null);

  // Audit trail
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Inline editing in modal
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Update pushedExpenses set when expenses data changes
  useEffect(() => {
    if (hasApprovalPermission) {
      const pushed = new Set(expenses.filter(e => e.zohoExpenseId).map(e => e.id));
      setPushedExpenses(pushed);
    }
  }, [expenses, hasApprovalPermission]);

  // Fetch audit trail when viewing expense (accountant/admin/developer only)
  const fetchAuditTrail = async (expenseId: string) => {
    if (!hasApprovalPermission) return;
    
    setLoadingAudit(true);
    try {
      const response = await fetch(`/api/expenses/${expenseId}/audit`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const trail = data.auditTrail || [];
        setAuditTrail(trail);
        // Auto-expand if there's history (more than just "created")
        const hasChanges = trail.filter((entry: any) => entry.action !== 'created').length > 0;
        setShowAuditTrail(hasChanges);
      } else {
        console.error('[Audit] Failed to fetch audit trail');
        setAuditTrail([]);
        setShowAuditTrail(false);
      }
    } catch (error) {
      console.error('[Audit] Error fetching audit trail:', error);
      setAuditTrail([]);
      setShowAuditTrail(false);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>, file?: File, ocrDataOverride?: any) => {
    // Prevent duplicate submissions
    if (isSaving) {
      console.log('[ExpenseSubmission] Already saving, ignoring duplicate submission');
      return;
    }

    setIsSaving(true);

    try {
      console.log('[ExpenseSubmission] Saving expense...', { isEdit: !!editingExpense, hasFile: !!file });
      
      if (api.USE_SERVER) {
        let expenseId: string | null = null;
        
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
          expenseId = editingExpense.id;
          console.log('[ExpenseSubmission] Expense updated successfully');
          addToast('✅ Expense updated successfully!', 'success');
        } else {
          console.log('[ExpenseSubmission] Creating new expense');
          const newExpense = await api.createExpense({
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
          expenseId = newExpense.id;
          console.log('[ExpenseSubmission] Expense created successfully with ID:', expenseId);
          addToast('✅ Expense saved successfully!', 'success');
        }

        // Track OCR corrections if OCR v2 data exists (use passed data or state)
        const ocrDataToUse = ocrDataOverride || ocrV2Data;
        if (ocrDataToUse && ocrDataToUse.originalValues) {
          console.log('[OCR Correction] Checking for user corrections...');
          console.log('[OCR Correction] Comparing original vs submitted:', {
            original: ocrDataToUse.originalValues,
            submitted: {
              merchant: expenseData.merchant,
              amount: expenseData.amount,
              date: expenseData.date,
              category: expenseData.category
            }
          });
          const corrections = detectCorrections(ocrDataToUse.inference, {
            merchant: expenseData.merchant,
            amount: expenseData.amount,
            date: expenseData.date,
            category: expenseData.category,
            cardLastFour: (expenseData.cardUsed?.match(/\(\.\.\.(\d{4})\)/) || [])[1] || null
          });

          if (Object.keys(corrections).length > 0) {
            console.log('[OCR Correction] User made corrections:', corrections);
            
            // Send corrections to backend for continuous learning
            await sendOCRCorrection({
              expenseId: expenseId || undefined,
              originalOCRText: ocrDataToUse.ocrText || '',
              originalInference: ocrDataToUse.inference,
              correctedFields: corrections,
              notes: `User corrected ${Object.keys(corrections).length} field(s) during expense submission`
            }).catch(err => {
              console.error('[OCR Correction] Failed to send correction:', err);
              // Don't throw - corrections are optional
            });

            console.log(`[OCR Correction] Sent ${Object.keys(corrections).length} correction(s) to backend with expense ID: ${expenseId}`);
          } else {
            console.log('[OCR Correction] No corrections detected - OCR was accurate!');
          }
        } else {
          console.log('[OCR Correction] No OCR v2 data available for correction tracking');
        }

        // Clear OCR data after processing if we used the override
        if (ocrDataOverride) {
          setOcrV2Data(null);
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

  // Start inline editing in the modal
  const startInlineEdit = (expense: Expense) => {
    setIsEditingExpense(true);
    setEditFormData({
      tradeShowId: expense.tradeShowId || '',
      amount: expense.amount || 0,
      category: expense.category || '',
      merchant: expense.merchant || '',
      date: expense.date ? formatForDateInput(expense.date) : getTodayLocalDateString(),
      description: expense.description || '',
      cardUsed: expense.cardUsed || '',
      location: expense.location || '',
      reimbursementRequired: expense.reimbursementRequired || false
    });
  };

  // Cancel inline editing
  const cancelInlineEdit = () => {
    setIsEditingExpense(false);
    setEditFormData(null);
  };

  // Save inline edits
  const saveInlineEdit = async () => {
    if (!viewingExpense || !editFormData) return;

    setIsSaving(true);
    try {
      // Convert camelCase to snake_case for backend
      const response = await fetch(`/api/expenses/${viewingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          event_id: editFormData.tradeShowId,
          amount: editFormData.amount,
          category: editFormData.category,
          merchant: editFormData.merchant,
          date: editFormData.date,
          description: editFormData.description,
          card_used: editFormData.cardUsed,
          location: editFormData.location,
          reimbursement_required: editFormData.reimbursementRequired,
          userId: user.id
        })
      });

      if (!response.ok) throw new Error('Failed to update expense');

      const updatedExpense = await response.json();
      
      // Update the viewing expense
      setViewingExpense(updatedExpense);
      
      // Reload data to refresh the list
      await reloadData();
      
      // Refresh audit trail
      await fetchAuditTrail(viewingExpense.id);
      
      // Exit edit mode
      setIsEditingExpense(false);
      setEditFormData(null);
      
      addToast('✅ Expense updated successfully', 'success');
    } catch (error) {
      console.error('[ExpenseSubmission] Error updating expense:', error);
      addToast('❌ Failed to update expense. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
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

  const handleReceiptProcessed = async (receiptData: ReceiptData, file: File) => {
    setIsSaving(true);
    
    // Prepare OCR v2 data for correction tracking (but don't rely on state)
    let ocrDataForCorrections: any = null;
    if (receiptData.ocrV2Data) {
      console.log('[OCR Correction] Preparing OCR v2 data for correction tracking');
      const inference = receiptData.ocrV2Data.inference;
      ocrDataForCorrections = {
        ocrText: receiptData.ocrText,
        inference: inference,
        categories: receiptData.ocrV2Data.categories,
        provider: receiptData.ocrV2Data.ocrProvider,
        confidence: receiptData.confidence,
        // Store the ORIGINAL OCR-extracted values (before user edits)
        originalValues: {
          merchant: inference?.merchant?.value || 'Unknown Merchant',
          amount: inference?.amount?.value || 0,
          date: inference?.date?.value || '',
          category: inference?.category?.value || 'Other',
          location: inference?.location?.value || '',
          cardLastFour: inference?.cardLastFour?.value || null
        }
      };
      console.log('[OCR Correction] Original OCR values stored:', {
        merchant: inference?.merchant?.value,
        amount: inference?.amount?.value,
        category: inference?.category?.value
      });
      console.log('[OCR Correction] User submitted values:', {
        merchant: receiptData.merchant,
        amount: receiptData.total,
        category: receiptData.category
      });
    }

    // Save expense directly with all fields from ReceiptUpload
    const expenseData: Omit<Expense, 'id'> = {
      userId: user.id,
      tradeShowId: receiptData.tradeShowId || '',
      amount: receiptData.total || 0,
      category: receiptData.category || 'Other',
      merchant: receiptData.merchant || '',
      date: receiptData.date || getTodayLocalDateString(),
      description: receiptData.description || '',
      cardUsed: receiptData.cardUsed || '',
      status: 'pending',
      location: receiptData.location || '',
      ocrText: receiptData.ocrText || '',
      extractedData: receiptData
    };

    // Save and wait for completion before closing - pass OCR data directly
    await handleSaveExpense(expenseData, file, ocrDataForCorrections);
    setIsSaving(false);
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

  // Apply user permission filter to hook's filtered results (sorting already handled by hook)
  const finalFilteredExpenses = filteredExpenses
    .filter(expense => {
      // User permission filter:
      // - Users with approval permission see ALL expenses
      // - Regular users see only their own expenses
      return hasApprovalPermission || expense.userId === user.id;
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
      <>
        <ReceiptUpload
          user={user}
          events={events}
          onReceiptProcessed={handleReceiptProcessed}
          onCancel={() => setShowReceiptUpload(false)}
          isSaving={isSaving}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
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
            onClick={() => setShowReceiptUpload(true)}
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
              onClick={() => setShowReceiptUpload(true)}
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
                  <th className="px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 min-h-[44px] text-right text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <span>Actions</span>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-1 rounded transition-colors ${
                          showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={showFilters ? 'Hide Filters' : 'Show Filters'}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                </tr>
                {/* ✅ REFACTORED: Replaced 147 lines with ExpenseTableFilters component */}
                <ExpenseTableFilters
                  expenses={expenses}
                  events={events}
                  users={users}
                  hasApprovalPermission={hasApprovalPermission}
                  showFilters={showFilters}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  eventFilter={eventFilter}
                  setEventFilter={setEventFilter}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  merchantFilter={merchantFilter}
                  setMerchantFilter={setMerchantFilter}
                  cardFilter={cardFilter}
                  setCardFilter={setCardFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  reimbursementFilter={reimbursementFilter}
                  setReimbursementFilter={setReimbursementFilter}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  uniqueCategories={uniqueCategories}
                  uniqueCards={uniqueCards}
                />
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* ✅ REFACTORED: Replaced 206 lines with ExpenseTableRow component */}
                {finalFilteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  const userName = expense.user_name || users.find(u => u.id === expense.userId)?.name || 'Unknown User';
                  
                  return (
                    <ExpenseTableRow
                      key={expense.id}
                      expense={expense}
                      event={event}
                      userName={userName}
                      hasApprovalPermission={hasApprovalPermission}
                      entityOptions={entityOptions}
                      pushingExpenseId={pushingExpenseId}
                      pushedExpenses={pushedExpenses}
                      onReimbursementApproval={handleReimbursementApproval}
                      onMarkAsPaid={handleMarkAsPaid}
                      onAssignEntity={handleAssignEntity}
                      onPushToZoho={handlePushToZoho}
                      onViewExpense={(exp) => {
                        setViewingExpense(exp);
                        fetchAuditTrail(exp.id);
                      }}
                      onDeleteExpense={handleDeleteExpense}
                      currentUserId={user.id}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✅ REFACTORED: Expense Details Modal with 8 sub-components */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            <ExpenseModalHeader
              eventName={events.find(e => e.id === viewingExpense.tradeShowId)?.name}
              onClose={() => {
                setViewingExpense(null);
                setShowFullReceipt(true);
                setIsEditingExpense(false);
                setEditFormData(null);
              }}
            />

            {/* Content */}
            <div className="p-6 space-y-6">
              <ExpenseModalDuplicateWarning duplicateCheck={viewingExpense.duplicateCheck} />

              {/* ✅ REFACTORED: Replaced 190 lines with 2 simplified components */}
              {!isEditingExpense ? (
                <ExpenseModalDetailsView expense={viewingExpense} />
              ) : (
                <ExpenseModalDetailsEdit
                  formData={editFormData}
                  onChange={(updates) => setEditFormData({ ...editFormData, ...updates })}
                  uniqueCategories={uniqueCategories}
                  uniqueCards={uniqueCards}
                />
              )}

              {/* ✅ REFACTORED: Replaced 198 lines with ExpenseModalStatusManagement */}
              <ExpenseModalStatusManagement
                expense={viewingExpense}
                hasApprovalPermission={hasApprovalPermission}
                entityOptions={entityOptions}
                auditTrail={auditTrail}
                onExpenseUpdate={(updates) => setViewingExpense({ ...viewingExpense, ...updates })}
                onReloadData={reloadData}
                onToast={addToast}
              />

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

              {/* Audit Trail (accountant/admin/developer only) */}
              {hasApprovalPermission && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                  <button
                    onClick={() => setShowAuditTrail(!showAuditTrail)}
                    className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center space-x-2">
                      <History className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Change History</h3>
                      {(() => {
                        const historyCount = auditTrail.filter(entry => entry.action !== 'created').length;
                        if (historyCount > 0) {
                          return (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">
                              {historyCount}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="text-blue-600">
                      {showAuditTrail ? '▼' : '▶'}
                    </div>
                  </button>
                  
                  {showAuditTrail && (loadingAudit ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading history...</span>
                    </div>
                  ) : auditTrail.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No changes recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditTrail.map((entry, index) => {
                        const timestamp = new Date(entry.timestamp);
                        const actionLabels: Record<string, string> = {
                          created: 'Created',
                          updated: 'Updated',
                          status_changed: 'Status Changed',
                          entity_assigned: 'Entity Assigned',
                          pushed_to_zoho: 'Pushed to Zoho'
                        };
                        const actionColors: Record<string, string> = {
                          created: 'bg-green-100 text-green-800',
                          updated: 'bg-blue-100 text-blue-800',
                          status_changed: 'bg-purple-100 text-purple-800',
                          entity_assigned: 'bg-orange-100 text-orange-800',
                          pushed_to_zoho: 'bg-emerald-100 text-emerald-800'
                        };
                        
                        return (
                          <div key={entry.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${actionColors[entry.action] || 'bg-gray-100 text-gray-800'}`}>
                                  {actionLabels[entry.action] || entry.action}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{entry.userName}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            
                            {entry.changes && Object.keys(entry.changes).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(entry.changes).map(([field, change]: [string, any]) => {
                                  const fieldLabels: Record<string, string> = {
                                    merchant: 'Merchant',
                                    amount: 'Amount',
                                    date: 'Date',
                                    category: 'Category',
                                    description: 'Description',
                                    location: 'Location',
                                    card_used: 'Card Used',
                                    reimbursement_required: 'Reimbursement Required',
                                    zoho_entity: 'Entity',
                                    zoho_expense_id: 'Zoho Expense ID',
                                    status: 'Status'
                                  };
                                  
                                  return (
                                    <div key={field} className="text-xs text-gray-700">
                                      <span className="font-medium">{fieldLabels[field] || field}:</span>
                                      {' '}
                                      {change.old !== null && change.old !== undefined && (
                                        <span className="text-red-600 line-through">
                                          {field === 'amount' && typeof change.old === 'number' ? `$${change.old.toFixed(2)}` : String(change.old)}
                                        </span>
                                      )}
                                      {change.old !== null && change.old !== undefined && ' → '}
                                      <span className="text-green-600 font-medium">
                                        {field === 'amount' && typeof change.new === 'number' ? `$${change.new.toFixed(2)}` : String(change.new)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end space-x-3">
              {!isEditingExpense ? (
                <>
                  <button
                    onClick={() => {
                      setViewingExpense(null);
                      setShowFullReceipt(true);
                      setIsEditingExpense(false);
                      setEditFormData(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => startInlineEdit(viewingExpense)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Edit Expense
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={cancelInlineEdit}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveInlineEdit}
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
