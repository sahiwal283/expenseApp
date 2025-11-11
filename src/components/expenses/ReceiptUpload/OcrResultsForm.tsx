/**
 * OcrResultsForm Component
 * 
 * Form displaying OCR results and allowing user edits.
 */

import React from 'react';
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { ReceiptData } from '../../../types/types';
import { TradeShow } from '../../../App';

interface CardOption {
  name: string;
  lastFour: string;
  entity?: string | null;
}

interface FieldWarning {
  field: string;
  reason: string;
  severity: string;
  suggestedAction?: string;
}

interface OcrResultsFormProps {
  ocrResults: ReceiptData;
  setOcrResults: React.Dispatch<React.SetStateAction<ReceiptData | null>>;
  selectedEvent: string;
  setSelectedEvent: (value: string) => void;
  selectedCard: string;
  setSelectedCard: (value: string) => void;
  selectedEntity: string;
  setSelectedEntity: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  cardOptions: CardOption[];
  categories: string[];
  userEvents: TradeShow[];
  fieldWarnings: FieldWarning[];
  getFieldWarnings: (fieldName: string) => FieldWarning[];
}

export const OcrResultsForm: React.FC<OcrResultsFormProps> = ({
  ocrResults,
  setOcrResults,
  selectedEvent,
  setSelectedEvent,
  selectedCard,
  setSelectedCard,
  selectedEntity,
  setSelectedEntity,
  description,
  setDescription,
  cardOptions,
  categories,
  userEvents,
  fieldWarnings,
  getFieldWarnings
}) => {
  return (
    <div className="bg-gray-50 rounded-xl p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">Extracted Data</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            ocrResults.confidence >= 0.7 ? 'bg-emerald-100 text-emerald-800' :
            ocrResults.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {Math.round(ocrResults.confidence * 100)}% confidence
          </span>
          {ocrResults.ocrV2Data?.ocrProvider && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
              {ocrResults.ocrV2Data.ocrProvider}
            </span>
          )}
        </div>
        <div className={`flex items-center text-sm ${
          ocrResults.ocrV2Data?.needsReview ? 'text-orange-600 font-medium' : 'text-blue-600'
        }`}>
          <AlertCircle className="w-4 h-4 mr-1" />
          <span>
            {ocrResults.ocrV2Data?.needsReview 
              ? `⚠️ Review: ${ocrResults.ocrV2Data.reviewReasons?.join(', ') || 'Low confidence fields'}`
              : '✓ Please verify all fields before submitting'
            }
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant
              {ocrResults.ocrV2Data?.inference?.merchant && (
                <span className={`ml-2 text-xs ${
                  ocrResults.ocrV2Data.inference.merchant.confidence >= 0.7 ? 'text-emerald-600' :
                  ocrResults.ocrV2Data.inference.merchant.confidence >= 0.5 ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  ({Math.round(ocrResults.ocrV2Data.inference.merchant.confidence * 100)}%)
                </span>
              )}
              {getFieldWarnings('merchant').length > 0 && (
                <span className="ml-2 text-orange-600">
                  ⚠️
                </span>
              )}
            </label>
            <input
              type="text"
              value={ocrResults.merchant}
              onChange={(e) => setOcrResults({ ...ocrResults, merchant: e.target.value })}
              className={`w-full bg-white px-3 py-2 rounded-lg border ${
                getFieldWarnings('merchant').some(w => w.severity === 'high') 
                  ? 'border-orange-400 focus:ring-orange-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              } focus:ring-2 focus:border-blue-500`}
              placeholder="Merchant name"
            />
            {getFieldWarnings('merchant').map((warning, idx) => (
              <div key={idx} className={`mt-1 text-xs ${
                warning.severity === 'high' ? 'text-orange-600' :
                warning.severity === 'medium' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                <span className="font-medium">⚠️ {warning.reason}</span>
                {warning.suggestedAction && (
                  <div className="ml-4 mt-0.5 text-gray-600 italic">
                    → {warning.suggestedAction}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount
              {ocrResults.ocrV2Data?.inference?.amount && (
                <span className={`ml-2 text-xs ${
                  ocrResults.ocrV2Data.inference.amount.confidence >= 0.7 ? 'text-emerald-600' :
                  ocrResults.ocrV2Data.inference.amount.confidence >= 0.5 ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  ({Math.round(ocrResults.ocrV2Data.inference.amount.confidence * 100)}%)
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              value={ocrResults.total || ''}
              onChange={(e) => {
                const value = e.target.value;
                const cleaned = value.replace(/^0+(?=\d)/, '');
                setOcrResults({ ...ocrResults, total: parseFloat(cleaned) || 0 });
              }}
              className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-emerald-600"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
              {ocrResults.ocrV2Data?.inference?.date && (
                <span className={`ml-2 text-xs ${
                  ocrResults.ocrV2Data.inference.date.confidence >= 0.7 ? 'text-emerald-600' :
                  ocrResults.ocrV2Data.inference.date.confidence >= 0.5 ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  ({Math.round(ocrResults.ocrV2Data.inference.date.confidence * 100)}%)
                </span>
              )}
            </label>
            <input
              type="date"
              value={ocrResults.date}
              onChange={(e) => setOcrResults({ ...ocrResults, date: e.target.value })}
              className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
              {ocrResults.ocrV2Data?.inference?.category && (
                <span className={`ml-2 text-xs ${
                  ocrResults.ocrV2Data.inference.category.confidence >= 0.7 ? 'text-emerald-600' :
                  ocrResults.ocrV2Data.inference.category.confidence >= 0.5 ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  ({Math.round(ocrResults.ocrV2Data.inference.category.confidence * 100)}% confidence)
                </span>
              )}
            </label>
            <select
              value={ocrResults.category || ''}
              onChange={(e) => {
                console.log('[ReceiptUpload] Category changed to:', e.target.value);
                setOcrResults({ ...ocrResults, category: e.target.value });
              }}
              className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select category...</option>
              {categories.length > 0 ? (
                categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))
              ) : (
                <option disabled>Loading categories...</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Review Reasons */}
      {ocrResults.ocrV2Data?.reviewReasons && ocrResults.ocrV2Data.reviewReasons.length > 0 && (
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">Please Review:</p>
              <ul className="text-sm text-orange-700 mt-1 space-y-1">
                {ocrResults.ocrV2Data.reviewReasons.map((reason: string, idx: number) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Event and Card Selection */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trade Show Event *
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full max-w-sm bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select an event</option>
            {userEvents.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <CreditCard className="w-4 h-4 inline mr-1" />
            Card Used
            {ocrResults?.ocrV2Data?.inference?.cardLastFour && (
              <span className={`ml-2 text-xs ${
                ocrResults.ocrV2Data.inference.cardLastFour.confidence >= 0.7 ? 'text-emerald-600' :
                ocrResults.ocrV2Data.inference.cardLastFour.confidence >= 0.5 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                ({Math.round(ocrResults.ocrV2Data.inference.cardLastFour.confidence * 100)}% - OCR found ...{ocrResults.ocrV2Data.inference.cardLastFour.value})
              </span>
            )}
          </label>
          <select
            value={selectedCard}
            onChange={(e) => {
              const cardValue = e.target.value;
              const selectedCardOption = cardOptions.find(card => `${card.name} (...${card.lastFour})` === cardValue);
              setSelectedCard(cardValue);
              setSelectedEntity(selectedCardOption?.entity || '');
            }}
            className="w-full max-w-sm bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select card...</option>
            {cardOptions.map((card, idx) => (
              <option key={idx} value={`${card.name} (...${card.lastFour})`}>
                {card.name} (...{card.lastFour})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description / Notes */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description / Notes
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full max-w-2xl bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Optional: Add any additional notes or details..."
        />
      </div>
    </div>
  );
};

