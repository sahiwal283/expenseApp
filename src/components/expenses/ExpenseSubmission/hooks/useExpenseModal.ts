/**
 * useExpenseModal Hook
 * 
 * Manages expense viewing and inline editing in modal dialogs.
 * Handles opening/closing modals, editing state, and saving edited data.
 */

import { useState } from 'react';
import { Expense } from '../../../../App';
import { ExpenseEditFormData } from '../../../../types/types';

interface UseExpenseModalProps {
  onSave: (expenseData: Partial<Expense>) => Promise<void>;
  reloadData: () => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useExpenseModal({ onSave, reloadData, addToast }: UseExpenseModalProps) {
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [showFullReceipt, setShowFullReceipt] = useState(true);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editFormData, setEditFormData] = useState<ExpenseEditFormData | null>(null);

  const openExpenseModal = (expense: Expense) => {
    setViewingExpense(expense);
    setShowFullReceipt(true);
    setIsEditingExpense(false);
    setEditFormData(null);
  };

  const closeExpenseModal = () => {
    setViewingExpense(null);
    setIsEditingExpense(false);
    setEditFormData(null);
  };

  const startInlineEdit = (expense: Expense) => {
    setEditFormData({
      category: expense.category,
      merchant: expense.merchant,
      amount: expense.amount,
      date: expense.date,
      description: expense.description || '',
      location: expense.location || '',
      cardUsed: expense.cardUsed,
      reimbursementRequired: expense.reimbursementRequired,
      zohoEntity: expense.zohoEntity || '',
    });
    setIsEditingExpense(true);
  };

  const cancelInlineEdit = () => {
    setIsEditingExpense(false);
    setEditFormData(null);
  };

  const saveInlineEdit = async () => {
    if (!viewingExpense || !editFormData) return;

    try {
      const response = await fetch(`/api/expenses/${viewingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          category: editFormData.category,
          merchant: editFormData.merchant,
          amount: parseFloat(editFormData.amount),
          date: editFormData.date,
          description: editFormData.description,
          location: editFormData.location,
          card_used: editFormData.cardUsed,
          reimbursement_required: editFormData.reimbursementRequired,
          zoho_entity: editFormData.zohoEntity || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update expense');
      }

      const updatedExpense = await response.json();

      addToast('✅ Expense updated successfully!', 'success');
      setViewingExpense(updatedExpense);
      setIsEditingExpense(false);
      setEditFormData(null);
      await reloadData();
    } catch (error) {
      console.error('Error updating expense:', error);
      addToast('❌ Failed to update expense. Please try again.', 'error');
    }
  };

  const updateEditFormField = <K extends keyof ExpenseEditFormData>(
    field: K,
    value: ExpenseEditFormData[K]
  ) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const toggleReceiptView = () => {
    setShowFullReceipt((prev) => !prev);
  };

  return {
    viewingExpense,
    showFullReceipt,
    isEditingExpense,
    editFormData,
    openExpenseModal,
    closeExpenseModal,
    startInlineEdit,
    cancelInlineEdit,
    saveInlineEdit,
    updateEditFormField,
    toggleReceiptView,
    setViewingExpense,
  };
}

