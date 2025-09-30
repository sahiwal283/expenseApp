import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { TradeShow, Expense } from '../../App';

interface BudgetOverviewProps {
  events: TradeShow[];
  expenses: Expense[];
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ events, expenses }) => {
  const budgetData = useMemo(() => {
    return events.map(event => {
      const eventExpenses = expenses.filter(expense => expense.tradeShowId === event.id);
      const totalSpent = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const budgetUsed = (totalSpent / event.budget) * 100;
      
      return {
        ...event,
        totalSpent,
        budgetUsed,
        remaining: event.budget - totalSpent,
        expenseCount: eventExpenses.length
      };
    }).slice(0, 4);
  }, [events, expenses]);

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'red', status: 'Critical', icon: AlertTriangle };
    if (percentage >= 75) return { color: 'orange', status: 'Warning', icon: AlertTriangle };
    return { color: 'emerald', status: 'Good', icon: CheckCircle };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Budget Overview</h3>
        <TrendingUp className="w-5 h-5 text-blue-600" />
      </div>

      {budgetData.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No budget data available</p>
          <p className="text-sm text-gray-400 mt-1">Create events and add expenses to see budget tracking</p>
        </div>
      ) : (
        <div className="space-y-6">
          {budgetData.map(event => {
            const status = getBudgetStatus(event.budgetUsed);
            const StatusIcon = status.icon;
            
            return (
              <div key={event.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{event.name}</h4>
                    <p className="text-sm text-gray-600">{event.expenseCount} expenses submitted</p>
                  </div>
                  <div className={`flex items-center space-x-1 text-sm font-medium ${
                    status.color === 'red' ? 'text-red-600' :
                    status.color === 'orange' ? 'text-orange-600' : 'text-emerald-600'
                  }`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{status.status}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Spent: ${event.totalSpent.toLocaleString()}</span>
                    <span className="text-gray-600">Budget: ${event.budget.toLocaleString()}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        status.color === 'red' ? 'bg-red-500' :
                        status.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(event.budgetUsed, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${
                      status.color === 'red' ? 'text-red-600' :
                      status.color === 'orange' ? 'text-orange-600' : 'text-emerald-600'
                    }`}>
                      {event.budgetUsed.toFixed(1)}% used
                    </span>
                    <span className="text-gray-600">
                      ${event.remaining.toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};