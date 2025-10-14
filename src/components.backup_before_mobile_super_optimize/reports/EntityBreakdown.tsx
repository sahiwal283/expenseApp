import React from 'react';
import { Building2, DollarSign, FileText } from 'lucide-react';
import { Expense, TradeShow } from '../../App';
import { getCategoryColor } from '../../constants/appConstants';

interface EntityBreakdownProps {
  expenses: Expense[];
  events: TradeShow[];
}

export const EntityBreakdown: React.FC<EntityBreakdownProps> = ({ expenses, events }) => {
  const entityData = expenses.reduce((acc, expense) => {
    const entity = expense.zohoEntity || 'Unassigned';
    if (!acc[entity]) {
      acc[entity] = {
        totalAmount: 0,
        expenseCount: 0,
        categories: {},
        events: new Set()
      };
    }
    
    acc[entity].totalAmount += expense.amount;
    acc[entity].expenseCount += 1;
    acc[entity].categories[expense.category] = (acc[entity].categories[expense.category] || 0) + expense.amount;
    
    const event = events.find(e => e.id === expense.tradeShowId);
    if (event) {
      acc[entity].events.add(event.name);
    }
    
    return acc;
  }, {} as Record<string, {
    totalAmount: number;
    expenseCount: number;
    categories: Record<string, number>;
    events: Set<string>;
  }>);

  const entities = Object.keys(entityData);
  const totalAmount = Object.values(entityData).reduce((sum, data) => sum + data.totalAmount, 0);

  return (
    <div className="space-y-6">
      {entities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Entity Data Available</h3>
          <p className="text-gray-600">
            Assign expenses to Zoho entities to see detailed breakdowns by organization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {entities.map((entityName) => {
            const data = entityData[entityName];
            const percentage = (data.totalAmount / totalAmount) * 100;
            const topCategories = Object.entries(data.categories)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3);

            return (
              <div key={entityName} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {entityName === 'Unassigned' ? '⚠️ Unassigned' : entityName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {percentage.toFixed(1)}% of total expenses
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ${data.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {data.expenseCount} expenses
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Top Categories */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900">Top Categories</h4>
                  <div className="space-y-2">
                    {topCategories.map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category)}`}>
                          {category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Associated Events */}
                {data.events.size > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Associated Events</h4>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(data.events).slice(0, 3).map((eventName) => (
                        <span
                          key={eventName}
                          className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                        >
                          {eventName}
                        </span>
                      ))}
                      {data.events.size > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          +{data.events.size - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Section */}
      {entities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Entity Summary</h3>
            <FileText className="w-5 h-5 text-gray-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{entities.length}</p>
              <p className="text-sm text-gray-600">Total Entities</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(totalAmount / entities.length).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Avg per Entity</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {entityData['Unassigned']?.expenseCount || 0}
              </p>
              <p className="text-sm text-gray-600">Unassigned Expenses</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};