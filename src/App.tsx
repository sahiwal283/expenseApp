import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { EventSetup } from './components/events/EventSetup';
import { ExpenseSubmission } from './components/expenses/ExpenseSubmission';
import { AdminSettings } from './components/admin/AdminSettings';
import { DevDashboard } from './components/developer/DevDashboard';
import { Approvals } from './components/admin/Approvals';
import { Reports } from './components/reports/Reports';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { InstallPrompt } from './components/layout/InstallPrompt';
import { InactivityWarning } from './components/common/InactivityWarning';
import { NotificationBanner, useNotifications } from './components/common/NotificationBanner';
import { SyncStatusBar } from './components/common/SyncStatusBar';
import { useAuth } from './hooks/useAuth';
import { useLocalStorage } from './hooks/useLocalStorage';
import { sessionManager } from './utils/sessionManager';
import { syncManager } from './utils/syncManager';
import { networkMonitor } from './utils/networkDetection';
import { offlineDb } from './utils/offlineDb';
import { clearEncryptionData } from './utils/encryption';
import { apiClient } from './utils/apiClient';

export type UserRole = 'admin' | 'coordinator' | 'salesperson' | 'accountant' | 'developer' | 'temporary' | 'pending';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  registration_date?: string;
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
  zohoExpenseId?: string;
  location?: string;
  ocrText?: string;
  extractedData?: {
    total: number;
    category: string;
    merchant: string;
    date: string;
    location: string;
  };
  // Pre-fetched from backend JOINs (when available)
  user_name?: string;
  event_name?: string;
}

function App() {
  const { user, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // Will be set by sessionManager
  const notifications = useNotifications();

  // Register API unauthorized callback to auto-logout on token expiration
  useEffect(() => {
    console.log('[App] Registering API unauthorized callback');
    apiClient.setUnauthorizedCallback(() => {
      console.log('[App] API detected unauthorized access, forcing logout');
      notifications.showWarning(
        'Session Expired',
        'Your session has expired. Please log in again.',
        false
      );
      // Use setTimeout to ensure the notification is shown before logout
      setTimeout(() => {
        handleLogout();
      }, 100);
    });
  }, [notifications]);

  // Initialize session manager
  useEffect(() => {
    if (user) {
      console.log('[App] User logged in, initializing session manager');
      
      sessionManager.init(
        // On warning callback
        () => {
          console.log('[App] Showing inactivity warning');
          setShowInactivityWarning(true);
          setTimeRemaining(sessionManager.getTimeRemaining());
        },
        // On logout callback
        () => {
          console.log('[App] Session expired, logging out user');
          setShowInactivityWarning(false);
          setCurrentPage('dashboard'); // Reset to dashboard to avoid redirect loops
          logout();
        }
      );

      return () => {
        console.log('[App] Cleaning up session manager');
        sessionManager.cleanup();
      };
    }
  }, [user, logout]);

  // Update time remaining while warning is shown
  useEffect(() => {
    if (showInactivityWarning) {
      const interval = setInterval(() => {
        setTimeRemaining(sessionManager.getTimeRemaining());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showInactivityWarning]);

  // Initialize sync manager and network monitoring
  useEffect(() => {
    if (user) {
      console.log('[App] Initializing offline sync system');

      // Listen for sync events
      const unsubscribeSync = syncManager.addEventListener((event) => {
        console.log('[App] Sync event:', event.type);
        
        if (event.type === 'sync-start') {
          notifications.showSyncing('Syncing your changes...');
        } else if (event.type === 'sync-complete') {
          const { synced, failed } = event.data;
          if (synced > 0) {
            notifications.showSuccess('Sync Complete', `${synced} item(s) synced successfully`);
          }
          if (failed > 0) {
            notifications.showWarning('Partial Sync', `${failed} item(s) failed to sync. Check Pending Actions.`);
          }
        } else if (event.type === 'sync-error') {
          notifications.showError('Sync Failed', event.data.error || 'Unknown error occurred', false);
        }
      });

      // Listen for network status changes
      const unsubscribeNetwork = networkMonitor.addListener((state) => {
        console.log('[App] Network status:', state.status);
        
        if (!state.isOnline) {
          notifications.showOffline();
        } else if (state.status === 'degraded') {
          notifications.showWarning('Slow Connection', 'Your connection is slow. Sync may take longer.');
        }
      });

      // Register background sync if supported
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          console.log('[App] Registering background sync');
          return registration.sync.register('expense-sync');
        }).catch(err => {
          console.log('[App] Background sync registration failed:', err);
        });
      }

      return () => {
        console.log('[App] Cleaning up offline sync system');
        unsubscribeSync();
        unsubscribeNetwork();
      };
    }
  }, [user, notifications]);

  // Enhanced logout with data cleanup
  const handleLogout = async () => {
    console.log('[App] Logging out and clearing local data...');
    
    try {
      // Clear offline database
      await offlineDb.clearAllData();
      
      // Clear encryption keys
      await clearEncryptionData();
      
      console.log('[App] Local data cleared successfully');
    } catch (error) {
      console.error('[App] Error clearing local data:', error);
    }
    
    // Reset to dashboard to avoid redirect loops on next login
    setCurrentPage('dashboard');
    
    // Call original logout
    logout();
  };

  const handleStayLoggedIn = () => {
    console.log('[App] User chose to stay logged in, resetting timer');
    sessionManager.dismissWarning(); // Reset timer
    setShowInactivityWarning(false);
  };

  const handleDismissWarning = () => {
    console.log('[App] User dismissed warning, resetting timer');
    sessionManager.dismissWarning(); // Reset timer when dismissing
    setShowInactivityWarning(false);
  };

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sync Status Bar */}
      <SyncStatusBar position="top" />

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
          onLogout={handleLogout}
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
          {currentPage === 'devdashboard' && <DevDashboard user={user} />}
        </main>
        
        {/* PWA Install Prompt */}
        <InstallPrompt />
      </div>

      {/* Notification Banner */}
      <NotificationBanner 
        notifications={notifications.notifications}
        onDismiss={notifications.removeNotification}
      />

      {/* Inactivity Warning Modal */}
      <InactivityWarning
        isOpen={showInactivityWarning}
        onClose={handleDismissWarning}
        onStayLoggedIn={handleStayLoggedIn}
        timeRemaining={timeRemaining}
      />
    </div>
  );
}

export default App;
