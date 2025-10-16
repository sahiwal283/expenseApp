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
 * Local LLM Provider (Framework Only - Not Implemented)
 * 
 * For running local models like LLaVA, Mistral, etc.
 * Could use Ollama, llama.cpp, or other local inference engines.
 */
export class LocalLLMProvider extends BaseLLMProvider {
  name = 'local-llm';
  
  async extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>> {
    // TODO: Implement local LLM call (e.g., via Ollama API)
    console.warn('[LLM] Local LLM provider not implemented yet');
    throw new Error('Local LLM provider not implemented');
  }
  
  async validateFields(inference: FieldInference): Promise<{ valid: boolean; corrections?: Partial<FieldInference> }> {
    // TODO: Implement local LLM validation
    console.warn('[LLM] Local LLM validation not implemented yet');
    throw new Error('Local LLM validation not implemented');
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if local LLM server is running
    // TODO: Implement health check
    return false;
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

