import React, { useMemo } from 'react';
import { DollarSign, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { User, TradeShow, Expense } from './App';
import { StatsCard } from './StatsCard';
import { RecentExpenses } from './RecentExpenses';
import { UpcomingEvents } from './UpcomingEvents';
import { BudgetOverview } from './BudgetOverview';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const events = JSON.parse(localStorage.getItem('tradeshow_events') || '[]') as TradeShow[];
  const expenses = JSON.parse(localStorage.getItem('tradeshow_expenses') || '[]') as Expense[];

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
    const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
    const activeEvents = events.filter(e => e.status === 'active').length;

    return {
      totalExpenses,
      pendingExpenses,
      upcomingEvents,
      activeEvents,
      totalEvents: events.length,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0
    };
  }, [events, expenses]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl text-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-blue-100">
              {user.role === 'coordinator' && 'Manage your trade shows and track expenses'}
              {user.role === 'salesperson' && 'Submit your expenses and view your activity'}
              {user.role === 'accountant' && 'Review expenses and manage entity mappings'}
              {user.role === 'admin' && 'Oversee all operations and manage users'}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Total Expenses"
          value={`$${stats.totalExpenses.toLocaleString()}`}
          icon={DollarSign}
          color="blue"
          trend="+12.5%"
          trendUp={true}
        />
        <StatsCard
          title="Pending Approvals"
          value={stats.pendingExpenses.toString()}
          icon={AlertTriangle}
          color="orange"
          trend={stats.pendingExpenses > 5 ? 'High' : 'Normal'}
          trendUp={false}
        />
        <StatsCard
          title="Active Events"
          value={stats.activeEvents.toString()}
          icon={Calendar}
          color="emerald"
          trend={`${stats.totalEvents} total`}
          trendUp={true}
        />
        <StatsCard
          title="Team Members"
          value="24"
          icon={Users}
          color="purple"
          trend="+3 this month"
          trendUp={true}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RecentExpenses expenses={expenses} />
          {(user.role === 'admin' || user.role === 'accountant') && (
            <BudgetOverview events={events} expenses={expenses} />
          )}
        </div>
        <div className="space-y-6">
          <UpcomingEvents events={events} />
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {(user.role === 'salesperson' || user.role === 'coordinator') && (
                <button className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Submit New Expense
                </button>
              )}
              {user.role === 'coordinator' && (
                <button className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Create Trade Show
                </button>
              )}
              {user.role === 'accountant' && (
                <button className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Review Expenses
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};