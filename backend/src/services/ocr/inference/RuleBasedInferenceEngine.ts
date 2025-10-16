/**
 * Rule-Based Inference Engine
 * 
 * Extracts structured fields from OCR text using regex patterns and keyword matching.
 * Provides confidence scores for each field based on pattern strength and context.
 */

import { InferenceEngine, OCRResult, FieldInference, FieldValue, CategorySuggestion } from '../types';

export class RuleBasedInferenceEngine implements InferenceEngine {
  name = 'rule-based';
  
  // Category keywords with weights
  private categoryKeywords = {
    'Booth / Marketing / Tools': {
      keywords: ['booth', 'display', 'banner', 'signage', 'marketing', 'promotion', 'brochure', 'flyer', 'tools', 'equipment'],
      weight: 1.0
    },
    'Travel - Flight': {
      keywords: ['airline', 'airways', 'flight', 'aviation', 'airport', 'boarding', 'departure', 'arrival'],
      weight: 1.0
    },
    'Accommodation - Hotel': {
      keywords: ['hotel', 'motel', 'inn', 'resort', 'marriott', 'hilton', 'hyatt', 'holiday inn', 'best western', 'lodging', 'accommodation', 'night', 'stay'],
      weight: 1.0
    },
    'Transportation - Uber / Lyft / Others': {
      keywords: ['uber', 'lyft', 'taxi', 'cab', 'rideshare', 'ride-share', 'transport'],
      weight: 1.0
    },
    'Parking Fees': {
      keywords: ['parking', 'park', 'valet', 'garage'],
      weight: 1.0
    },
    'Rental - Car / U-haul': {
      keywords: ['rental', 'hertz', 'enterprise', 'avis', 'budget', 'u-haul', 'uhaul', 'car hire', 'vehicle rental'],
      weight: 1.0
    },
    'Meal and Entertainment': {
      keywords: ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'grill', 'kitchen', 'bar', 'pub', 'food', 'dining', 'breakfast', 'lunch', 'dinner', 'meal', 'entertainment'],
      weight: 1.0
    },
    'Gas / Fuel': {
      keywords: ['gas', 'fuel', 'gasoline', 'diesel', 'petrol', 'shell', 'bp', 'exxon', 'chevron', 'mobil'],
      weight: 1.0
    },
    'Show Allowances - Per Diem': {
      keywords: ['per diem', 'allowance', 'daily allowance', 'show allowance'],
      weight: 1.0
    },
    'Model': {
      keywords: ['model', 'talent', 'contractor', 'appearance'],
      weight: 1.0
    },
    'Shipping Charges': {
      keywords: ['shipping', 'freight', 'delivery', 'courier', 'fedex', 'ups', 'usps', 'dhl'],
      weight: 1.0
    },
    'Other': {
      keywords: ['misc', 'miscellaneous', 'other'],
      weight: 0.5
    }
  };
  
  // Common card types and patterns
  private cardPatterns = [
    { pattern: /\*+(\d{4})/i, confidence: 0.9 },
    { pattern: /x{4,}(\d{4})/i, confidence: 0.9 },
    { pattern: /ending\s+(?:in\s+)?(\d{4})/i, confidence: 0.95 },
    { pattern: /card\s+(?:no\.?|number)?\s*\*+(\d{4})/i, confidence: 0.95 },
    { pattern: /(?:visa|mastercard|amex|discover)\s+\*+(\d{4})/i, confidence: 1.0 }
  ];
  
  /**
   * Infer fields from OCR result
   */
  async infer(ocrResult: OCRResult): Promise<FieldInference> {
    const text = ocrResult.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textLower = text.toLowerCase();
    
    console.log('[Inference] Starting field extraction...');
    
    return {
      merchant: this.extractMerchant(lines, ocrResult.confidence),
      amount: this.extractAmount(text, textLower, ocrResult.confidence),
      date: this.extractDate(text, ocrResult.confidence),
      cardLastFour: this.extractCardLastFour(text, textLower, ocrResult.confidence),
      category: this.predictCategory(textLower, ocrResult.confidence),
      location: this.extractLocation(text, ocrResult.confidence),
      taxAmount: this.extractTaxAmount(text, textLower, ocrResult.confidence),
      tipAmount: this.extractTipAmount(text, textLower, ocrResult.confidence)
    };
  }
  
  /**
   * Extract merchant name (usually first substantial line)
   */
  private extractMerchant(lines: string[], ocrConfidence: number): FieldValue<string> {
    for (const line of lines.slice(0, 8)) {
      const trimmed = line.trim();
      // Skip lines that are just numbers, dates, or common headers
      if (trimmed.length > 3 && 
          !/^\d+$/.test(trimmed) && 
          !/^receipt$/i.test(trimmed) &&
          !/^invoice$/i.test(trimmed) &&
          !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed)) {
        
        const confidence = Math.min(0.7 + (ocrConfidence * 0.3), 0.95);
        console.log(`[Inference] Merchant: "${trimmed}" (confidence: ${confidence.toFixed(2)})`);
        
        return {
          value: trimmed,
          confidence,
          source: 'inference',
          rawText: line
        };
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract amount with multiple patterns
   */
  private extractAmount(text: string, textLower: string, ocrConfidence: number): FieldValue<number> {
    const patterns = [
      { regex: /total[\s:]*\$?\s*(\d+[.,]\d{2})/i, confidence: 0.95 },
      { regex: /amount[\s:]*\$?\s*(\d+[.,]\d{2})/i, confidence: 0.90 },
      { regex: /balance[\s:]*\$?\s*(\d+[.,]\d{2})/i, confidence: 0.85 },
      { regex: /grand[\s]+total[\s:]*\$?\s*(\d+[.,]\d{2})/i, confidence: 0.98 },
      { regex: /subtotal[\s:]*\$?\s*(\d+[.,]\d{2})/i, confidence: 0.80 },
      { regex: /\$\s*(\d+[.,]\d{2})\s*(?:total|amount|balance)/i, confidence: 0.90 }
    ];
    
    const alternatives: Array<{ value: number; confidence: number }> = [];
    
    for (const { regex, confidence: patternConf } of patterns) {
      const match = text.match(regex);
      if (match) {
        const amount = parseFloat(match[1].replace(',', '.'));
        // Only accept reasonable amounts (between $0.01 and $100,000)
        if (amount >= 0.01 && amount <= 100000) {
          const finalConfidence = Math.min(patternConf * ocrConfidence, 0.98);
          
          if (!alternatives.find(a => Math.abs(a.value - amount) < 0.01)) {
            alternatives.push({ value: amount, confidence: finalConfidence });
          }
        }
      }
    }
    
    // Sort by confidence and return best match
    alternatives.sort((a, b) => b.confidence - a.confidence);
    
    if (alternatives.length > 0) {
      const best = alternatives[0];
      console.log(`[Inference] Amount: $${best.value} (confidence: ${best.confidence.toFixed(2)})`);
      
      return {
        value: best.value,
        confidence: best.confidence,
        source: 'inference',
        rawText: text.match(patterns[0].regex)?.[0],
        alternatives: alternatives.slice(1, 3) // Include top 2 alternatives
      };
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract date with multiple formats
   */
  private extractDate(text: string, ocrConfidence: number): FieldValue<string> {
    const patterns = [
      { regex: /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,  confidence: 0.90, format: 'MM/DD/YYYY' },
      { regex: /(\d{1,2}[-/]\d{1,2}[-/]\d{2})/,  confidence: 0.85, format: 'MM/DD/YY' },
      { regex: /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,  confidence: 0.90, format: 'YYYY/MM/DD' },
      { regex: /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i, confidence: 0.95, format: 'Month DD, YYYY' }
    ];
    
    for (const { regex, confidence: patternConf } of patterns) {
      const match = text.match(regex);
      if (match) {
        const finalConfidence = Math.min(patternConf * ocrConfidence, 0.95);
        console.log(`[Inference] Date: ${match[0]} (confidence: ${finalConfidence.toFixed(2)})`);
        
        return {
          value: match[0],
          confidence: finalConfidence,
          source: 'inference',
          rawText: match[0]
        };
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract card last 4 digits
   */
  private extractCardLastFour(text: string, textLower: string, ocrConfidence: number): FieldValue<string> {
    for (const { pattern, confidence: patternConf } of this.cardPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const lastFour = match[1];
        const finalConfidence = Math.min(patternConf * ocrConfidence, 0.98);
        
        console.log(`[Inference] Card: ****${lastFour} (confidence: ${finalConfidence.toFixed(2)})`);
        
        return {
          value: lastFour,
          confidence: finalConfidence,
          source: 'inference',
          rawText: match[0]
        };
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Predict category based on keywords
   */
  private predictCategory(textLower: string, ocrConfidence: number): FieldValue<string> {
    let bestMatch: { category: string; confidence: number; keywords: string[] } | null = null;
    
    for (const [category, { keywords, weight }] of Object.entries(this.categoryKeywords)) {
      const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
      
      if (matchedKeywords.length > 0) {
        // Calculate confidence based on number and quality of matches
        const matchScore = matchedKeywords.length / keywords.length;
        const confidence = Math.min((0.5 + matchScore * 0.4) * weight * ocrConfidence, 0.95);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category, confidence, keywords: matchedKeywords };
        }
      }
    }
    
    if (bestMatch) {
      console.log(`[Inference] Category: ${bestMatch.category} (confidence: ${bestMatch.confidence.toFixed(2)})`);
      console.log(`[Inference] Matched keywords: ${bestMatch.keywords.join(', ')}`);
      
      return {
        value: bestMatch.category,
        confidence: bestMatch.confidence,
        source: 'inference',
        rawText: bestMatch.keywords.join(', ')
      };
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract location/address
   */
  private extractLocation(text: string, ocrConfidence: number): FieldValue<string> {
    const patterns = [
      { regex: /\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane)/i, confidence: 0.85 },
      { regex: /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/i, confidence: 0.90 }
    ];
    
    for (const { regex, confidence: patternConf } of patterns) {
      const match = text.match(regex);
      if (match) {
        const finalConfidence = Math.min(patternConf * ocrConfidence, 0.90);
        
        return {
          value: match[0],
          confidence: finalConfidence,
          source: 'inference',
          rawText: match[0]
        };
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract tax amount
   */
  private extractTaxAmount(text: string, textLower: string, ocrConfidence: number): FieldValue<number> {
    const patterns = [
      /tax[\s:]*\$?\s*(\d+[.,]\d{2})/i,
      /sales\s+tax[\s:]*\$?\s*(\d+[.,]\d{2})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(',', '.'));
        if (amount >= 0 && amount <= 10000) {
          return {
            value: amount,
            confidence: Math.min(0.85 * ocrConfidence, 0.90),
            source: 'inference',
            rawText: match[0]
          };
        }
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Extract tip amount
   */
  private extractTipAmount(text: string, textLower: string, ocrConfidence: number): FieldValue<number> {
    const patterns = [
      /tip[\s:]*\$?\s*(\d+[.,]\d{2})/i,
      /gratuity[\s:]*\$?\s*(\d+[.,]\d{2})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(',', '.'));
        if (amount >= 0 && amount <= 10000) {
          return {
            value: amount,
            confidence: Math.min(0.85 * ocrConfidence, 0.90),
            source: 'inference',
            rawText: match[0]
          };
        }
      }
    }
    
    return {
      value: null,
      confidence: 0,
      source: 'inference'
    };
  }
  
  /**
   * Suggest categories based on inference and OCR text
   */
  async suggestCategories(ocrResult: OCRResult, inference: FieldInference): Promise<CategorySuggestion[]> {
    const textLower = ocrResult.text.toLowerCase();
    const suggestions: CategorySuggestion[] = [];
    
    for (const [category, { keywords, weight }] of Object.entries(this.categoryKeywords)) {
      const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword.toLowerCase()));
      
      if (matchedKeywords.length > 0) {
        const matchScore = matchedKeywords.length / keywords.length;
        const confidence = Math.min((0.5 + matchScore * 0.4) * weight * ocrResult.confidence, 0.95);
        
        suggestions.push({
          category,
          confidence,
          keywords: matchedKeywords,
          source: 'rule-based'
        });
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 3
    return suggestions.slice(0, 3);
  }
}

