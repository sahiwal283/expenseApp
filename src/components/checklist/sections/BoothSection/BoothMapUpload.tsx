/**
 * BoothMapUpload Component
 * 
 * Booth map upload and display component.
 */

import React, { useState } from 'react';
import { Map, Upload, X } from 'lucide-react';
import { BoothMapViewer } from '../../../common/BoothMapViewer';

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
  const [showBoothMapViewer, setShowBoothMapViewer] = useState(false);

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
        <div className="space-y-2">
          <div className="relative group">
            <img
              src={`${import.meta.env.VITE_API_BASE_URL || '/api'}${boothMapUrl}`}
              alt="Booth Map"
              className="w-full h-32 object-contain bg-white rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowBoothMapViewer(true)}
              title="Click to view full size"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => boothMapInputRef.current?.click()}
              className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
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

      {/* Booth Map Viewer Modal */}
      {boothMapUrl && (
        <BoothMapViewer
          boothMapUrl={boothMapUrl}
          isOpen={showBoothMapViewer}
          onClose={() => setShowBoothMapViewer(false)}
        />
      )}
    </div>
  );
};

