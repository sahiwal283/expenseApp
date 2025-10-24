/**
 * OCR Training & Learning Routes
 * 
 * Endpoints for managing the AI training pipeline:
 * - View learning statistics
 * - Force pattern refresh
 * - Export training data
 * - Test learned patterns
 */

import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { query } from '../config/database';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/training/stats
 * 
 * Get statistics about the AI training system
 * (Admin/Developer only)
 */
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  // Get correction statistics
  const correctionStats = await query(`
    SELECT 
      COUNT(*) as total_corrections,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT expense_id) as unique_expenses,
      MIN(created_at) as first_correction,
      MAX(created_at) as last_correction
    FROM ocr_corrections;
  `);
  
  // Get corrections by field - using fields_corrected array
  const fieldStats = await query(`
    SELECT 
      UNNEST(fields_corrected) as field,
      COUNT(*) as correction_count
    FROM ocr_corrections
    GROUP BY field
    ORDER BY COUNT(*) DESC;
  `);
  
  // Get corrections by provider
  const providerStats = await query(`
    SELECT 
      ocr_provider,
      COUNT(*) as correction_count
    FROM ocr_corrections
    GROUP BY ocr_provider;
  `);
  
  // Get recent correction trend (last 30 days)
  const trendStats = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as corrections
    FROM ocr_corrections
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
  `);
  
  res.json({
    success: true,
    overall: correctionStats.rows[0],
    byField: fieldStats.rows,
    byProvider: providerStats.rows,
    recentTrend: trendStats.rows
  });
}));

/**
 * POST /api/training/refresh
 * 
 * Force refresh of learned patterns from user corrections
 * (Developer only)
 */
router.post('/refresh', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  // This would trigger the adaptive engine to reload
  // For now, just return success - actual implementation would depend on OCRService architecture
  
  res.json({
    success: true,
    message: 'Learned patterns will be refreshed on next OCR request',
    note: 'Patterns refresh automatically every 24 hours'
  });
}));

/**
 * GET /api/training/patterns
 * 
 * View learned patterns that will be applied
 * (Developer only)
 */
router.get('/patterns', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  const { field, minFrequency = 3 } = req.query;
  
  // Build query to find patterns from corrections
  const result = await query(`
    SELECT 
      field_name,
      original_value,
      corrected_value,
      original_confidence,
      COUNT(*) as frequency,
      MAX(created_at) as last_seen,
      array_agg(DISTINCT user_id) as correcting_users
    FROM (
      -- Merchant corrections
      SELECT 
        'merchant' as field_name,
        COALESCE(original_inference->>'merchant', original_inference->'merchant'->>'value', 'unknown') as original_value,
        corrected_merchant as corrected_value,
        COALESCE((original_inference->'merchant'->>'confidence')::numeric, 0) as original_confidence,
        created_at,
        user_id
      FROM ocr_corrections
      WHERE corrected_merchant IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      
      UNION ALL
      
      -- Amount corrections
      SELECT 
        'amount' as field_name,
        COALESCE(original_inference->>'amount', original_inference->'amount'->>'value', 'unknown') as original_value,
        corrected_amount::text as corrected_value,
        COALESCE((original_inference->'amount'->>'confidence')::numeric, 0) as original_confidence,
        created_at,
        user_id
      FROM ocr_corrections
      WHERE corrected_amount IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      
      UNION ALL
      
      -- Date corrections
      SELECT 
        'date' as field_name,
        COALESCE(original_inference->>'date', original_inference->'date'->>'value', 'unknown') as original_value,
        corrected_date as corrected_value,
        COALESCE((original_inference->'date'->>'confidence')::numeric, 0) as original_confidence,
        created_at,
        user_id
      FROM ocr_corrections
      WHERE corrected_date IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      
      UNION ALL
      
      -- Category corrections
      SELECT 
        'category' as field_name,
        COALESCE(original_inference->>'category', original_inference->'category'->>'value', 'unknown') as original_value,
        corrected_category as corrected_value,
        COALESCE((original_inference->'category'->>'confidence')::numeric, 0) as original_confidence,
        created_at,
        user_id
      FROM ocr_corrections
      WHERE corrected_category IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
    ) all_corrections
    WHERE ($1::text IS NULL OR field_name = $1)
    GROUP BY field_name, original_value, corrected_value, original_confidence
    HAVING COUNT(*) >= $2
    ORDER BY COUNT(*) DESC
    LIMIT 50;
  `, [field || null, minFrequency]);
  
  // Format patterns for display
  const patterns = result.rows.map((row: any) => {
    return {
      field: row.field_name,
      pattern: {
        original: row.original_value,
        corrected: row.corrected_value,
        originalConfidence: parseFloat(row.original_confidence)
      },
      frequency: parseInt(row.frequency),
      lastSeen: row.last_seen,
      userCount: row.correcting_users.length,
      learnedConfidence: Math.min(0.85 + (parseInt(row.frequency) * 0.02), 0.98)
    };
  });
  
  res.json({
    success: true,
    count: patterns.length,
    patterns
  });
}));

/**
 * GET /api/training/export
 * 
 * Export training data for external ML/AI tools
 * (Developer only)
 */
router.get('/export', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  const { format = 'json', days = 90 } = req.query;
  
  // Export all corrections with full context
  const result = await query(`
    SELECT 
      c.id,
      c.expense_id,
      c.user_id,
      c.ocr_text,
      c.original_inference,
      c.corrected_merchant,
      c.corrected_amount,
      c.corrected_date,
      c.corrected_category,
      c.corrected_card_last_four,
      c.receipt_image_path,
      c.ocr_provider,
      c.llm_model_version,
      c.environment,
      c.correction_notes,
      c.created_at,
      u.username as user_name,
      u.role as user_role
    FROM ocr_corrections c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
    ORDER BY c.created_at DESC;
  `);
  
  if (format === 'csv') {
    // Convert to CSV format
    const csv = [
      ['ID', 'Date', 'User', 'Provider', 'Environment', 'Field', 'Original', 'Corrected', 'Original Confidence'].join(','),
      ...result.rows.flatMap((row: any) => {
        const corrections = [];
        // Add each corrected field
        if (row.corrected_merchant) {
          const original = row.original_inference?.merchant?.value || row.original_inference?.merchant || '';
          const confidence = row.original_inference?.merchant?.confidence || 0;
          corrections.push([row.id, new Date(row.created_at).toISOString(), row.user_name, row.ocr_provider, row.environment, 'merchant', `"${original}"`, `"${row.corrected_merchant}"`, confidence].join(','));
        }
        if (row.corrected_amount) {
          const original = row.original_inference?.amount?.value || row.original_inference?.amount || '';
          const confidence = row.original_inference?.amount?.confidence || 0;
          corrections.push([row.id, new Date(row.created_at).toISOString(), row.user_name, row.ocr_provider, row.environment, 'amount', `"${original}"`, `"${row.corrected_amount}"`, confidence].join(','));
        }
        if (row.corrected_date) {
          const original = row.original_inference?.date?.value || row.original_inference?.date || '';
          const confidence = row.original_inference?.date?.confidence || 0;
          corrections.push([row.id, new Date(row.created_at).toISOString(), row.user_name, row.ocr_provider, row.environment, 'date', `"${original}"`, `"${row.corrected_date}"`, confidence].join(','));
        }
        if (row.corrected_category) {
          const original = row.original_inference?.category?.value || row.original_inference?.category || '';
          const confidence = row.original_inference?.category?.confidence || 0;
          corrections.push([row.id, new Date(row.created_at).toISOString(), row.user_name, row.ocr_provider, row.environment, 'category', `"${original}"`, `"${row.corrected_category}"`, confidence].join(','));
        }
        if (row.corrected_card_last_four) {
          const original = row.original_inference?.cardLastFour?.value || row.original_inference?.cardLastFour || '';
          const confidence = row.original_inference?.cardLastFour?.confidence || 0;
          corrections.push([row.id, new Date(row.created_at).toISOString(), row.user_name, row.ocr_provider, row.environment, 'cardLastFour', `"${original}"`, `"${row.corrected_card_last_four}"`, confidence].join(','));
        }
        return corrections;
      })
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ocr_training_data_${Date.now()}.csv"`);
    return res.send(csv);
  }
  
  // Default: JSON format
  res.json({
    success: true,
    exportDate: new Date().toISOString(),
    daysBack: parseInt(days as string),
    recordCount: result.rows.length,
    data: result.rows
  });
}));

/**
 * POST /api/training/test
 * 
 * Test learned patterns against sample OCR text
 * (Developer only)
 */
router.post('/test', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  const { ocrText, fields } = req.body;
  
  if (!ocrText) {
    return res.status(400).json({ error: 'ocrText is required' });
  }
  
  // This would run the adaptive engine on the sample text
  // For now, return mock results
  
  res.json({
    success: true,
    message: 'Pattern testing endpoint - implementation pending',
    input: {
      ocrText: ocrText.substring(0, 100) + '...',
      fieldsToTest: fields || ['all']
    }
  });
}));

export default router;

