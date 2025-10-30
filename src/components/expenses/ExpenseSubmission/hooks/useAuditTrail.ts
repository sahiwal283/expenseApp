/**
 * useAuditTrail Hook
 * 
 * Manages audit trail fetching and display logic for expense details.
 * Automatically expands the audit trail if there are changes beyond creation.
 */

import { useState } from 'react';

interface AuditTrailEntry {
  action: string;
  timestamp: string;
  user?: string;
  changes?: Record<string, any>;
  [key: string]: any;
}

export function useAuditTrail() {
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const fetchAuditTrail = async (expenseId: string, hasPermission: boolean) => {
    if (!hasPermission) return;

    setLoadingAudit(true);
    try {
      const response = await fetch(`/api/expenses/${expenseId}/audit`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const trail = data.auditTrail || [];
        setAuditTrail(trail);

        // Auto-expand if there's history (more than just "created")
        const hasChanges = trail.filter((entry: AuditTrailEntry) => entry.action !== 'created').length > 0;
        setShowAuditTrail(hasChanges);
      } else {
        console.error('[Audit] Failed to fetch audit trail');
        setAuditTrail([]);
        setShowAuditTrail(false);
      }
    } catch (error) {
      console.error('[Audit] Error fetching audit trail:', error);
      setAuditTrail([]);
      setShowAuditTrail(false);
    } finally {
      setLoadingAudit(false);
    }
  };

  const clearAuditTrail = () => {
    setAuditTrail([]);
    setShowAuditTrail(false);
    setLoadingAudit(false);
  };

  const toggleAuditTrail = () => {
    setShowAuditTrail((prev) => !prev);
  };

  return {
    auditTrail,
    loadingAudit,
    showAuditTrail,
    fetchAuditTrail,
    clearAuditTrail,
    toggleAuditTrail,
    setShowAuditTrail,
  };
}

