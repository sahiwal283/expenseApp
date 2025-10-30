/**
 * StatusBadge Component
 * 
 * Reusable badge component for displaying expense status with consistent
 * styling across the application. Eliminates duplicate status badge logic
 * found in 5+ components.
 * 
 * Usage:
 *   <StatusBadge status="pending" />
 *   <StatusBadge status="approved" size="sm" />
 *   <StatusBadge status="rejected" showIcon />
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, FileCheck } from 'lucide-react';

type ExpenseStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'paid' 
  | 'reimbursed'
  | 'needs_further_review';

interface StatusBadgeProps {
  status: ExpenseStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Pending'
  },
  approved: {
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
    label: 'Approved'
  },
  rejected: {
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    label: 'Rejected'
  },
  paid: {
    color: 'bg-blue-100 text-blue-800',
    icon: FileCheck,
    label: 'Paid'
  },
  reimbursed: {
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCircle,
    label: 'Reimbursed'
  },
  needs_further_review: {
    color: 'bg-orange-100 text-orange-800',
    icon: AlertCircle,
    label: 'Needs Review'
  }
};

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

const iconSizes = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = false,
  className = ''
}) => {
  const config = statusConfig[status];
  
  if (!config) {
    console.warn(`[StatusBadge] Unknown status: ${status}`);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 ${className}`}>
        {status}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span 
      className={`
        ${sizeClasses[size]} 
        ${config.color} 
        font-medium rounded-full whitespace-nowrap inline-flex items-center gap-1
        ${className}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

