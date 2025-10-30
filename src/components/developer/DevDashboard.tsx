import React, { useState, useEffect } from 'react';
import { RefreshCw, Code } from 'lucide-react';
import { User } from '../../App';
import { api } from '../../utils/api';
import { DashboardSummaryCards } from './DevDashboard/DashboardSummaryCards';
import { DashboardTabNavigation } from './DevDashboard/DashboardTabNavigation';
import { OverviewTab } from './DevDashboard/OverviewTab';
import { MetricsTab } from './DevDashboard/MetricsTab';
import { OcrTab } from './DevDashboard/OcrTab';
import { ModelTrainingTab } from './DevDashboard/ModelTrainingTab';
import { AuditLogsTab } from './DevDashboard/AuditLogsTab';
import { SessionsTab } from './DevDashboard/SessionsTab';
import { ApiAnalyticsTab } from './DevDashboard/ApiAnalyticsTab';
import { AlertsTab } from './DevDashboard/AlertsTab';
import { PageAnalyticsTab } from './DevDashboard/PageAnalyticsTab';

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
  const [ocrMetrics, setOcrMetrics] = useState<any>(null);
  
  // Filters
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditAction, setAuditAction] = useState('all');
  const [alertStatus, setAlertStatus] = useState('active');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      if (activeTab === 'overview' || activeTab === 'metrics' || activeTab === 'sessions') {
        loadDashboardData(true);
      }
    }, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [activeTab, timeRange]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [summaryData, metricsData, versionData, ocrData] = await Promise.all([
        api.devDashboard.getSummary(),
        api.devDashboard.getMetrics(timeRange),
        api.devDashboard.getVersion(),
        api.devDashboard.getOcrMetrics().catch(() => null), // Graceful fallback if OCR service unavailable
      ]);

      setSummary(summaryData);
      setMetrics(metricsData);
      setVersionInfo(versionData);
      setOcrMetrics(ocrData);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    loadDashboardData();
  };

  const handleAlertStatusChange = (status: string) => {
    setAlertStatus(status);
    loadDashboardData();
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
    <div className="space-y-4 md:space-y-6">
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
      {summary && <DashboardSummaryCards summary={summary} />}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DashboardTabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Content */}
        <div className="p-4 md:p-6">
          {activeTab === 'overview' && versionInfo && metrics && (
            <OverviewTab
              versionInfo={versionInfo}
              metrics={metrics}
              formatUptime={formatUptime}
              formatBytes={formatBytes}
            />
          )}

          {activeTab === 'ocr' && (
            <div>
              <OcrTab ocrMetrics={ocrMetrics} />
            </div>
          )}

          {activeTab === 'training' && <ModelTrainingTab user={user} />}

          {activeTab === 'metrics' && metrics && (
            <MetricsTab metrics={metrics} formatUptime={formatUptime} />
          )}

          {activeTab === 'logs' && (
            <AuditLogsTab
              auditLogs={auditLogs}
              auditSearchTerm={auditSearchTerm}
              auditAction={auditAction}
              onSearchChange={setAuditSearchTerm}
              onActionChange={setAuditAction}
              onApplyFilters={() => loadDashboardData()}
            />
          )}

          {activeTab === 'sessions' && <SessionsTab sessions={sessions} />}

          {activeTab === 'api' && apiAnalytics && (
            <ApiAnalyticsTab apiAnalytics={apiAnalytics} timeRange={timeRange} />
          )}

          {activeTab === 'alerts' && (
            <AlertsTab
              alerts={alerts}
              alertStatus={alertStatus}
              onStatusChange={handleAlertStatusChange}
            />
          )}

          {activeTab === 'analytics' && pageAnalytics && (
            <PageAnalyticsTab pageAnalytics={pageAnalytics} />
          )}
        </div>
      </div>
    </div>
  );
};
