/**
 * OcrFailedState Component
 * 
 * Error state displayed when OCR processing fails.
 */

import React from 'react';
import { AlertCircle, Scan, FileText } from 'lucide-react';
import { ReceiptData } from '../../../types/types';
import { getTodayLocalDateString } from '../../../utils/dateUtils';

interface OcrFailedStateProps {
  selectedFile: File | null;
  onRetry: () => void;
  onManualEntry: (defaultData: ReceiptData) => void;
}

export const OcrFailedState: React.FC<OcrFailedStateProps> = ({
  selectedFile,
  onRetry,
  onManualEntry
}) => {
  const handleManualEntry = () => {
    if (!selectedFile) return;
    
    const defaultData: ReceiptData = {
      merchant: '',
      total: '',
      date: getTodayLocalDateString(),
      category: 'Other',
      confidence: 0,
      ocrText: '',
      file: selectedFile
    };
    onManualEntry(defaultData);
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">OCR Processing Failed</h3>
          <p className="text-sm text-orange-800 mb-4">
            We couldn't automatically extract data from your receipt. This might be due to image quality, file format, or service availability.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>Try OCR Again</span>
            </button>
            <button
              onClick={handleManualEntry}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-orange-300 text-orange-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Enter Details Manually</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

