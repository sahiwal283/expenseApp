/**
 * OCR Correction Tracking
 * 
 * Captures user corrections to OCR-extracted fields and sends them to
 * the backend for continuous learning and model improvement.
 */

import { api } from './api';

export interface OCRCorrection {
  expenseId?: string;
  originalOCRText: string;
  originalInference: any;
  correctedFields: {
    merchant?: string;
    amount?: number;
    date?: string;
    cardLastFour?: string;
    category?: string;
  };
  receiptImagePath?: string;
  notes?: string;
}

/**
 * Send user corrections to backend for learning
 */
export async function sendOCRCorrection(correction: OCRCorrection): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token'); // Fixed: Use correct token key
    if (!token) {
      console.warn('[OCR Correction] No auth token found, skipping correction logging');
      return;
    }
    
    const response = await fetch(`${api.API_BASE || '/api'}/api/ocr/v2/corrections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(correction)
    });

    if (!response.ok) {
      throw new Error(`Failed to send correction: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[OCR Correction] Sent successfully:', result.correctionId);
  } catch (error) {
    console.error('[OCR Correction] Failed to send:', error);
    // Don't throw - corrections are nice-to-have, not critical
  }
}

/**
 * Track which fields user changed from OCR-extracted values
 */
export function detectCorrections(
  originalInference: any,
  submittedData: any
): { merchant?: string; amount?: number; date?: string; category?: string } {
  const corrections: any = {};

  if (originalInference?.merchant?.value && 
      submittedData.merchant && 
      originalInference.merchant.value !== submittedData.merchant) {
    corrections.merchant = submittedData.merchant;
  }

  if (originalInference?.amount?.value && 
      submittedData.amount && 
      originalInference.amount.value !== submittedData.amount) {
    corrections.amount = submittedData.amount;
  }

  if (originalInference?.date?.value && 
      submittedData.date && 
      originalInference.date.value !== submittedData.date) {
    corrections.date = submittedData.date;
  }

  if (originalInference?.category?.value && 
      submittedData.category && 
      originalInference.category.value !== submittedData.category) {
    corrections.category = submittedData.category;
  }

  return corrections;
}

