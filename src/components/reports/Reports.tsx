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
  const [activeEntityOptions, setActiveEntityOptions] = useState<string[]>([]);

  const handleTradeShowClick = (eventId: string) => {
    setSelectedEvent(eventId);
    setReportType('detailed');
    // Scroll to detailed report
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        const [ev, ex, settings] = await Promise.all([
          api.getEvents(), 
          api.getExpenses(),
          api.getSettings()
        ]);
        setEvents(ev || []);
        setExpenses(ex || []);
        setActiveEntityOptions(settings?.entityOptions || []);
      } else {
        const storedEvents = localStorage.getItem('tradeshow_events');
        const storedExpenses = localStorage.getItem('tradeshow_expenses');
        const storedSettings = localStorage.getItem('app_settings');
        if (storedEvents) setEvents(JSON.parse(storedEvents));
        if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
        if (storedSettings) {
          const settings = JSON.parse(storedSettings);
          setActiveEntityOptions(settings.entityOptions || []);
        }
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

  // Calculate entity totals (filtered, only active entities)
  const entityTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      // Only include expenses with entities that are in the active entity options
      if (expense.zohoEntity && activeEntityOptions.includes(expense.zohoEntity)) {
        totals[expense.zohoEntity] = (totals[expense.zohoEntity] || 0) + expense.amount;
      }
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1]) // Sort by amount descending
      .map(([entity, amount]) => ({ entity, amount }));
  }, [filteredExpenses, activeEntityOptions]);

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

      {/* Entity Totals Dashboard */}
      {entityTotals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Entity Running Totals</h3>
              <p className="text-xs text-gray-600">For selected filters</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {entityTotals.map(({ entity, amount }) => (
              <div 
                key={entity} 
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-200 min-w-[200px] flex-shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 mb-1 truncate" title={entity}>
                      {entity}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                    <DollarSign className="w-3 h-3 text-purple-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredExpenses.filter(e => !e.zohoEntity).length > 0 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-xs text-yellow-800">
                  <span className="font-semibold">{filteredExpenses.filter(e => !e.zohoEntity).length} expenses</span> in current view have no entity assigned (${filteredExpenses.filter(e => !e.zohoEntity).reduce((sum, e) => sum + e.amount, 0).toLocaleString()})
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* Report Content */}
      {reportType === 'overview' && (
        <ExpenseChart 
          expenses={filteredExpenses} 
          events={events}
          categoryBreakdown={reportStats.categoryBreakdown}
          onTradeShowClick={handleTradeShowClick}
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