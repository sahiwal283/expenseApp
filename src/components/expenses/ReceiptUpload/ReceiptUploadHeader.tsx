/**
 * ReceiptUploadHeader Component
 * 
 * Header section with back button and title.
 */

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface ReceiptUploadHeaderProps {
  onCancel: () => void;
}

export const ReceiptUploadHeader: React.FC<ReceiptUploadHeaderProps> = ({ onCancel }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Receipt Scanner</h1>
          <p className="text-gray-600">Upload your receipt for automatic data extraction</p>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

