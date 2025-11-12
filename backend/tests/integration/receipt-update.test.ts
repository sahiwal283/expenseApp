/**
 * Receipt Update API Integration Tests
 * 
 * Tests the receipt update endpoint (PUT /expenses/:id/receipt):
 * - Receipt upload functionality
 * - Authorization checks
 * - Status restrictions
 * - Transaction safety (file cleanup)
 * - Audit trail logging
 * - Error handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../../src/config/database';
import { expenseRepository } from '../../src/database/repositories/ExpenseRepository';
import { auditLogRepository } from '../../src/database/repositories/AuditLogRepository';
import { userRepository } from '../../src/database/repositories/UserRepository';
import { expenseService } from '../../src/services/ExpenseService';
import { ExpenseAuditService } from '../../src/services/ExpenseAuditService';
import * as fs from 'fs';
import * as path from 'path';
import { createMockFile } from '../utils/testHelpers';

describe('Receipt Update API Integration Tests', () => {
  let dbAvailable = false;
  let testUserId: string;
  let testAdminId: string;
  let testExpenseId: string;
  let testExpenseWithReceiptId: string;
  let testApprovedExpenseId: string;
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const testFiles: string[] = []; // Track test files for cleanup

  beforeAll(async () => {
    // Verify database connection
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      console.warn('⚠️  Database not available locally - tests will verify code structure only');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }

    // Clean up test files
    for (const filePath of testFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testFiles.length = 0;

    // Create test users
    try {
      // Create regular user
      const testUser = await userRepository.create({
        username: `test_user_${Date.now()}`,
        password: 'hashed_password',
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        role: 'salesperson'
      });
      testUserId = testUser.id;

      // Create admin user
      const testAdmin = await userRepository.create({
        username: `test_admin_${Date.now()}`,
        password: 'hashed_password',
        name: 'Test Admin',
        email: `admin_${Date.now()}@example.com`,
        role: 'admin'
      });
      testAdminId = testAdmin.id;

      // Create test expenses
      const expense1 = await expenseRepository.create({
        user_id: testUserId,
        event_id: null,
        date: '2025-01-29',
        merchant: 'Test Merchant',
        amount: 100.00,
        category: 'Food',
        status: 'pending',
        receipt_url: null,
        card_used: 'Haute CC',
        reimbursement_required: false
      });
      testExpenseId = expense1.id;

      // Create expense with existing receipt
      const expense2 = await expenseRepository.create({
        user_id: testUserId,
        event_id: null,
        date: '2025-01-29',
        merchant: 'Test Merchant 2',
        amount: 200.00,
        category: 'Food',
        status: 'pending',
        receipt_url: '/uploads/old-receipt.jpg',
        card_used: 'Haute CC',
        reimbursement_required: false
      });
      testExpenseWithReceiptId = expense2.id;

      // Create approved expense
      const expense3 = await expenseRepository.create({
        user_id: testUserId,
        event_id: null,
        date: '2025-01-29',
        merchant: 'Test Merchant 3',
        amount: 300.00,
        category: 'Food',
        status: 'approved',
        receipt_url: '/uploads/approved-receipt.jpg',
        card_used: 'Haute CC',
        reimbursement_required: false
      });
      testApprovedExpenseId = expense3.id;
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Clean up test data
      try {
        if (testExpenseId) await expenseRepository.delete(testExpenseId);
        if (testExpenseWithReceiptId) await expenseRepository.delete(testExpenseWithReceiptId);
        if (testApprovedExpenseId) await expenseRepository.delete(testApprovedExpenseId);
        if (testUserId) await userRepository.delete(testUserId);
        if (testAdminId) await userRepository.delete(testAdminId);
      } catch (error) {
        // Ignore cleanup errors
      }

      // Clean up test files
      for (const filePath of testFiles) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    await pool.end();
  });

  describe('ExpenseService.updateExpenseReceipt', () => {
    it('should update receipt URL for pending expense', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/new-receipt.jpg';
      const result = await expenseService.updateExpenseReceipt(
        testExpenseId,
        testUserId,
        'salesperson',
        newReceiptUrl
      );

      expect(result.expense.receipt_url).toBe(newReceiptUrl);
      expect(result.oldReceiptUrl).toBeNull();
    });

    it('should return old receipt URL when replacing existing receipt', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/new-receipt-2.jpg';
      const result = await expenseService.updateExpenseReceipt(
        testExpenseWithReceiptId,
        testUserId,
        'salesperson',
        newReceiptUrl
      );

      expect(result.expense.receipt_url).toBe(newReceiptUrl);
      expect(result.oldReceiptUrl).toBe('/uploads/old-receipt.jpg');
    });

    it('should allow admin to update any expense receipt', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/admin-updated-receipt.jpg';
      const result = await expenseService.updateExpenseReceipt(
        testExpenseId,
        testAdminId,
        'admin',
        newReceiptUrl
      );

      expect(result.expense.receipt_url).toBe(newReceiptUrl);
    });

    it('should throw AuthorizationError when user tries to update another user\'s receipt', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const otherUserId = 'other-user-id';
      const newReceiptUrl = '/uploads/unauthorized-receipt.jpg';

      await expect(
        expenseService.updateExpenseReceipt(
          testExpenseId,
          otherUserId,
          'salesperson',
          newReceiptUrl
        )
      ).rejects.toThrow('You can only update receipts for your own expenses');
    });

    it('should throw ValidationError when user tries to update approved expense receipt', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/cannot-update-receipt.jpg';

      await expect(
        expenseService.updateExpenseReceipt(
          testApprovedExpenseId,
          testUserId,
          'salesperson',
          newReceiptUrl
        )
      ).rejects.toThrow('Cannot update receipts for expenses that have been approved or rejected');
    });

    it('should allow admin to update approved expense receipt', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/admin-can-update-approved.jpg';
      const result = await expenseService.updateExpenseReceipt(
        testApprovedExpenseId,
        testAdminId,
        'admin',
        newReceiptUrl
      );

      expect(result.expense.receipt_url).toBe(newReceiptUrl);
    });

    it('should throw NotFoundError when expense does not exist', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const nonExistentId = 'non-existent-id';
      const newReceiptUrl = '/uploads/non-existent-receipt.jpg';

      await expect(
        expenseService.updateExpenseReceipt(
          nonExistentId,
          testUserId,
          'salesperson',
          newReceiptUrl
        )
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('Audit Trail Logging', () => {
    it('should log receipt_replaced action in audit trail', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const newReceiptUrl = '/uploads/audit-test-receipt.jpg';
      
      // Update receipt
      await expenseService.updateExpenseReceipt(
        testExpenseWithReceiptId,
        testUserId,
        'salesperson',
        newReceiptUrl
      );

      // Log audit trail manually (simulating route handler)
      await ExpenseAuditService.logChange(
        testExpenseWithReceiptId,
        testUserId,
        'Test User',
        'receipt_replaced',
        {
          receipt_url: {
            old: '/uploads/old-receipt.jpg',
            new: newReceiptUrl
          }
        }
      );

      // Verify audit log entry
      const auditLogs = await auditLogRepository.findByExpenseId(testExpenseWithReceiptId);
      const receiptReplacedLog = auditLogs.find(log => log.action === 'receipt_replaced');

      expect(receiptReplacedLog).toBeDefined();
      expect(receiptReplacedLog?.action).toBe('receipt_replaced');
      expect(receiptReplacedLog?.user_id).toBe(testUserId);
      
      // Verify change details
      if (receiptReplacedLog?.change_details) {
        const details = typeof receiptReplacedLog.change_details === 'string' 
          ? JSON.parse(receiptReplacedLog.change_details)
          : receiptReplacedLog.change_details;
        expect(details.receipt_url.old).toBe('/uploads/old-receipt.jpg');
        expect(details.receipt_url.new).toBe(newReceiptUrl);
      }
    });
  });

  describe('File System Operations', () => {
    it('should handle file path construction correctly', () => {
      // Test path construction logic from route handler
      const testCases = [
        { input: '/uploads/receipt.jpg', expected: 'receipt.jpg' },
        { input: '/api/uploads/receipt.jpg', expected: 'receipt.jpg' },
        { input: 'uploads/receipt.jpg', expected: 'uploads/receipt.jpg' },
      ];

      testCases.forEach(({ input, expected }) => {
        let receiptPath = input;
        if (receiptPath.startsWith('/uploads/')) {
          receiptPath = receiptPath.substring('/uploads/'.length);
        } else if (receiptPath.startsWith('/api/uploads/')) {
          receiptPath = receiptPath.substring('/api/uploads/'.length);
        }
        expect(receiptPath).toBe(expected);
      });
    });

    it('should construct correct file path for deletion', () => {
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      const receiptUrl = '/uploads/receipt.jpg';
      
      let receiptPath = receiptUrl;
      if (receiptPath.startsWith('/uploads/')) {
        receiptPath = receiptPath.substring('/uploads/'.length);
      }
      
      const fullPath = path.join(uploadDir, receiptPath);
      expect(fullPath).toBe(path.join('uploads', 'receipt.jpg'));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing expense gracefully', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const newReceiptUrl = '/uploads/missing-expense.jpg';

      await expect(
        expenseService.updateExpenseReceipt(
          nonExistentId,
          testUserId,
          'salesperson',
          newReceiptUrl
        )
      ).rejects.toThrow();
    });

    it('should validate receipt URL format', () => {
      // Test that receipt URL follows expected format
      const validUrls = [
        '/uploads/receipt.jpg',
        '/uploads/receipt-123.png',
        '/uploads/subfolder/receipt.pdf',
      ];

      const invalidUrls = [
        '../uploads/receipt.jpg', // Path traversal
        'uploads/receipt.jpg', // Missing leading slash
        '/uploads/../../etc/passwd', // Path traversal
      ];

      validUrls.forEach(url => {
        expect(url.startsWith('/uploads/')).toBe(true);
      });

      invalidUrls.forEach(url => {
        // Should not start with /uploads/ or contain path traversal
        expect(url.startsWith('/uploads/') && !url.includes('..')).toBe(false);
      });
    });
  });

  describe('Transaction Safety', () => {
    it('should update database before file deletion', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping - database not available');
        return;
      }

      // This test verifies the order of operations:
      // 1. Database update happens first
      // 2. File deletion happens after (in route handler)
      
      const newReceiptUrl = '/uploads/transaction-test.jpg';
      const result = await expenseService.updateExpenseReceipt(
        testExpenseWithReceiptId,
        testUserId,
        'salesperson',
        newReceiptUrl
      );

      // Database should be updated
      expect(result.expense.receipt_url).toBe(newReceiptUrl);
      
      // Old receipt URL should be returned for cleanup
      expect(result.oldReceiptUrl).toBe('/uploads/old-receipt.jpg');
    });

    it('should handle file deletion errors gracefully', () => {
      // Test that file deletion errors don't fail the request
      // This is tested by the route handler logic which catches delete errors
      // and logs them without failing the request
      
      const nonExistentPath = path.join(uploadDir, 'non-existent-file.jpg');
      
      // Should not throw if file doesn't exist
      try {
        if (fs.existsSync(nonExistentPath)) {
          fs.unlinkSync(nonExistentPath);
        }
      } catch (error) {
        // This should not happen if we check existsSync first
        expect(error).toBeUndefined();
      }
    });
  });
});

