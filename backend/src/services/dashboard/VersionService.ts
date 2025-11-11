/**
 * Version Service
 * Handles version information for frontend, backend, and database
 */

import { pool } from '../../config/database';
import backendPkg from '../../../package.json';
import { FRONTEND_VERSION } from '../../config/version';

export class VersionService {
  /**
   * Get version information for all system components
   */
  static async getVersionInfo() {
    const backendVersion = backendPkg.version;
    const frontendVersion = FRONTEND_VERSION;
    
    // Get database info
    const dbResult = await pool.query('SELECT version()');
    const dbVersion = dbResult.rows[0].version;
    
    // Get database uptime
    const uptimeResult = await pool.query(`
      SELECT EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) as uptime
    `);
    const dbUptime = Math.floor(uptimeResult.rows[0].uptime);
    
    // Get process uptime (backend server uptime)
    const processUptime = Math.floor(process.uptime());
    
    return {
      frontend: {
        version: frontendVersion
      },
      backend: {
        version: backendVersion,
        nodeVersion: process.version
      },
      database: dbVersion.match(/\d+\.\d+/)?.[0] || 'PostgreSQL',
      uptime: processUptime,
      dbUptime: dbUptime,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

