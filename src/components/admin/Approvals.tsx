import React, { useState, useEffect, useMemo } from 'react';
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
  Edit
} from 'lucide-react';
import { User, TradeShow, Expense } from '../../App';
import { api } from '../../utils/api';
import { formatLocalDate } from '../../utils/dateUtils';
import { getStatusColor, getCategoryColor, getReimbursementStatusColor } from '../../constants/appConstants';
import { useToast, ToastContainer } from '../common/Toast';

interface ApprovalsProps {
  user: User;
}

export const Approvals: React.FC<ApprovalsProps> = ({ user }) => {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cardOptions, setCardOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReimbursement, setFilterReimbursement] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editReimbursementStatus, setEditReimbursementStatus] = useState<'pending review' | 'approved' | 'rejected' | 'paid'>('pending review');
  const [editEntity, setEditEntity] = useState<string>('');

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Zoho-enabled entities (entities that have Zoho Books accounts configured)
  const zohoEnabledEntities = ['haute', 'alpha', 'beta', 'gamma', 'delta'];

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (api.USE_SERVER) {
      try {
        const [ev, ex, us, st] = await Promise.all([
          api.getEvents(),
          api.getExpenses(),
          api.getUsers(),
          api.getSettings()
        ]);
        setEvents(ev || []);
        setExpenses(ex || []);
        setUsers(us || []);
        setCardOptions(st?.cardOptions || []);
        console.log('[Approvals] Entity options from API:', st?.entityOptions);
        setEntityOptions(st?.entityOptions || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  };

  // Filter and sort expenses (pending items at top)
  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter(expense => {
      const matchesSearch = expense.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
      const matchesUser = filterUser === 'all' || expense.userId === filterUser;
      const matchesEvent = filterEvent === 'all' || expense.tradeShowId === filterEvent;
      const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
      const matchesReimbursement = filterReimbursement === 'all' || 
        (filterReimbursement === 'required' && expense.reimbursementRequired) ||
        (filterReimbursement === 'not-required' && !expense.reimbursementRequired);
      const matchesEntity = filterEntity === 'all' || 
        (filterEntity === 'unassigned' && !expense.zohoEntity) ||
        expense.zohoEntity === filterEntity;
      
      return matchesSearch && matchesCategory && matchesUser && matchesEvent && 
             matchesStatus && matchesReimbursement && matchesEntity;
    });

    // Sort: pending expenses at the top, then approved/rejected
    return filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // If both have the same status, sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses, searchTerm, filterCategory, filterUser, filterEvent, filterStatus, filterReimbursement, filterEntity]);

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

  const handleAssignEntity = async (expense: Expense, entity: string) => {
    try {
      if (api.USE_SERVER) {
        await api.assignEntity(expense.id, { zoho_entity: entity });
      }

      // Check if entity has Zoho Books integration
      const isZohoEntity = zohoEnabledEntities.includes(entity.toLowerCase());
      const isRealZoho = entity.toLowerCase() === 'haute';
      
      if (isZohoEntity) {
        if (isRealZoho) {
          addToast(`✅ Entity assigned! Expense is being pushed to Haute Brands Zoho Books...`, 'success');
        } else {
          addToast(`✅ Entity assigned to ${entity}! (Mock mode - simulated Zoho sync)`, 'info');
        }
      } else {
        addToast(`✅ Entity "${entity}" assigned successfully`, 'success');
      }

      await loadData(); // Refresh all data
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
        if (editStatus !== editingExpense.status) {
          await api.reviewExpense(editingExpense.id, { status: editStatus });
        }
        
        // Update reimbursement status if changed and reimbursement is required
        if (editingExpense.reimbursementRequired && editReimbursementStatus !== editingExpense.reimbursementStatus) {
          await api.setExpenseReimbursement(editingExpense.id, { reimbursement_status: editReimbursementStatus });
        }
        
        // Update entity if changed
        if (editEntity !== editingExpense.zohoEntity) {
          await api.assignEntity(editingExpense.id, { zoho_entity: editEntity });
          entityChanged = true;
          newEntity = editEntity;
        }
      }
      
      await loadData(); // Refresh all data
      closeEditModal();

      // Show toast notification if entity was changed
      if (entityChanged && newEntity) {
        const isZohoEntity = zohoEnabledEntities.includes(newEntity.toLowerCase());
        const isRealZoho = newEntity.toLowerCase() === 'haute';
        
        if (isZohoEntity) {
          if (isRealZoho) {
            addToast(`✅ Changes saved! Expense is being pushed to Haute Brands Zoho Books...`, 'success');
          } else {
            addToast(`✅ Changes saved! Entity ${newEntity} (Mock mode - simulated Zoho sync)`, 'info');
          }
        } else {
          addToast(`✅ Expense updated successfully`, 'success');
        }
      } else {
        addToast(`✅ Expense updated successfully`, 'success');
      }
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
              <p className="text-gray-600">Pending Approval</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            ${stats.pendingAmount.toLocaleString()} total
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.reimbursementCount}</p>
              <p className="text-gray-600">Reimbursements</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Pending approval
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-red-600">{stats.unassignedCount}</p>
              <p className="text-gray-600">Unassigned Entities</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Need entity assignment
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <h3 className="text-lg font-semibold text-gray-900">Expense Review</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {filteredExpenses.length} expenses
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & User
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant & Event
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reimbursement
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No expenses found matching your filters
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  const expenseUser = users.find(u => u.id === expense.userId);
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatLocalDate(expense.date)}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <UserIcon className="w-3 h-3 mr-1" />
                            {expenseUser?.name || 'Unknown User'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.merchant}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {event?.name || 'No Event'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
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
                        <div className="space-y-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={expense.zohoEntity || ''}
                          onChange={(e) => handleAssignEntity(expense, e.target.value)}
                          className={`text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full ${
                            expense.zohoEntity 
                              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                          disabled={!!expense.zohoEntity}
                        >
                          <option value="">Unassigned</option>
                          {entityOptions.map((entity, index) => (
                            <option key={index} value={entity}>{entity}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {expense.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveExpense(expense)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Approve Expense"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectExpense(expense)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject Expense"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Expense"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-t-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <h2 className="text-xl font-bold">Edit Expense</h2>
                <button
                  onClick={closeEditModal}
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
                    <p className="text-base font-semibold text-gray-900">{editingExpense.merchant}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount</p>
                    <p className="text-base font-semibold text-gray-900">${editingExpense.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-base font-semibold text-gray-900">{editingExpense.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatLocalDate(editingExpense.date)}
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
                    onChange={(e) => setEditStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Reimbursement Status */}
                {editingExpense.reimbursementRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reimbursement Status
                    </label>
                    <select
                      value={editReimbursementStatus}
                      onChange={(e) => setEditReimbursementStatus(e.target.value as 'pending review' | 'approved' | 'rejected' | 'paid')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    onChange={(e) => setEditEntity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Filter Expenses</h3>
                  <p className="text-sm text-gray-600">Refine your expense search</p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-t border-gray-200">
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

