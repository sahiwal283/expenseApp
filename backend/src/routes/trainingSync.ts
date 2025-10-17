/**
 * Training Data Sync API Routes
 * 
 * Endpoints for cross-environment correction sync and training dataset management
 */

import { Router } from 'express';
import { crossEnvironmentSyncService } from '../services/ocr/CrossEnvironmentSyncService';
import { authorize } from '../middleware/auth';

const router = Router();

// All routes require admin or developer role
const adminOnly = authorize(['admin', 'developer']);

/**
 * POST /api/training/sync/export
 * Export corrections to training dataset
 */
router.post('/export', adminOnly, async (req, res) => {
  try {
    const { minQualityScore, includeSandbox, includeProduction, limit } = req.body;

    const result = await crossEnvironmentSyncService.exportToTrainingDataset({
      minQualityScore,
      includeSandbox,
      includeProduction,
      limit
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[Training Sync] Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/training/sync/report
 * Get sync status and statistics
 */
router.get('/report', adminOnly, async (req, res) => {
  try {
    const report = await crossEnvironmentSyncService.getSyncReport();

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('[Training Sync] Report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/training/sync/dataset/:datasetId
 * Get corrections for a specific dataset
 */
router.get('/dataset/:datasetId', adminOnly, async (req, res) => {
  try {
    const { datasetId } = req.params;
    const corrections = await crossEnvironmentSyncService.getDatasetCorrections(datasetId);

    res.json({
      success: true,
      datasetId,
      corrections,
      count: corrections.length
    });
  } catch (error: any) {
    console.error('[Training Sync] Dataset fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/training/sync/mark-used/:datasetId
 * Mark dataset as used in training
 */
router.post('/mark-used/:datasetId', adminOnly, async (req, res) => {
  try {
    const { datasetId } = req.params;
    const count = await crossEnvironmentSyncService.markDatasetUsed(datasetId);

    res.json({
      success: true,
      datasetId,
      markedCount: count
    });
  } catch (error: any) {
    console.error('[Training Sync] Mark used error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/training/sync/anonymize
 * Anonymize corrections for privacy
 */
router.post('/anonymize', adminOnly, async (req, res) => {
  try {
    const { correctionIds } = req.body;

    if (!Array.isArray(correctionIds)) {
      return res.status(400).json({
        success: false,
        error: 'correctionIds must be an array'
      });
    }

    await crossEnvironmentSyncService.anonymizeCorrections(correctionIds);

    res.json({
      success: true,
      anonymizedCount: correctionIds.length
    });
  } catch (error: any) {
    console.error('[Training Sync] Anonymize error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

