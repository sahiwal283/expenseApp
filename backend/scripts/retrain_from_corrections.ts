/**
 * Active Learning: Retrain Inference Patterns from User Corrections
 * 
 * This script analyzes user corrections in the ocr_corrections table
 * and generates updated inference patterns for the RuleBasedInferenceEngine.
 * 
 * Run monthly or after significant correction volume to improve OCR accuracy.
 * 
 * Usage:
 *   ts-node scripts/retrain_from_corrections.ts [--days=30] [--min-corrections=10]
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface CorrectionPattern {
  field: string;
  originalValue: string;
  correctedValue: string;
  frequency: number;
  confidence: number;
}

async function analyzeCorrections(pool: Pool, daysBack: number = 30): Promise<CorrectionPattern[]> {
  console.log(`\n📊 Analyzing corrections from the last ${daysBack} days...\n`);
  
  const query = `
    SELECT 
      jsonb_object_keys(corrected_fields) as field,
      original_inference,
      corrected_fields,
      COUNT(*) as frequency
    FROM ocr_corrections
    WHERE created_at >= NOW() - INTERVAL '${daysBack} days'
    GROUP BY field, original_inference, corrected_fields
    ORDER BY frequency DESC;
  `;
  
  const result = await pool.query(query);
  
  const patterns: CorrectionPattern[] = [];
  
  for (const row of result.rows) {
    const field = row.field;
    const originalInference = row.original_inference;
    const correctedFields = row.corrected_fields;
    const frequency = parseInt(row.frequency);
    
    // Extract original and corrected values
    const originalValue = originalInference[field]?.value || '';
    const correctedValue = correctedFields[field] || '';
    
    if (originalValue && correctedValue && originalValue !== correctedValue) {
      patterns.push({
        field,
        originalValue,
        correctedValue,
        frequency,
        confidence: originalInference[field]?.confidence || 0
      });
    }
  }
  
  return patterns;
}

async function generateMerchantRules(patterns: CorrectionPattern[]): Promise<string[]> {
  const merchantPatterns = patterns.filter(p => p.field === 'merchant');
  const rules: string[] = [];
  
  console.log('🏪 Merchant Correction Patterns:\n');
  
  // Group by corrected value to find common mappings
  const mappings = new Map<string, { originals: string[]; frequency: number }>();
  
  for (const pattern of merchantPatterns) {
    if (!mappings.has(pattern.correctedValue)) {
      mappings.set(pattern.correctedValue, { originals: [], frequency: 0 });
    }
    const mapping = mappings.get(pattern.correctedValue)!;
    mapping.originals.push(pattern.originalValue);
    mapping.frequency += pattern.frequency;
  }
  
  // Generate rules for high-frequency mappings
  for (const [correctedMerchant, data] of mappings.entries()) {
    if (data.frequency >= 3) { // Minimum 3 corrections to consider a pattern
      console.log(`  ${correctedMerchant}:`);
      console.log(`    Frequency: ${data.frequency} corrections`);
      console.log(`    Common misreads: ${data.originals.slice(0, 3).join(', ')}...\n`);
      
      // Find common pattern in misreads
      const commonKeywords = data.originals
        .join(' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const uniqueKeywords = [...new Set(commonKeywords)];
      
      if (uniqueKeywords.length > 0) {
        rules.push(`  // ${correctedMerchant} - Detected from ${data.frequency} user corrections`);
        rules.push(`  { pattern: /${uniqueKeywords.slice(0, 3).join('|')}/i, name: '${correctedMerchant}', confidence: 0.92 },`);
      }
    }
  }
  
  return rules;
}

async function generateCategoryRules(patterns: CorrectionPattern[]): Promise<string[]> {
  const categoryPatterns = patterns.filter(p => p.field === 'category');
  const rules: string[] = [];
  
  console.log('\n📁 Category Correction Patterns:\n');
  
  // Group by category
  const categoryMap = new Map<string, { keywords: Set<string>; frequency: number }>();
  
  for (const pattern of categoryPatterns) {
    if (!categoryMap.has(pattern.correctedValue)) {
      categoryMap.set(pattern.correctedValue, { keywords: new Set(), frequency: 0 });
    }
    const cat = categoryMap.get(pattern.correctedValue)!;
    
    // Extract keywords from original OCR text (would need to query original_ocr_text)
    cat.frequency += pattern.frequency;
  }
  
  for (const [category, data] of categoryMap.entries()) {
    if (data.frequency >= 3) {
      console.log(`  ${category}: ${data.frequency} corrections`);
    }
  }
  
  return rules;
}

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'expenseapp',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'expenseapp'
  });
  
  try {
    console.log('🤖 Active Learning: Analyzing User Corrections\n');
    console.log('============================================\n');
    
    // Get command line args
    const args = process.argv.slice(2);
    const daysArg = args.find(a => a.startsWith('--days='));
    const daysBack = daysArg ? parseInt(daysArg.split('=')[1]) : 30;
    
    // Analyze corrections
    const patterns = await analyzeCorrections(pool, daysBack);
    
    if (patterns.length === 0) {
      console.log('✨ No corrections found in the specified period.\n');
      console.log('This means either:');
      console.log('  1. OCR accuracy is already excellent! 🎉');
      console.log('  2. Not enough data has been collected yet.\n');
      return;
    }
    
    console.log(`\n✅ Found ${patterns.length} correction patterns\n`);
    console.log('============================================\n');
    
    // Generate new rules
    const merchantRules = await generateMerchantRules(patterns);
    const categoryRules = await generateCategoryRules(patterns);
    
    console.log('\n📝 Suggested Updates to RuleBasedInferenceEngine.ts:\n');
    console.log('============================================\n');
    
    if (merchantRules.length > 0) {
      console.log('// Add to contextualMerchants array:');
      merchantRules.forEach(rule => console.log(rule));
      console.log('');
    }
    
    if (categoryRules.length > 0) {
      console.log('// Add to categoryKeywords:');
      categoryRules.forEach(rule => console.log(rule));
      console.log('');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('  1. Review the suggested patterns above');
    console.log('  2. Manually add them to RuleBasedInferenceEngine.ts');
    console.log('  3. Test with sample receipts');
    console.log('  4. Deploy updated inference engine\n');
    
    console.log('📊 Accuracy Report:');
    const fieldAccuracy = new Map<string, { total: number; corrected: number }>();
    
    for (const pattern of patterns) {
      if (!fieldAccuracy.has(pattern.field)) {
        fieldAccuracy.set(pattern.field, { total: 0, corrected: 0 });
      }
      const stats = fieldAccuracy.get(pattern.field)!;
      stats.corrected += pattern.frequency;
      stats.total += pattern.frequency; // This is simplified; would need total extraction count
    }
    
    console.log('\nField-level correction frequency:');
    for (const [field, stats] of fieldAccuracy.entries()) {
      console.log(`  ${field}: ${stats.corrected} corrections`);
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Error analyzing corrections:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

