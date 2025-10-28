import React from 'react';
import { Eye, DollarSign, Zap, Activity, CheckCircle, XCircle, Globe } from 'lucide-react';

interface OCRMetrics {
  service?: {
    url: string;
    status: string;
    primary: string;
    fallback: string;
    availability: Record<string, boolean>;
    languages: string[];
    confidenceThreshold: number;
  };
  usage?: {
    all: {
      total: number;
      thisMonth: number;
      today: number;
    };
    googleVision: {
      total: number;
      thisMonth: number;
      today: number;
    };
    freeThreshold: number;
    remainingFree: number;
  };
  costs?: {
    estimatedThisMonth: string;
    currency: string;
    pricingModel: string;
    projectedMonthly: string;
  };
  performance?: {
    provider: string;
    fallback: string;
    expectedSpeed: string;
    availability: Record<string, boolean>;
  };
}

interface OcrTabProps {
  ocrMetrics: OCRMetrics | null;
}

export const OcrTab: React.FC<OcrTabProps> = ({ ocrMetrics }) => {
  console.log('[OcrTab] Received ocrMetrics:', ocrMetrics);
  
  if (!ocrMetrics) {
    console.log('[OcrTab] ocrMetrics is null/undefined, showing unavailable message');
    return (
      <div className="text-center py-12">
        <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">OCR Service Unavailable</p>
        <p className="text-gray-400 text-sm mt-2">Unable to connect to the OCR service</p>
      </div>
    );
  }

  const { service, usage, costs, performance } = ocrMetrics;
  console.log('[OcrTab] Destructured data:', { service, usage, costs, performance });

  return (
    <div className="space-y-6">
      {/* Service Status Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
          <Eye className="w-6 h-6 text-purple-600" />
          OCR Service Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Service Health */}
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">Service Health</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`text-sm font-medium flex items-center gap-1 ${
                  service?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {service?.status === 'healthy' ? (
                    <><CheckCircle className="w-4 h-4" /> Healthy</>
                  ) : (
                    <><XCircle className="w-4 h-4" /> Unavailable</>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">URL:</span>
                <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                  {service?.url?.replace('http://', '')}
                </code>
              </div>
            </div>
          </div>

          {/* OCR Providers */}
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">OCR Providers</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Primary:</span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  {service?.primary || 'Unknown'}
                  {service?.availability?.[service?.primary || ''] && (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fallback:</span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  {service?.fallback || 'Unknown'}
                  {service?.availability?.[service?.fallback || ''] && (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Speed:</span>
                <span className="text-sm font-medium text-gray-900">
                  {performance?.expectedSpeed || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">Configuration</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Languages:</span>
                <span className="text-sm font-medium text-gray-900">
                  {service?.languages?.join(', ') || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Confidence:</span>
                <span className="text-sm font-medium text-gray-900">
                  {service?.confidenceThreshold ? `${(service.confidenceThreshold * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          Usage Statistics
        </h3>

        {/* Google Vision Receipts (Billable) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Google Vision Receipts (Billable)
            </h4>
            <span className="text-xs text-purple-600 bg-purple-100 px-3 py-1 rounded-full font-medium">
              Counts toward free tier
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
              <p className="text-sm text-gray-600 mb-2">Today</p>
              <p className="text-3xl font-bold text-purple-600">{usage?.googleVision?.today || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
              <p className="text-sm text-gray-600 mb-2">This Month</p>
              <p className="text-3xl font-bold text-purple-600">{usage?.googleVision?.thisMonth || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
              <p className="text-sm text-gray-600 mb-2">All Time</p>
              <p className="text-3xl font-bold text-purple-600">{usage?.googleVision?.total || 0}</p>
            </div>
          </div>

          {/* Free Tier Progress */}
          <div className="bg-white rounded-lg p-5 border border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900">Free Tier Usage (Google Vision only)</h4>
              <span className="text-sm text-gray-600">
                {usage?.remainingFree || 0} / {usage?.freeThreshold || 1000} remaining
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className={`h-4 rounded-full transition-all ${
                  ((usage?.freeThreshold || 1000) - (usage?.remainingFree || 0)) / (usage?.freeThreshold || 1000) > 0.9
                    ? 'bg-red-500'
                    : ((usage?.freeThreshold || 1000) - (usage?.remainingFree || 0)) / (usage?.freeThreshold || 1000) > 0.7
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${(((usage?.freeThreshold || 1000) - (usage?.remainingFree || 0)) / (usage?.freeThreshold || 1000)) * 100}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {((((usage?.freeThreshold || 1000) - (usage?.remainingFree || 0)) / (usage?.freeThreshold || 1000)) * 100).toFixed(1)}% of free tier used
            </p>
          </div>
        </div>

        {/* All Receipts (Total) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              All Receipts (Total OCR Processing)
            </h4>
            <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
              All methods combined
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200 text-center">
              <p className="text-sm text-gray-600 mb-2">Today</p>
              <p className="text-3xl font-bold text-blue-600">{usage?.all?.today || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 text-center">
              <p className="text-sm text-gray-600 mb-2">This Month</p>
              <p className="text-3xl font-bold text-blue-600">{usage?.all?.thisMonth || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 text-center">
              <p className="text-sm text-gray-600 mb-2">All Time</p>
              <p className="text-3xl font-bold text-blue-600">{usage?.all?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          Cost Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-5 border border-emerald-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Cost This Month:</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${costs?.estimatedThisMonth || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Projected Monthly:</span>
              <span className="text-lg font-medium text-gray-900">
                ${costs?.projectedMonthly || '0.00'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-emerald-100">
            <h4 className="font-medium text-gray-900 mb-3">Pricing Model</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {costs?.pricingModel || 'Free for first 1,000/month, then $1.50 per 1,000 images'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

