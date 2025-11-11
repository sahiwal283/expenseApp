/**
 * BoothMapUpload Component
 * 
 * Booth map upload and display component.
 */

import React from 'react';
import { Map, Upload, X } from 'lucide-react';

interface BoothMapUploadProps {
  boothMapUrl: string | null;
  uploadingMap: boolean;
  boothMapInputRef: React.RefObject<HTMLInputElement>;
  onMapUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDeleteMap: () => Promise<void>;
}

export const BoothMapUpload: React.FC<BoothMapUploadProps> = ({
  boothMapUrl,
  uploadingMap,
  boothMapInputRef,
  onMapUpload,
  onDeleteMap
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Map className="w-4 h-4" />
          Booth Floor Plan
        </label>
        {boothMapUrl && (
          <button
            onClick={onDeleteMap}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete map"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {boothMapUrl ? (
        <div className="relative group">
          <img
            src={`${import.meta.env.VITE_API_BASE_URL || '/api'}${boothMapUrl}`}
            alt="Booth Map"
            className="w-full h-32 object-contain bg-white rounded border border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded flex items-center justify-center">
            <button
              onClick={() => boothMapInputRef.current?.click()}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-700 rounded-lg shadow-lg text-sm flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Replace
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => boothMapInputRef.current?.click()}
          disabled={uploadingMap}
          className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm text-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploadingMap ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Floor Plan
            </>
          )}
        </button>
      )}
      
      <p className="text-xs text-gray-500 mt-1">
        Upload booth layout/map (JPG, PNG, GIF, PDF • Max 10MB)
      </p>
    </div>
  );
};

