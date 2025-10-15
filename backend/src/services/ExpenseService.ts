/**
 * Expense Service
 * 
 * Business logic for expense management.
 */

import { expenseRepository, Expense, ExpenseWithDetails } from '../database/repositories/ExpenseRepository';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';

class ExpenseService {
  /**
   * Get all expenses (with optional filters)
   */
  async getExpenses(filters?: {
    userId?: string;
    eventId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    entity?: string;
  }): Promise<Expense[]> {
    if (filters && Object.keys(filters).length > 0) {
      return expenseRepository.findWithFilters(filters);
    }
    return expenseRepository.findAll();
  }

  /**
   * Get all expenses with user/event details (optimized with JOINs)
   */
  async getExpensesWithDetails(filters?: {
    userId?: string;
    eventId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    entity?: string;
  }): Promise<ExpenseWithDetails[]> {
    if (filters && Object.keys(filters).length > 0) {
      return expenseRepository.findWithFiltersAndDetails(filters);
    }
    return expenseRepository.findAllWithDetails();
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string): Promise<Expense> {
    const expense = await expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundError('Expense', id);
    }
    return expense;
  }

  /**
   * Get expense by ID with user/event details (optimized with JOINs)
   */
  async getExpenseByIdWithDetails(id: string): Promise<ExpenseWithDetails> {
    const expense = await expenseRepository.findByIdWithDetails(id);
    if (!expense) {
      throw new NotFoundError('Expense', id);
    }
    return expense;
  }

  /**
   * Get expenses for a specific user
   */
  async getUserExpenses(userId: string): Promise<Expense[]> {
    return expenseRepository.findByUserId(userId);
  }

  /**
   * Get user expense statistics
   */
  async getUserStats(userId: string) {
    return expenseRepository.getUserStats(userId);
  }

  /**
   * Create new expense
   */
  async createExpense(
    userId: string,
    data: {
      eventId: string;
      date: string;
      merchant: string;
      amount: number;
      category: string;
      description?: string;
      location?: string;
      cardUsed: string;
      receiptUrl?: string;
      reimbursementRequired: boolean;
      zohoEntity?: string;
    }
  ): Promise<Expense> {
    // Validation
    if (data.amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }
    if (!data.merchant || data.merchant.trim().length === 0) {
      throw new ValidationError('Merchant name is required');
    }

    // Create expense
    return expenseRepository.create({
      user_id: userId,
      event_id: data.eventId,
      date: data.date,
      merchant: data.merchant,
      amount: data.amount,
      category: data.category,
      description: data.description,
      location: data.location,
      card_used: data.cardUsed,
      status: 'pending',
      receipt_url: data.receiptUrl,
      reimbursement_required: data.reimbursementRequired,
      zoho_entity: data.zohoEntity
    });
  }

  /**
   * Update expense
   */
  async updateExpense(
    expenseId: string,
    userId: string,
    userRole: string,
    data: Partial<{
      eventId: string;
      date: string;
      merchant: string;
      amount: number;
      category: string;
      description: string;
      location: string;
      cardUsed: string;
      receiptUrl: string;
      reimbursementRequired: boolean;
      zohoEntity: string;
    }>
  ): Promise<Expense> {
    // Get existing expense
    const expense = await this.getExpenseById(expenseId);

    // Authorization check
    const isAdmin = userRole === 'admin' || userRole === 'accountant' || userRole === 'developer';
    if (!isAdmin && expense.user_id !== userId) {
      throw new AuthorizationError('You can only update your own expenses');
    }

    // Users can't update approved/rejected expenses
    if (!isAdmin && expense.status !== 'pending') {
      throw new ValidationError('Cannot update expenses that have been approved or rejected');
    }

    // Map camelCase to snake_case
    const updateData: any = {};
    if (data.eventId !== undefined) updateData.event_id = data.eventId;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.merchant !== undefined) updateData.merchant = data.merchant;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.cardUsed !== undefined) updateData.card_used = data.cardUsed;
    if (data.receiptUrl !== undefined) updateData.receipt_url = data.receiptUrl;
    if (data.reimbursementRequired !== undefined) updateData.reimbursement_required = data.reimbursementRequired;
    if (data.zohoEntity !== undefined) updateData.zoho_entity = data.zohoEntity;

    return expenseRepository.update(expenseId, updateData);
  }

  /**
   * Delete expense
   */
  async deleteExpense(expenseId: string, userId: string, userRole: string): Promise<void> {
    const expense = await this.getExpenseById(expenseId);

    // Authorization check
    const isAdmin = userRole === 'admin' || userRole === 'accountant' || userRole === 'developer';
    if (!isAdmin && expense.user_id !== userId) {
      throw new AuthorizationError('You can only delete your own expenses');
    }

    // Users can't delete approved expenses
    if (!isAdmin && expense.status === 'approved') {
      throw new ValidationError('Cannot delete approved expenses');
    }

    await expenseRepository.delete(expenseId);
  }

  /**
   * Approve or reject expense (admin/accountant only)
   */
  async updateExpenseStatus(
    expenseId: string,
    status: 'approved' | 'rejected',
    userRole: string
  ): Promise<Expense> {
    // Authorization check
    if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'developer') {
      throw new AuthorizationError('Only admins and accountants can approve/reject expenses');
    }

    return expenseRepository.updateStatus(expenseId, status);
  }

  /**
   * Bulk approve expenses
   */
  async bulkApprove(expenseIds: string[], userRole: string): Promise<{ success: number; failed: string[] }> {
    if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'developer') {
      throw new AuthorizationError('Only admins and accountants can approve expenses');
    }

    let success = 0;
    const failed: string[] = [];

    for (const id of expenseIds) {
      try {
        await expenseRepository.updateStatus(id, 'approved');
        success++;
      } catch (error) {
        failed.push(id);
      }
    }

    return { success, failed };
  }

  /**
   * Get expenses pending Zoho sync
   */
  async getPendingZohoSync(): Promise<Expense[]> {
    return expenseRepository.findPendingZohoSync();
  }

  /**
   * Update Zoho expense ID after sync
   */
  async updateZohoExpenseId(expenseId: string, zohoExpenseId: string): Promise<Expense> {
    return expenseRepository.updateZohoInfo(expenseId, zohoExpenseId);
  }

  /**
   * Get expense statistics by status
   */
  async getStatusCounts(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [pending, approved, rejected] = await Promise.all([
      expenseRepository.countByStatus('pending'),
      expenseRepository.countByStatus('approved'),
      expenseRepository.countByStatus('rejected')
    ]);

    return { pending, approved, rejected };
  }

  /**
   * Assign Zoho entity to expense (admin/accountant only)
   */
  async assignZohoEntity(
    expenseId: string,
    zohoEntity: string,
    userRole: string
  ): Promise<Expense> {
    // Authorization check
    if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'developer') {
      throw new AuthorizationError('Only admins and accountants can assign entities');
    }

    // Validate entity is provided
    if (!zohoEntity || zohoEntity.trim().length === 0) {
      throw new ValidationError('Zoho entity name is required');
    }

    return expenseRepository.update(expenseId, { zoho_entity: zohoEntity });
  }

  /**
   * Update reimbursement status (admin/accountant only)
   */
  async updateReimbursementStatus(
    expenseId: string,
    status: 'pending review' | 'approved' | 'rejected' | 'paid',
    userRole: string
  ): Promise<Expense> {
    // Authorization check
    if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'developer') {
      throw new AuthorizationError('Only admins and accountants can update reimbursement status');
    }

    // Validate status
    const validStatuses = ['pending review', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid reimbursement status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
    }

    return expenseRepository.update(expenseId, { reimbursement_status: status });
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();

