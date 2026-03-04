import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { HiCamera, HiX } from 'react-icons/hi';
import imageCompression from 'browser-image-compression';

const MAX_FILE_SIZE_MB = 1;

const PhotoUpload = memo(({ 
  photos = [], 
  onChange, 
  maxPhotos = 4, 
  label = "Upload Photos",
  helperText = "Upload up to 4 photos for verification",
  error 
}) => {
  const fileInputRef = useRef(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [uploading, setUploading] = useState(false);

  const processFile = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB before compression');
    }
    let compressed = file;
    try {
      compressed = await imageCompression(file, {
        maxSizeMB: MAX_FILE_SIZE_MB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
    } catch {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`Ukuran foto maksimal ${MAX_FILE_SIZE_MB}MB. Kompresi gagal.`);
      }
    }
    if (compressed.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Ukuran foto maksimal ${MAX_FILE_SIZE_MB}MB setelah kompresi.`);
    }
    const preview = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(compressed);
    });
    return {
      id: `${Date.now()}-${Math.random()}`,
      file: compressed,
      preview,
      name: compressed.name,
      size: compressed.size,
      type: compressed.type,
      uploadedAt: new Date().toISOString(),
    };
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    
    if (photos.length + files.length > maxPhotos) {
      alert(`You can only upload up to ${maxPhotos} photos`);
      return;
    }

    setUploading(true);
    Promise.all(files.map(processFile))
      .then((newPhotos) => {
        onChange([...photos, ...newPhotos]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch((err) => {
        alert(err?.message || 'Upload failed');
      })
      .finally(() => {
        setUploading(false);
      });
  }, [photos, onChange, maxPhotos, processFile]);

  const handleRemovePhoto = useCallback((photoId) => {
    const removed = photos.find((p) => p.id === photoId);
    if (removed?.preview && typeof removed.preview === 'string' && removed.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview);
    }
    onChange(photos.filter((p) => p.id !== photoId));
  }, [photos, onChange]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    return () => {
      (photosRef.current || []).forEach((p) => {
        if (p?.preview && typeof p.preview === 'string' && p.preview.startsWith('blob:')) {
          URL.revokeObjectURL(p.preview);
        }
      });
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}

      {/* Helper Text */}
      {helperText && (
        <p className="text-xs text-neutral-500">
          {helperText}
        </p>
      )}

      {/* Upload Button */}
      {photos.length < maxPhotos && (
        <button
          type="button"
          onClick={handleClickUpload}
          disabled={uploading}
          className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
            error 
              ? 'border-red-300 bg-red-50' 
              : 'border-neutral-300 hover:border-neutral-900 bg-neutral-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex flex-col items-center gap-2">
            <HiCamera className={`w-8 h-8 ${error ? 'text-red-400' : 'text-neutral-400'}`} />
            <span className="text-sm font-medium text-neutral-700">
              {uploading ? 'Uploading...' : 'Click to upload photos'}
            </span>
            <span className="text-xs text-neutral-500">
              {photos.length} / {maxPhotos} photos uploaded
            </span>
          </div>
        </button>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group bg-neutral-100 rounded-lg overflow-hidden aspect-video"
            >
              {/* Photo Preview */}
              <img
                src={photo.preview}
                alt={photo.name}
                className="w-full h-full object-cover"
              />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-neutral-900 hover:bg-neutral-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove photo"
              >
                <HiX className="w-4 h-4" />
              </button>

              {/* Photo Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white font-medium truncate">
                  {photo.name}
                </p>
                <p className="text-xs text-neutral-300">
                  {formatFileSize(photo.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PhotoUpload.displayName = 'PhotoUpload';

export default PhotoUpload;
