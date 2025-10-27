import React from 'react';
import { TrendingUp, CreditCard, Building2 } from 'lucide-react';

interface ApprovalStatsCardsProps {
  stats: {
    pendingCount: number;
    pendingAmount: number;
    reimbursementCount: number;
    unassignedCount: number;
  };
}

export const ApprovalStatsCards: React.FC<ApprovalStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
      {/* Pending Approval Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
            <p className="text-gray-600">Pending Approval</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          ${stats.pendingAmount.toLocaleString()} total
        </div>
      </div>

      {/* Reimbursements Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.reimbursementCount}</p>
            <p className="text-gray-600">Reimbursements</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Pending approval
        </div>
      </div>

      {/* Unassigned Entities Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-red-600">{stats.unassignedCount}</p>
            <p className="text-gray-600">Unassigned Entities</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Need entity assignment
        </div>
      </div>
    </div>
  );
};

