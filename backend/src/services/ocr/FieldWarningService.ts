/**
 * Field Warning Service
 * 
 * Identifies OCR fields that are likely inaccurate based on:
 * - Known problematic patterns (e.g., long merchant names, ride descriptions)
 * - Historical correction frequency
 * - Semantic inconsistencies
 */

export interface FieldWarning {
  field: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

export class FieldWarningService {
  /**
   * Analyze extracted fields and return warnings for suspicious values
   */
  static analyzeFields(fields: any, ocrText: string): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    
    // Check merchant field
    if (fields.merchant?.value) {
      const merchantWarnings = this.checkMerchant(fields.merchant.value, fields.merchant.confidence);
      warnings.push(...merchantWarnings);
    }
    
    // Check amount field
    if (fields.amount?.value && fields.amount?.alternatives) {
      const amountWarnings = this.checkAmount(fields.amount.value, fields.amount.alternatives, fields.amount.confidence);
      warnings.push(...amountWarnings);
    }
    
    // Check date field
    if (fields.date?.value) {
      const dateWarnings = this.checkDate(fields.date.value, fields.date.confidence);
      warnings.push(...dateWarnings);
    }
    
    // Check category field
    if (fields.category?.value) {
      const categoryWarnings = this.checkCategory(fields.category.value, ocrText, fields.category.confidence);
      warnings.push(...categoryWarnings);
    }
    
    return warnings;
  }
  
  /**
   * Check if merchant name looks suspicious
   */
  private static checkMerchant(merchant: string, confidence: number): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    
    // Warning: Merchant name is too long (likely a description, not a name)
    if (merchant.length > 50) {
      warnings.push({
        field: 'merchant',
        reason: 'Merchant name is unusually long - may be a description instead of business name',
        severity: 'high',
        suggestedAction: 'Verify this is the actual merchant name, not a transaction description'
      });
    }
    
    // Warning: Merchant contains common description words
    const descriptionKeywords = /your ride to|trip to|order from|delivery from|purchase at|booking for/i;
    if (descriptionKeywords.test(merchant)) {
      warnings.push({
        field: 'merchant',
        reason: 'Contains transaction description keywords',
        severity: 'high',
        suggestedAction: 'Extract the actual merchant name (e.g., "Uber" instead of "Your ride to...")'
      });
    }
    
    // Warning: Merchant contains full address
    const addressPattern = /\d+\s+[A-Za-z]+\s+(street|st|avenue|ave|blvd|road|rd|drive|dr)/i;
    if (addressPattern.test(merchant)) {
      warnings.push({
        field: 'merchant',
        reason: 'Contains full address - merchant name should be business name only',
        severity: 'medium',
        suggestedAction: 'Remove address from merchant name'
      });
    }
    
    // Warning: High confidence but suspicious pattern
    if (confidence >= 0.9 && (merchant.length > 60 || descriptionKeywords.test(merchant))) {
      warnings.push({
        field: 'merchant',
        reason: 'High OCR confidence, but value looks incorrect',
        severity: 'high',
        suggestedAction: 'Double-check this field - OCR may have extracted wrong text'
      });
    }
    
    return warnings;
  }
  
  /**
   * Check if amount looks suspicious
   */
  private static checkAmount(amount: number, alternatives: number[] | undefined, confidence: number): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    
    // Warning: Multiple similar amounts detected
    if (alternatives && alternatives.length >= 2) {
      warnings.push({
        field: 'amount',
        reason: `Multiple amounts found on receipt: $${amount}, ${alternatives.map(a => `$${a}`).join(', ')}`,
        severity: 'medium',
        suggestedAction: 'Verify this is the total (not subtotal, tax, or tip)'
      });
    }
    
    // Warning: Amount is suspiciously low
    if (amount > 0 && amount < 1) {
      warnings.push({
        field: 'amount',
        reason: 'Amount is less than $1 - may be a fee or charge, not the total',
        severity: 'medium',
        suggestedAction: 'Check if this is the full amount or just a line item'
      });
    }
    
    // Warning: Amount is unusually high
    if (amount > 10000) {
      warnings.push({
        field: 'amount',
        reason: 'Amount exceeds $10,000 - please verify',
        severity: 'low',
        suggestedAction: 'Confirm this large amount is correct'
      });
    }
    
    return warnings;
  }
  
  /**
   * Check if date looks suspicious
   */
  private static checkDate(date: string, confidence: number): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    
    try {
      const parsedDate = new Date(date);
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const oneMonthAhead = new Date();
      oneMonthAhead.setMonth(now.getMonth() + 1);
      
      // Warning: Date is in the future (beyond 1 month)
      if (parsedDate > oneMonthAhead) {
        warnings.push({
          field: 'date',
          reason: 'Date is more than 1 month in the future',
          severity: 'high',
          suggestedAction: 'Verify the year is correct (OCR may have misread it)'
        });
      }
      
      // Warning: Date is very old (more than 6 months ago)
      if (parsedDate < sixMonthsAgo) {
        warnings.push({
          field: 'date',
          reason: 'Date is more than 6 months old',
          severity: 'low',
          suggestedAction: 'Confirm this is the correct transaction date'
        });
      }
    } catch (e) {
      // Invalid date format
      warnings.push({
        field: 'date',
        reason: 'Date format could not be validated',
        severity: 'medium',
        suggestedAction: 'Verify date is in correct format'
      });
    }
    
    return warnings;
  }
  
  /**
   * Check if category looks suspicious
   */
  private static checkCategory(category: string, ocrText: string, confidence: number): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    
    // Warning: Category confidence is low
    if (confidence < 0.6) {
      warnings.push({
        field: 'category',
        reason: 'Low confidence in category assignment',
        severity: 'low',
        suggestedAction: 'Review and select the most appropriate category'
      });
    }
    
    // Warning: Generic "Other" category
    if (category === 'Other' && confidence < 0.7) {
      warnings.push({
        field: 'category',
        reason: 'Could not determine specific category',
        severity: 'low',
        suggestedAction: 'Manually select the correct category'
      });
    }
    
    return warnings;
  }
  
  /**
   * Get historical accuracy for a specific field
   * (Query ocr_corrections table to find correction frequency)
   */
  static async getHistoricalAccuracy(db: any, field: string, daysBack: number = 30): Promise<{
    totalExtractions: number;
    correctionCount: number;
    accuracyRate: number;
    commonIssues: string[];
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_corrections,
          COUNT(DISTINCT expense_id) as unique_expenses,
          jsonb_object_keys(corrected_fields) as corrected_field
        FROM ocr_corrections
        WHERE created_at >= NOW() - INTERVAL '${daysBack} days'
          AND corrected_fields ? $1
        GROUP BY corrected_field
      `, [field]);
      
      // Calculate accuracy based on correction frequency
      const totalCorrections = parseInt(result.rows[0]?.total_corrections || '0');
      const totalExtractions = parseInt(result.rows[0]?.unique_expenses || '0') + totalCorrections;
      const accuracyRate = totalExtractions > 0 
        ? ((totalExtractions - totalCorrections) / totalExtractions) * 100 
        : 100;
      
      return {
        totalExtractions,
        correctionCount: totalCorrections,
        accuracyRate,
        commonIssues: [] // TODO: Analyze correction patterns
      };
    } catch (error) {
      console.error(`[FieldWarning] Error getting historical accuracy for ${field}:`, error);
      return {
        totalExtractions: 0,
        correctionCount: 0,
        accuracyRate: 100,
        commonIssues: []
      };
    }
  }
}

