/**
 * Network Detection and Connectivity Monitoring
 * 
 * Provides real-time network status detection and monitoring for offline-first capabilities.
 * Handles various connectivity scenarios: online, offline, and degraded (slow) connections.
 */

export type NetworkStatus = 'online' | 'offline' | 'degraded';

export interface NetworkState {
  status: NetworkStatus;
  isOnline: boolean;
  effectiveType?: string;  // '4g', '3g', '2g', 'slow-2g'
  downlink?: number;        // Mbps
  rtt?: number;             // Round trip time in ms
  lastChecked: number;
}

type NetworkChangeCallback = (state: NetworkState) => void;

export class NetworkMonitor {
  private state: NetworkState;
  private listeners: Set<NetworkChangeCallback> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_URL: string;

  constructor(healthCheckUrl: string = '/api/health') {
    this.HEALTH_CHECK_URL = healthCheckUrl;
    
    // Initialize state
    this.state = {
      status: navigator.onLine ? 'online' : 'offline',
      isOnline: navigator.onLine,
      lastChecked: Date.now()
    };

    this.init();
  }

  /**
   * Initialize network monitoring
   */
  private init(): void {
    console.log('[NetworkMonitor] Initializing...');

    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for connection change (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', this.handleConnectionChange);
    }

    // Listen for visibility change (check when tab becomes visible)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Start periodic health checks
    this.startPeriodicChecks();

    // Initial connectivity check
    this.checkConnectivity();
  }

  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    console.log('[NetworkMonitor] Cleaning up...');
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.removeEventListener('change', this.handleConnectionChange);
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.listeners.clear();
  }

  /**
   * Handle browser online event
   */
  private handleOnline = (): void => {
    console.log('[NetworkMonitor] Browser online event');
    this.checkConnectivity();
  };

  /**
   * Handle browser offline event
   */
  private handleOffline = (): void => {
    console.log('[NetworkMonitor] Browser offline event');
    this.updateState({
      status: 'offline',
      isOnline: false,
      lastChecked: Date.now()
    });
  };

  /**
   * Handle connection change (Network Information API)
   */
  private handleConnectionChange = (): void => {
    console.log('[NetworkMonitor] Connection change detected');
    this.checkConnectivity();
  };

  /**
   * Handle page visibility change
   */
  private handleVisibilityChange = (): void => {
    if (!document.hidden) {
      console.log('[NetworkMonitor] Page became visible, checking connectivity');
      this.checkConnectivity();
    }
  };

  /**
   * Start periodic connectivity checks
   */
  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      if (this.state.isOnline) {
        this.checkConnectivity();
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Check actual connectivity by pinging backend health endpoint
   */
  private async checkConnectivity(): Promise<void> {
    const startTime = Date.now();

    try {
      // First check browser API
      if (!navigator.onLine) {
        this.updateState({
          status: 'offline',
          isOnline: false,
          lastChecked: Date.now()
        });
        return;
      }

      // Try to reach backend health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(this.HEALTH_CHECK_URL, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const rtt = Date.now() - startTime;

      if (response.ok) {
        // Get connection info if available
        const connectionInfo = this.getConnectionInfo();
        
        // Determine if connection is degraded based on RTT
        const status: NetworkStatus = rtt > 2000 ? 'degraded' : 'online';

        this.updateState({
          status,
          isOnline: true,
          rtt,
          ...connectionInfo,
          lastChecked: Date.now()
        });

        console.log(`[NetworkMonitor] Connectivity check: ${status} (RTT: ${rtt}ms)`);
      } else {
        // Backend returned error, but we have internet
        this.updateState({
          status: 'degraded',
          isOnline: true,
          rtt,
          lastChecked: Date.now()
        });
        console.warn('[NetworkMonitor] Backend returned error:', response.status);
      }
    } catch (error: any) {
      // Network error - we're offline
      console.error('[NetworkMonitor] Connectivity check failed:', error.message);
      
      this.updateState({
        status: 'offline',
        isOnline: false,
        lastChecked: Date.now()
      });
    }
  }

  /**
   * Get connection information from Network Information API
   */
  private getConnectionInfo(): { effectiveType?: string; downlink?: number } {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink
      };
    }
    return {};
  }

  /**
   * Update network state and notify listeners
   */
  private updateState(newState: Partial<NetworkState>): void {
    const prevStatus = this.state.status;
    this.state = { ...this.state, ...newState };

    // Notify listeners if status changed
    if (prevStatus !== this.state.status) {
      console.log(`[NetworkMonitor] Status changed: ${prevStatus} → ${this.state.status}`);
      this.notifyListeners();
    }
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('[NetworkMonitor] Listener error:', error);
      }
    });
  }

  /**
   * Register a listener for network state changes
   */
  public addListener(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);
    
    // Immediately notify with current state
    callback(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get current network state
   */
  public getState(): NetworkState {
    return { ...this.state };
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Check if currently offline
   */
  public isOffline(): boolean {
    return !this.state.isOnline;
  }

  /**
   * Check if connection is degraded
   */
  public isDegraded(): boolean {
    return this.state.status === 'degraded';
  }

  /**
   * Force an immediate connectivity check
   */
  public async forceCheck(): Promise<NetworkState> {
    await this.checkConnectivity();
    return this.getState();
  }

  /**
   * Wait for online status (useful for sync operations)
   */
  public async waitForOnline(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener((state) => {
        if (state.isOnline) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Get human-readable status message
   */
  public getStatusMessage(): string {
    switch (this.state.status) {
      case 'online':
        return 'Connected';
      case 'offline':
        return 'No internet connection';
      case 'degraded':
        return 'Slow connection';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get connection quality estimate (0-100)
   */
  public getConnectionQuality(): number {
    if (!this.state.isOnline) {
      return 0;
    }

    if (this.state.status === 'degraded') {
      return 50;
    }

    // Base quality on RTT if available
    if (this.state.rtt !== undefined) {
      if (this.state.rtt < 50) return 100;
      if (this.state.rtt < 200) return 90;
      if (this.state.rtt < 500) return 75;
      if (this.state.rtt < 1000) return 60;
      return 50;
    }

    // Base quality on connection type if available
    switch (this.state.effectiveType) {
      case '4g': return 100;
      case '3g': return 70;
      case '2g': return 40;
      case 'slow-2g': return 20;
      default: return 80;
    }
  }
}

// ========== SINGLETON INSTANCE ==========

export const networkMonitor = new NetworkMonitor(
  import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/health`
    : '/api/health'
);

// Log initialization
console.log('[NetworkMonitor] Initialized with status:', networkMonitor.getState());

// Export for use in components
export default networkMonitor;

