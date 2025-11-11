/**
 * Expense Helper Utilities
 * Helper functions for expense data transformation and normalization
 */

interface RawExpense {
  id: string;
  user_id: string;
  event_id?: string | null;
  amount: string | number;
  category: string;
  merchant: string;
  date: string;
  description?: string;
  card_used?: string | null;
  receipt_url?: string | null;
  reimbursement_required?: boolean;
  reimbursement_status?: string | null;
  status: string;
  zoho_entity?: string | null;
  zoho_expense_id?: string | null;
  location?: string | null;
  ocr_text?: string | null;
  created_at: string;
  updated_at?: string;
  duplicate_check?: string | unknown[];
  user_name?: string;
  event_name?: string;
}

/**
 * Normalize expense data from database format to API response format
 */
export function normalizeExpense(expense: RawExpense) {
  // Parse duplicate_check if it's a string (shouldn't be, but just in case)
  let duplicateCheckValue: unknown[] | null = null;
  if (typeof expense.duplicate_check === 'string') {
    try {
      duplicateCheckValue = JSON.parse(expense.duplicate_check) as unknown[];
    } catch (e) {
      console.error('[Normalize] Failed to parse duplicate_check:', e);
      duplicateCheckValue = null;
    }
  } else if (Array.isArray(expense.duplicate_check)) {
    duplicateCheckValue = expense.duplicate_check;
  }
  
  const normalized = {
    id: expense.id,
    userId: expense.user_id,
    tradeShowId: expense.event_id || null,
    amount: expense.amount ? parseFloat(String(expense.amount)) : null,
    category: expense.category,
    merchant: expense.merchant,
    date: expense.date,
    description: expense.description,
    cardUsed: expense.card_used || null,
    receiptUrl: expense.receipt_url || null,
    reimbursementRequired: expense.reimbursement_required,
    reimbursementStatus: expense.reimbursement_status || null,
    status: expense.status,
    zohoEntity: expense.zoho_entity || null,
    zohoExpenseId: expense.zoho_expense_id || null,
    location: expense.location || null,
    ocrText: expense.ocr_text || null,
    createdAt: expense.created_at,
    updatedAt: expense.updated_at,
    duplicateCheck: duplicateCheckValue || null,
    // Include pre-fetched JOIN fields if present
    user_name: expense.user_name,
    event_name: expense.event_name,
  };
  
  // Debug logging for duplicate check
  if (duplicateCheckValue) {
    console.log(`[Normalize] Expense ${expense.id} HAS duplicateCheck:`, Array.isArray(duplicateCheckValue), duplicateCheckValue.length);
  }
  
  return normalized;
}

