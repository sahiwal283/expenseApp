import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Search, Filter, Eye, CreditCard as Edit2, Trash2, X } from 'lucide-react';
import { User, Expense, TradeShow } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { api } from '../../utils/api';

interface ExpenseSubmissionProps {
  user: User;
}

export const ExpenseSubmission: React.FC<ExpenseSubmissionProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);

  // Column-level filters
  const [dateFilter, setDateFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [amountMinFilter, setAmountMinFilter] = useState('');
  const [amountMaxFilter, setAmountMaxFilter] = useState('');
  const [cardFilter, setCardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reimbursementFilter, setReimbursementFilter] = useState('all');

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          const [ev, ex] = await Promise.all([
            api.getEvents(),
            api.getExpenses(),
          ]);
          setEvents(ev || []);
          setExpenses(ex || []);
        } catch {
          setEvents([]);
          setExpenses([]);
        }
      } else {
        const storedExpenses = localStorage.getItem('tradeshow_expenses');
        const storedEvents = localStorage.getItem('tradeshow_events');
        if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
        if (storedEvents) setEvents(JSON.parse(storedEvents));
      }
    })();
  }, []);

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>, file?: File) => {
    if (api.USE_SERVER) {
      if (editingExpense) {
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
      } else {
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
      }
      setPendingReceiptFile(null);
      const refreshed = await api.getExpenses();
      setExpenses(refreshed || []);
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
    }
    setShowForm(false);
    setEditingExpense(null);
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
      const refreshed = await api.getExpenses();
      setExpenses(refreshed || []);
    } else {
      const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
      setExpenses(updatedExpenses);
      localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
    }
  };

  const handleReceiptProcessed = (receiptData: any, file: File) => {
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

  const clearAllFilters = () => {
    setDateFilter('');
    setEventFilter('all');
    setCategoryFilter('all');
    setMerchantFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
    setCardFilter('all');
    setStatusFilter('all');
    setReimbursementFilter('all');
  };

  // Get unique values for dropdowns
  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category))).sort();
  const uniqueCards = Array.from(new Set(expenses.map(e => e.cardUsed).filter(Boolean))).sort();

  const filteredExpenses = expenses.filter(expense => {
    // Date filter
    if (dateFilter && !expense.date.includes(dateFilter)) return false;
    
    // Event filter
    if (eventFilter !== 'all' && expense.tradeShowId !== eventFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
    
    // Merchant filter
    if (merchantFilter && !expense.merchant.toLowerCase().includes(merchantFilter.toLowerCase())) return false;
    
    // Amount filters
    if (amountMinFilter && expense.amount < parseFloat(amountMinFilter)) return false;
    if (amountMaxFilter && expense.amount > parseFloat(amountMaxFilter)) return false;
    
    // Card filter
    if (cardFilter !== 'all' && expense.cardUsed !== cardFilter) return false;
    
    // Status filter
    if (statusFilter !== 'all' && expense.status !== statusFilter) return false;
    
    // Reimbursement filter
    if (reimbursementFilter === 'required' && !expense.reimbursementRequired) return false;
    if (reimbursementFilter === 'not-required' && expense.reimbursementRequired) return false;
    
    // User permission filter
    const matchesUser = user.role === 'admin' || user.role === 'accountant' || expense.userId === user.id;
    
    return matchesUser;
  });

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

  const hasActiveFilters = dateFilter || eventFilter !== 'all' || categoryFilter !== 'all' || 
                          merchantFilter || amountMinFilter || amountMaxFilter || 
                          cardFilter !== 'all' || statusFilter !== 'all' || reimbursementFilter !== 'all';

  if (showForm) {
    return (
      <ExpenseForm
        expense={editingExpense}
        events={events}
        onSave={handleSaveExpense}
        onCancel={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
      />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">Submit and track your trade show expenses</p>
        </div>
        <div className="flex space-x-3">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Clear Filters</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            <Receipt className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
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
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Event</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Merchant</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Card Used</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Receipt</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Reimbursement</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
                {/* Inline Filters Row */}
                <tr className="bg-gray-100 border-t border-gray-200">
                  {/* Date Filter */}
                  <th className="px-3 py-2">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Filter date"
                    />
                  </th>
                  {/* Event Filter */}
                  <th className="px-3 py-2">
                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Events</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </th>
                  {/* Category Filter */}
                  <th className="px-3 py-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </th>
                  {/* Merchant Filter */}
                  <th className="px-3 py-2">
                    <input
                      type="text"
                      value={merchantFilter}
                      onChange={(e) => setMerchantFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Search..."
                    />
                  </th>
                  {/* Amount Filter */}
                  <th className="px-3 py-2">
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={amountMinFilter}
                        onChange={(e) => setAmountMinFilter(e.target.value)}
                        className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Min"
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={amountMaxFilter}
                        onChange={(e) => setAmountMaxFilter(e.target.value)}
                        className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Max"
                        step="0.01"
                      />
                    </div>
                  </th>
                  {/* Card Filter */}
                  <th className="px-3 py-2">
                    <select
                      value={cardFilter}
                      onChange={(e) => setCardFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      {uniqueCards.map(card => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                  </th>
                  {/* Receipt Filter - Placeholder */}
                  <th className="px-3 py-2">
                    <div className="text-xs text-gray-400 text-center">-</div>
                  </th>
                  {/* Status Filter */}
                  <th className="px-3 py-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </th>
                  {/* Reimbursement Filter */}
                  <th className="px-3 py-2">
                    <select
                      value={reimbursementFilter}
                      onChange={(e) => setReimbursementFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="required">Required</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </th>
                  {/* Actions - No filter */}
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      {/* Event */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {event ? event.name : 'No Event'}
                      </td>
                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      {/* Merchant */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.merchant}</div>
                          {expense.location && (
                            <div className="text-sm text-gray-500">{expense.location}</div>
                          )}
                        </div>
                      </td>
                      {/* Amount */}
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        ${expense.amount.toFixed(2)}
                      </td>
                      {/* Card Used */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.cardUsed}
                      </td>
                      {/* Receipt */}
                      <td className="px-6 py-4">
                        {expense.receiptUrl ? (
                          <button
                            onClick={() => setReceiptModalUrl(expense.receiptUrl.replace(/^\/uploads/, '/api/uploads'))}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                          >
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm whitespace-nowrap">No receipt</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      {/* Reimbursement */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                          expense.reimbursementRequired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.reimbursementRequired ? 'Required' : 'Not Required'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* Receipt Modal */}
      {receiptModalUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setReceiptModalUrl(null)}>
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Receipt</h3>
              <button onClick={() => setReceiptModalUrl(null)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <img src={receiptModalUrl} alt="Receipt" className="max-w-md mx-auto rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
