-- Migration: Fix expenses stuck in "needs further review" status
-- Version: 1.4.1
-- Date: October 16, 2025
-- Description: Auto-approve expenses that have corrective actions applied

-- This migration fixes expenses that should be "approved" based on the new
-- auto-approval logic but were stuck in "needs further review" status because
-- they were assigned entities or had reimbursements approved BEFORE v1.4.0 was deployed.

-- Auto-approve expenses that have entities assigned
-- These should have been auto-approved when entity was assigned
UPDATE expenses 
SET status = 'approved'
WHERE status = 'needs further review' 
  AND zoho_entity IS NOT NULL 
  AND zoho_entity != '';

-- Auto-approve expenses that have reimbursement status set to approved or rejected
-- These should have been auto-approved when reimbursement was reviewed
UPDATE expenses 
SET status = 'approved'
WHERE status = 'needs further review' 
  AND reimbursement_required = true 
  AND reimbursement_status IN ('approved', 'rejected');

-- Log the results
DO $$
DECLARE
  entity_count INTEGER;
  reimb_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO entity_count
  FROM expenses 
  WHERE status = 'approved' 
    AND zoho_entity IS NOT NULL 
    AND zoho_entity != '';
    
  SELECT COUNT(*) INTO reimb_count
  FROM expenses 
  WHERE status = 'approved' 
    AND reimbursement_status IN ('approved', 'rejected');
    
  RAISE NOTICE 'Migration complete: % expenses with entities, % with reimbursement decisions', 
    entity_count, reimb_count;
END $$;

