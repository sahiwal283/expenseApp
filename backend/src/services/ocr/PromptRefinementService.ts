/**
 * Prompt Refinement Service
 * 
 * Analyzes user corrections to automatically improve Ollama prompts.
 * Enables continuous learning without full model retraining.
 */

import { query } from '../../config/database';
import fs from 'fs';
import path from 'path';

interface MerchantPattern {
  original: string;
  corrected: string;
  frequency: number;
}

interface CategoryPattern {
  originalCategory: string;
  correctedCategory: string;
  keywords: string[];
  frequency: number;
}

interface PromptTemplate {
  version: string;
  lastUpdated: Date;
  merchantExamples: string[];
  categoryKeywords: { [category: string]: string[] };
  amountPatterns: string[];
  datePatterns: string[];
}

export class PromptRefinementService {
  private promptTemplatePath = path.join(__dirname, 'prompt-templates.json');
  
  /**
   * Analyze corrections and suggest prompt improvements
   */
  async analyzeCorrections(sinceDays: number = 30): Promise<{
    suggestions: string[];
    newExamples: { [field: string]: string[] };
    confidenceThresholds: { [field: string]: number };
  }> {
    console.log(`[PromptRefinement] Analyzing corrections from last ${sinceDays} days...`);
    
    // Get merchant misreads
    const merchantPatterns = await this.getMerchantPatterns(sinceDays);
    
    // Get category misclassifications
    const categoryPatterns = await this.getCategoryPatterns(sinceDays);
    
    // Get amount extraction errors
    const amountPatterns = await this.getAmountPatterns(sinceDays);
    
    // Generate suggestions
    const suggestions: string[] = [];
    const newExamples: { [field: string]: string[] } = {};
    
    // Merchant suggestions
    if (merchantPatterns.length > 0) {
      suggestions.push(`Add ${merchantPatterns.length} merchant corrections to training examples`);
      newExamples.merchant = merchantPatterns.slice(0, 10).map(p => 
        `"${p.original}" should be recognized as "${p.corrected}"`
      );
    }
    
    // Category suggestions
    if (categoryPatterns.length > 0) {
      suggestions.push(`Update category keywords based on ${categoryPatterns.length} misclassifications`);
      newExamples.category = categoryPatterns.slice(0, 10).map(p => 
        `Receipts with keywords like [${p.keywords.join(', ')}] should be "${p.correctedCategory}" not "${p.originalCategory}"`
      );
    }
    
    // Amount suggestions
    if (amountPatterns.length > 0) {
      suggestions.push(`Improve amount extraction patterns (${amountPatterns.length} errors detected)`);
    }
    
    // Calculate optimal confidence thresholds
    const confidenceThresholds = await this.calculateOptimalThresholds(sinceDays);
    
    console.log(`[PromptRefinement] Generated ${suggestions.length} suggestions`);
    
    return {
      suggestions,
      newExamples,
      confidenceThresholds
    };
  }
  
  /**
   * Get merchant misread patterns
   */
  private async getMerchantPatterns(days: number): Promise<MerchantPattern[]> {
    const result = await query(`
      SELECT 
        original_inference->>'merchant'->>'value' as original,
        corrected_merchant as corrected,
        COUNT(*) as frequency
      FROM ocr_corrections
      WHERE corrected_merchant IS NOT NULL
        AND 'merchant' = ANY(fields_corrected)
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY original, corrected
      HAVING COUNT(*) >= 2
      ORDER BY frequency DESC
      LIMIT 100
    `);
    
    return result.rows.map(row => ({
      original: row.original,
      corrected: row.corrected,
      frequency: parseInt(row.frequency)
    }));
  }
  
  /**
   * Get category misclassification patterns
   */
  private async getCategoryPatterns(days: number): Promise<CategoryPattern[]> {
    const result = await query(`
      SELECT 
        original_inference->>'category'->>'value' as original_category,
        corrected_category,
        ocr_text,
        COUNT(*) as frequency
      FROM ocr_corrections
      WHERE corrected_category IS NOT NULL
        AND 'category' = ANY(fields_corrected)
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY original_category, corrected_category, ocr_text
      HAVING COUNT(*) >= 2
      ORDER BY frequency DESC
      LIMIT 100
    `);
    
    return result.rows.map(row => ({
      originalCategory: row.original_category,
      correctedCategory: row.corrected_category,
      keywords: this.extractKeywords(row.ocr_text),
      frequency: parseInt(row.frequency)
    }));
  }
  
