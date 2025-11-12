/**
 * useBoothReceipts Hook
 * 
 * Handles loading and categorizing receipts for booth section.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../../utils/api';
import { TradeShow, Expense } from '../../../../../App';

interface ReceiptStatus {
  booth: Expense[];
  electricity: Expense[];
  booth_shipping: Expense[];
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
      console.log('[useBoothReceipts] Loading receipts for event:', event.id);
      const expenses = await api.getExpenses({ event_id: event.id });
      console.log('[useBoothReceipts] Loaded expenses:', expenses.length);
      
      // Categorize expenses by checklist section
      // Note: Both booth and electricity use 'Booth / Marketing / Tools' category
      // We distinguish them by checking the description for "electricity"
      const allBoothCategoryExpenses = expenses.filter((e: Expense) => 
        e.category === 'Booth / Marketing / Tools'
      );
      
      const categorizedReceipts: ReceiptStatus = {
        // Booth receipts: category is 'Booth / Marketing / Tools' and description doesn't contain "electricity"
        booth: allBoothCategoryExpenses.filter((e: Expense) => 
          !e.description?.toLowerCase().includes('electricity')
        ),
        // Electricity receipts: category is 'Booth / Marketing / Tools' and description contains "electricity"
        electricity: allBoothCategoryExpenses.filter((e: Expense) => 
          e.description?.toLowerCase().includes('electricity')
        ),
        // Booth shipping: category is 'Shipping Charges'
        booth_shipping: expenses.filter((e: Expense) => 
          e.category === 'Shipping Charges'
        )
      };
      
      console.log('[useBoothReceipts] Categorized receipts:', {
        booth: categorizedReceipts.booth.length,
        electricity: categorizedReceipts.electricity.length,
        booth_shipping: categorizedReceipts.booth_shipping.length
      });
      
      setReceiptStatus(categorizedReceipts);
    } catch (error) {
      console.error('[useBoothReceipts] Error loading receipts:', error);
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

