import React, { useEffect, useState } from 'react';
import { 
  UserPlus, FileText, Upload, AlertTriangle, Clock, DollarSign, 
  ArrowRight, RefreshCw 
} from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';

interface Task {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count: number;
  action: string;
  link: string;
  icon: string;
  eventIds?: string[];
  primaryEventId?: string;
}

interface QuickActionsProps {
  user: User;
  onNavigate: (page: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ user, onNavigate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await api.quickActions.getTasks();
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Failed to load quick actions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // Refresh every 60 seconds
    const interval = setInterval(() => loadTasks(true), 60000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: JSX.Element } = {
      UserPlus: <UserPlus className="w-5 h-5" />,
      FileText: <FileText className="w-5 h-5" />,
      Upload: <Upload className="w-5 h-5" />,
      AlertTriangle: <AlertTriangle className="w-5 h-5" />,
      Clock: <Clock className="w-5 h-5" />,
      DollarSign: <DollarSign className="w-5 h-5" />
    };
    return icons[iconName] || <FileText className="w-5 h-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Pending Tasks</h2>
        <button
          onClick={() => loadTasks(true)}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">No pending tasks at the moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`mt-1 ${task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`}>
                    {getIcon(task.icon)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <button
                      onClick={() => {
                        // Extract page name from link
                        const page = task.link.replace('/', '');
                        
                        // Use sessionStorage to pass tab information (more reliable than hash for navigation)
                        if (task.type === 'pending_users' && page === 'settings') {
                          // Signal to AdminSettings to open User Management tab
                          sessionStorage.setItem('openSettingsTab', 'users');
                        }
                        // Note: 'unpushed_zoho' tasks now direct to unified expenses page (v1.3.0+)
                        // Approvals page was removed and merged into expenses page
                        
                        // Navigate
                        onNavigate(page);
                      }}
                      className={`inline-flex items-center text-sm font-medium transition-colors ${
                        task.priority === 'high' 
                          ? 'text-red-600 hover:text-red-700' 
                          : task.priority === 'medium'
                          ? 'text-yellow-600 hover:text-yellow-700'
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      {task.action}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

