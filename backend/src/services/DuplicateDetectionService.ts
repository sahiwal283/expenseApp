import { query } from '../config/database';

interface DuplicateWarning {
  expenseId: number;
  merchant: string;
  amount: number;
  date: string;
  similarity: {
    merchant: number;
    amount: number;
    dateDiff: number;
  };
}

export class DuplicateDetectionService {
  /**
   * Calculate Levenshtein distance between two strings
   * Returns similarity percentage (0-100)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    const similarity = ((longer.length - editDistance) / longer.length) * 100;
    
    return Math.round(similarity);
  }

  /**
   * Calculate Levenshtein distance (edit distance) between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if two dates are within 1 day of each other
   */
  private static isDateSimilar(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  }

  /**
   * Calculate date difference in days
   */
  private static getDateDifference(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check for potential duplicate expenses
   * Returns array of potential duplicates with similarity scores
   */
  static async checkForDuplicates(
    merchant: string,
    amount: number,
    date: string,
    userId: string | number,
    excludeExpenseId?: string | number
  ): Promise<DuplicateWarning[]> {
    try {
      console.log(`[DuplicateCheck] Checking for duplicates: merchant="${merchant}", amount=${amount}, date=${date}, userId=${userId}`);
      
      // Get all expenses for this user from the last 30 days
      const dateObj = new Date(date);
      const thirtyDaysAgo = new Date(dateObj);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysLater = new Date(dateObj);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      let sql = `
        SELECT id, merchant, amount, date
        FROM expenses
        WHERE user_id = $1
        AND date >= $2
        AND date <= $3
      `;
      const params: any[] = [userId, thirtyDaysAgo.toISOString().split('T')[0], thirtyDaysLater.toISOString().split('T')[0]];

      if (excludeExpenseId) {
        sql += ` AND id != $4`;
        params.push(excludeExpenseId);
      }

      const result = await query(sql, params);
      const potentialDuplicates: DuplicateWarning[] = [];
      
      console.log(`[DuplicateCheck] Found ${result.rows.length} candidate expenses to check`);

      for (const expense of result.rows) {
        const merchantSimilarity = this.calculateSimilarity(merchant, expense.merchant);
        const amountSimilarity = this.calculateSimilarity(
          amount.toString(),
          expense.amount.toString()
        );
        const dateSimilar = this.isDateSimilar(date, expense.date);
        const dateDiff = this.getDateDifference(date, expense.date);

        // Check if all three criteria meet the thresholds
        if (merchantSimilarity >= 75 && amountSimilarity >= 75 && dateSimilar) {
          console.log(`[DuplicateCheck] MATCH FOUND! Expense #${expense.id}: merchant=${merchantSimilarity}%, amount=${amountSimilarity}%, dateDiff=${dateDiff} days`);
          potentialDuplicates.push({
            expenseId: expense.id,
            merchant: expense.merchant,
            amount: parseFloat(expense.amount),
            date: expense.date,
            similarity: {
              merchant: merchantSimilarity,
              amount: amountSimilarity,
              dateDiff: dateDiff
            }
          });
        } else {
          console.log(`[DuplicateCheck] No match for expense #${expense.id}: merchant=${merchantSimilarity}%, amount=${amountSimilarity}%, dateDiff=${dateDiff} days (threshold: 75%)`);
        }
      }

      console.log(`[DuplicateCheck] Returning ${potentialDuplicates.length} potential duplicate(s)`);
      return potentialDuplicates;
    } catch (error) {
      console.error('[DuplicateDetection] Error checking for duplicates:', error);
      return [];
    }
  }

  /**
   * Format duplicate warning for display
   */
  static formatDuplicateWarning(duplicate: DuplicateWarning): string {
    const dateObj = new Date(duplicate.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return `⚠ Possible duplicate: Expense #${duplicate.expenseId} ($${duplicate.amount.toFixed(2)} at ${duplicate.merchant} on ${formattedDate})`;
  }
}

