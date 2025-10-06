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
  TrendingUp
} from 'lucide-react';
import { User, TradeShow, Expense } from '../../App';
import { api } from '../../utils/api';

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
        setEntityOptions(st?.entityOptions || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
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
  }, [expenses, searchTerm, filterCategory, filterUser, filterEvent, filterStatus, filterReimbursement, filterEntity]);

  // Calculate stats
  const stats = useMemo(() => {
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    const pendingReimbursements = expenses.filter(e => e.reimbursementRequired && e.reimbursementStatus === 'pending');
    const unassignedEntities = expenses.filter(e => e.status === 'approved' && !e.zohoEntity);
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
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Failed to assign entity:', error);
      alert('Failed to assign entity. Please try again.');
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

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-emerald-100 text-emerald-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors['pending'];
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Flights': 'bg-blue-100 text-blue-800',
      'Hotels': 'bg-emerald-100 text-emerald-800',
      'Meals': 'bg-orange-100 text-orange-800',
      'Supplies': 'bg-purple-100 text-purple-800',
      'Transportation': 'bg-yellow-100 text-yellow-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors['Other'];
  };

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Approvals</h1>
          <p className="text-gray-600 mt-1">Review, approve, and manage expense submissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
              <p className="text-gray-600">Pending Approval</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            ${stats.pendingAmount.toLocaleString()} total
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">{stats.reimbursementCount}</p>
              <p className="text-gray-600">Reimbursements</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Pending approval
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{stats.unassignedCount}</p>
              <p className="text-gray-600">Unassigned Entities</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Need entity assignment
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
              <p className="text-gray-600">Total Expenses</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Matching filters
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>

          <select
            value={filterReimbursement}
            onChange={(e) => setFilterReimbursement(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Reimbursement</option>
            <option value="required">Required</option>
            <option value="not-required">Not Required</option>
          </select>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Entities</option>
            <option value="unassigned">Unassigned</option>
            {entityOptions.map((entity, index) => (
              <option key={index} value={entity}>{entity}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Expense Review</h3>
            <div className="text-sm text-gray-600">
              {filteredExpenses.length} expenses
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant & Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            {new Date(expense.date).toLocaleDateString()}
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
                            expense.reimbursementRequired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {expense.reimbursementRequired ? 'Required' : 'Not Required'}
                          </span>
                          {expense.reimbursementRequired && expense.reimbursementStatus === 'pending' && (
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
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                          disabled={expense.status !== 'approved'}
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
    </div>
  );
};

