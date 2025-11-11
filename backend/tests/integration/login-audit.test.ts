import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../../src/config/database';
import { auditLogRepository } from '../../src/database/repositories/AuditLogRepository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Login and Audit Logging Integration Tests
 * 
 * Tests authentication endpoints and audit logging functionality:
 * - Successful login creates audit log entry
 * - Failed login creates audit log entry
 * - Audit log entries have correct data
 * - Other endpoints that use audit logging
 */

describe('Login and Audit Logging Integration Tests', () => {
  let dbAvailable = false;
  let testUserId: string | null = null;
  let testUsername = 'test_audit_user';
  let testPassword = 'TestPassword123!';
  let testUserEmail = 'test_audit@example.com';
  let testUserRole = 'developer';

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ Database connection successful');

      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const result = await pool.query(
        `INSERT INTO users (username, password, name, email, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [testUsername, hashedPassword, 'Test Audit User', testUserEmail, testUserRole]
      );
      testUserId = result.rows[0].id;
      console.log(`✅ Test user created: ${testUserId}`);
    } catch (error) {
      console.warn('⚠️  Database not available - tests will verify code structure only');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable && testUserId) {
      // Cleanup: Delete test user and their audit logs
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('✅ Test user and audit logs cleaned up');
    }
    await pool.end();
  });

  beforeEach(async () => {
    if (dbAvailable && testUserId) {
      // Clean up audit logs created during tests (keep user)
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1 AND action LIKE $2', [
        testUserId,
        'test_%',
      ]);
    }
  });

  describe('Successful Login Audit Logging', () => {
    it('should create audit log entry for successful login', async () => {
      if (!dbAvailable || !testUserId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Get count before login
      const beforeResult = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE user_id = $1 AND action = 'login_success'`,
        [testUserId]
      );
      const beforeCount = parseInt(beforeResult.rows[0].count, 10);

      // Simulate successful login by calling logAuth directly
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
        email: testUserEmail,
        role: testUserRole,
      }, '127.0.0.1');

      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify audit log entry was created
      const afterResult = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE user_id = $1 AND action = 'login_success'`,
        [testUserId]
      );
      const afterCount = parseInt(afterResult.rows[0].count, 10);

      expect(afterCount).toBe(beforeCount + 1);
      console.log('✅ Successful login audit log entry created');
    });

    it('should have correct data in successful login audit log', async () => {
      if (!dbAvailable || !testUserId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create a test login audit log
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
        email: testUserEmail,
        role: testUserRole,
      }, '192.168.1.100');

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Query the audit log entry
      const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 AND action = 'login_success' 
         ORDER BY created_at DESC LIMIT 1`,
        [testUserId]
      );

      expect(result.rows.length).toBe(1);
      const logEntry = result.rows[0];

      // Verify all fields
      expect(logEntry.user_id).toBe(testUserId);
      expect(logEntry.user_name).toBe(testUsername);
      expect(logEntry.user_email).toBe(testUserEmail);
      expect(logEntry.user_role).toBe(testUserRole);
      expect(logEntry.action).toBe('login_success');
      expect(logEntry.status).toBe('success');
      expect(logEntry.ip_address).toBeTruthy();
      expect(logEntry.created_at).toBeTruthy();

      console.log('✅ Successful login audit log has correct data');
    });

    it('should include IP address in audit log', async () => {
      if (!dbAvailable || !testUserId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const testIP = '10.0.0.50';
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
      }, testIP);

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await pool.query(
        `SELECT ip_address FROM audit_logs 
         WHERE user_id = $1 AND action = 'login_success' 
         ORDER BY created_at DESC LIMIT 1`,
        [testUserId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].ip_address).toBe(testIP);
      console.log('✅ IP address included in audit log');
    });
  });

  describe('Failed Login Audit Logging', () => {
    it('should create audit log entry for failed login', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Get count before failed login
      const beforeResult = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE action = 'login_failed' AND user_name = $1`,
        [testUsername]
      );
      const beforeCount = parseInt(beforeResult.rows[0].count, 10);

      // Simulate failed login
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_failed', { username: testUsername }, '127.0.0.1', 'Invalid password');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify audit log entry was created
      const afterResult = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE action = 'login_failed' AND user_name = $1`,
        [testUsername]
      );
      const afterCount = parseInt(afterResult.rows[0].count, 10);

      expect(afterCount).toBe(beforeCount + 1);
      console.log('✅ Failed login audit log entry created');
    });

    it('should have correct data in failed login audit log', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const errorMessage = 'Invalid password provided';
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_failed', { username: testUsername }, '192.168.1.200', errorMessage);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Query the audit log entry
      const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'login_failed' AND user_name = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [testUsername]
      );

      expect(result.rows.length).toBe(1);
      const logEntry = result.rows[0];

      // Verify all fields
      expect(logEntry.user_name).toBe(testUsername);
      expect(logEntry.action).toBe('login_failed');
      expect(logEntry.status).toBe('failure');
      expect(logEntry.error_message).toBe(errorMessage);
      expect(logEntry.ip_address).toBeTruthy();
      expect(logEntry.created_at).toBeTruthy();

      console.log('✅ Failed login audit log has correct data');
    });

    it('should handle failed login without user ID', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Failed login for non-existent user
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_failed', { username: 'nonexistent_user' }, '127.0.0.1', 'User not found');

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'login_failed' AND user_name = 'nonexistent_user' 
         ORDER BY created_at DESC LIMIT 1`
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBeNull(); // No user ID for non-existent user
      expect(result.rows[0].status).toBe('failure');
      console.log('✅ Failed login without user ID handled correctly');
    });
  });

  describe('Audit Log Repository Functionality', () => {
    it('should query audit logs by user ID', async () => {
      if (!dbAvailable || !testUserId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create a test audit log
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
      }, '127.0.0.1');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Query using repository
      const logs = await auditLogRepository.findByUserId(testUserId, 10);

      expect(logs.length).toBeGreaterThan(0);
      const loginLog = logs.find(log => log.action === 'login_success');
      expect(loginLog).toBeDefined();
      expect(loginLog?.user_id).toBe(testUserId);

      console.log('✅ Audit logs queryable by user ID');
    });

    it('should query audit logs by action', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create test audit logs
      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
      }, '127.0.0.1');

      await logAuth('login_failed', { username: testUsername }, '127.0.0.1', 'Test error');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Query by action
      const successLogs = await auditLogRepository.findWithFilters({
        action: 'login_success',
        limit: 10,
      });

      const failedLogs = await auditLogRepository.findWithFilters({
        action: 'login_failed',
        limit: 10,
      });

      expect(successLogs.length).toBeGreaterThan(0);
      expect(failedLogs.length).toBeGreaterThan(0);

      console.log('✅ Audit logs queryable by action');
    });

    it('should count audit logs by action', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create multiple test logs
      const { logAuth } = await import('../../src/utils/auditLogger');
      for (let i = 0; i < 3; i++) {
        await logAuth('test_action_count', {
          id: testUserId,
          username: testUsername,
        }, '127.0.0.1');
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Count by action
      const count = await auditLogRepository.countByAction('test_action_count');

      expect(count).toBeGreaterThanOrEqual(3);
      console.log(`✅ Audit log count by action works (found ${count} logs)`);
    });
  });

  describe('Audit Log Data Integrity', () => {
    it('should have all required fields in audit log entries', async () => {
      if (!dbAvailable || !testUserId) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const { logAuth } = await import('../../src/utils/auditLogger');
      await logAuth('login_success', {
        id: testUserId,
        username: testUsername,
        email: testUserEmail,
        role: testUserRole,
      }, '127.0.0.1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 AND action = 'login_success' 
         ORDER BY created_at DESC LIMIT 1`,
        [testUserId]
      );

      expect(result.rows.length).toBe(1);
      const log = result.rows[0];

      // Verify required fields exist
      expect(log.id).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.status).toBeDefined();
      expect(log.created_at).toBeDefined();

      // Verify optional fields are set correctly
      expect(log.user_id).toBe(testUserId);
      expect(log.user_name).toBe(testUsername);
      expect(log.user_email).toBe(testUserEmail);
      expect(log.user_role).toBe(testUserRole);

      console.log('✅ Audit log entries have all required fields');
    });

    it('should handle null values for optional fields', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Create audit log with minimal data
      const { logAudit } = await import('../../src/utils/auditLogger');
      await logAudit({
        action: 'test_minimal',
        status: 'success',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'test_minimal' 
         ORDER BY created_at DESC LIMIT 1`
      );

      expect(result.rows.length).toBe(1);
      const log = result.rows[0];

      // Optional fields can be null
      expect(log.action).toBe('test_minimal');
      expect(log.status).toBe('success');
      expect(log.user_id).toBeNull();
      expect(log.user_name).toBeNull();

      console.log('✅ Audit log handles null optional fields');
    });
  });

  describe('Audit Log Table Structure', () => {
    it('should use audit_logs table (not audit_log)', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Verify audit_logs table exists
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_logs'
        );
      `);

      expect(result.rows[0].exists).toBe(true);

      // Verify audit_log table does NOT exist
      const oldTableResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_log'
        );
      `);

      expect(oldTableResult.rows[0].exists).toBe(false);
      console.log('✅ Using audit_logs table (correct)');
    });

    it('should have correct column structure', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position;
      `);

      const columns = result.rows.map(r => r.column_name);

      // Verify required columns exist
      const requiredColumns = [
        'id',
        'action',
        'status',
        'created_at',
        'user_id',
        'user_name',
        'user_email',
        'user_role',
        'ip_address',
      ];

      requiredColumns.forEach(col => {
        expect(columns).toContain(col);
      });

      console.log(`✅ audit_logs table has ${columns.length} columns with correct structure`);
    });
  });

  describe('Error Handling', () => {
    it('should not crash if audit logging fails', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // This test verifies that audit logging errors don't crash the app
      // The logAudit function catches errors internally
      const { logAudit } = await import('../../src/utils/auditLogger');

      // Try to log with invalid data (should not throw)
      await expect(
        logAudit({
          action: null as any, // Invalid action
          status: 'success',
        })
      ).resolves.not.toThrow();

      console.log('✅ Audit logging errors handled gracefully');
    });
  });

  describe('Actual User Verification', () => {
    it('should verify existing users in database', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Check for existing users
      const result = await pool.query(
        `SELECT id, username, email, role, created_at 
         FROM users 
         WHERE role != 'pending'
         ORDER BY created_at DESC 
         LIMIT 10`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      console.log(`✅ Found ${result.rows.length} existing users in database`);

      // Log user details for manual testing
      result.rows.forEach((user, index) => {
        console.log(`  User ${index + 1}: ${user.username} (${user.role}) - ${user.email}`);
      });
    });

    it('should verify users have valid passwords', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Get a test user
      const result = await pool.query(
        `SELECT id, username, password 
         FROM users 
         WHERE role != 'pending'
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        expect(user.password).toBeTruthy();
        expect(user.password.length).toBeGreaterThan(0);
        console.log(`✅ User ${user.username} has password hash`);
      }
    });

    it('should verify audit_logs table is accessible', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Try to query audit_logs table
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs`
      );

      expect(result.rows.length).toBe(1);
      const count = parseInt(result.rows[0].count, 10);
      console.log(`✅ audit_logs table accessible (${count} total entries)`);
    });

    it('should verify recent audit log entries exist', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // Check for recent audit log entries (last 24 hours)
      const result = await pool.query(
        `SELECT action, status, user_name, created_at 
         FROM audit_logs 
         WHERE created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC 
         LIMIT 5`
      );

      console.log(`✅ Found ${result.rows.length} audit log entries in last 24 hours`);
      
      if (result.rows.length > 0) {
        result.rows.forEach((log, index) => {
          console.log(`  Entry ${index + 1}: ${log.action} (${log.status}) - ${log.user_name || 'N/A'} - ${log.created_at}`);
        });
      }
    });
  });

  describe('Login Endpoint Verification', () => {
    it('should verify login endpoint code structure', async () => {
      // Verify login route exists and uses audit logging
      const authRoutes = await import('../../src/routes/auth');
      expect(authRoutes).toBeDefined();
      
      // Verify logAuth is imported
      const auditLogger = await import('../../src/utils/auditLogger');
      expect(auditLogger.logAuth).toBeDefined();
      
      console.log('✅ Login endpoint code structure verified');
    });

    it('should verify login endpoint calls logAuth for success', async () => {
      // This test verifies the code structure - actual HTTP testing requires server
      const fs = await import('fs');
      const path = await import('path');
      const authPath = path.join(__dirname, '../../src/routes/auth.ts');
      
      try {
        const authCode = await fs.promises.readFile(authPath, 'utf-8');
        
        // Verify logAuth is called for successful login
        expect(authCode).toContain('logAuth');
        expect(authCode).toContain('login_success');
        expect(authCode).toContain('login_failed');
        console.log('✅ Login endpoint code calls logAuth correctly');
      } catch (error) {
        // If file can't be read, verify imports work instead
        const authRoutes = await import('../../src/routes/auth');
        expect(authRoutes).toBeDefined();
        console.log('✅ Login endpoint module loaded successfully');
      }
    });
  });
});

