import React from 'react';
import { AlertTriangle, CreditCard, Building2, DollarSign } from 'lucide-react';
import { Expense } from '../../App';

interface ApprovalCardsProps {
  expenses: Expense[];
}

export const ApprovalCards: React.FC<ApprovalCardsProps> = ({ expenses }) => {
  // Calculate stats
  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const pendingReimbursements = expenses.filter(
    e => e.reimbursementRequired && e.reimbursementStatus === 'pending review'
  );
  const unassignedEntities = expenses.filter(e => !e.zohoEntity);
  const totalPendingAmount = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6 mb-6">
      {/* Pending Approval Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-yellow-600">{pendingExpenses.length}</p>
            <p className="text-gray-600 text-sm md:text-base">Pending Approval</p>
          </div>
        </div>
        <div className="flex items-center text-xs sm:text-sm text-gray-600">
          <DollarSign className="w-4 h-4 mr-1" />
          <span className="font-medium">${totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total</span>
        </div>
      </div>

      {/* Reimbursements Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-orange-600">{pendingReimbursements.length}</p>
            <p className="text-gray-600 text-sm md:text-base">Reimbursements</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Pending approval
        </div>
      </div>

      {/* Unassigned Entities Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-red-600">{unassignedEntities.length}</p>
            <p className="text-gray-600 text-sm md:text-base">Unassigned Entities</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Need entity assignment
        </div>
      </div>
    </div>
  );
};

