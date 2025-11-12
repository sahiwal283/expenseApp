/**
 * OCR Utility Functions
 * 
 * Extracted OCR-related logic for reusability and maintainability
 */

import { OcrV2Data, ReceiptData } from '../types/types';
import { detectCorrections } from './ocrCorrections';
import { Expense } from '../App';
import { extractCardLastFour } from './expenseUtils';

/**
 * Prepares OCR v2 data for correction tracking
 */
export function prepareOcrCorrectionData(
  receiptData: ReceiptData
): OcrV2Data | null {
  if (!receiptData.ocrV2Data) {
    return null;
  }

  const inference = receiptData.ocrV2Data.inference;

  return {
    inference: inference,
    categories: receiptData.ocrV2Data.categories,
    ocrProvider: receiptData.ocrV2Data.ocrProvider,
    ocrText: receiptData.ocrText,
    // Store the ORIGINAL OCR-extracted values (before user edits)
    originalValues: {
      merchant: inference?.merchant?.value || 'Unknown Merchant',
      amount: inference?.amount?.value || 0,
      date: inference?.date?.value || '',
      category: inference?.category?.value || 'Other',
      location: inference?.location?.value || '',
      cardLastFour: inference?.cardLastFour?.value || null,
    },
  };
}

/**
 * Tracks and sends OCR corrections if user made changes
 */
export async function trackOcrCorrections(
  ocrData: OcrV2Data | null | undefined,
  expenseData: Omit<Expense, 'id'>,
  expenseId: string | null | undefined,
  sendOCRCorrection: (data: {
    expenseId?: string;
    originalOCRText: string;
    originalInference: any;
    correctedFields: Record<string, any>;
    notes: string;
  }) => Promise<void>
): Promise<void> {
  if (!ocrData?.originalValues) {
    console.log('[OCR Correction] No OCR v2 data available for correction tracking');
    return;
  }

  console.log('[OCR Correction] Checking for user corrections...');
  console.log('[OCR Correction] Comparing original vs submitted:', {
    original: ocrData.originalValues,
    submitted: {
      merchant: expenseData.merchant,
      amount: expenseData.amount,
      date: expenseData.date,
      category: expenseData.category,
    },
  });

  const corrections = detectCorrections(ocrData.inference, {
    merchant: expenseData.merchant,
    amount: expenseData.amount,
    date: expenseData.date,
    category: expenseData.category,
    cardLastFour: extractCardLastFour(expenseData.cardUsed),
  });

  if (Object.keys(corrections).length > 0) {
    console.log('[OCR Correction] User made corrections:', corrections);

    // Send corrections to backend for continuous learning
    try {
      await sendOCRCorrection({
        expenseId: expenseId || undefined,
        originalOCRText: ocrData.ocrText || '',
        originalInference: ocrData.inference,
        correctedFields: corrections,
        notes: `User corrected ${Object.keys(corrections).length} field(s) during expense submission`,
      });

      console.log(
        `[OCR Correction] Sent ${Object.keys(corrections).length} correction(s) to backend with expense ID: ${expenseId}`
      );
    } catch (err) {
      console.error('[OCR Correction] Failed to send correction:', err);
      // Don't throw - corrections are optional
    }
  } else {
    console.log('[OCR Correction] No corrections detected - OCR was accurate!');
  }
}


