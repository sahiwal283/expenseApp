import React from 'react';
import { DollarSign, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { User } from '../../App';
import { StatsCard } from './StatsCard';
import { RecentExpenses } from './RecentExpenses';
import { UpcomingEvents } from './UpcomingEvents';
import { BudgetOverview } from './BudgetOverview';
import { QuickActions } from './QuickActions';
import { InstallPWA } from '../common/InstallPWA';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardStats } from './hooks/useDashboardStats';

interface DashboardProps {
  user: User;
  onPageChange: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onPageChange }) => {
  // Use custom hooks
  const { expenses, events, users } = useDashboardData();
  const stats = useDashboardStats({ expenses, events, users, currentUser: user });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl text-white p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-blue-100">
              {user.role === 'coordinator' && 'Manage your trade shows and track expenses'}
              {user.role === 'salesperson' && 'Submit your expenses and view your activity'}
              {user.role === 'accountant' && 'Review expenses and manage entity mappings'}
              {user.role === 'admin' && 'Oversee all operations and manage users'}
              {user.role === 'developer' && 'Full system access with dev tools'}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
        {/* PWA Install Button */}
        <div className="flex justify-start">
          <InstallPWA />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatsCard
          title={user.role === 'admin' || user.role === 'developer' || user.role === 'accountant' ? 'Total Expenses' : 'My Expenses'}
          value={`$${stats.totalExpenses.toLocaleString()}`}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard
          title={user.role === 'admin' || user.role === 'developer' || user.role === 'accountant' ? 'Pending Approvals' : 'My Pending Approvals'}
          value={stats.pendingExpenses.toString()}
          icon={AlertTriangle}
          color="orange"
        />
        <StatsCard
          title={user.role === 'admin' || user.role === 'developer' || user.role === 'coordinator' ? 'Active Events' : 'My Active Events'}
          value={stats.activeEvents.toString()}
          icon={Calendar}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RecentExpenses expenses={stats.userExpenses} onPageChange={onPageChange} />
          {(user.role === 'admin' || user.role === 'developer' || user.role === 'accountant') && (
            <BudgetOverview events={stats.userEvents} expenses={stats.userExpenses} />
          )}
        </div>
        <div className="space-y-6">
          <UpcomingEvents events={stats.userEvents} onPageChange={onPageChange} />
          
          {/* Pending Tasks / Quick Actions */}
          <QuickActions user={user} onNavigate={onPageChange} />
        </div>
      </div>
    </div>
  );
};