  /**
   * Get amount extraction error patterns
   */
  private async getAmountPatterns(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        original_inference->>'amount'->>'value' as original_amount,
        corrected_amount,
        ocr_text,
        COUNT(*) as frequency
      FROM ocr_corrections
      WHERE corrected_amount IS NOT NULL
        AND 'amount' = ANY(fields_corrected)
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY original_amount, corrected_amount, ocr_text
      HAVING COUNT(*) >= 2
      ORDER BY frequency DESC
      LIMIT 100
    `);
    
    return result.rows;
  }
  
  /**
   * Extract keywords from OCR text
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];
    
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    // Get unique words
    return Array.from(new Set(words)).slice(0, 10);
  }
  
  /**
   * Calculate optimal confidence thresholds by field
   */
  private async calculateOptimalThresholds(days: number): Promise<{ [field: string]: number }> {
    const result = await query(`
      SELECT 
        unnest(fields_corrected) as field,
        AVG(ocr_confidence) as avg_confidence,
        STDDEV(ocr_confidence) as stddev_confidence
      FROM ocr_corrections
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY field
    `);
    
    const thresholds: { [field: string]: number } = {};
    
    for (const row of result.rows) {
      // Set threshold to mean + 1 stddev (captures ~84% of errors)
      const mean = parseFloat(row.avg_confidence);
      const stddev = parseFloat(row.stddev_confidence || 0);
      thresholds[row.field] = Math.min(0.95, mean + stddev);
    }
    
    return thresholds;
  }
  
  /**
   * Generate improved prompt based on corrections
   */
  async generateImprovedPrompt(basePrompt: string, corrections: any[]): Promise<string> {
    console.log(`[PromptRefinement] Generating improved prompt from ${corrections.length} corrections`);
    
    // Extract common corrections
    const merchantExamples = corrections
      .filter(c => c.corrected_merchant)
      .slice(0, 5)
      .map(c => `"${c.original_inference.merchant?.value}" → "${c.corrected_merchant}"`)
      .join(', ');
    
    // Add examples to prompt
    let improvedPrompt = basePrompt;
    
    if (merchantExamples) {
      improvedPrompt += `\n\nCommon merchant corrections: ${merchantExamples}`;
    }
    
    return improvedPrompt;
  }
  
  /**
   * Save prompt template version
   */
  async savePromptTemplate(template: PromptTemplate): Promise<void> {
    const data = JSON.stringify(template, null, 2);
    fs.writeFileSync(this.promptTemplatePath, data, 'utf-8');
    console.log(`[PromptRefinement] Saved prompt template version ${template.version}`);
  }
  
  /**
   * Load current prompt template
   */
  loadPromptTemplate(): PromptTemplate | null {
    try {
      if (fs.existsSync(this.promptTemplatePath)) {
        const data = fs.readFileSync(this.promptTemplatePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[PromptRefinement] Error loading template:', error);
    }
    return null;
  }
  
  /**
   * Create new prompt version from corrections
   */
  async createNewPromptVersion(sinceDays: number = 30): Promise<PromptTemplate> {
    const analysis = await this.analyzeCorrections(sinceDays);
    
    // Load existing template or create new
    const existingTemplate = this.loadPromptTemplate();
    const currentVersion = existingTemplate?.version || '1.0.0';
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Increment version
    const newVersion = `${major}.${minor}.${patch + 1}`;
    
    // Build new template
    const newTemplate: PromptTemplate = {
      version: newVersion,
      lastUpdated: new Date(),
      merchantExamples: analysis.newExamples.merchant || [],
      categoryKeywords: {}, // TODO: Extract from patterns
      amountPatterns: [],
      datePatterns: []
    };
    
    return newTemplate;
  }
}

// Export singleton
export const promptRefinementService = new PromptRefinementService();

