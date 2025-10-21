/**
 * Adaptive Inference Engine
 * 
 * Learns from user corrections in real-time and automatically improves field extraction.
 * Uses a combination of:
 * 1. Base rule-based patterns (RuleBasedInferenceEngine)
 * 2. User-trained patterns (from ocr_corrections table)
 * 3. LLM enhancement (Ollama) for complex cases
 */

import { InferenceEngine, OCRResult, FieldInference, FieldValue } from './types';
import { RuleBasedInferenceEngine } from './inference/RuleBasedInferenceEngine';
import { Pool } from 'pg';

interface LearnedPattern {
  id: string;
  field: string;
  pattern: RegExp;
  correctedValue: string;
  confidence: number;
  frequency: number;
  lastSeen: Date;
}

export class AdaptiveInferenceEngine implements InferenceEngine {
  name = 'adaptive';
  
  private baseEngine: RuleBasedInferenceEngine;
  private learnedPatterns: Map<string, LearnedPattern[]> = new Map();
  private db?: Pool;
  private lastRefresh: Date = new Date(0);
  private refreshInterval = 1000 * 60 * 60 * 24; // 24 hours
  
  constructor(db?: Pool) {
    this.baseEngine = new RuleBasedInferenceEngine();
    this.db = db;
    
    // Load learned patterns on startup
    if (db) {
      this.refreshLearnedPatterns().catch(err => {
        console.error('[AdaptiveEngine] Failed to load learned patterns:', err);
      });
    }
  }
  
  /**
   * Main inference method - combines base rules with learned patterns
   */
  async infer(ocrResult: OCRResult): Promise<FieldInference> {
    // Refresh learned patterns if needed (once per day)
    if (this.db && Date.now() - this.lastRefresh.getTime() > this.refreshInterval) {
      await this.refreshLearnedPatterns();
    }
    
    // Get base inference
    const baseInference = await this.baseEngine.infer(ocrResult);
    
    // Apply learned patterns to improve inference
    const enhancedInference = await this.applyLearnedPatterns(ocrResult.text, baseInference);
    
    return enhancedInference;
  }
  
  /**
   * Suggest categories (delegate to base engine)
   */
  async suggestCategories(ocrResult: OCRResult, inference: FieldInference): Promise<any[]> {
    return this.baseEngine.suggestCategories(ocrResult, inference);
  }
  
  /**
   * Load learned patterns from user corrections
   */
  private async refreshLearnedPatterns(): Promise<void> {
    if (!this.db) return;
    
    try {
      console.log('[AdaptiveEngine] Refreshing learned patterns from user corrections...');
      
      // Query corrections with high frequency (minimum 3 occurrences)
      const query = `
        SELECT 
          field,
          original_inference,
          corrected_fields,
          COUNT(*) as frequency,
          MAX(created_at) as last_seen,
          AVG((original_inference->field->>'confidence')::float) as avg_confidence
        FROM (
          SELECT 
            jsonb_object_keys(corrected_fields) as field,
            original_inference,
            corrected_fields,
            created_at
          FROM ocr_corrections
          WHERE created_at >= NOW() - INTERVAL '90 days'
        ) corrections
        GROUP BY field, original_inference, corrected_fields
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
        LIMIT 100;
      `;
      
      const result = await this.db.query(query);
      
      // Clear existing patterns
      this.learnedPatterns.clear();
      
      for (const row of result.rows) {
        const field = row.field;
        const originalInference = row.original_inference;
        const correctedFields = row.corrected_fields;
        const frequency = parseInt(row.frequency);
        const lastSeen = new Date(row.last_seen);
        const avgConfidence = parseFloat(row.avg_confidence || '0');
        
        const originalValue = originalInference[field]?.value;
        const correctedValue = correctedFields[field];
        
        if (!originalValue || !correctedValue || originalValue === correctedValue) {
          continue;
        }
        
        // Generate pattern from original value
        const pattern = this.generatePattern(field, originalValue, correctedValue);
        
        if (pattern) {
          const learnedPattern: LearnedPattern = {
            id: `${field}-${frequency}-${lastSeen.getTime()}`,
            field,
            pattern,
            correctedValue,
            confidence: Math.min(0.85 + (frequency * 0.02), 0.98), // Higher frequency = higher confidence
            frequency,
            lastSeen
          };
          
          if (!this.learnedPatterns.has(field)) {
            this.learnedPatterns.set(field, []);
          }
          
          this.learnedPatterns.get(field)!.push(learnedPattern);
        }
      }
      
      this.lastRefresh = new Date();
      
      console.log(`[AdaptiveEngine] Loaded ${result.rows.length} learned patterns across ${this.learnedPatterns.size} fields`);
      
      // Log learned patterns by field
      for (const [field, patterns] of this.learnedPatterns.entries()) {
        console.log(`  ${field}: ${patterns.length} patterns`);
      }
      
    } catch (error) {
      console.error('[AdaptiveEngine] Error refreshing learned patterns:', error);
    }
  }
  
  /**
   * Generate regex pattern from original/corrected value pair
   */
  private generatePattern(field: string, originalValue: string, correctedValue: string): RegExp | null {
    try {
      if (field === 'merchant') {
        // For merchants, look for distinctive keywords in the original text
        const keywords = originalValue
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 4 && !['unknown', 'merchant', 'receipt'].includes(word))
          .slice(0, 3); // Take first 3 distinctive words
        
        if (keywords.length > 0) {
          // Create a pattern that matches any of these keywords
          return new RegExp(keywords.join('|'), 'i');
        }
      }
      
      if (field === 'category') {
        // For categories, look for keywords that suggest the correct category
        // This would come from analyzing the original OCR text (would need to store that)
        return null; // TODO: Implement category pattern learning
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Apply learned patterns to enhance inference
   */
  private async applyLearnedPatterns(ocrText: string, baseInference: FieldInference): Promise<FieldInference> {
    const enhanced = { ...baseInference };
    const textLower = ocrText.toLowerCase();
    
    // Apply merchant patterns
    if (this.learnedPatterns.has('merchant')) {
      for (const pattern of this.learnedPatterns.get('merchant')!) {
        if (pattern.pattern.test(textLower)) {
          // Learned pattern matches - override base inference if:
          // 1. Base inference has low confidence (<0.7), OR
          // 2. Learned pattern has high frequency (>10 occurrences)
          if (baseInference.merchant.confidence < 0.7 || pattern.frequency > 10) {
            console.log(`[AdaptiveEngine] Applying learned pattern: "${pattern.correctedValue}" (freq: ${pattern.frequency})`);
            enhanced.merchant = {
              value: pattern.correctedValue,
              confidence: pattern.confidence,
              source: 'inference',
              rawText: `Learned from ${pattern.frequency} user corrections`
            };
            break; // Use first matching pattern
          }
        }
      }
    }
    
    // Apply category patterns (when implemented)
    if (this.learnedPatterns.has('category')) {
      // TODO: Implement category pattern matching
    }
    
    return enhanced;
  }
  
  /**
   * Get statistics about learned patterns
   */
  getStats(): {
    totalPatterns: number;
    patternsByField: Record<string, number>;
    lastRefresh: Date;
  } {
    const patternsByField: Record<string, number> = {};
    
    for (const [field, patterns] of this.learnedPatterns.entries()) {
      patternsByField[field] = patterns.length;
    }
    
    return {
      totalPatterns: Array.from(this.learnedPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      patternsByField,
      lastRefresh: this.lastRefresh
    };
  }
  
  /**
   * Force refresh of learned patterns (useful for testing)
   */
  async forceRefresh(): Promise<void> {
    await this.refreshLearnedPatterns();
  }
}

