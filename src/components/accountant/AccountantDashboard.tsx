import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Building2, 
  DollarSign, 
  Calendar,
  User as UserIcon,
  CreditCard,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { User, TradeShow, Expense } from '../../App';
import { api } from '../../utils/api';

interface AccountantDashboardProps {
  user: User;
  expenses: Expense[];
  events: TradeShow[];
  onUpdateExpense: (expense: Expense) => void;
}


export const AccountantDashboard: React.FC<AccountantDashboardProps> = ({
  user,
  expenses,
  events,
  onUpdateExpense
}) => {
  const [cardOptions, setCardOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReimbursement, setFilterReimbursement] = useState('all');
  const [filterCard, setFilterCard] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          const [us, st] = await Promise.all([api.getUsers(), api.getSettings()]);
          setUsers(us || []);
          setCardOptions(st?.cardOptions || []);
          setEntityOptions(st?.entityOptions || []);
        } catch {
          setUsers([]);
        }
      }
    })();
  }, []);
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
      const matchesCard = filterCard === 'all' || expense.cardUsed === filterCard;
      const matchesEntity = filterEntity === 'all' || expense.zohoEntity === filterEntity;
      
      return matchesSearch && matchesCategory && matchesUser && matchesEvent && 
             matchesStatus && matchesReimbursement && matchesCard && matchesEntity;
    });
  }, [expenses, searchTerm, filterCategory, filterUser, filterEvent, filterStatus, filterReimbursement, filterCard, filterEntity]);

  const handleAssignEntity = async (expense: Expense, entity: string) => {
    try {
      if (api.USE_SERVER) {
        await api.assignEntity(expense.id, { zoho_entity: entity });
        // Force reload by calling parent update with fresh data from server
        const refreshedExpenses = await api.getExpenses();
        const updatedExpense = refreshedExpenses?.find(e => e.id === expense.id);
        if (updatedExpense) {
          onUpdateExpense(updatedExpense);
        }
      } else {
        onUpdateExpense({ ...expense, zohoEntity: entity });
      }
    } catch (error) {
      console.error('Failed to assign entity:', error);
      alert('Failed to assign entity. Please try again.');
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

  const stats = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const approvedAmount = filteredExpenses.filter(e => e.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0);
    const pendingAmount = filteredExpenses.filter(e => e.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0);
    const pendingCount = filteredExpenses.filter(e => e.status === 'pending').length;
    const reimbursementCount = filteredExpenses.filter(e => e.reimbursementRequired).length;
    const unassignedCount = filteredExpenses.filter(e => !e.zohoEntity).length;
    const entityCount = new Set(expenses.map(e => e.zohoEntity).filter(Boolean)).size;

    return { 
      totalAmount, 
      approvedAmount, 
      pendingAmount, 
      pendingCount, 
      reimbursementCount, 
      unassignedCount,
      entityCount,
      expenseCount: filteredExpenses.length
    };
  }, [filteredExpenses, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="text-gray-600 mt-1">Review expenses, assign entities, and manage approvals</p>
        </div>
      </div>

      {/* Stats Cards - Matching Admin Dashboard Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${stats.totalAmount.toLocaleString()}</p>
              <p className="text-gray-600">Total Expenses</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {stats.expenseCount} transactions
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">${stats.approvedAmount.toLocaleString()}</p>
              <p className="text-gray-600">Approved</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {stats.totalAmount > 0 ? Math.round((stats.approvedAmount / stats.totalAmount) * 100) : 0}% of total
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">${stats.pendingAmount.toLocaleString()}</p>
              <p className="text-gray-600">Pending</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {stats.pendingCount} items
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{stats.entityCount}</p>
              <p className="text-gray-600">Entities</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Active mappings
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
            value={filterReimbursement}
            onChange={(e) => setFilterReimbursement(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Reimbursement</option>
            <option value="required">Required</option>
            <option value="not-required">Not Required</option>
          </select>

          <select
            value={filterCard}
            onChange={(e) => setFilterCard(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Cards</option>
            {cardOptions.map((card, index) => (
              <option key={index} value={card}>{card}</option>
            ))}
          </select>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Entities</option>
            <option value="">Unassigned</option>
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
              {filteredExpenses.length} expenses • ${stats.totalAmount.toLocaleString()} total
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
                  Category & Card
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
                  Entity Assignment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Info
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => {
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
                      <div className="space-y-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                        <div className="text-xs text-gray-600">{expense.cardUsed}</div>
                      </div>
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
                        {expense.reimbursementRequired ? 'Required' : 'Not Required'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={expense.zohoEntity || ''}
                        onChange={(e) => handleAssignEntity(expense, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Unassigned</option>
                        {entityOptions.map((entity, index) => (
                          <option key={index} value={entity}>{entity}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-500 italic">
                        Use Approvals page for reviews
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};