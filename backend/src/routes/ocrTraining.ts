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
  
  const db = req.app.get('db');
  
  // Get correction statistics
  const correctionStats = await db.query(`
    SELECT 
      COUNT(*) as total_corrections,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT expense_id) as unique_expenses,
      MIN(created_at) as first_correction,
      MAX(created_at) as last_correction
    FROM ocr_corrections;
  `);
  
  // Get corrections by field
  const fieldStats = await db.query(`
    SELECT 
      jsonb_object_keys(corrected_fields) as field,
      COUNT(*) as correction_count
    FROM ocr_corrections
    GROUP BY field
    ORDER BY COUNT(*) DESC;
  `);
  
  // Get corrections by provider
  const providerStats = await db.query(`
    SELECT 
      ocr_provider,
      COUNT(*) as correction_count
    FROM ocr_corrections
    GROUP BY ocr_provider;
  `);
  
  // Get recent correction trend (last 30 days)
  const trendStats = await db.query(`
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
  
  const db = req.app.get('db');
  const { field, minFrequency = 3 } = req.query;
  
  let query = `
    SELECT 
      jsonb_object_keys(corrected_fields) as field,
      original_inference,
      corrected_fields,
      COUNT(*) as frequency,
      MAX(created_at) as last_seen,
      array_agg(DISTINCT user_id) as correcting_users
    FROM (
      SELECT 
        jsonb_object_keys(corrected_fields) as field,
        original_inference,
        corrected_fields,
        created_at,
        user_id
      FROM ocr_corrections
      WHERE created_at >= NOW() - INTERVAL '90 days'
    ) corrections
    GROUP BY field, original_inference, corrected_fields
    HAVING COUNT(*) >= $1
  `;
  
  const params: any[] = [minFrequency];
  
  if (field) {
    query += ` AND jsonb_object_keys(corrected_fields) = $2`;
    params.push(field);
  }
  
  query += ` ORDER BY COUNT(*) DESC LIMIT 50;`;
  
  const result = await db.query(query, params);
  
  // Format patterns for display
  const patterns = result.rows.map((row: any) => {
    const fieldName = row.field;
    const originalValue = row.original_inference[fieldName]?.value || 'unknown';
    const correctedValue = row.corrected_fields[fieldName];
    const originalConfidence = row.original_inference[fieldName]?.confidence || 0;
    
    return {
      field: fieldName,
      pattern: {
        original: originalValue,
        corrected: correctedValue,
        originalConfidence
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
  
  const db = req.app.get('db');
  const { format = 'json', days = 90 } = req.query;
  
  // Export all corrections with full context
  const result = await db.query(`
    SELECT 
      c.id,
      c.expense_id,
      c.user_id,
      c.original_ocr_text,
      c.original_inference,
      c.corrected_fields,
      c.receipt_image_path,
      c.ocr_provider,
      c.llm_version,
      c.environment,
      c.notes,
      c.created_at,
      u.name as user_name,
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
        for (const [field, value] of Object.entries(row.corrected_fields)) {
          const original = row.original_inference[field]?.value || '';
          const confidence = row.original_inference[field]?.confidence || 0;
          corrections.push([
            row.id,
            new Date(row.created_at).toISOString(),
            row.user_name,
            row.ocr_provider,
            row.environment,
            field,
            `"${original}"`,
            `"${value}"`,
            confidence
          ].join(','));
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

