import React from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { Expense, TradeShow } from '../../App';
import { formatLocalDate } from '../../utils/dateUtils';
import { CATEGORY_COLORS } from '../../constants/appConstants';

interface ExpenseChartProps {
  expenses: Expense[];
  events: TradeShow[];
  categoryBreakdown: Record<string, number>;
  onTradeShowClick?: (eventId: string) => void;
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ 
  expenses, 
  events, 
  categoryBreakdown,
  onTradeShowClick
}) => {
  const categories = Object.keys(categoryBreakdown);
  const maxAmount = Math.max(...Object.values(categoryBreakdown));

  const monthlyData = expenses.reduce((acc, expense) => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const monthlyEntries = Object.entries(monthlyData).sort();

  const eventBreakdown = expenses.reduce((acc, expense) => {
    const event = events.find(e => e.id === expense.tradeShowId);
    const eventName = event?.name || 'No Event';
    const eventId = event?.id || 'no-event';
    acc[eventName] = { amount: (acc[eventName]?.amount || 0) + expense.amount, eventId };
    return acc;
  }, {} as Record<string, { amount: number; eventId: string }>);

  const getCategoryColor = (category: string) => {
    const colorConfig = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
    if (!colorConfig) return 'bg-gray-500';
    
    // Convert badge colors (bg-blue-100) to chart bar colors (bg-blue-500)
    const bgClass = colorConfig.bg;
    return bgClass.replace('-100', '-500');
  };

  return (
    <div className="space-y-6">
      {/* Event Breakdown - MOVED TO TOP */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sm:p-5 md:p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Expenses by Trade Show</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Click to view details</span>
          </div>
        </div>
        
        {Object.keys(eventBreakdown).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(eventBreakdown)
              .sort(([, a], [, b]) => b.amount - a.amount)
              .map(([eventName, { amount, eventId }]) => {
                const maxEventAmount = Math.max(...Object.values(eventBreakdown).map(e => e.amount));
                const percentage = (amount / maxEventAmount) * 100;
                
                return (
                  <div 
                    key={eventName} 
                    className="bg-gray-50 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-purple-300"
                    onClick={() => onTradeShowClick?.(eventId)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && onTradeShowClick?.(eventId)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate hover:text-purple-700 transition-colors">
                          {eventName}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {expenses.filter(e => {
                          const event = events.find(ev => ev.id === e.tradeShowId);
                          return (event?.name || 'No Event') === eventName;
                        }).length} expenses
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No event data available</p>
          </div>
        )}
      </div>

      {/* Category and Monthly sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 sm:gap-5 md:gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sm:p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
          </div>
        
        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((category) => {
              const amount = categoryBreakdown[category];
              const percentage = (amount / maxAmount) * 100;
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getCategoryColor(category)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No expense data available</p>
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sm:p-5 md:p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Spending Trend</h3>
        </div>
        
        {monthlyEntries.length > 0 ? (
          <div className="space-y-4">
            {monthlyEntries.map(([month, amount]) => {
              const maxMonthly = Math.max(...monthlyEntries.map(([, amt]) => amt));
              const percentage = (amount / maxMonthly) * 100;
              
              return (
                <div key={month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {formatLocalDate(month + '-01', { year: 'numeric', month: 'long' })}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No monthly data available</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};