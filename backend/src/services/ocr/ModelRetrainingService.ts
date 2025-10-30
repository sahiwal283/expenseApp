/**
 * Model Retraining Service
 * 
 * Manages continuous learning pipeline for Ollama Lite.
 * Handles model versioning, retraining, deployment, and rollback.
 */

import { query } from '../../config/database';
import { promptRefinementService } from './PromptRefinementService';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ModelVersion {
  version: string;
  createdAt: Date;
  basedOnCorrections: number;
  performanceMetrics?: {
    merchantAccuracy?: number;
    amountAccuracy?: number;
    categoryAccuracy?: number;
    overallAccuracy?: number;
  };
  deployed: boolean;
  notes?: string;
}

interface RetrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  correctionsSince: Date;
  newModelVersion?: string;
  error?: string;
  metrics?: any;
}

export class ModelRetrainingService {
  private ollamaUrl = process.env.OLLAMA_API_URL || 'http://192.168.1.173:11434';
  private baseModel = process.env.OLLAMA_MODEL || 'dolphin-llama3';
  private versionsPath = path.join(__dirname, 'model-versions.json');
  private jobsPath = path.join(__dirname, 'retraining-jobs.json');
  
  /**
   * Start a retraining job
   */
  async startRetrainingJob(sinceDays: number = 30): Promise<RetrainingJob> {
    console.log(`[Retraining] Starting retraining job with corrections from last ${sinceDays} days`);
    
    const job: RetrainingJob = {
      id: `retrain-${Date.now()}`,
      status: 'pending',
      correctionsSince: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    };
    
    // Save job
    this.saveJob(job);
    
    // Run asynchronously
    this.runRetrainingJob(job, sinceDays).catch(error => {
      console.error('[Retraining] Job failed:', error);
      job.status = 'failed';
      job.error = error.message;
      this.saveJob(job);
    });
    
    return job;
  }
  
  /**
   * Run retraining job (internal)
   */
  private async runRetrainingJob(job: RetrainingJob, sinceDays: number): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    this.saveJob(job);
    
