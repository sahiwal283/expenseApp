/**
 * Report Utility Functions
 * 
 * Extracted complex report calculation logic
 */

import { Expense, TradeShow } from '../App';

export interface CategoryAverage {
  category: string;
  total: number;
  count: number;
  average: number;
}

/**
 * Calculates category averages across trade shows
 */
export function calculateCategoryAverages(
  expenses: Expense[],
  events: TradeShow[]
): CategoryAverage[] {
  // Calculate category totals per trade show
  const tradeShowCategoryTotals: Record<string, Record<string, number>> = {};

  expenses.forEach((expense) => {
    if (!expense.tradeShowId) return;

    if (!tradeShowCategoryTotals[expense.tradeShowId]) {
      tradeShowCategoryTotals[expense.tradeShowId] = {};
    }

    if (!tradeShowCategoryTotals[expense.tradeShowId][expense.category]) {
      tradeShowCategoryTotals[expense.tradeShowId][expense.category] = 0;
    }

    tradeShowCategoryTotals[expense.tradeShowId][expense.category] += expense.amount;
  });

  // Calculate averages per category
  const categoryAverages: Record<string, { total: number; count: number; average: number }> = {};

  Object.values(tradeShowCategoryTotals).forEach((tradeShowCategories) => {
    Object.entries(tradeShowCategories).forEach(([category, amount]) => {
      if (!categoryAverages[category]) {
        categoryAverages[category] = { total: 0, count: 0, average: 0 };
      }
      categoryAverages[category].total += amount;
      categoryAverages[category].count += 1;
    });
  });

  // Calculate final averages and sort by average amount (descending)
  return Object.entries(categoryAverages)
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      average: data.total / data.count,
    }))
    .sort((a, b) => b.average - a.average);
}

/**
 * Calculates trade show breakdown for a specific entity
 */
export function calculateTradeShowBreakdown(
  expenses: Expense[],
  events: TradeShow[],
  selectedEntity: string
): Array<{ eventId: string; amount: number; name: string }> {
  if (selectedEntity === 'all') return [];

  const totals: Record<string, { eventId: string; amount: number; name: string }> = {};

  expenses.forEach((expense) => {
    if (expense.zohoEntity === selectedEntity && expense.tradeShowId) {
      const event = events.find((e) => e.id === expense.tradeShowId);
      if (event) {
        if (!totals[expense.tradeShowId]) {
          totals[expense.tradeShowId] = {
            eventId: expense.tradeShowId,
            amount: 0,
            name: event.name,
          };
        }
        totals[expense.tradeShowId].amount += expense.amount;
      }
    }
  });

  return Object.values(totals).sort((a, b) => b.amount - a.amount);
}

