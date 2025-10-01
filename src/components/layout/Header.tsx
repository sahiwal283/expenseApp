import React from 'react';
import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';

const APP_VERSION = '0.6.2-alpha';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  
  // Check for unread notifications
  const [notifications, setNotifications] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          const ex = await api.getExpenses();
          const pending = (ex || []).filter((e: any) => e.status === 'pending' && (user.role === 'admin' || user.role === 'accountant'));
          setNotifications(pending);
        } catch {
          setNotifications([]);
        }
      } else {
        const expenses = JSON.parse(localStorage.getItem('tradeshow_expenses') || '[]');
        const pendingExpenses = expenses.filter((e: any) => e.status === 'pending' && (user.role === 'admin' || user.role === 'accountant'));
        setNotifications(pendingExpenses);
      }
    })();
  }, [user.role]);

  const hasUnreadNotifications = notifications.length > 0;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses, events..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="hidden md:flex items-center px-3 py-1 bg-gray-100 rounded-full">
            <span className="text-xs text-gray-600">v{APP_VERSION}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {hasUnreadNotifications && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((expense: any, index: number) => (
                      <div key={index} className="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                        <p className="text-sm text-gray-900 font-medium">Pending Expense Approval</p>
                        <p className="text-xs text-gray-600 mt-1">{expense.merchant} - ${expense.amount}</p>
                        <p className="text-xs text-gray-500 mt-1">Submitted by user</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">No new notifications</p>
                      <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500 capitalize">{user.role}</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.name.charAt(0)}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};