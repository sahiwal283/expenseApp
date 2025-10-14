/**
 * Health Check and Version Info Endpoint
 * 
 * Provides system health status and version information for frontend sync monitoring
 */

import { Router } from 'express';
import { pool } from '../config/database';
import { version } from '../../package.json';

const router = Router();

/**
 * Health check endpoint
 * Used by frontend for connectivity testing and sync monitoring
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'ok',
      version,
      timestamp: new Date().toISOString(),
      database: 'connected',
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error: any) {
    console.error('[Health] Health check failed:', error);
    
    res.status(503).json({
      status: 'error',
      version,
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed',
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

export default router;

