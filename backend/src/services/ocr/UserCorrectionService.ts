/**
 * User Correction Service
 * 
 * Handles storage and retrieval of user corrections to OCR inferences.
 * Used for continuous learning and accuracy improvement.
 */

import { query } from '../../config/database';
import { UserCorrection, FieldInference } from './types';

export class UserCorrectionService {
  /**
   * Store a user correction
   */
  async storeCorrection(correction: UserCorrection): Promise<string> {
    const fieldsCorrect = [];
    
    if (correction.correctedFields.merchant) fieldsCorrect.push('merchant');
    if (correction.correctedFields.amount !== undefined) fieldsCorrect.push('amount');
    if (correction.correctedFields.date) fieldsCorrect.push('date');
    if (correction.correctedFields.cardLastFour) fieldsCorrect.push('cardLastFour');
    if (correction.correctedFields.category) fieldsCorrect.push('category');
    
    const result = await query(
      `INSERT INTO ocr_corrections (
        expense_id,
        user_id,
        ocr_provider,
        ocr_text,
        ocr_confidence,
        original_inference,
        corrected_merchant,
        corrected_amount,
        corrected_date,
        corrected_card_last_four,
        corrected_category,
        receipt_image_path,
        correction_notes,
        fields_corrected
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        correction.expenseId || null,
        correction.userId,
        'paddleocr', // TODO: Get from correction or default
        correction.originalOCRText,
        0.85, // TODO: Get actual confidence from OCR result
        JSON.stringify(correction.originalInference),
        correction.correctedFields.merchant || null,
        correction.correctedFields.amount || null,
        correction.correctedFields.date || null,
        correction.correctedFields.cardLastFour || null,
        correction.correctedFields.category || null,
        correction.receiptImagePath || null,
        correction.notes || null,
        fieldsCorrect
      ]
    );
    
    const correctionId = result.rows[0].id;
    console.log(`[UserCorrection] Stored correction ${correctionId} with ${fieldsCorrect.length} field(s) corrected`);
    
    return correctionId;
  }
  
  /**
   * Get corrections by user
   */
  async getCorrectionsByUser(userId: string, limit: number = 100): Promise<any[]> {
    const result = await query(
      `SELECT * FROM ocr_corrections
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }
  
  /**
   * Get corrections by expense
   */
  async getCorrectionsByExpense(expenseId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM ocr_corrections
       WHERE expense_id = $1
       ORDER BY created_at DESC`,
      [expenseId]
    );
    
    return result.rows;
  }
  
  /**
   * Get correction statistics for analytics
   */
  async getCorrectionStats(): Promise<{
    totalCorrections: number;
    byField: { [field: string]: number };
    avgConfidenceWhenCorrected: number;
  }> {
    // Total corrections
    const totalResult = await query('SELECT COUNT(*) as count FROM ocr_corrections');
    const totalCorrections = parseInt(totalResult.rows[0].count);
    
    // By field
    const fieldResult = await query(`
      SELECT 
        unnest(fields_corrected) as field,
        COUNT(*) as count
      FROM ocr_corrections
      GROUP BY field
      ORDER BY count DESC
    `);
    
    const byField: { [field: string]: number } = {};
    fieldResult.rows.forEach(row => {
      byField[row.field] = parseInt(row.count);
    });
    
    // Average OCR confidence when corrections were needed
    const avgResult = await query(
      'SELECT AVG(ocr_confidence) as avg FROM ocr_corrections'
    );
    const avgConfidenceWhenCorrected = parseFloat(avgResult.rows[0].avg) || 0;
    
    return {
      totalCorrections,
      byField,
      avgConfidenceWhenCorrected
    };
  }
  
  /**
   * Get corrections for ML training export
   * Returns data in format suitable for model retraining
   */
  async exportCorrectionsForTraining(startDate?: Date, endDate?: Date): Promise<any[]> {
    let sql = `
      SELECT 
        ocr_text,
        ocr_confidence,
        original_inference,
        corrected_merchant,
        corrected_amount,
        corrected_date,
        corrected_card_last_four,
        corrected_category,
        fields_corrected,
        created_at
      FROM ocr_corrections
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (startDate) {
      params.push(startDate);
      sql += ` AND created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      sql += ` AND created_at <= $${params.length}`;
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    
    return result.rows.map(row => ({
      input: row.ocr_text,
      originalPredictions: row.original_inference,
      corrections: {
        merchant: row.corrected_merchant,
        amount: row.corrected_amount,
        date: row.corrected_date,
        cardLastFour: row.corrected_card_last_four,
        category: row.corrected_category
      },
      fieldsCorrected: row.fields_corrected,
      metadata: {
        ocrConfidence: row.ocr_confidence,
        timestamp: row.created_at
      }
    }));
  }
}

// Export singleton
export const userCorrectionService = new UserCorrectionService();

