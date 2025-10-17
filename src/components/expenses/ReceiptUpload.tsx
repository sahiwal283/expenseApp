import React, { useState, useRef } from 'react';
import { Upload, X, ArrowLeft, Camera, FileImage, Scan, CheckCircle, AlertCircle } from 'lucide-react';
import { api, TokenManager } from '../../utils/api';
import { ReceiptData } from '../../types/types';
import { getTodayLocalDateString } from '../../utils/dateUtils';

interface ReceiptUploadProps {
  onReceiptProcessed: (data: ReceiptData, file: File) => void;
  onCancel: () => void;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onReceiptProcessed, onCancel }) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<ReceiptData | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        processReceipt(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const processReceipt = async (file: File) => {
    setProcessing(true);
    
    try {
      // Call NEW OCR v2 API (PaddleOCR + Ollama LLM)
      const formData = new FormData();
      formData.append('receipt', file);
      
      const token = TokenManager.getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/ocr/v2/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR v2 failed:', errorText);
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      
      console.log('[OCR v2] Response:', result);
      
      // Transform OCR v2 response to match expected format
      const inference = result.inference || {};
      const ocrData = {
        file: file,
        total: inference.amount?.value || 0,
        merchant: inference.merchant?.value || 'Unknown Merchant',
        date: inference.date?.value || getTodayLocalDateString(),
        location: inference.location?.value || 'Unknown Location',
        category: inference.category?.value || result.categories?.[0]?.category || 'Other',
        ocrText: result.ocr?.text || '',
        confidence: result.overallConfidence || result.ocr?.confidence || 0,
        receiptFile: file,
        // Store enhanced OCR v2 data for corrections
        ocrV2Data: {
          inference,
          categories: result.categories || [],
          needsReview: result.needsReview,
          reviewReasons: result.reviewReasons || [],
          ocrProvider: result.ocr?.provider
        }
      };

      setOcrResults(ocrData);
    } catch (error) {
      console.error('OCR v2 Error:', error);
      alert('Failed to process receipt with OCR v2. Please try again or enter manually.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (ocrResults) {
      onReceiptProcessed(ocrResults, selectedFile!);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 lg:p-8">
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

        {!uploadedImage ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Upload className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Drop your receipt here, or click to browse
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Supports JPG and PNG files. Our OCR will automatically extract expense details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center space-x-3">
                  <Camera className="w-8 h-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Advanced OCR</h4>
                    <p className="text-sm text-gray-600">PaddleOCR + AI powered</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileImage className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Smart Categories</h4>
                    <p className="text-sm text-gray-600">AI-suggested with confidence</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Scan className="w-8 h-8 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Auto Extract</h4>
                    <p className="text-sm text-gray-600">Amount, date, merchant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Image Preview */}
            <div className="flex justify-center">
              <div className="relative max-w-md">
                <div 
                  onClick={() => !processing && setShowFullImage(true)}
                  className="cursor-pointer group relative"
                >
                  <img
                    src={uploadedImage}
                    alt="Uploaded receipt"
                    className="w-full h-auto rounded-lg shadow-md group-hover:shadow-xl transition-shadow"
                  />
                  {!processing && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                      <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-sm font-medium text-gray-900">Click to view full size</p>
                      </div>
                    </div>
                  )}
                </div>
                {processing && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-700 font-medium">Processing receipt...</p>
                      <p className="text-sm text-gray-600">Extracting expense data with OCR</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OCR Results */}
            {ocrResults && !processing && (
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
                  {ocrResults.ocrV2Data?.needsReview && (
                    <div className="flex items-center text-orange-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Review recommended
                    </div>
                  )}
                </div>

                {/* Category Suggestions */}
                {ocrResults.ocrV2Data?.categories && ocrResults.ocrV2Data.categories.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI-Suggested Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ocrResults.ocrV2Data.categories.slice(0, 3).map((cat: any, idx: number) => (
                        <div 
                          key={idx}
                          className={`px-3 py-1.5 rounded-lg border-2 ${
                            idx === 0 
                              ? 'bg-blue-50 border-blue-300 text-blue-900' 
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{cat.category}</span>
                          <span className="ml-2 text-xs opacity-75">
                            {Math.round(cat.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      </label>
                      <input
                        type="text"
                        value={ocrResults.merchant}
                        onChange={(e) => setOcrResults({ ...ocrResults, merchant: e.target.value })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Merchant name"
                      />
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
                        value={ocrResults.total}
                        onChange={(e) => setOcrResults({ ...ocrResults, total: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-emerald-600"
                        placeholder="0.00"
                      />
                    </div>
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
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category (Top Suggestion)
                        {ocrResults.ocrV2Data?.inference?.category && (
                          <span className={`ml-2 text-xs ${
                            ocrResults.ocrV2Data.inference.category.confidence >= 0.7 ? 'text-emerald-600' :
                            ocrResults.ocrV2Data.inference.category.confidence >= 0.5 ? 'text-yellow-600' :
                            'text-orange-600'
                          }`}>
                            ({Math.round(ocrResults.ocrV2Data.inference.category.confidence * 100)}%)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={ocrResults.category}
                        onChange={(e) => setOcrResults({ ...ocrResults, category: e.target.value })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                        {ocrResults.ocrV2Data?.inference?.location && (
                          <span className={`ml-2 text-xs ${
                            ocrResults.ocrV2Data.inference.location.confidence >= 0.7 ? 'text-emerald-600' :
                            ocrResults.ocrV2Data.inference.location.confidence >= 0.5 ? 'text-yellow-600' :
                            'text-orange-600'
                          }`}>
                            ({Math.round(ocrResults.ocrV2Data.inference.location.confidence * 100)}%)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={ocrResults.location}
                        onChange={(e) => setOcrResults({ ...ocrResults, location: e.target.value })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Location"
                      />
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
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setUploadedImage(null);
                  setSelectedFile(null);
                  setOcrResults(null);
                  setProcessing(false);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Upload Different Receipt
              </button>
              
              {ocrResults && (
                <button
                  onClick={handleConfirm}
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Create Expense</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && uploadedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
          <div className="max-w-5xl max-h-[90vh] overflow-auto">
            <img
              src={uploadedImage}
              alt="Receipt full size"
              className="w-auto h-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
