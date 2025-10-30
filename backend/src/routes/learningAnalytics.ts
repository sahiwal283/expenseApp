/**
 * Continuous Learning Analytics API
 * 
 * Endpoints for monitoring OCR accuracy, user corrections, and model performance.
 * Used to drive continuous improvement of Ollama LLM inference.
 */

import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { query } from '../config/database';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/learning/stats
 * 
 * Get overall correction statistics
 * Access: Admin, Developer only
 */
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  // Total corrections by field
  const fieldStats = await query(`
    SELECT 
      unnest(fields_corrected) as field,
      COUNT(*) as correction_count,
      AVG(ocr_confidence) as avg_ocr_confidence_when_corrected
    FROM ocr_corrections
    GROUP BY field
    ORDER BY correction_count DESC
  `);
  
  // Total corrections
  const totalResult = await query('SELECT COUNT(*) as total FROM ocr_corrections');
  const totalCorrections = parseInt(totalResult.rows[0].total);
  
  // Corrections over time (last 30 days)
  const timeSeriesResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as corrections
    FROM ocr_corrections
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  
  // Most active correctors
  const topCorrectorsResult = await query(`
    SELECT 
      u.name,
      u.username,
      COUNT(*) as corrections
    FROM ocr_corrections oc
    JOIN users u ON oc.user_id = u.id
    GROUP BY u.id, u.name, u.username
    ORDER BY corrections DESC
    LIMIT 10
  `);
  
  res.json({
    success: true,
    stats: {
      totalCorrections,
      byField: fieldStats.rows.map(row => ({
        field: row.field,
        correctionCount: parseInt(row.correction_count),
        avgOcrConfidence: parseFloat(row.avg_ocr_confidence_when_corrected || 0)
      })),
      timeSeries: timeSeriesResult.rows,
      topCorrectors: topCorrectorsResult.rows
    }
  });
}));

/**
 * GET /api/learning/patterns
 * 
 * Identify common correction patterns for prompt refinement
 * Access: Developer only
 */
router.get('/patterns', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  // Find common merchant corrections (misreads)
  const merchantPatternsResult = await query(`
    SELECT 
      original_inference->>'merchant'->'value' as original_merchant,
      corrected_merchant,
      COUNT(*) as frequency
    FROM ocr_corrections
    WHERE corrected_merchant IS NOT NULL
      AND 'merchant' = ANY(fields_corrected)
    GROUP BY original_merchant, corrected_merchant
    HAVING COUNT(*) >= 2
    ORDER BY frequency DESC
    LIMIT 50
  `);
  
  // Find category misclassifications
  const categoryPatternsResult = await query(`
    SELECT 
      original_inference->>'category'->'value' as original_category,
      corrected_category,
      COUNT(*) as frequency
    FROM ocr_corrections
    WHERE corrected_category IS NOT NULL
      AND 'category' = ANY(fields_corrected)
    GROUP BY original_category, corrected_category
    HAVING COUNT(*) >= 2
    ORDER BY frequency DESC
    LIMIT 50
  `);
  
  // Find amount extraction errors
  const amountPatternsResult = await query(`
    SELECT 
      original_inference->>'amount'->'value' as original_amount,
      corrected_amount,
      ABS(
        CAST(corrected_amount AS DECIMAL) - 
        CAST(original_inference->>'amount'->'value' AS DECIMAL)
      ) as difference,
      COUNT(*) as frequency
    FROM ocr_corrections
    WHERE corrected_amount IS NOT NULL
      AND 'amount' = ANY(fields_corrected)
    GROUP BY original_amount, corrected_amount
    HAVING COUNT(*) >= 2
    ORDER BY frequency DESC
    LIMIT 50
  `);
  
  res.json({
    success: true,
    patterns: {
      merchants: merchantPatternsResult.rows,
      categories: categoryPatternsResult.rows,
      amounts: amountPatternsResult.rows
    },
    insights: {
      merchantMisreads: merchantPatternsResult.rows.length,
      categoryMisclassifications: categoryPatternsResult.rows.length,
      amountErrors: amountPatternsResult.rows.length
    }
  });
}));

