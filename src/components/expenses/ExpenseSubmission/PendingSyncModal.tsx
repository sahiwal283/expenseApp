/**
 * PendingSyncModal Component
 * 
 * Modal displaying pending sync actions.
 */

import React from 'react';
import { X } from 'lucide-react';
import { User } from '../../../App';
import { PendingActions } from '../../common/PendingActions';

interface PendingSyncModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export const PendingSyncModal: React.FC<PendingSyncModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-50">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Pending Sync</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            <PendingActions user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

