import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Building2, 
  CheckCircle, 
  X, 
  DollarSign, 
  Calendar,
  User as UserIcon,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Edit,
  Eye,
  Receipt,
  MapPin,
  FileText,
  Upload,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { User, Expense } from '../../App';
import { api } from '../../utils/api';
import { formatLocalDate } from '../../utils/dateUtils';
import { getReimbursementStatusColor } from '../../constants/appConstants';
import { useToast, ToastContainer } from '../common/Toast';
import { StatusBadge, CategoryBadge } from '../common';
import { useApprovals } from './Approvals/hooks/useApprovals';
import { useApprovalFilters } from './Approvals/hooks/useApprovalFilters';
// ✅ REFACTORED: Import extracted components
import {
  ApprovalStatsCards,
  ApprovalTableRow,
  ApprovalViewModal,
  ApprovalEditModal,
  ApprovalFilterModal
} from './Approvals';

interface ApprovalsProps {
  user: User;
}

export const Approvals: React.FC<ApprovalsProps> = ({ user }) => {
  // Use custom hooks for data fetching and filtering
  const { events, expenses, users, cardOptions, entityOptions, loading, reload: loadData } = useApprovals();
  const {
    searchTerm, setSearchTerm,
    filterCategory, setFilterCategory,
    filterUser, setFilterUser,
    filterEvent, setFilterEvent,
    filterStatus, setFilterStatus,
    filterReimbursement, setFilterReimbursement,
    filterEntity, setFilterEntity,
    filteredExpenses,
    hasActiveFilters,
    clearAllFilters
  } = useApprovalFilters(expenses);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editReimbursementStatus, setEditReimbursementStatus] = useState<'pending review' | 'approved' | 'rejected' | 'paid'>('pending review');
  const [editEntity, setEditEntity] = useState<string>('');

  // View details modal state
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Zoho push state
  const [pushingExpenseId, setPushingExpenseId] = useState<string | null>(null);
  const [pushedExpenses, setPushedExpenses] = useState<Set<string>>(new Set());

  // Update pushedExpenses set when expenses data changes
  useEffect(() => {
    console.log('[Approvals] useEffect triggered - expenses count:', expenses.length);
    if (expenses.length > 0) {
      console.log('[Approvals] First expense sample:', {
        id: expenses[0].id,
        zohoEntity: expenses[0].zohoEntity,
        zohoExpenseId: expenses[0].zohoExpenseId,
        hasZohoExpenseId: !!expenses[0].zohoExpenseId
      });
    }
    const pushed = new Set(expenses.filter(e => e.zohoExpenseId).map(e => e.id));
    setPushedExpenses(pushed);
    console.log('[Approvals] Updated pushedExpenses set:', pushed.size, 'expenses');
    if (pushed.size > 0) {
      console.log('[Approvals] Pushed expense IDs:', Array.from(pushed));
    }
  }, [expenses]);

  // Zoho-enabled entities (entities that have Zoho Books accounts configured)
  const zohoEnabledEntities = ['haute', 'alpha', 'beta', 'gamma', 'delta'];

  // Calculate stats
  const stats = useMemo(() => {
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    const pendingReimbursements = expenses.filter(e => e.reimbursementRequired && e.reimbursementStatus === 'pending review');
    const unassignedEntities = expenses.filter(e => !e.zohoEntity);
    const totalPendingAmount = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      pendingCount: pendingExpenses.length,
      pendingAmount: totalPendingAmount,
      reimbursementCount: pendingReimbursements.length,
      unassignedCount: unassignedEntities.length
    };
  }, [expenses]);

  // Handlers
  const handleApproveExpense = async (expense: Expense) => {
    try {
      if (api.USE_SERVER) {
        await api.reviewExpense(expense.id, { status: 'approved' });
      }
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Failed to approve expense. Please try again.');
    }
  };

  const handleRejectExpense = async (expense: Expense) => {
    try {
      if (api.USE_SERVER) {
        await api.reviewExpense(expense.id, { status: 'rejected' });
      }
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Failed to reject expense. Please try again.');
    }
  };

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
      await loadData(); // Refresh data to update zohoExpenseId
    } catch (error: any) {
      console.error('Failed to push to Zoho:', error);
      
      // Check if this is an auth error (401/403) - should not happen, but handle gracefully
      if (error.response?.status === 401 || error.response?.status === 403) {
        addToast('⚠️ Session expired. Please log in again.', 'warning');
        // Don't force logout - let the existing auth interceptor handle it
        return;
      }
      
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      
      // Check if this is a "not configured" error for this specific entity
      if (errorMsg.includes('does not have Zoho Books integration configured')) {
        addToast(
          `🕐 Zoho Books integration for "${expense.zohoEntity}" is coming soon. Please try again in the future or add this expense manually.`,
          'info'
        );
      } else {
        // Other errors (real API failures, network issues, etc.)
        addToast(`❌ Failed to push to Zoho Books: ${errorMsg}`, 'error');
      }
    } finally {
      setPushingExpenseId(null);
    }
  };

  const handleAssignEntity = async (expense: Expense, entity: string) => {
    // Warn if changing entity on an already-pushed expense
    // Check both zohoExpenseId (current state) and pushedExpenses Set (in-memory tracking)
    const wasPushed = expense.zohoExpenseId || pushedExpenses.has(expense.id);
    const isChangingEntity = expense.zohoEntity && expense.zohoEntity !== entity;
    
    console.log('[Approvals] Entity change check:', {
      expenseId: expense.id,
      wasPushed,
      isChangingEntity,
      currentEntity: expense.zohoEntity,
      newEntity: entity,
      hasZohoId: !!expense.zohoExpenseId
    });
    
    if (wasPushed && isChangingEntity) {
      const confirmed = window.confirm(
        `⚠️ This expense has already been pushed to "${expense.zohoEntity}" Zoho Books.\n\n` +
        `Changing the entity will allow you to push it to "${entity || 'Unassigned'}" instead, ` +
        `but it will NOT remove it from "${expense.zohoEntity}" Zoho Books.\n\n` +
        `Are you sure you want to change entities?`
      );
      
      if (!confirmed) {
        console.log('[Approvals] User cancelled entity change');
        return; // User cancelled
      }
      console.log('[Approvals] User confirmed entity change');
    }

    try {
      let updatedExpense = expense;
      
      if (api.USE_SERVER) {
        // Empty string means "unassign" (set to NULL in database)
        // Backend will also clear zoho_expense_id if entity is changed
        updatedExpense = await api.assignEntity(expense.id, { zoho_entity: entity });
      }

      // Remove from pushedExpenses set to allow re-push
      if (expense.zohoEntity !== entity) {
        setPushedExpenses(prev => {
          const newSet = new Set(prev);
          newSet.delete(expense.id);
          return newSet;
        });
      }

      await loadData(); // Refresh all data
      
      // Update viewingExpense if modal is open (use the returned updated expense)
      if (viewingExpense && viewingExpense.id === expense.id) {
        setViewingExpense(updatedExpense);
      }
      
      if (expense.zohoExpenseId) {
        addToast('✅ Entity changed. You can now push to the new entity.', 'success');
      }
    } catch (error) {
      console.error('Failed to assign entity:', error);
      addToast('❌ Failed to assign entity. Please try again.', 'error');
    }
  };

  const handleReimbursementApproval = async (expense: Expense, status: 'approved' | 'rejected') => {
    try {
      if (api.USE_SERVER) {
        await api.setExpenseReimbursement(expense.id, { reimbursement_status: status });
      }
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Error updating reimbursement:', error);
      alert('Failed to update reimbursement status. Please try again.');
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setEditStatus(expense.status as 'pending' | 'approved' | 'rejected');
    setEditReimbursementStatus(expense.reimbursementStatus as 'pending review' | 'approved' | 'rejected' | 'paid');
    setEditEntity(expense.zohoEntity || '');
  };

  const closeEditModal = () => {
    setEditingExpense(null);
    setEditStatus('pending');
    setEditReimbursementStatus('pending review');
    setEditEntity('');
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    try {
      let entityChanged = false;
      let newEntity = '';

      if (api.USE_SERVER) {
        // Update status if changed
        if (editStatus !== editingExpense.status && (editStatus === 'approved' || editStatus === 'rejected')) {
          await api.reviewExpense(editingExpense.id, { status: editStatus });
        }
        
        // Update reimbursement status if changed and reimbursement is required
        if (editingExpense.reimbursementRequired && editReimbursementStatus !== editingExpense.reimbursementStatus) {
          await api.setExpenseReimbursement(editingExpense.id, { reimbursement_status: editReimbursementStatus });
        }
        
        // Update entity if changed (empty string means "unassign")
        if (editEntity !== editingExpense.zohoEntity) {
          await api.assignEntity(editingExpense.id, { zoho_entity: editEntity });
          entityChanged = true;
          newEntity = editEntity;
        }
      }
      
      await loadData(); // Refresh all data
      closeEditModal();
    } catch (error) {
      console.error('Error updating expense:', error);
      addToast('❌ Failed to update expense. Please try again.', 'error');
    }
  };

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expense Approvals</h1>
          <p className="text-gray-600 mt-1">Review, approve, and manage expense submissions</p>
        </div>
      </div>

      {/* ✅ REFACTORED: Replaced 47 lines with ApprovalStatsCards component */}
      <ApprovalStatsCards stats={stats} />

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <h3 className="text-lg font-semibold text-gray-900">Expense Review</h3>
            <div className="flex items-center space-x-4">
              <div className="text-xs sm:text-sm text-gray-600">
                {filteredExpenses.length} expenses
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-medium">Filters</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & User
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant & Event
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reimbursement
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zoho
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No expenses found matching your filters
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  // Use pre-fetched data from backend JOINs when available
                  const eventName = expense.event_name || events.find(e => e.id === expense.tradeShowId)?.name || 'No Event';
                  const userName = expense.user_name || users.find(u => u.id === expense.userId)?.name || 'Unknown User';
                  
                  return (
                    <ApprovalTableRow
                      key={expense.id}
                      expense={expense}
                      eventName={eventName}
                      userName={userName}
                      entityOptions={entityOptions}
                      pushingExpenseId={pushingExpenseId}
                      pushedExpenses={pushedExpenses}
                      onApprove={handleApproveExpense}
                      onReject={handleRejectExpense}
                      onReimbursementApproval={handleReimbursementApproval}
                      onAssignEntity={handleAssignEntity}
                      onPushToZoho={handlePushToZoho}
                      onViewDetails={setViewingExpense}
                      onEdit={openEditModal}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ REFACTORED: Replaced 215 lines with ApprovalViewModal component */}
      {viewingExpense && (
        <ApprovalViewModal
          expense={viewingExpense}
          entityOptions={entityOptions}
          showFullReceipt={showFullReceipt}
          onClose={() => setViewingExpense(null)}
          onToggleReceipt={() => setShowFullReceipt(!showFullReceipt)}
          onAssignEntity={handleAssignEntity}
          onEdit={(exp) => {
            openEditModal(exp);
            setViewingExpense(null);
          }}
        />
      )}


      {/* Full Receipt Modal */}
      {showFullReceipt && viewingExpense?.receiptUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowFullReceipt(false)}
        >
          <button
            onClick={() => setShowFullReceipt(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
          <div className="max-w-5xl max-h-[90vh] overflow-auto">
            <img
              src={viewingExpense.receiptUrl.replace(/^\/uploads/, '/api/uploads')}
              alt="Receipt full size"
              className="w-auto h-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ✅ REFACTORED: Replaced 114 lines with ApprovalEditModal component */}
      {editingExpense && (
        <ApprovalEditModal
          expense={editingExpense}
          editStatus={editStatus}
          editReimbursementStatus={editReimbursementStatus}
          editEntity={editEntity}
          entityOptions={entityOptions}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
          onStatusChange={setEditStatus}
          onReimbursementStatusChange={setEditReimbursementStatus}
          onEntityChange={setEditEntity}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Filter Expenses</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Refine your expense search</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search expenses..."
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* First Row: Status, Category, Event */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event
                    </label>
                    <select
                      value={filterEvent}
                      onChange={(e) => setFilterEvent(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Events</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Second Row: User, Reimbursement, Entity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User
                    </label>
                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Users</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reimbursement
                    </label>
                    <select
                      value={filterReimbursement}
                      onChange={(e) => setFilterReimbursement(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Reimbursement</option>
                      <option value="required">Required</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entity
                    </label>
                    <select
                      value={filterEntity}
                      onChange={(e) => setFilterEntity(e.target.value)}
                      className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Entities</option>
                      <option value="unassigned">Unassigned</option>
                      {entityOptions.map((entity, index) => (
                        <option key={index} value={entity}>{entity}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-t border-gray-200">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setFilterEvent('all');
                  setFilterUser('all');
                  setFilterReimbursement('all');
                  setFilterEntity('all');
                }}
                className="px-3 sm:px-4 py-2 min-h-[44px] text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