/**
 * GET /api/learning/training-data
 * 
 * Export corrections as training data for model fine-tuning
 * Access: Developer only
 */
router.get('/training-data', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  const { since, limit = '1000', format = 'jsonl' } = req.query;
  
  let sql = `
    SELECT 
      ocr_text,
      original_inference,
      corrected_merchant,
      corrected_amount,
      corrected_date,
      corrected_card_last_four,
      corrected_category,
      fields_corrected,
      created_at
    FROM ocr_corrections
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (since) {
    params.push(since);
    sql += ` AND created_at >= $${params.length}`;
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit as string, 10)}`;
  
  const result = await query(sql, params);
  
  // Format as training examples
  const trainingExamples = result.rows.map(row => ({
    input: {
      text: row.ocr_text,
      originalInference: row.original_inference
    },
    output: {
      merchant: row.corrected_merchant,
      amount: row.corrected_amount,
      date: row.corrected_date,
      cardLastFour: row.corrected_card_last_four,
      category: row.corrected_category
    },
    metadata: {
      fieldsCorrected: row.fields_corrected,
      timestamp: row.created_at
    }
  }));
  
  if (format === 'jsonl') {
    // JSONL format for LLM training
    const jsonl = trainingExamples.map(ex => JSON.stringify(ex)).join('\n');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="training-data-${Date.now()}.jsonl"`);
    res.send(jsonl);
  } else {
    // Standard JSON
    res.json({
      success: true,
      count: trainingExamples.length,
      examples: trainingExamples
    });
  }
}));

/**
 * GET /api/learning/accuracy-metrics
 * 
 * Calculate accuracy metrics over time
 * Access: Admin, Developer
 */
router.get('/accuracy-metrics', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  const { days = '30' } = req.query;
  const daysInt = parseInt(days as string, 10);
  
  // Calculate correction rate by week
  const accuracyTrendResult = await query(`
    SELECT 
      DATE_TRUNC('week', created_at) as week,
      COUNT(*) as total_corrections,
      COUNT(DISTINCT expense_id) as unique_expenses,
      ARRAY_AGG(DISTINCT unnest(fields_corrected)) as fields_corrected_list
    FROM ocr_corrections
    WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
    GROUP BY week
    ORDER BY week DESC
  `);
  
  // Field-specific accuracy (inverse of correction rate)
  const fieldAccuracyResult = await query(`
    SELECT 
      unnest(fields_corrected) as field,
      COUNT(*) as corrections,
      AVG(ocr_confidence) as avg_confidence
    FROM ocr_corrections
    WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
    GROUP BY field
    ORDER BY corrections DESC
  `);
  
  res.json({
    success: true,
    metrics: {
      accuracyTrend: accuracyTrendResult.rows,
      fieldAccuracy: fieldAccuracyResult.rows.map(row => ({
        field: row.field,
        corrections: parseInt(row.corrections),
        avgConfidence: parseFloat(row.avg_confidence),
        // Note: Lower corrections = higher accuracy
        estimatedAccuracy: Math.max(0, 100 - (parseInt(row.corrections) / daysInt * 10))
      }))
    }
  });
}));

/**
 * POST /api/learning/feedback
 * 
 * Submit feedback on model performance (for A/B testing)
 * Access: All authenticated users
 */
router.post('/feedback', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const { correctionId, helpful, notes } = req.body;
  
  // Store feedback in separate table (TODO: create table)
  // For now, just acknowledge
  
  console.log(`[Learning] User ${userId} feedback on correction ${correctionId}: helpful=${helpful}`);
  
  res.json({
    success: true,
    message: 'Feedback recorded'
  });
}));

export default router;

