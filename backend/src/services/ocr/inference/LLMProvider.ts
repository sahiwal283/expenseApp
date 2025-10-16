/**
 * LLM Provider Framework
 * 
 * This is a framework/interface for future LLM integration.
 * Currently not implemented, but ready for:
 * - OpenAI GPT-4 Vision
 * - Claude 3 Vision
 * - Local models (LLaVA, etc.)
 * 
 * Usage: Fallback for low-confidence OCR results or field validation
 */

import { LLMProvider, FieldInference, OCRResult } from '../types';

/**
 * Base LLM Provider (Abstract)
 * 
 * Extend this class to implement specific LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  
  /**
   * Extract fields from OCR text using LLM
   * 
   * @param ocrText - Raw OCR text
   * @param lowConfidenceFields - Array of field names that need LLM assistance
   * @returns Partial field inference (only requested fields)
   */
  abstract extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>>;
  
  /**
   * Validate inferred fields using LLM
   * 
   * @param inference - Current field inference
   * @returns Validation result with optional corrections
   */
  abstract validateFields(inference: FieldInference): Promise<{ 
    valid: boolean; 
    corrections?: Partial<FieldInference>;
    confidence?: number;
  }>;
  
  /**
   * Check if LLM is available and configured
   */
  abstract isAvailable(): Promise<boolean>;
  
  /**
   * Helper: Build prompt for field extraction
   */
  protected buildExtractionPrompt(ocrText: string, fields: string[]): string {
    return `
Extract the following fields from this receipt OCR text:
${fields.map(f => `- ${f}`).join('\n')}

OCR Text:
${ocrText}

Return a JSON object with the extracted values. Use null for missing fields.
For amounts, return numbers without currency symbols.
For dates, use YYYY-MM-DD format if possible.
    `.trim();
  }
  
  /**
   * Helper: Build prompt for field validation
   */
  protected buildValidationPrompt(inference: FieldInference): string {
    return `
Validate these extracted receipt fields for accuracy and consistency:

Merchant: ${inference.merchant.value || 'null'}
Amount: ${inference.amount.value || 'null'}
Date: ${inference.date.value || 'null'}
Card: ${inference.cardLastFour.value || 'null'}
Category: ${inference.category.value || 'null'}

Respond with:
{
  "valid": true/false,
  "issues": ["list of validation issues"],
  "corrections": { "field": "corrected value" }
}
    `.trim();
  }
}

/**
 * OpenAI GPT-4 Provider (Framework Only - Not Implemented)
 * 
 * To implement:
 * 1. npm install openai
 * 2. Set OPENAI_API_KEY in environment
 * 3. Implement extractFields() and validateFields()
 */
export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai-gpt4';
  
  async extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>> {
    // TODO: Implement OpenAI API call
    console.warn('[LLM] OpenAI provider not implemented yet');
    throw new Error('OpenAI provider not implemented');
  }
  
  async validateFields(inference: FieldInference): Promise<{ valid: boolean; corrections?: Partial<FieldInference> }> {
    // TODO: Implement OpenAI validation
    console.warn('[LLM] OpenAI validation not implemented yet');
    throw new Error('OpenAI validation not implemented');
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return !!process.env.OPENAI_API_KEY;
  }
}

/**
 * Claude Provider (Framework Only - Not Implemented)
 * 
 * To implement:
 * 1. npm install @anthropic-ai/sdk
 * 2. Set CLAUDE_API_KEY in environment
 * 3. Implement extractFields() and validateFields()
 */
export class ClaudeProvider extends BaseLLMProvider {
  name = 'claude-3';
  
  async extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>> {
    // TODO: Implement Claude API call
    console.warn('[LLM] Claude provider not implemented yet');
    throw new Error('Claude provider not implemented');
  }
  
  async validateFields(inference: FieldInference): Promise<{ valid: boolean; corrections?: Partial<FieldInference> }> {
    // TODO: Implement Claude validation
    console.warn('[LLM] Claude validation not implemented yet');
    throw new Error('Claude validation not implemented');
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return !!process.env.CLAUDE_API_KEY;
  }
}

/**
 * Ollama Local LLM Provider (IMPLEMENTED)
 * 
 * Uses Ollama running on local network for inference.
 * Supports dolphin-llama3 and other Ollama models.
 * 
 * Environment Variables:
 * - OLLAMA_API_URL: Ollama API endpoint (default: http://192.168.1.173:11434)
 * - OLLAMA_MODEL: Model name (default: dolphin-llama3)
 * - OLLAMA_TEMPERATURE: Temperature for inference (default: 0.1)
 * - OLLAMA_TIMEOUT: Request timeout in ms (default: 30000)
 */
export class LocalLLMProvider extends BaseLLMProvider {
  name = 'ollama';
  private apiUrl: string;
  private model: string;
  private temperature: number;
  private timeout: number;
  
  constructor() {
    super();
    this.apiUrl = process.env.OLLAMA_API_URL || 'http://192.168.1.173:11434';
    this.model = process.env.OLLAMA_MODEL || 'dolphin-llama3';
    this.temperature = parseFloat(process.env.OLLAMA_TEMPERATURE || '0.1');
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000');
  }
  
