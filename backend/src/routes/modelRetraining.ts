/**
 * Model Retraining API
 * 
 * Endpoints for managing continuous learning pipeline.
 * Developer-only access for model versioning, retraining, and rollback.
 */

import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { modelRetrainingService } from '../services/ocr/ModelRetrainingService';

const router = Router();

router.use(authenticateToken);

// Require developer role for all endpoints
router.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
});

/**
 * GET /api/retraining/versions
 * 
 * Get all model versions
 */
router.get('/versions', asyncHandler(async (req: AuthRequest, res) => {
  const versions = modelRetrainingService.getModelVersions();
  const current = modelRetrainingService.getCurrentVersion();
  
  res.json({
    success: true,
    currentVersion: current,
    versions
  });
}));

/**
 * POST /api/retraining/start
 * 
 * Start a new retraining job
 */
router.post('/start', asyncHandler(async (req: AuthRequest, res) => {
  const { sinceDays = 30 } = req.body;
  
  console.log(`[API] Starting retraining job (corrections since ${sinceDays} days)`);
  
  const job = await modelRetrainingService.startRetrainingJob(sinceDays);
  
  res.json({
    success: true,
    job,
    message: `Retraining job ${job.id} started. This may take several minutes.`
  });
}));

/**
 * GET /api/retraining/jobs
 * 
 * Get all retraining jobs
 */
router.get('/jobs', asyncHandler(async (req: AuthRequest, res) => {
  const jobs = modelRetrainingService.getRetrainingJobs();
  
  res.json({
    success: true,
    jobs
  });
}));

/**
 * GET /api/retraining/jobs/:id
 * 
 * Get specific retraining job status
 */
router.get('/jobs/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const jobs = modelRetrainingService.getRetrainingJobs();
  const job = jobs.find(j => j.id === id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    success: true,
    job
  });
}));

/**
 * POST /api/retraining/deploy/:version
 * 
 * Deploy a specific model version
 */
router.post('/deploy/:version', asyncHandler(async (req: AuthRequest, res) => {
  const { version } = req.params;
  
  console.log(`[API] Deploying model version ${version}`);
  
  await modelRetrainingService.deployModelVersion(version);
  
  res.json({
    success: true,
    message: `Model version ${version} deployed successfully`,
    version
  });
}));

/**
 * POST /api/retraining/rollback
 * 
 * Rollback to previous model version
 */
router.post('/rollback', asyncHandler(async (req: AuthRequest, res) => {
  console.log('[API] Rolling back to previous model version');
  
  await modelRetrainingService.rollbackToPreviousVersion();
  
  const current = modelRetrainingService.getCurrentVersion();
  
  res.json({
    success: true,
    message: 'Rolled back to previous version',
    currentVersion: current
  });
}));

/**
 * GET /api/retraining/status
 * 
 * Get overall retraining system status
 */
router.get('/status', asyncHandler(async (req: AuthRequest, res) => {
  const current = modelRetrainingService.getCurrentVersion();
  const jobs = modelRetrainingService.getRetrainingJobs();
  const recentJobs = jobs.slice(0, 5);
  
  const runningJobs = jobs.filter(j => j.status === 'running');
  const failedJobs = jobs.filter(j => j.status === 'failed');
  
  res.json({
    success: true,
    status: {
      currentVersion: current,
      recentJobs,
      stats: {
        totalJobs: jobs.length,
        runningJobs: runningJobs.length,
        failedJobs: failedJobs.length
      }
    }
  });
}));

/**
 * POST /api/retraining/schedule
 * 
 * Configure automatic retraining schedule
 */
router.post('/schedule', asyncHandler(async (req: AuthRequest, res) => {
  const { intervalDays = 7 } = req.body;
  
  console.log(`[API] Configuring automatic retraining every ${intervalDays} days`);
  
  modelRetrainingService.scheduleAutoRetraining(intervalDays);
  
  res.json({
    success: true,
    message: `Automatic retraining scheduled every ${intervalDays} days`
  });
}));

export default router;

