/**
 * usePendingSync Hook
 * 
 * Manages pending sync count for offline queue
 */

import { useState, useEffect } from 'react';
import { offlineDb } from '../../../../utils/offlineDb';

export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const queue = await offlineDb.syncQueue.toArray();
        const pending = queue.filter(item => item.status === 'pending' || item.status === 'failed');
        setPendingCount(pending.length);
      } catch (error) {
        console.error('[usePendingSync] Failed to load pending count:', error);
      }
    };

    loadPendingCount();
    // Refresh count every 5 seconds
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount };
}

