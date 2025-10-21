import React, { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Clock, Cpu, Database, HardDrive,
  RefreshCw, Search, Server, TrendingUp, Users, Eye, CheckCircle2, X, Filter, AlertCircle, Code, Zap, Brain
} from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';
import { ModelTrainingDashboard } from '../dev/ModelTrainingDashboard';

interface DevDashboardProps {
  user: User;
}

export const DevDashboard: React.FC<DevDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  
  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [apiAnalytics, setApiAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pageAnalytics, setPageAnalytics] = useState<any>(null);
  const [versionInfo, setVersionInfo] = useState<any>(null);
  
  // Filters
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditAction, setAuditAction] = useState('all');
  const [alertStatus, setAlertStatus] = useState('active');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      if (activeTab === 'overview' || activeTab === 'metrics') {
        loadDashboardData(true);
      }
    }, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [activeTab, timeRange]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [summaryData, metricsData, versionData] = await Promise.all([
        api.devDashboard.getSummary(),
        api.devDashboard.getMetrics(timeRange),
        api.devDashboard.getVersion(),
      ]);

      setSummary(summaryData);
      setMetrics(metricsData);
      setVersionInfo(versionData);

      if (activeTab === 'logs') {
        const logsData = await api.devDashboard.getAuditLogs({
          limit: 50,
          action: auditAction !== 'all' ? auditAction : undefined,
          search: auditSearchTerm || undefined,
        });
        setAuditLogs(logsData.logs || []);
      }

      if (activeTab === 'sessions') {
        const sessionsData = await api.devDashboard.getSessions();
        setSessions(sessionsData.sessions || []);
      }

      if (activeTab === 'api') {
        const analyticsData = await api.devDashboard.getApiAnalytics(timeRange);
        setApiAnalytics(analyticsData);
      }

      if (activeTab === 'alerts') {
        const alertsData = await api.devDashboard.getAlerts(alertStatus);
        setAlerts(alertsData.alerts || []);
      }

      if (activeTab === 'analytics') {
        const pageData = await api.devDashboard.getPageAnalytics(timeRange);
        setPageAnalytics(pageData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600">Loading Developer Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Developer Dashboard</h1>
              <p className="text-sm text-gray-600">System health, logs, and analytics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => loadDashboardData()}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.active_sessions || 0}</p>
            <p className="text-xs text-gray-600">Active Sessions</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.recent_actions || 0}</p>
            <p className="text-xs text-gray-600">Actions (24h)</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className={`w-5 h-5 ${summary.critical_alerts > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.active_alerts || 0}</p>
            <p className="text-xs text-gray-600">Active Alerts</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Server className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.total_users || 0}</p>
            <p className="text-xs text-gray-600">Total Users</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.active_events || 0}</p>
            <p className="text-xs text-gray-600">Active Events</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.pending_expenses || 0}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'metrics', label: 'Metrics', icon: Cpu },
              { id: 'training', label: 'Model Training', icon: Brain },
              { id: 'logs', label: 'Audit Logs', icon: Activity },
              { id: 'sessions', label: 'Sessions', icon: Users },
              { id: 'api', label: 'API Analytics', icon: Zap },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'analytics', label: 'Page Views', icon: Eye },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    loadDashboardData();
                  }}
                  className={`py-3 md:py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && versionInfo && metrics && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Version Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Server className="w-5 h-5 mr-2 text-blue-600" />
                    Version Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Frontend:</span>
                      <span className="text-sm font-medium text-gray-900">{versionInfo.frontend?.version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Backend:</span>
                      <span className="text-sm font-medium text-gray-900">{versionInfo.backend?.version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Node.js:</span>
                      <span className="text-sm font-medium text-gray-900">{versionInfo.backend?.nodeVersion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Environment:</span>
                      <span className={`text-sm font-medium ${versionInfo.environment === 'production' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {versionInfo.environment || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime:</span>
                      <span className="text-sm font-medium text-gray-900">{formatUptime(versionInfo.uptime || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-5 border border-emerald-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                    System Health
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Memory Usage:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {metrics.system?.memory?.usagePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            metrics.system?.memory?.usagePercent > 85
                              ? 'bg-red-500'
                              : metrics.system?.memory?.usagePercent > 70
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${metrics.system?.memory?.usagePercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics.system?.memory?.usedGB} GB / {metrics.system?.memory?.totalGB} GB
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">CPU Load Avg:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {metrics.system?.cpu?.loadAverage[0].toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{metrics.system?.cpu?.cores} CPU cores</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                      <span className="text-sm text-gray-600">DB Connections:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.database?.activeConnections} / {metrics.database?.totalConnections}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">DB Size:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatBytes(metrics.database?.databaseSize || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Tables */}
              {metrics.database?.tableSizes && metrics.database.tableSizes.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-gray-600" />
                    Top Tables by Size
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-600 font-medium">Table</th>
                          <th className="text-right py-2 text-gray-600 font-medium">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.database.tableSizes.slice(0, 5).map((table: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">{table.tablename}</td>
                            <td className="py-2 text-right text-gray-700">{table.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Training Tab */}
          {activeTab === 'training' && (
            <ModelTrainingDashboard />
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && metrics && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">CPU Load</h4>
                    <Cpu className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.system?.cpu?.loadAverage[0].toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">1-minute average</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Memory</h4>
                    <HardDrive className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.system?.memory?.usagePercent.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {metrics.system?.memory?.usedGB}GB used
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Database</h4>
                    <Database className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.database?.activeConnections || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Active connections</p>
                </div>
              </div>

              {/* Historical Metrics */}
              {metrics.historical && metrics.historical.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Metrics ({timeRange})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-600 font-medium">Metric</th>
                          <th className="text-right py-2 text-gray-600 font-medium">Avg</th>
                          <th className="text-right py-2 text-gray-600 font-medium">Max</th>
                          <th className="text-right py-2 text-gray-600 font-medium">Min</th>
                          <th className="text-right py-2 text-gray-600 font-medium">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.historical.map((metric: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900 capitalize">
                              {metric.metric_type.replace('_', ' ')}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {parseFloat(metric.avg_value).toFixed(2)} {metric.metric_unit}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {parseFloat(metric.max_value).toFixed(2)} {metric.metric_unit}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {parseFloat(metric.min_value).toFixed(2)} {metric.metric_unit}
                            </td>
                            <td className="py-2 text-right text-gray-600">{metric.sample_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={auditSearchTerm}
                      onChange={(e) => setAuditSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  <option value="login_success">Login Success</option>
                  <option value="login_failed">Login Failed</option>
                  <option value="expense_created">Expense Created</option>
                  <option value="expense_approved">Expense Approved</option>
                  <option value="expense_rejected">Expense Rejected</option>
                  <option value="expense_updated">Expense Updated</option>
                  <option value="entity_assigned">Entity Assigned</option>
                </select>
                <button
                  onClick={() => loadDashboardData()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Apply</span>
                </button>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="p-12 text-center">
                    <Activity className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Audit Logs Yet</h3>
                    <p className="text-sm text-gray-600">
                      Activity logs will appear here once users start performing actions.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Entity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-gray-900 font-medium">{log.user_name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{log.user_role || '-'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-gray-600 capitalize">{log.entity_type || '-'}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  log.status === 'success'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.status === 'failure'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{log.ip_address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {sessions.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Sessions</h3>
                  <p className="text-sm text-gray-600">
                    User sessions will appear here once they log in and start using the app.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Last Activity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-gray-900 font-medium">{session.user_name}</p>
                              <p className="text-xs text-gray-500">{session.user_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                              {session.user_role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {session.last_activity ? (
                              <div>
                                <p className="text-gray-900">
                                  {new Date(session.last_activity).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {session.status === 'active' ? (
                                    <span className="text-emerald-600 font-medium">● Active</span>
                                  ) : session.status === 'idle' ? (
                                    <span className="text-yellow-600">○ Idle</span>
                                  ) : (
                                    <span className="text-gray-400">○ Inactive</span>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">No recent activity</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{session.ip_address || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(session.expires_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* API Analytics Tab */}
          {activeTab === 'api' && apiAnalytics && (
            <div className="space-y-4 md:space-y-6">
              {/* Endpoint Stats */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Top Endpoints ({timeRange})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Endpoint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Method</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Calls</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Avg Time</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Max Time</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {apiAnalytics.endpointStats?.map((stat: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{stat.endpoint}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              stat.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                              stat.method === 'POST' ? 'bg-green-100 text-green-800' :
                              stat.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {stat.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">{stat.call_count}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {parseInt(stat.avg_response_time).toFixed(0)}ms
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{stat.max_response_time}ms</td>
                          <td className="px-4 py-3 text-right">
                            <span className={stat.error_count > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {stat.error_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slowest Endpoints */}
              {apiAnalytics.slowestEndpoints && apiAnalytics.slowestEndpoints.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Slowest Endpoints</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Endpoint</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Method</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Avg Time</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Max Time</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Calls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {apiAnalytics.slowestEndpoints.map((stat: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 font-mono text-xs">{stat.endpoint}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                {stat.method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium ${
                                parseFloat(stat.avg_response_time) > 1000 ? 'text-red-600' :
                                parseFloat(stat.avg_response_time) > 500 ? 'text-yellow-600' :
                                'text-gray-700'
                              }`}>
                                {parseFloat(stat.avg_response_time).toFixed(0)}ms
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">{stat.max_response_time}ms</td>
                            <td className="px-4 py-3 text-right text-gray-600">{stat.call_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Real-Time System Alerts</h4>
                    <p className="text-sm text-blue-800">
                      These alerts are generated automatically based on current system conditions. They will clear automatically when you resolve the underlying issue:
                    </p>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                      <li><strong>Pending Expenses:</strong> Approve expenses on the Approvals page</li>
                      <li><strong>Zoho Books Sync:</strong> Use "Push to Zoho" button on Reports page</li>
                      <li><strong>Missing Receipts:</strong> Upload receipts when creating/editing expenses</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Alert Filter */}
              <div className="flex items-center space-x-3">
                <select
                  value={alertStatus}
                  onChange={(e) => {
                    setAlertStatus(e.target.value);
                    loadDashboardData();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active Alerts</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                    <p className="text-gray-600">No {alertStatus} alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`bg-white rounded-lg border-2 p-4 ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {alert.severity === 'critical' && <AlertCircle className="w-5 h-5 text-red-600" />}
                            {alert.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full capitalize">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                          {alert.metric_value && (
                            <p className="text-xs text-gray-600">
                              Value: {alert.metric_value} 
                              {alert.threshold_value && ` (Threshold: ${alert.threshold_value})`}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {/* Note: These alerts are dynamic and will automatically clear when the underlying issue is resolved */}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Page Analytics Tab */}
          {activeTab === 'analytics' && pageAnalytics && (
            <div className="space-y-4 md:space-y-6">
              {/* Page Stats */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Top Pages ({timeRange})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Page</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Views</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Unique Users</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pageAnalytics.pageStats?.map((stat: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-gray-900 font-medium">{stat.page_title || stat.page_path}</p>
                              <p className="text-xs text-gray-500 font-mono">{stat.page_path}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">{stat.view_count}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{stat.unique_users}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {stat.avg_duration ? `${parseFloat(stat.avg_duration).toFixed(1)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

