/**
 * OCR Metrics Service
 * Handles OCR service metrics and analytics
 */

import { pool } from '../../config/database';
import axios from 'axios';

export class OCRMetricsService {
  /**
   * Get OCR service metrics
   */
  static async getOCRMetrics() {
    const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://192.168.1.195:8000';

    try {
      // Get OCR usage from api_requests table
      const usageResult = await pool.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as receipts_today,
          COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as receipts_week,
          COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as receipts_month,
          AVG(response_time_ms) as avg_processing_time
        FROM api_requests
        WHERE endpoint LIKE '%/ocr/v2/process%'
          OR endpoint LIKE '%/ocr/v2/%'
      `);

      const usage = usageResult.rows[0];

      // Check OCR service health
      let serviceStatus = 'unknown';
      let providers: string[] = [];
      
      try {
        const [healthCheck, providersCheck] = await Promise.all([
          axios.get(`${OCR_SERVICE_URL}/health/ready`, { timeout: 5000 }),
          axios.get(`${OCR_SERVICE_URL}/ocr/providers`, { timeout: 5000 })
        ]);
        
        serviceStatus = healthCheck.status === 200 ? 'healthy' : 'degraded';
        providers = providersCheck.data.providers || [];
      } catch (error) {
        console.error('[OCR Metrics] Failed to check OCR service:', error);
        serviceStatus = 'offline';
      }

      // Estimate cost (rough calculation)
      const totalRequests = parseInt(usage.total_requests) || 0;
      const estimatedCost = totalRequests * 0.002; // $0.002 per request (example rate)

      return {
        usage: {
          total: totalRequests,
          today: parseInt(usage.receipts_today) || 0,
          week: parseInt(usage.receipts_week) || 0,
          month: parseInt(usage.receipts_month) || 0,
          avgProcessingTime: parseFloat(usage.avg_processing_time) || 0
        },
        service: {
          status: serviceStatus,
          url: OCR_SERVICE_URL,
          providers: providers.length > 0 ? providers : ['google', 'tesseract']
        },
        cost: {
          estimated: estimatedCost.toFixed(2),
          currency: 'USD',
          period: 'all-time'
        }
      };
    } catch (error) {
      console.error('[OCR Metrics] Error:', error);
      return {
        usage: {
          total: 0,
          today: 0,
          week: 0,
          month: 0,
          avgProcessingTime: 0
        },
        service: {
          status: 'unknown',
          url: OCR_SERVICE_URL,
          providers: []
        },
        cost: {
          estimated: '0.00',
          currency: 'USD',
          period: 'all-time'
        }
      };
    }
  }
}

