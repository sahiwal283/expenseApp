import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Search, Filter, Eye, CreditCard as Edit2, Trash2, X } from 'lucide-react';
import { User, Expense, TradeShow } from '../../App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';
import { api } from '../../utils/api';
import { formatLocalDate } from '../../utils/dateUtils';
import { getStatusColor, getCategoryColor, getReimbursementStatusColor } from '../../constants/appConstants';

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
    setCardFilter('all');
    setStatusFilter('all');
    setReimbursementFilter('all');
  };

  // Get unique values for dropdowns
  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category))).sort();
  const uniqueCards = Array.from(new Set(expenses.map(e => e.cardUsed).filter(Boolean))).sort();

  // Filter and sort expenses (pending items at top)
  const filteredExpenses = expenses.filter(expense => {
    // Date filter
    if (dateFilter && !expense.date.includes(dateFilter)) return false;
    
    // Event filter
    if (eventFilter !== 'all' && expense.tradeShowId !== eventFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
    
    // Merchant filter
    if (merchantFilter && !expense.merchant.toLowerCase().includes(merchantFilter.toLowerCase())) return false;
    
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
  }).sort((a, b) => {
    // Sort: pending expenses at the top, then approved/rejected
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    // If both have the same status, sort by date (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });


  const hasActiveFilters = dateFilter || eventFilter !== 'all' || categoryFilter !== 'all' || 
                          merchantFilter || cardFilter !== 'all' || statusFilter !== 'all' || reimbursementFilter !== 'all';

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
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Event</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Category</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Merchant</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Card Used</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Receipt</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-left text-sm font-medium text-gray-900">Reimbursement</th>
                  <th className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 min-h-[44px] text-right text-sm font-medium text-gray-900">Actions</th>
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
                  {/* Receipt Filter - Placeholder */}
                  <th className="px-3 py-1.5">
                    <div className="text-xs text-gray-300 text-center">-</div>
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
                {filteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {formatLocalDate(expense.date)}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" 
          onClick={() => setReceiptModalUrl(null)}
        >
          <button
            onClick={() => setReceiptModalUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
          <div className="max-w-5xl max-h-[90vh] overflow-auto">
            <img
              src={receiptModalUrl}
              alt="Receipt full size"
              className="w-auto h-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
