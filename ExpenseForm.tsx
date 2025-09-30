import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Building2, Upload, AlertCircle } from 'lucide-react';
import { Expense, TradeShow } from './App';

interface ExpenseFormProps {
  expense?: Expense | null;
  events: TradeShow[];
  onSave: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

const categories = ['Flights', 'Hotels', 'Meals', 'Supplies', 'Transportation', 'Other'];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, events, onSave, onCancel }) => {
  const [cardOptions, setCardOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    tradeShowId: expense?.tradeShowId || '',
    amount: expense?.amount || 0,
    category: expense?.category || '',
    merchant: expense?.merchant || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    description: expense?.description || '',
    cardUsed: expense?.cardUsed || '',
    reimbursementRequired: expense?.reimbursementRequired || false,
    reimbursementStatus: expense?.reimbursementStatus || 'pending',
    status: expense?.status || 'pending' as const,
    zohoEntity: expense?.zohoEntity || '',
    location: expense?.location || '',
    ocrText: expense?.ocrText || '',
    receiptUrl: expense?.receiptUrl || ''
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState<any>(null);

  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    setCardOptions(settings.cardOptions || [
      'Corporate Amex',
      'Corporate Visa', 
      'Personal Card (Reimbursement)',
      'Company Debit',
      'Cash'
    ]);
    setEntityOptions(settings.entityOptions || [
      'Entity A - Main Operations',
      'Entity B - Sales Division',
      'Entity C - Marketing Department', 
      'Entity D - International Operations'
    ]);
  }, []);
  // Listen for OCR data from receipt upload
  useEffect(() => {
    const handlePopulateForm = (event: CustomEvent) => {
      const ocrData = event.detail;
      setFormData({
        ...formData,
        amount: ocrData.amount || 0,
        category: ocrData.category || '',
        merchant: ocrData.merchant || '',
        date: ocrData.date || new Date().toISOString().split('T')[0],
        description: ocrData.description || '',
        cardUsed: ocrData.cardUsed || '',
        reimbursementRequired: ocrData.reimbursementRequired || false,
        location: ocrData.location || ''
      });
    };

    window.addEventListener('populateExpenseForm', handlePopulateForm as EventListener);
    return () => {
      window.removeEventListener('populateExpenseForm', handlePopulateForm as EventListener);
    };
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required receipt for new expenses
    if (!expense && !receiptFile && !formData.receiptUrl) {
      alert('Please upload a receipt image. This is required for all expense submissions.');
      return;
    }
    
    onSave(formData);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    setReceiptFile(file);
    setIsProcessingOCR(true);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFormData({ ...formData, receiptUrl: previewUrl });

    // Simulate OCR processing with improved extraction logic
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      // Enhanced OCR simulation based on image filename patterns
      const filename = file.name.toLowerCase();
      let merchant = 'Unknown Merchant';
      let category = 'Other';
      let amount = (Math.random() * 200 + 10).toFixed(2);
      let location = 'Unknown Location';
      
      // Detect merchant from filename or use contextual detection
      if (filename.includes('hertz') || filename.includes('rental') || filename.includes('car')) {
        merchant = 'Hertz Car Rental';
        category = 'Transportation';
        amount = (Math.random() * 300 + 150).toFixed(2);
        location = 'Indianapolis, IN';
      } else if (filename.includes('flight') || filename.includes('airline') || filename.includes('delta') || filename.includes('united')) {
        merchant = 'Delta Airlines';
        category = 'Flights';
        amount = (Math.random() * 500 + 200).toFixed(2);
        location = 'Atlanta, GA';
      } else if (filename.includes('hotel') || filename.includes('marriott') || filename.includes('hilton')) {
        merchant = 'Marriott Hotel';
        category = 'Hotels';
        amount = (Math.random() * 250 + 100).toFixed(2);
        location = 'Las Vegas, NV';
      } else if (filename.includes('restaurant') || filename.includes('food') || filename.includes('meal')) {
        merchant = 'Restaurant';
        category = 'Meals';
        amount = (Math.random() * 80 + 20).toFixed(2);
        location = 'New York, NY';
      } else if (filename.includes('uber') || filename.includes('lyft') || filename.includes('taxi')) {
        merchant = 'Uber';
        category = 'Transportation';
        amount = (Math.random() * 50 + 10).toFixed(2);
        location = 'Chicago, IL';
      } else {
        // Default to contextual business expense
        const merchants = ['Office Supplies Plus', 'Tech Conference', 'Business Center', 'Trade Show Services'];
        merchant = merchants[Math.floor(Math.random() * merchants.length)];
        category = 'Supplies';
      }
      
      const today = new Date();
      const mockOcrText = `
        RECEIPT
        Merchant: ${merchant}
        Date: ${today.toLocaleDateString()}
        Amount: $${amount}
        Location: ${location}
        Thank you for your business!
      `;

      const extractedData = {
        merchant: mockOcrText.match(/Merchant: (.+)/)?.[1] || '',
        amount: parseFloat(mockOcrText.match(/Amount: \$(.+)/)?.[1] || '0'),
        location: mockOcrText.match(/Location: (.+)/)?.[1] || '',
        ocrText: mockOcrText.trim()
      };

      setOcrResults(extractedData);
      
      // Auto-populate form with OCR data
      setFormData(prev => ({
        ...prev,
        merchant: prev.merchant || extractedData.merchant,
        amount: prev.amount || extractedData.amount,
        location: prev.location || extractedData.location,
        ocrText: extractedData.ocrText,
        category: prev.category || category
      }));

    } catch (error) {
      console.error('OCR processing failed:', error);
      alert('Failed to process receipt. Please try again.');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Auto-flag reimbursement when personal card is selected
  useEffect(() => {
    if (formData.cardUsed && formData.cardUsed.toLowerCase().includes('personal')) {
      setFormData(prev => ({ ...prev, reimbursementRequired: true }));
    }
  }, [formData.cardUsed]);

  const suggestCategory = (merchant: string) => {
    const merchantLower = merchant.toLowerCase();
    if (merchantLower.includes('airline') || merchantLower.includes('airport') || merchantLower.includes('flight')) {
      return 'Flights';
    }
    if (merchantLower.includes('hotel') || merchantLower.includes('inn') || merchantLower.includes('resort')) {
      return 'Hotels';
    }
    if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
      return 'Meals';
    }
    if (merchantLower.includes('uber') || merchantLower.includes('taxi') || merchantLower.includes('transport')) {
      return 'Transportation';
    }
    return 'Other';
  };

  const handleMerchantChange = (merchant: string) => {
    setFormData({
      ...formData,
      merchant,
      category: formData.category || suggestCategory(merchant)
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {expense ? 'Edit Expense' : 'Add New Expense'}
              </h1>
              <p className="text-gray-600">Enter expense details and assign to a trade show</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Upload - First Field */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Receipt Image * <span className="text-red-600">(Upload First - Required)</span>
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-blue-500" />
                    <p className="mb-2 text-sm text-gray-700">
                      <span className="font-semibold">Click to upload receipt</span>
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    required={!expense}
                  />
                </label>
              </div>

              {/* Receipt Preview */}
              {formData.receiptUrl && (
                <div className="relative">
                  <img
                    src={formData.receiptUrl}
                    alt="Receipt preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border mx-auto"
                  />
                  {isProcessingOCR && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-700 font-medium">Processing receipt...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OCR Results */}
              {ocrResults && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-semibold text-green-800">Receipt Processed Successfully</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Form fields below have been auto-filled with extracted data. Please review and adjust if needed.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Show Event *
              </label>
              <select
                value={formData.tradeShowId}
                onChange={(e) => setFormData({ ...formData, tradeShowId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select an event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merchant *
              </label>
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Delta Airlines, Marriott Hotel"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Used *
              </label>
              <select
                value={formData.cardUsed}
                onChange={(e) => setFormData({ ...formData, cardUsed: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select card used</option>
                {cardOptions.map((card, index) => (
                  <option key={index} value={card}>{card}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Las Vegas, NV"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional details about this expense..."
            />
          </div>

          {/* OCR Text Display */}
          {formData.ocrText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OCR Extracted Text
              </label>
              <textarea
                value={formData.ocrText}
                readOnly
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                placeholder="OCR text will appear here after receipt processing..."
              />
            </div>
          )}

          {/* Reimbursement Required */}
          <div className={`rounded-lg p-6 ${formData.reimbursementRequired ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="reimbursementRequired"
                checked={formData.reimbursementRequired}
                onChange={(e) => setFormData({ ...formData, reimbursementRequired: e.target.checked })}
                disabled={formData.cardUsed.toLowerCase().includes('personal')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
              />
              <label htmlFor="reimbursementRequired" className="text-sm font-medium text-gray-900">
                Reimbursement Required
                {formData.cardUsed.toLowerCase().includes('personal') && (
                  <span className="ml-2 text-xs text-yellow-700 font-semibold">(Auto-flagged for Personal Card)</span>
                )}
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-7">
              {formData.cardUsed.toLowerCase().includes('personal') 
                ? 'Personal card expenses are automatically flagged for reimbursement approval.' 
                : 'Check this box if this expense requires separate reimbursement approval from the accountant.'}
            </p>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{expense ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};