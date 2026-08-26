import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { boothApi, BoothAttachment } from '../../utils/boothApi';

interface Props {
  entityType: string;
  entityId: string;
  canEdit: boolean;
}

export const PhotoGallery: React.FC<Props> = ({ entityType, entityId, canEdit }) => {
  const [photos, setPhotos] = useState<BoothAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPhotos(await boothApi.listAttachments(entityType, entityId));
    } catch {
      setError("Couldn't load photos. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { void load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await boothApi.uploadAttachment(entityType, entityId, file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload this photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await boothApi.deleteAttachment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this photo');
    }
  };

  return (
    <div>
      {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {canEdit && (
        <div className="mb-3">
          <label className="text-sm font-medium" htmlFor="photo-upload">Add photo</label>
          <input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleUpload}
            className="mt-1 block text-sm"
          />
          {uploading && <p className="mt-1 text-xs text-gray-500">Uploading…</p>}
        </div>
      )}

      {!error && loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!error && !loading && photos.length === 0 && (
        <p className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No photos yet.
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded border">
              <img src={p.url} alt={p.caption ?? 'Booth photo'} className="h-32 w-full object-cover" />
              {canEdit && (
                <button
                  onClick={() => handleDelete(p.id)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