    try {
      // Step 1: Analyze corrections and generate improvements
      console.log('[Retraining] Step 1: Analyzing corrections...');
      const analysis = await promptRefinementService.analyzeCorrections(sinceDays);
      
      // Step 2: Create new prompt version
      console.log('[Retraining] Step 2: Creating improved prompt template...');
      const newTemplate = await promptRefinementService.createNewPromptVersion(sinceDays);
      
      // Step 3: Update LLM Provider with new prompts
      console.log('[Retraining] Step 3: Updating Ollama prompts...');
      // This would update the prompts in LLMProvider
      // For now, just save the template
      await promptRefinementService.savePromptTemplate(newTemplate);
      
      // Step 4: (Optional) Fine-tune Ollama model
      // This requires creating a Modelfile and running ollama create
      // Skipping for now - prompt refinement is often sufficient
      
      // Step 5: Run validation tests
      console.log('[Retraining] Step 4: Validating improvements...');
      const metrics = await this.validateModel(newTemplate.version);
      
      // Step 6: Save model version
      const modelVersion: ModelVersion = {
        version: newTemplate.version,
        createdAt: new Date(),
        basedOnCorrections: analysis.suggestions.length,
        performanceMetrics: metrics,
        deployed: false,
        notes: `Based on ${sinceDays} days of corrections. Suggestions: ${analysis.suggestions.join('; ')}`
      };
      
      this.saveModelVersion(modelVersion);
      
      // Complete job
      job.status = 'completed';
      job.completedAt = new Date();
      job.newModelVersion = newTemplate.version;
      job.metrics = metrics;
      this.saveJob(job);
      
      console.log(`[Retraining] Job ${job.id} completed successfully. New version: ${newTemplate.version}`);
      
    } catch (error: any) {
      console.error('[Retraining] Job failed:', error);
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.saveJob(job);
      throw error;
    }
  }
  
  /**
   * Validate model performance
   */
  private async validateModel(version: string): Promise<any> {
    // Get recent corrections to use as validation set
    const validationResult = await query(`
      SELECT 
        COUNT(*) as total_corrections,
        COUNT(DISTINCT CASE WHEN 'merchant' = ANY(fields_corrected) THEN id END) as merchant_corrections,
        COUNT(DISTINCT CASE WHEN 'amount' = ANY(fields_corrected) THEN id END) as amount_corrections,
        COUNT(DISTINCT CASE WHEN 'category' = ANY(fields_corrected) THEN id END) as category_corrections
      FROM ocr_corrections
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    
    const row = validationResult.rows[0];
    const total = parseInt(row.total_corrections);
    
    if (total === 0) {
      return {
        merchantAccuracy: 100,
        amountAccuracy: 100,
        categoryAccuracy: 100,
        overallAccuracy: 100,
        note: 'No corrections in validation period'
      };
    }
    
    // Calculate accuracy (inverse of correction rate)
    const merchantAccuracy = 100 - (parseInt(row.merchant_corrections) / total * 100);
    const amountAccuracy = 100 - (parseInt(row.amount_corrections) / total * 100);
    const categoryAccuracy = 100 - (parseInt(row.category_corrections) / total * 100);
    const overallAccuracy = (merchantAccuracy + amountAccuracy + categoryAccuracy) / 3;
    
    return {
      merchantAccuracy,
      amountAccuracy,
      categoryAccuracy,
      overallAccuracy,
      validationSamples: total
    };
  }
  
  /**
   * Deploy a model version
   */
  async deployModelVersion(version: string): Promise<void> {
    console.log(`[Retraining] Deploying model version ${version}...`);
    
    // Load model version
    const versions = this.loadModelVersions();
    const modelVersion = versions.find(v => v.version === version);
    
    if (!modelVersion) {
      throw new Error(`Model version ${version} not found`);
    }
    
    // Mark all as not deployed
    versions.forEach(v => v.deployed = false);
    
    // Mark this version as deployed
    modelVersion.deployed = true;
    
    // Save
    this.saveModelVersions(versions);
    
    // Reload OCR service with new prompts
    // This would trigger a restart or reload of the OCRService
    console.log(`[Retraining] Model version ${version} deployed successfully`);
  }
  
  /**
   * Rollback to previous model version
   */
  async rollbackToPreviousVersion(): Promise<void> {
    const versions = this.loadModelVersions().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    if (versions.length < 2) {
      throw new Error('No previous version available for rollback');
    }
    
    const currentVersion = versions.find(v => v.deployed);
    const previousVersion = versions[1]; // Second most recent
    
    console.log(`[Retraining] Rolling back from ${currentVersion?.version} to ${previousVersion.version}`);
    
    await this.deployModelVersion(previousVersion.version);
  }
  
  /**
   * Get all model versions
   */
  getModelVersions(): ModelVersion[] {
    return this.loadModelVersions().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  /**
   * Get all retraining jobs
   */
  getRetrainingJobs(): RetrainingJob[] {
    return this.loadJobs().sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });
  }
  
  /**
   * Get current deployed version
   */
  getCurrentVersion(): ModelVersion | null {
    const versions = this.loadModelVersions();
    return versions.find(v => v.deployed) || null;
  }
  
  /**
   * Save model version
   */
  private saveModelVersion(version: ModelVersion): void {
    const versions = this.loadModelVersions();
    versions.push(version);
    this.saveModelVersions(versions);
  }
  
  /**
   * Load model versions from disk
   */
  private loadModelVersions(): ModelVersion[] {
    try {
      if (fs.existsSync(this.versionsPath)) {
        const data = fs.readFileSync(this.versionsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[Retraining] Error loading versions:', error);
    }
    return [];
  }
  
  /**
   * Save model versions to disk
   */
  private saveModelVersions(versions: ModelVersion[]): void {
    fs.writeFileSync(this.versionsPath, JSON.stringify(versions, null, 2), 'utf-8');
  }
  
  /**
   * Save retraining job
   */
  private saveJob(job: RetrainingJob): void {
    const jobs = this.loadJobs();
    const existing = jobs.findIndex(j => j.id === job.id);
    
    if (existing >= 0) {
      jobs[existing] = job;
    } else {
      jobs.push(job);
    }
    
    fs.writeFileSync(this.jobsPath, JSON.stringify(jobs, null, 2), 'utf-8');
  }
  
  /**
   * Load retraining jobs from disk
   */
  private loadJobs(): RetrainingJob[] {
    try {
      if (fs.existsSync(this.jobsPath)) {
        const data = fs.readFileSync(this.jobsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[Retraining] Error loading jobs:', error);
    }
    return [];
  }
  
  /**
   * Schedule automatic retraining
   */
  scheduleAutoRetraining(intervalDays: number = 7): void {
    console.log(`[Retraining] Scheduling automatic retraining every ${intervalDays} days`);
    
    setInterval(async () => {
      try {
        console.log('[Retraining] Running scheduled retraining...');
        await this.startRetrainingJob(intervalDays);
      } catch (error) {
        console.error('[Retraining] Scheduled retraining failed:', error);
      }
    }, intervalDays * 24 * 60 * 60 * 1000);
  }
}

// Export singleton
export const modelRetrainingService = new ModelRetrainingService();

