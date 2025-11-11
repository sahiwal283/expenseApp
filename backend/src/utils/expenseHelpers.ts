/**
 * Expense Helper Utilities
 * Helper functions for expense data transformation and normalization
 */

/**
 * Normalize expense data from database format to API response format
 */
export function normalizeExpense(expense: any) {
  // Parse duplicate_check if it's a string (shouldn't be, but just in case)
  let duplicateCheckValue = expense.duplicate_check;
  if (typeof duplicateCheckValue === 'string') {
    try {
      duplicateCheckValue = JSON.parse(duplicateCheckValue);
    } catch (e) {
      console.error('[Normalize] Failed to parse duplicate_check:', e);
      duplicateCheckValue = null;
    }
  }
  
  const normalized: any = {
    id: expense.id,
    userId: expense.user_id,
    tradeShowId: expense.event_id || null,
    amount: expense.amount ? parseFloat(expense.amount) : null,
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

