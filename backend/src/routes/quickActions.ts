import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get pending tasks/quick actions based on user role
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tasks: any[] = [];

    // ADMIN TASKS
    if (userRole === 'admin') {
      // 1. Users pending role assignment
      const pendingUsersResult = await query(
        `SELECT id, username, name, email, registration_date 
         FROM users 
         WHERE role = 'pending' 
         ORDER BY registration_date ASC`
      );
      
      if (pendingUsersResult.rows.length > 0) {
        tasks.push({
          id: 'pending-users',
          type: 'admin',
          priority: 'high',
          title: `${pendingUsersResult.rows.length} New User${pendingUsersResult.rows.length > 1 ? 's' : ''} Awaiting Role Assignment`,
          description: `${pendingUsersResult.rows.length} user${pendingUsersResult.rows.length > 1 ? 's have' : ' has'} registered and need${pendingUsersResult.rows.length === 1 ? 's' : ''} a role assigned`,
          count: pendingUsersResult.rows.length,
          action: 'Go to User Management',
          link: '/settings', // User management is on settings page
          icon: 'UserPlus',
          users: pendingUsersResult.rows
        });
      }

      // 2. Expenses pending approval
      const pendingExpensesResult = await query(
        `SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'`
      );
      
      const pendingExpensesCount = parseInt(pendingExpensesResult.rows[0].count);
      if (pendingExpensesCount > 0) {
        tasks.push({
          id: 'pending-expenses',
          type: 'admin',
          priority: 'medium',
          title: `${pendingExpensesCount} Expense${pendingExpensesCount > 1 ? 's' : ''} Pending Approval`,
          description: `Review and approve pending expense submissions`,
          count: pendingExpensesCount,
          action: 'Review Expenses',
          link: '/approvals',
          icon: 'FileText'
        });
      }

      // 3. Approved expenses not pushed to Zoho
      const unpushedExpensesResult = await query(
        `SELECT COUNT(*) as count, 
                ARRAY_AGG(DISTINCT event_id) as event_ids,
                event_id as primary_event
         FROM expenses 
         WHERE status = 'approved' 
           AND zoho_entity IS NOT NULL 
           AND zoho_expense_id IS NULL
         GROUP BY event_id
         ORDER BY COUNT(*) DESC
         LIMIT 1`
      );
      
      const unpushedCountQuery = await query(
        `SELECT COUNT(*) as count 
         FROM expenses 
         WHERE status = 'approved' 
           AND zoho_entity IS NOT NULL 
           AND zoho_expense_id IS NULL`
      );
      
      const unpushedCount = parseInt(unpushedCountQuery.rows[0].count);
      if (unpushedCount > 0) {
        // Get all unique event IDs with unpushed expenses
        const eventsQuery = await query(
          `SELECT DISTINCT event_id 
           FROM expenses 
           WHERE status = 'approved' 
             AND zoho_entity IS NOT NULL 
             AND zoho_expense_id IS NULL
           ORDER BY event_id`
        );
        
        const eventIds = eventsQuery.rows.map(row => row.event_id);
        const primaryEventId = unpushedExpensesResult.rows[0]?.primary_event; // Event with most unpushed
        
        tasks.push({
          id: 'unpushed-zoho',
          type: 'unpushed_zoho',
          priority: 'medium',
          title: `${unpushedCount} Expense${unpushedCount > 1 ? 's' : ''} Not Synced to Zoho`,
          description: `Push approved expenses to Zoho Books`,
          count: unpushedCount,
          action: eventIds.length === 1 ? 'Push to Zoho' : 'Go to Reports',
          link: '/reports',
          icon: 'Upload',
          eventIds: eventIds,
          primaryEventId: primaryEventId // Event with most unsynced expenses
        });
      }
    }

    // ACCOUNTANT TASKS
    if (userRole === 'accountant') {
      // 1. Expenses pending approval
      const pendingExpensesResult = await query(
        `SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'`
      );
      
      const pendingExpensesCount = parseInt(pendingExpensesResult.rows[0].count);
      if (pendingExpensesCount > 0) {
        tasks.push({
          id: 'pending-expenses',
          type: 'accountant',
          priority: 'high',
          title: `${pendingExpensesCount} Expense${pendingExpensesCount > 1 ? 's' : ''} Pending Approval`,
          description: `Review and approve pending expense submissions`,
          count: pendingExpensesCount,
          action: 'Review Expenses',
          link: '/approvals',
          icon: 'FileText'
        });
      }

      // 2. Reimbursements to process
      const reimbursementsResult = await query(
        `SELECT COUNT(*) as count 
         FROM expenses 
         WHERE reimbursement_required = TRUE 
           AND (reimbursement_status = 'pending review' OR reimbursement_status = 'approved')`
      );
      
      const reimbursementCount = parseInt(reimbursementsResult.rows[0].count);
      if (reimbursementCount > 0) {
        tasks.push({
          id: 'pending-reimbursements',
          type: 'accountant',
          priority: 'medium',
          title: `${reimbursementCount} Reimbursement${reimbursementCount > 1 ? 's' : ''} to Process`,
          description: `Process pending reimbursements`,
          count: reimbursementCount,
          action: 'View Reports',
          link: '/reports',
          icon: 'DollarSign'
        });
      }
    }

    // COORDINATOR TASKS
    if (userRole === 'coordinator') {
      // Events requiring budget review
      const eventBudgetResult = await query(
        `SELECT e.id, e.name, 
                SUM(ex.amount) as spent,
                e.budget,
                (SUM(ex.amount) / NULLIF(e.budget, 0) * 100) as percent_spent
         FROM events e
         LEFT JOIN expenses ex ON e.id = ex.event_id AND ex.status = 'approved'
         WHERE e.coordinator_id = $1
           AND e.status != 'completed'
           AND e.budget IS NOT NULL
         GROUP BY e.id, e.name, e.budget
         HAVING SUM(ex.amount) / NULLIF(e.budget, 0) >= 0.8`,
        [userId]
      );
      
      if (eventBudgetResult.rows.length > 0) {
        tasks.push({
          id: 'budget-warnings',
          type: 'coordinator',
          priority: 'high',
          title: `${eventBudgetResult.rows.length} Event${eventBudgetResult.rows.length > 1 ? 's' : ''} Near Budget Limit`,
          description: `Events have reached 80% or more of their budget`,
          count: eventBudgetResult.rows.length,
          action: 'View Events',
          link: '/events',
          icon: 'AlertTriangle',
          events: eventBudgetResult.rows
        });
      }
    }

    // SALESPERSON TASKS
    if (userRole === 'salesperson') {
      // Pending expense submissions (user's own)
      const userPendingResult = await query(
        `SELECT COUNT(*) as count 
         FROM expenses 
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );
      
      const userPendingCount = parseInt(userPendingResult.rows[0].count);
      if (userPendingCount > 0) {
        tasks.push({
          id: 'user-pending-expenses',
          type: 'salesperson',
          priority: 'low',
          title: `${userPendingCount} of Your Expense${userPendingCount > 1 ? 's' : ''} Pending Review`,
          description: `Waiting for accountant approval`,
          count: userPendingCount,
          action: 'View Expenses',
          link: '/expenses',
          icon: 'Clock'
        });
      }

      // Missing receipts
      const missingReceiptsResult = await query(
        `SELECT COUNT(*) as count 
         FROM expenses 
         WHERE user_id = $1 AND receipt_url IS NULL`,
        [userId]
      );
      
      const missingReceiptsCount = parseInt(missingReceiptsResult.rows[0].count);
      if (missingReceiptsCount > 0) {
        tasks.push({
          id: 'missing-receipts',
          type: 'salesperson',
          priority: 'medium',
          title: `${missingReceiptsCount} Expense${missingReceiptsCount > 1 ? 's' : ''} Missing Receipts`,
          description: `Upload receipts for proper documentation`,
          count: missingReceiptsCount,
          action: 'Upload Receipts',
          link: '/expenses',
          icon: 'Upload'
        });
      }
    }

    // Return tasks sorted by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    res.json({ tasks });
  } catch (error) {
    console.error('Quick actions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending tasks' });
  }
});

export default router;

