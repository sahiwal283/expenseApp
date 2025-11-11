/**
 * ExpenseModalDetailsEdit Component
 * 
 * Extracted and SIMPLIFIED from ExpenseSubmission.tsx (was lines 1203-1316, ~113 lines)
 * Editable form for expense details
 * 
 * SIMPLIFICATION: Separated from view mode, uses cleaner prop interface
 */

import React from 'react';
import { Edit2 } from 'lucide-react';

interface EditFormData {
  date: string;
  amount: number;
  category: string;
  merchant: string;
  cardUsed: string;
  location?: string;
  description?: string;
  reimbursementRequired: boolean;
}

interface ExpenseModalDetailsEditProps {
  formData: EditFormData;
  onChange: (updates: Partial<EditFormData>) => void;
  uniqueCategories: string[];
  uniqueCards: string[];
  onCancel: () => void;
  onSave: () => void;
}

export const ExpenseModalDetailsEdit: React.FC<ExpenseModalDetailsEditProps> = ({
  formData,
  onChange,
  uniqueCategories,
  uniqueCards,
  onCancel,
  onSave,
}) => {
  return (
    <div className="space-y-4">
      {/* Edit Mode Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <Edit2 className="w-4 h-4" />
          <span>Editing expense - make changes below and click Save</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.date || ''}
            onChange={(e) => onChange({ date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount || 0}
            onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={formData.category || ''}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select category</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merchant *</label>
          <input
            type="text"
            value={formData.merchant || ''}
            onChange={(e) => onChange({ merchant: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Card Used */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Used *</label>
          <select
            value={formData.cardUsed || ''}
            onChange={(e) => onChange({ cardUsed: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select card used</option>
            {uniqueCards.map((card, idx) => (
              <option key={idx} value={card}>
                {card}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location || ''}
            onChange={(e) => onChange({ location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Optional additional details"
        />
      </div>

      {/* Reimbursement */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-reimbursement"
          checked={formData.reimbursementRequired || false}
          onChange={(e) => onChange({ reimbursementRequired: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="edit-reimbursement" className="text-sm font-medium text-gray-700">
          Reimbursement Required (Personal Card)
        </label>
      </div>
    </div>
  );
};

