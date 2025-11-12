/**
 * ReceiptsViewerModal Component
 * 
 * Modal for viewing multiple receipts in a gallery/carousel format.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense } from '../../App';

interface ReceiptsViewerModalProps {
  receipts: Expense[];
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptsViewerModal: React.FC<ReceiptsViewerModalProps> = ({
  receipts,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Use ref to store latest receipts length to avoid closure issues
  const receiptsLengthRef = useRef(receipts.length);

  // Navigation handlers (using useCallback to avoid stale closures)
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? receipts.length - 1 : prev - 1));
  }, [receipts.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === receipts.length - 1 ? 0 : prev + 1));
  }, [receipts.length]);

  // Reset to first receipt when modal opens or receipts change
  useEffect(() => {
    if (isOpen && receipts.length > 0) {
      setCurrentIndex(0);
    }
  }, [isOpen, receipts.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        // Use functional form of setState to avoid closure issues
        setCurrentIndex((prev) => {
          // Get current receipts length from closure-safe source
          const receiptsLength = receipts.length;
          return prev === 0 ? receiptsLength - 1 : prev - 1;
        });
      } else if (e.key === 'ArrowRight') {
        // Use functional form of setState to avoid closure issues
        setCurrentIndex((prev) => {
          // Get current receipts length from closure-safe source
          const receiptsLength = receipts.length;
          return prev === receiptsLength - 1 ? 0 : prev + 1;
        });
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, receipts.length]); // Only depend on receipts.length, not the handlers

  if (!isOpen || receipts.length === 0) return null;

  const currentReceipt = receipts[currentIndex];
  // @ts-ignore - Vite provides this at build time
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const imageUrl = currentReceipt.receiptUrl 
    ? `${apiBaseUrl}${currentReceipt.receiptUrl.startsWith('/') ? '' : '/'}${currentReceipt.receiptUrl}`
    : '';

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
        title="Close (Esc)"
      >
        <X className="w-6 h-6 text-gray-900" />
      </button>

      {/* Main Content */}
      <div 
        className="max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Counter */}
        <div className="text-white text-center mb-4">
          <span className="text-lg font-medium">
            Receipt {currentIndex + 1} of {receipts.length}
          </span>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center relative bg-gray-900 rounded-lg overflow-hidden">
          {/* Previous Button */}
          {receipts.length > 1 && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all z-10"
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Current Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Receipt ${currentIndex + 1}`}
                className="max-w-full max-h-[75vh] w-auto h-auto rounded-lg shadow-2xl object-contain"
              />
            ) : (
              <div className="text-white text-center">
                <p className="text-lg">No receipt image available</p>
              </div>
            )}
          </div>

          {/* Next Button */}
          {receipts.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all z-10"
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {receipts.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 overflow-x-auto pb-2">
            {receipts.map((receipt, index) => {
              // @ts-ignore - Vite provides this at build time
              const thumbApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
              const thumbUrl = receipt.receiptUrl 
                ? `${thumbApiBaseUrl}${receipt.receiptUrl.startsWith('/') ? '' : '/'}${receipt.receiptUrl}`
                : '';
              
              return (
                <button
                  key={receipt.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-white scale-110'
                      : 'border-gray-600 opacity-60 hover:opacity-100'
                  }`}
                  title={`View receipt ${index + 1}`}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-white text-xs">{index + 1}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Receipt Info */}
        {currentReceipt && (
          <div className="mt-4 text-white text-center text-sm">
            {currentReceipt.merchant && (
              <p className="font-medium">{currentReceipt.merchant}</p>
            )}
            {currentReceipt.amount && (
              <p className="text-gray-300">${currentReceipt.amount.toFixed(2)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

