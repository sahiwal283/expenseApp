import React, { useState, useEffect } from 'react';
import { User, Expense } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { ApprovalCards } from './ApprovalCards';
import { api } from '../../utils/api';
import { formatLocalDate, getTodayLocalDateString, formatForDateInput } from '../../utils/dateUtils';
import { useExpenses } from './ExpenseSubmission/hooks/useExpenses';
import { useExpenseFilters } from './ExpenseSubmission/hooks/useExpenseFilters';
import { usePendingSync } from './ExpenseSubmission/hooks/usePendingSync';
import { ReceiptData, AuditTrailEntry, ExpenseEditFormData, OcrV2Data, AppError } from '../../types/types';
import { useToast, ToastContainer } from '../common/Toast';
import { sendOCRCorrection, detectCorrections } from '../../utils/ocrCorrections';

// ✅ REFACTORED: Imported extracted components
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
import {
  ExpenseSubmissionHeader,
  ExpenseSubmissionEmptyState,
  ExpenseSubmissionTable,
  PendingSyncModal,
} from './ExpenseSubmission/index';

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
  const [ocrV2Data, setOcrV2Data] = useState<OcrV2Data | null>(null);

  // Audit trail
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Inline editing in modal
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editFormData, setEditFormData] = useState<ExpenseEditFormData | null>(null);

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
        const hasChanges = trail.filter((entry: AuditTrailEntry) => entry.action !== 'created').length > 0;
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

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>, file?: File, ocrDataOverride?: OcrV2Data) => {
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
            zoho_entity: expenseData.zohoEntity || undefined,  // Auto-populated from card selection
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

          const updatedExpense = await response.json() as Expense;
      
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
    let ocrDataForCorrections: OcrV2Data | null = null;
    if (receiptData.ocrV2Data) {
      console.log('[OCR Correction] Preparing OCR v2 data for correction tracking');
      const inference = receiptData.ocrV2Data.inference;
      ocrDataForCorrections = {
        inference: inference,
        categories: receiptData.ocrV2Data.categories,
        ocrProvider: receiptData.ocrV2Data.ocrProvider,
        ocrText: receiptData.ocrText,
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
      extractedData: {
        total: receiptData.total || 0,
        category: receiptData.category || 'Other',
        merchant: receiptData.merchant || '',
        date: receiptData.date || getTodayLocalDateString(),
        location: receiptData.location || ''
      },
      zohoEntity: receiptData.zohoEntity || undefined  // Auto-populated from card selection
    };

        // Save and wait for completion before closing - pass OCR data directly
        await handleSaveExpense(expenseData, file, ocrDataForCorrections || undefined);
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

    console.log(`[Entity Assignment] Starting: Expense ${expense.id} → "${entity}"`);

    try {
      if (api.USE_SERVER) {
        const updatedExpense = await api.assignEntity(expense.id, { zoho_entity: entity }) as Expense;
        console.log(`[Entity Assignment] Response:`, updatedExpense);
        
        // Verify entity was actually updated
        if (updatedExpense.zohoEntity !== entity) {
          console.error(`[Entity Assignment] MISMATCH: Expected "${entity}", got "${updatedExpense.zohoEntity}"`);
          addToast('⚠️ Entity may not have been updated. Please refresh and try again.', 'warning');
          return;
        }
        
        console.log(`[Entity Assignment] SUCCESS: Entity is now "${updatedExpense.zohoEntity}"`);
      }

      // Remove from pushedExpenses set to allow re-push
      if (expense.zohoEntity !== entity) {
        setPushedExpenses(prev => {
          const newSet = new Set(prev);
          newSet.delete(expense.id);
          return newSet;
        });
      }

      console.log(`[Entity Assignment] Reloading data...`);
      await reloadData();
      console.log(`[Entity Assignment] Data reloaded`);
      
      if (expense.zohoExpenseId) {
        addToast('✅ Entity changed. You can now push to the new entity.', 'success');
      } else {
        addToast('✅ Entity assigned!', 'success');
      }
    } catch (error) {
      console.error('[Entity Assignment] Failed:', error);
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

    console.log(`[Push to Zoho] Starting push for expense ${expense.id} to entity "${expense.zohoEntity}"`);
    console.log(`[Push to Zoho] Current user:`, user);
    
    setPushingExpenseId(expense.id);
    try {
      await api.pushToZoho(expense.id);
      setPushedExpenses(prev => new Set(prev).add(expense.id));
      addToast(`✅ Expense successfully pushed to ${expense.zohoEntity} Zoho Books!`, 'success');
      await reloadData();
    } catch (error) {
      const appError = error as AppError & { response?: { status?: number; statusText?: string; data?: unknown } };
      console.error('[Push to Zoho] Failed:', appError);
      console.error('[Push to Zoho] Error details:', {
        status: appError.response?.status,
        statusText: appError.response?.statusText,
        data: appError.response?.data,
        message: appError.message
      });
      
      const errorMsg = appError.response?.data?.error || appError.message || 'Unknown error';
      
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
      <ExpenseSubmissionHeader
        hasApprovalPermission={hasApprovalPermission}
        hasActiveFilters={hasActiveFilters}
        pendingCount={pendingCount}
        onClearFilters={clearAllFilters}
        onShowPendingSync={() => setShowPendingSync(true)}
        onAddExpense={() => setShowReceiptUpload(true)}
      />

      {/* Approval Workflow Cards (Only visible to admin/accountant/developer) */}
      {hasApprovalPermission && <ApprovalCards expenses={expenses} />}

      {/* Expenses Table */}
      {finalFilteredExpenses.length === 0 ? (
        <ExpenseSubmissionEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          onAddExpense={() => setShowReceiptUpload(true)}
        />
      ) : (
        <ExpenseSubmissionTable
          expenses={expenses}
          filteredExpenses={finalFilteredExpenses}
          events={events}
          users={users}
          hasApprovalPermission={hasApprovalPermission}
          entityOptions={entityOptions}
          pushingExpenseId={pushingExpenseId}
          pushedExpenses={pushedExpenses}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
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
                onReimbursementStatusChange={async (newStatus) => {
                  await handleReimbursementApproval(viewingExpense, newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'pending review');
                  if (newStatus === 'paid') {
                    await handleMarkAsPaid(viewingExpense);
                  }
                }}
                onEntityChange={async (newEntity) => {
                  await handleAssignEntity(viewingExpense, newEntity);
                }}
              />

              {/* ✅ REFACTORED: Replaced 27 lines with ExpenseModalReceipt */}
              <ExpenseModalReceipt
                receiptUrl={viewingExpense.receiptUrl}
                showFullReceipt={showFullReceipt}
                onToggle={() => setShowFullReceipt(!showFullReceipt)}
              />

              {/* ✅ REFACTORED: Replaced 110 lines with ExpenseModalAuditTrail */}
              <ExpenseModalAuditTrail
                hasApprovalPermission={hasApprovalPermission}
                loadingAudit={loadingAudit}
                auditTrail={auditTrail}
              />
            </div>

            {/* ✅ REFACTORED: Replaced 50 lines with ExpenseModalFooter */}
            <ExpenseModalFooter
              isEditingExpense={isEditingExpense}
              isSaving={isSaving}
              onClose={() => {
                setViewingExpense(null);
                setShowFullReceipt(true);
                setIsEditingExpense(false);
                setEditFormData(null);
              }}
              onEdit={() => startInlineEdit(viewingExpense)}
              onCancel={cancelInlineEdit}
              onSave={saveInlineEdit}
            />
          </div>
        </div>
      )}

      <PendingSyncModal
        user={user}
        isOpen={showPendingSync}
        onClose={() => setShowPendingSync(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
