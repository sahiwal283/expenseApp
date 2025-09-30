import React, { useState, useRef } from 'react';
import { Upload, X, ArrowLeft, Camera, FileImage, Scan, CheckCircle, AlertCircle } from 'lucide-react';

interface ReceiptUploadProps {
  onReceiptProcessed: (data: any) => void;
  onCancel: () => void;
}

// Simple OCR simulation using basic text extraction
const extractTextFromImage = async (imageData: string): Promise<string> => {
  // In a real implementation, you would use a library like Tesseract.js
  // For now, we'll simulate OCR with mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockOcrText = `
        RECEIPT
        Merchant: Sample Store
        Date: ${new Date().toLocaleDateString()}
        Amount: $${(Math.random() * 100 + 10).toFixed(2)}
        Location: Sample City, ST
        Thank you for your business!
      `;
      resolve(mockOcrText.trim());
    }, 1500);
  });
};
export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onReceiptProcessed, onCancel }) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<any>(null);
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
    
    // Extract OCR text from image
    const ocrText = await extractTextFromImage(uploadedImage!);
    
    // Simulate OCR processing with realistic delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock OCR results - in real implementation, this would call an OCR API
    const mockResults = {
      total: Math.floor(Math.random() * 200) + 20,
      merchant: ['Starbucks', 'McDonald\'s', 'Delta Airlines', 'Marriott Hotel', 'Uber'][Math.floor(Math.random() * 5)],
      date: new Date().toISOString().split('T')[0],
      location: ['Las Vegas, NV', 'New York, NY', 'Chicago, IL', 'San Francisco, CA'][Math.floor(Math.random() * 4)],
      category: 'Meals',
      ocrText: ocrText,
      items: [
        { name: 'Coffee', price: 4.50 },
        { name: 'Pastry', price: 3.25 },
        { name: 'Tax', price: 0.62 }
      ],
      confidence: 0.95
    };

    // Auto-categorize based on merchant
    if (mockResults.merchant.includes('Airlines') || mockResults.merchant.includes('Airport')) {
      mockResults.category = 'Flights';
    } else if (mockResults.merchant.includes('Hotel') || mockResults.merchant.includes('Inn')) {
      mockResults.category = 'Hotels';
    } else if (mockResults.merchant.includes('Uber') || mockResults.merchant.includes('Taxi')) {
      mockResults.category = 'Transportation';
    }

    setOcrResults(mockResults);
    setProcessing(false);
  };

  const handleConfirm = () => {
    if (ocrResults) {
      onReceiptProcessed(ocrResults);
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Receipt Scanner</h1>
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
                  Supports JPG, PNG, and PDF files. Our advanced OCR will automatically extract expense details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center space-x-3">
                  <Camera className="w-8 h-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Smart Scanning</h4>
                    <p className="text-sm text-gray-600">AI-powered data extraction</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileImage className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Multiple Formats</h4>
                    <p className="text-sm text-gray-600">JPG, PNG, PDF supported</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Scan className="w-8 h-8 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Auto Categorize</h4>
                    <p className="text-sm text-gray-600">Intelligent expense sorting</p>
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
                <img
                  src={uploadedImage}
                  alt="Uploaded receipt"
                  className="w-full h-auto rounded-lg shadow-md"
                />
                {processing && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-700 font-medium">Processing receipt...</p>
                      <p className="text-sm text-gray-600">Extracting expense data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OCR Results */}
            {ocrResults && !processing && (
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Extracted Data</h3>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 text-xs font-medium rounded-full">
                      {Math.round(ocrResults.confidence * 100)}% confidence
                    </span>
                  </div>
                  {ocrResults.confidence < 0.8 && (
                    <div className="flex items-center text-orange-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Please verify extracted data
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
                      <div className="bg-white px-3 py-2 rounded-lg border">{ocrResults.merchant}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                      <div className="bg-white px-3 py-2 rounded-lg border font-semibold text-emerald-600">
                        ${ocrResults.total.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <div className="bg-white px-3 py-2 rounded-lg border">{ocrResults.date}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="bg-white px-3 py-2 rounded-lg border">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 text-sm font-medium rounded-full">
                          {ocrResults.category}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <div className="bg-white px-3 py-2 rounded-lg border">{ocrResults.location}</div>
                    </div>
                  </div>
                </div>

                {ocrResults.items && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Line Items</label>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      {ocrResults.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center px-4 py-2 border-b last:border-b-0">
                          <span className="text-gray-900">{item.name}</span>
                          <span className="font-medium">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
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
    </div>
  );
};