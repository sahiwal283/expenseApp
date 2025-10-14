import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { User, TradeShow, Expense } from '../../App';
import { api } from '../../utils/api';
import { StatsCard } from './StatsCard';
import { RecentExpenses } from './RecentExpenses';
import { UpcomingEvents } from './UpcomingEvents';
import { BudgetOverview } from './BudgetOverview';
import { QuickActions } from './QuickActions';
import { InstallPWA } from '../common/InstallPWA';
import { parseLocalDate } from '../../utils/dateUtils';

interface DashboardProps {
  user: User;
  onPageChange: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onPageChange }) => {
  const [events, setEvents] = useState<TradeShow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (api.USE_SERVER) {
        console.log('[Dashboard] Loading data...');
        
        // Fetch expenses (critical for dashboard stats)
        try {
          const ex = await api.getExpenses();
          if (mounted) {
            console.log('[Dashboard] Loaded expenses:', ex?.length || 0);
            setExpenses(ex || []);
          }
        } catch (error) {
          console.error('[Dashboard] Error loading expenses:', error);
          if (mounted) setExpenses([]);
        }

        // Fetch events (critical for dashboard)
        try {
          const ev = await api.getEvents();
          if (mounted) {
            console.log('[Dashboard] Loaded events:', ev?.length || 0);
            setEvents(ev || []);
          }
        } catch (error) {
          console.error('[Dashboard] Error loading events:', error);
          if (mounted) setEvents([]);
        }

        // Fetch users (non-critical)
        try {
          const us = await api.getUsers();
          if (mounted) {
            console.log('[Dashboard] Loaded users:', us?.length || 0);
            setUsers(us || []);
          }
        } catch (error) {
          console.error('[Dashboard] Error loading users (non-critical):', error);
          if (mounted) setUsers([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    // Filter data based on user role
    const isAdminOrAccountant = user.role === 'admin' || user.role === 'developer' || user.role === 'accountant';
    
    // For non-admin/accountant users, only show their own expenses
    const userExpenses = isAdminOrAccountant 
      ? expenses 
      : expenses.filter(e => e.userId === user.id);
    
    // For non-admin/coordinator users, only show events they're assigned to
    const userEvents = (user.role === 'admin' || user.role === 'developer' || user.role === 'coordinator')
      ? events
      : events.filter(event => event.participants.some(p => p.id === user.id));
    
    const totalExpenses = userExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const pendingExpenses = userExpenses.filter(e => e.status === 'pending').length;
    
    // Calculate active events based on end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeEvents = userEvents.filter(event => {
      const endDate = parseLocalDate(event.endDate);
      return endDate >= today;
    }).length;

    return {
      totalExpenses,
      pendingExpenses,
      upcomingEvents: activeEvents,
      activeEvents,
      totalEvents: userEvents.length,
      averageExpense: userExpenses.length > 0 ? totalExpenses / userExpenses.length : 0,
      teamMembers: users.length,
      userExpenses, // Pass filtered expenses
      userEvents    // Pass filtered events
    };
  }, [events, expenses, users, user.id, user.role]);

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
          trend="+12.5%"
          trendUp={true}
        />
        <StatsCard
          title={user.role === 'admin' || user.role === 'developer' || user.role === 'accountant' ? 'Pending Approvals' : 'My Pending Approvals'}
          value={stats.pendingExpenses.toString()}
          icon={AlertTriangle}
          color="orange"
          trend={stats.pendingExpenses > 5 ? 'High' : 'Normal'}
          trendUp={false}
        />
        <StatsCard
          title={user.role === 'admin' || user.role === 'developer' || user.role === 'coordinator' ? 'Active Events' : 'My Active Events'}
          value={stats.activeEvents.toString()}
          icon={Calendar}
          color="emerald"
          trend={`${stats.totalEvents} total`}
          trendUp={true}
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