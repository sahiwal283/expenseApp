import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Search, Filter, Eye, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { User, Expense, TradeShow } from './App';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptUpload } from './ReceiptUpload';

interface ExpenseSubmissionProps {
  user: User;
}

export const ExpenseSubmission: React.FC<ExpenseSubmissionProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');

  useEffect(() => {
    const storedExpenses = localStorage.getItem('tradeshow_expenses');
    const storedEvents = localStorage.getItem('tradeshow_events');
    
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses));
    }
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, []);

  const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: editingExpense?.id || Date.now().toString(),
      userId: user.id
    };

    let updatedExpenses;
    if (editingExpense) {
      updatedExpenses = expenses.map(expense => expense.id === editingExpense.id ? newExpense : expense);
    } else {
      updatedExpenses = [...expenses, newExpense];
    }

    setExpenses(updatedExpenses);
    localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
    setExpenses(updatedExpenses);
    localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
  };

  const handleReceiptProcessed = (receiptData: any) => {
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
    // Pre-populate form with OCR data
    setTimeout(() => {
      const event = new CustomEvent('populateExpenseForm', { detail: newExpense });
      window.dispatchEvent(event);
    }, 100);
    setShowReceiptUpload(false);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    const matchesEvent = filterEvent === 'all' || expense.tradeShowId === filterEvent;
    const matchesUser = user.role === 'admin' || user.role === 'accountant' || expense.userId === user.id;
    
    return matchesSearch && matchesStatus && matchesEvent && matchesUser;
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
          <button
            onClick={() => setShowReceiptUpload(true)}
            className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Receipt className="w-5 h-5" />
            <span>Scan Receipt</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Expenses Found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all' || filterEvent !== 'all'
              ? 'Try adjusting your filters to see more expenses.'
              : 'Start by submitting your first expense or scanning a receipt.'
            }
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowReceiptUpload(true)}
              className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Scan Receipt
            </button>
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
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Merchant</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Card Used</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Reimbursement</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Receipt</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Event</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => {
                  const event = events.find(e => e.id === expense.tradeShowId);
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.merchant}</div>
                          {expense.location && (
                            <div className="text-sm text-gray-500">{expense.location}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.cardUsed}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          expense.reimbursementRequired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.reimbursementRequired ? 'Required' : 'Not Required'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {expense.receiptUrl ? (
                          <button
                            onClick={() => window.open(expense.receiptUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">No receipt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {event ? event.name : 'No Event'}
                      </td>
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
    </div>
  );
};