  /**
   * Extract fields from OCR text using Ollama
   */
  async extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>> {
    console.log(`[Ollama] Extracting fields: ${lowConfidenceFields.join(', ')}`);
    
    const prompt = this.buildStructuredExtractionPrompt(ocrText, lowConfidenceFields);
    
    try {
      const response = await this.callOllama(prompt, 200);
      const extracted = this.parseExtractedFields(response, lowConfidenceFields);
      
      console.log(`[Ollama] Extracted ${Object.keys(extracted).length} fields`);
      return extracted;
      
    } catch (error: any) {
      console.error('[Ollama] Field extraction error:', error.message);
      throw new Error(`Ollama extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Validate inferred fields using Ollama
   */
  async validateFields(inference: FieldInference): Promise<{ 
    valid: boolean; 
    corrections?: Partial<FieldInference>;
    confidence?: number;
  }> {
    console.log('[Ollama] Validating inferred fields');
    
    const prompt = this.buildValidationPrompt(inference);
    
    try {
      const response = await this.callOllama(prompt, 300);
      const validation = this.parseValidationResponse(response);
      
      console.log(`[Ollama] Validation complete: ${validation.valid ? 'VALID' : 'ISSUES FOUND'}`);
      return validation;
      
    } catch (error: any) {
      console.error('[Ollama] Validation error:', error.message);
      // Don't throw - validation failure shouldn't break OCR
      return { valid: true }; // Assume valid if LLM fails
    }
  }
  
  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data: any = await response.json();
      const hasModel = data.models?.some((m: any) => 
        m.name.includes(this.model) || this.model.includes(m.name)
      );
      
      if (!hasModel) {
        console.warn(`[Ollama] Model "${this.model}" not found`);
        return false;
      }
      
      console.log(`[Ollama] Available at ${this.apiUrl} with model ${this.model}`);
      return true;
      
    } catch (error: any) {
      console.warn(`[Ollama] Not available: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Call Ollama API with prompt
   */
  private async callOllama(prompt: string, maxTokens: number = 200): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: maxTokens,
            stop: ['\n\n', 'END']
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      return data.response?.trim() || '';
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
  
  /**
   * Build structured extraction prompt
   */
  private buildStructuredExtractionPrompt(ocrText: string, fields: string[]): string {
    const fieldDescriptions: { [key: string]: string } = {
      merchant: 'The business name or merchant (e.g., "Walmart", "Starbucks")',
      amount: 'The total amount as a number without currency symbols (e.g., 45.99)',
      date: 'The date in YYYY-MM-DD format (e.g., 2025-10-15)',
      cardLastFour: 'The last 4 digits of credit card (e.g., "1234")',
      category: 'The expense category from: Meal and Entertainment, Booth Supplies, Setup Supplies, Marketing, Office Expense, Hotel, Uber/Car, Flight, Shipping, Home Depot, Costco, Other',
      location: 'The address or location if present',
      taxAmount: 'The tax amount as a number (e.g., 3.45)',
      tipAmount: 'The tip amount as a number (e.g., 8.00)'
    };
    
    return `Extract information from this receipt OCR text. Return ONLY valid JSON, no explanation.

Required fields to extract:
${fields.map(f => `- ${f}: ${fieldDescriptions[f] || f}`).join('\n')}

Receipt Text:
"""
${ocrText}
"""

Response format (JSON only, no markdown):
{
  ${fields.map(f => {
    if (f === 'amount' || f === 'taxAmount' || f === 'tipAmount') {
      return `"${f}": <number or null>`;
    } else if (f === 'category') {
      return `"${f}": "<one of the categories or null>"`;
    } else {
      return `"${f}": "<string or null>"`;
    }
  }).join(',\n  ')}
}`;
  }
  
  /**
   * Parse extracted fields from LLM response
   */
  private parseExtractedFields(response: string, requestedFields: string[]): Partial<FieldInference> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const inference: Partial<FieldInference> = {};
      
      // Map parsed fields to FieldInference format
      for (const field of requestedFields) {
        const value = parsed[field];
        
        if (value !== undefined && value !== null) {
          (inference as any)[field] = {
            value,
            confidence: 0.85, // LLM-extracted confidence
            source: 'llm' as const,
            rawText: response
          };
        }
      }
      
      return inference;
      
    } catch (error: any) {
      console.error('[Ollama] Failed to parse extraction response:', error.message);
      console.error('[Ollama] Raw response:', response);
      return {}; // Return empty if parsing fails
    }
  }
  
  /**
   * Parse validation response from LLM
   */
  private parseValidationResponse(response: string): { 
    valid: boolean; 
    corrections?: Partial<FieldInference>;
    confidence?: number;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON, assume valid
        return { valid: true };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        valid: parsed.valid !== false, // Default to valid if unclear
        corrections: parsed.corrections || undefined,
        confidence: parsed.confidence || undefined
      };
      
    } catch (error: any) {
      console.error('[Ollama] Failed to parse validation response:', error.message);
      return { valid: true }; // Default to valid if parsing fails
    }
  }
}

/**
 * Create LLM provider based on configuration
 * 
 * @param provider - Provider name
 * @returns LLM provider instance or null if not available
 */
export async function createLLMProvider(provider?: string): Promise<LLMProvider | null> {
  if (!provider) {
    return null;
  }
  
  let llm: LLMProvider;
  
  switch (provider.toLowerCase()) {
    case 'openai':
    case 'gpt4':
      llm = new OpenAIProvider();
      break;
    
    case 'claude':
    case 'claude-3':
      llm = new ClaudeProvider();
      break;
    
    case 'local':
    case 'ollama':
      llm = new LocalLLMProvider();
      break;
    
    default:
      console.warn(`[LLM] Unknown provider: ${provider}`);
      return null;
  }
  
  // Check if provider is available
  const available = await llm.isAvailable();
  if (!available) {
    console.warn(`[LLM] Provider "${llm.name}" not available`);
    return null;
  }
  
  return llm;
}

