import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { Dashboard } from './Dashboard';
import { EventSetup } from './EventSetup';
import { ExpenseSubmission } from './ExpenseSubmission';
import { UserManagement } from './UserManagement';
import { AdminSettings } from './AdminSettings';
import { Reports } from './Reports';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from './useAuth';
import { useLocalStorage } from './useLocalStorage';

export type UserRole = 'admin' | 'coordinator' | 'salesperson' | 'accountant';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface TradeShow {
  id: string;
  name: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  participants: User[];
  budget?: number;
  status: 'upcoming' | 'active' | 'completed';
  coordinatorId: string;
}

export interface Expense {
  id: string;
  userId: string;
  tradeShowId: string;
  amount: number;
  category: string;
  merchant: string;
  date: string;
  description: string;
  cardUsed: string;
  reimbursementRequired: boolean;
  reimbursementStatus?: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  zohoEntity?: string;
  location?: string;
  ocrText?: string;
  extractedData?: {
    total: number;
    category: string;
    merchant: string;
    date: string;
    location: string;
  };
}

function App() {
  const { user, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize demo data
  useEffect(() => {
    const initializeDemoData = () => {
      const existingUsers = localStorage.getItem('tradeshow_users');
      if (!existingUsers) {
        const demoUsers: User[] = [
          { id: '1', name: 'Admin User', username: 'admin', email: 'admin@company.com', role: 'admin' },
          { id: '2', name: 'Sarah Johnson', username: 'sarah', email: 'sarah@company.com', role: 'coordinator' },
          { id: '3', name: 'Mike Chen', username: 'mike', email: 'mike@company.com', role: 'salesperson' },
          { id: '4', name: 'Lisa Williams', username: 'lisa', email: 'lisa@company.com', role: 'accountant' }
        ];
        localStorage.setItem('tradeshow_users', JSON.stringify(demoUsers));
      }

      const existingShows = localStorage.getItem('tradeshow_events');
      if (!existingShows) {
        const demoShows: TradeShow[] = [
          {
            id: '1',
            name: 'CES 2025',
            venue: 'Las Vegas Convention Center',
            city: 'Las Vegas',
            state: 'Nevada',
            startDate: '2025-01-07',
            endDate: '2025-01-10',
            participants: [],
            budget: 50000,
            status: 'upcoming',
            coordinatorId: '2'
          }
        ];
        localStorage.setItem('tradeshow_events', JSON.stringify(demoShows));
      }
    };

    initializeDemoData();
  }, []);

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        user={user} 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header 
          user={user} 
          onLogout={logout}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 p-6">
          {currentPage === 'dashboard' && <Dashboard user={user} />}
          {currentPage === 'events' && <EventSetup user={user} />}
          {currentPage === 'expenses' && <ExpenseSubmission user={user} />}
          {currentPage === 'users' && <UserManagement user={user} />}
          {currentPage === 'settings' && <AdminSettings user={user} />}
          {currentPage === 'reports' && <Reports user={user} />}
        </main>
      </div>
    </div>
  );
}

export default App;