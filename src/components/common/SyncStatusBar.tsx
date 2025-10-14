/**
 * Sync Status Bar Component
 * 
 * Displays real-time sync status, network connectivity, and pending actions.
 * Shows at the top or bottom of the app for constant visibility.
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { networkMonitor, NetworkState } from '../../utils/networkDetection';
import { syncManager, SyncStatus } from '../../utils/syncManager';

interface SyncStatusBarProps {
  position?: 'top' | 'bottom';
  showDetails?: boolean;
  onSyncClick?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  position = 'top',
  showDetails = true,
  onSyncClick
}) => {
  const [networkState, setNetworkState] = useState<NetworkState>(networkMonitor.getState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasShownInitially, setHasShownInitially] = useState(false);

  useEffect(() => {
    // Listen for network changes
    const unsubscribeNetwork = networkMonitor.addListener((state) => {
      setNetworkState(state);
      // Show bar immediately on network change
      setIsVisible(true);
    });

    // Listen for sync events
    const unsubscribeSync = syncManager.addEventListener((event) => {
      if (event.type === 'sync-start') {
        setIsSyncing(true);
        setIsVisible(true);
      } else if (event.type === 'sync-complete' || event.type === 'sync-error') {
        setIsSyncing(false);
        setIsVisible(true);
      }
      
      // Refresh sync status
      refreshSyncStatus();
    });

    // Initial status load
    refreshSyncStatus();

    // Periodic status refresh
    const interval = setInterval(refreshSyncStatus, 5000);

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
      clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [hideTimeout]);

  // Auto-hide logic based on status
  useEffect(() => {
    const needsAttention = 
      !networkState.isOnline || // Show when offline
      isSyncing || // Show when syncing
      (syncStatus && syncStatus.pendingCount > 0) || // Show when items pending
      (syncStatus && syncStatus.failedCount > 0); // Show when items failed

    if (needsAttention) {
      // Clear any existing hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        setHideTimeout(null);
      }
      setIsVisible(true);
      setHasShownInitially(true);
    } else if (hasShownInitially) {
      // Only show "All Synced" if we previously had something to show
      // Auto-hide after 10 seconds
      if (isVisible && !hideTimeout) {
        const timeout = setTimeout(() => {
          setIsVisible(false);
          setHideTimeout(null);
        }, 10000); // 10 seconds
        setHideTimeout(timeout);
      } else if (!isVisible) {
        // Don't show the bar at all if nothing needs attention
        setIsVisible(false);
      }
    }
    // On initial load, don't show if everything is fine
  }, [networkState.isOnline, isSyncing, syncStatus, isVisible, hideTimeout, hasShownInitially]);

  const refreshSyncStatus = async () => {
    const status = await syncManager.getStatus();
    setSyncStatus(status);
  };

  const handleSyncClick = async () => {
    if (onSyncClick) {
      onSyncClick();
    } else {
      try {
        setIsSyncing(true);
        await syncManager.syncNow();
      } catch (error: any) {
        console.error('[SyncStatusBar] Manual sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const getStatusColor = () => {
    if (!networkState.isOnline) return 'bg-gray-600';
    if (isSyncing) return 'bg-blue-600';
    if (syncStatus && syncStatus.failedCount > 0) return 'bg-red-600';
    if (syncStatus && syncStatus.pendingCount > 0) return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  const getStatusIcon = () => {
    if (!networkState.isOnline) return <CloudOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus && syncStatus.failedCount > 0) return <AlertCircle className="w-4 h-4" />;
    if (syncStatus && syncStatus.pendingCount > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!networkState.isOnline) {
      return {
        primary: 'Offline',
        secondary: syncStatus && syncStatus.pendingCount > 0 
          ? `${syncStatus.pendingCount} items pending`
          : 'Working offline'
      };
    }

    if (isSyncing) {
      return {
        primary: 'Syncing...',
        secondary: syncStatus && syncStatus.pendingCount > 0 
          ? `${syncStatus.pendingCount} items remaining`
          : 'Updating data'
      };
    }

    if (syncStatus && syncStatus.failedCount > 0) {
      return {
        primary: 'Sync Failed',
        secondary: `${syncStatus.failedCount} items failed`
      };
    }

    if (syncStatus && syncStatus.pendingCount > 0) {
      return {
        primary: 'Pending Sync',
        secondary: `${syncStatus.pendingCount} items waiting`
      };
    }

    return {
      primary: 'All Synced',
      secondary: syncStatus && syncStatus.lastSyncTime 
        ? `Last sync: ${formatRelativeTime(syncStatus.lastSyncTime)}`
        : 'Up to date'
    };
  };

  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const statusText = getStatusText();
  const positionClasses = position === 'top' 
    ? 'top-0' 
    : 'bottom-0';

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed left-0 right-0 ${positionClasses} z-50
        ${getStatusColor()} text-white
        transition-all duration-300 ease-in-out
        shadow-md animate-slide-down
      `}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Status Info */}
          <div className="flex items-center space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon()}
            </div>

            {/* Text */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span className="font-semibold text-sm">
                {statusText.primary}
              </span>
              {showDetails && (
                <span className="text-xs opacity-90">
                  {statusText.secondary}
                </span>
              )}
            </div>

            {/* Network Quality Indicator */}
            {networkState.isOnline && networkState.rtt !== undefined && (
              <div className="hidden md:flex items-center space-x-1 text-xs opacity-75">
                <Wifi className="w-3 h-3" />
                <span>{networkState.rtt}ms</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Pending Count Badge */}
            {syncStatus && syncStatus.pendingCount > 0 && (
              <div className="bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs font-medium">
                {syncStatus.pendingCount}
              </div>
            )}

            {/* Failed Count Badge */}
            {syncStatus && syncStatus.failedCount > 0 && (
              <div className="bg-red-800 rounded-full px-2 py-1 text-xs font-medium">
                {syncStatus.failedCount} failed
              </div>
            )}

            {/* Sync Button */}
            {networkState.isOnline && !isSyncing && (
              <button
                onClick={handleSyncClick}
                className="
                  bg-white bg-opacity-20 hover:bg-opacity-30
                  rounded-lg px-3 py-1 text-sm font-medium
                  transition-all duration-200
                  flex items-center space-x-1
                "
                disabled={isSyncing}
                title="Sync now"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (shown when syncing) */}
        {isSyncing && (
          <div className="mt-2 h-1 bg-white bg-opacity-20 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatusBar;

