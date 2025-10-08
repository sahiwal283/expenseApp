import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { EventSetup } from './components/events/EventSetup';
import { ExpenseSubmission } from './components/expenses/ExpenseSubmission';
import { AdminSettings } from './components/admin/AdminSettings';
import { Approvals } from './components/admin/Approvals';
import { Reports } from './components/reports/Reports';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useAuth } from './hooks/useAuth';
import { useLocalStorage } from './hooks/useLocalStorage';

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
  reimbursementStatus?: 'pending review' | 'approved' | 'rejected' | 'paid';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Server-backed mode: disable demo data seeding
  useEffect(() => {}, []);

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        user={user} 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "ml-0 lg:ml-16" : "ml-0 lg:ml-64"}`}>
        <Header 
          user={user} 
          onLogout={logout}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          {currentPage === 'dashboard' && <Dashboard user={user} onPageChange={setCurrentPage} />}
          {currentPage === 'events' && <EventSetup user={user} />}
          {currentPage === 'expenses' && <ExpenseSubmission user={user} />}
          {currentPage === 'approvals' && <Approvals user={user} />}
          {currentPage === 'reports' && <Reports user={user} />}
          {currentPage === 'settings' && <AdminSettings user={user} />}
        </main>
      </div>
    </div>
  );
}

export default App;
