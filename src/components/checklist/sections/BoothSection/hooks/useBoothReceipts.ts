/**
 * useBoothReceipts Hook
 * 
 * Handles loading and categorizing receipts for booth section.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../../utils/api';
import { TradeShow } from '../../../../../App';

interface ReceiptStatus {
  booth: any[];
  electricity: any[];
  booth_shipping: any[];
}

interface UseBoothReceiptsReturn {
  receiptStatus: ReceiptStatus;
  loadingReceipts: boolean;
  loadReceipts: () => Promise<void>;
}

export function useBoothReceipts(event: TradeShow): UseBoothReceiptsReturn {
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>({
    booth: [],
    electricity: [],
    booth_shipping: []
  });
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const loadReceipts = useCallback(async () => {
    try {
      setLoadingReceipts(true);
      const expenses = await api.getExpenses({ event_id: event.id });
      
      // Categorize expenses by checklist section
      const categorizedReceipts: ReceiptStatus = {
        booth: expenses.filter((e: any) => e.category === 'Booth / Marketing / Tools'),
        electricity: expenses.filter((e: any) => e.category === 'Utilities'),
        booth_shipping: expenses.filter((e: any) => e.category === 'Shipping Charges')
      };
      
      setReceiptStatus(categorizedReceipts);
    } catch (error) {
      console.error('[BoothSection] Error loading receipts:', error);
    } finally {
      setLoadingReceipts(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  return {
    receiptStatus,
    loadingReceipts,
    loadReceipts
  };
}

