import React, { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Calendar, DollarSign, TrendingUp, Building2, CheckCircle, X } from 'lucide-react';
import { User, TradeShow, Expense } from '../../App';
import { ExpenseChart } from './ExpenseChart';
import { EntityBreakdown } from './EntityBreakdown';
import { DetailedReport } from './DetailedReport';
import { AccountantDashboard } from '../accountant/AccountantDashboard';
import { api } from '../../utils/api';

interface ReportsProps {
  user: User;
}

export const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [reportType, setReportType] = useState<'overview' | 'detailed' | 'entity'>('overview');

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        const [ev, ex] = await Promise.all([api.getEvents(), api.getExpenses()]);
        setEvents(ev || []);
        setExpenses(ex || []);
      } else {
        const storedEvents = localStorage.getItem('tradeshow_events');
        const storedExpenses = localStorage.getItem('tradeshow_expenses');
        if (storedEvents) setEvents(JSON.parse(storedEvents));
        if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
      }
    })();
  }, []);

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    // Future: call API to update expense; for now refresh list from server
    if (api.USE_SERVER) {
      const refreshed = await api.getExpenses();
      setExpenses(refreshed || []);
    } else {
      const updatedExpenses = expenses.map(expense => expense.id === updatedExpense.id ? updatedExpense : expense);
      setExpenses(updatedExpenses);
      localStorage.setItem('tradeshow_expenses', JSON.stringify(updatedExpenses));
    }
  };

  const handleReimbursementApproval = (expense: Expense, status: 'approved' | 'rejected') => {
    const updatedExpense = { ...expense, reimbursementStatus: status };
    handleUpdateExpense(updatedExpense);
  };
  // Show accountant dashboard for accountants
  if (user.role === 'accountant') {
    return (
      <AccountantDashboard 
        user={user}
        expenses={expenses}
        events={events}
        onUpdateExpense={handleUpdateExpense}
      />
    );
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const eventMatch = selectedEvent === 'all' || expense.tradeShowId === selectedEvent;
      const entityMatch = selectedEntity === 'all' || expense.zohoEntity === selectedEntity;
      
      let periodMatch = true;
      if (selectedPeriod !== 'all') {
        const expenseDate = new Date(expense.date);
        const now = new Date();
        
        switch (selectedPeriod) {
          case 'week':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            break;
          case 'quarter':
            periodMatch = (now.getTime() - expenseDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
            break;
        }
      }
      
      return eventMatch && entityMatch && periodMatch;
    });
  }, [expenses, selectedEvent, selectedEntity, selectedPeriod]);

  const reportStats = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const approvedAmount = filteredExpenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const pendingAmount = filteredExpenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAmount,
      approvedAmount,
      pendingAmount,
      expenseCount: filteredExpenses.length,
      categoryBreakdown
    };
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    const csvContent = [
      ['Date', 'Event', 'Merchant', 'Category', 'Amount', 'Status', 'Entity', 'Location'],
      ...filteredExpenses.map(expense => [
        expense.date,
        events.find(e => e.id === expense.tradeShowId)?.name || 'N/A',
        expense.merchant,
        expense.category,
        expense.amount.toString(),
        expense.status,
        expense.zohoEntity || 'N/A',
        expense.location || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const entities = Array.from(new Set(expenses.map(e => e.zohoEntity).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Analyze expenses and generate comprehensive reports</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>

          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Entities</option>
            {entities.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>

          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed</option>
            <option value="entity">By Entity</option>
          </select>
        </div>

        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-1" />
            <span>{filteredExpenses.length} expenses found</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{events.filter(e => selectedEvent === 'all' || e.id === selectedEvent).length} events</span>
          </div>
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-1" />
            <span>{selectedEntity === 'all' ? entities.length : 1} entities</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${reportStats.totalAmount.toLocaleString()}</p>
              <p className="text-gray-600">Total Expenses</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {reportStats.expenseCount} transactions
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">${reportStats.approvedAmount.toLocaleString()}</p>
              <p className="text-gray-600">Approved</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {Math.round((reportStats.approvedAmount / reportStats.totalAmount) * 100) || 0}% of total
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">${reportStats.pendingAmount.toLocaleString()}</p>
              <p className="text-gray-600">Pending</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {filteredExpenses.filter(e => e.status === 'pending').length} items
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{entities.length}</p>
              <p className="text-gray-600">Entities</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Active mappings
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'overview' && (
        <ExpenseChart 
          expenses={filteredExpenses} 
          events={events}
          categoryBreakdown={reportStats.categoryBreakdown}
        />
      )}
      
      {reportType === 'entity' && (
        <EntityBreakdown 
          expenses={filteredExpenses}
          events={events}
        />
      )}
      
      {reportType === 'detailed' && (
        <DetailedReport 
          expenses={filteredExpenses}
          events={events}
          onReimbursementApproval={user.role === 'accountant' ? handleReimbursementApproval : undefined}
        />
      )}
    </div>
  );
};