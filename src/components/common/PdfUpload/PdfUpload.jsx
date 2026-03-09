import { memo, useCallback, useRef, useState } from 'react';
import { HiDocument, HiX } from 'react-icons/hi';

const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const MAX_SIZE_LABEL = '500KB';

const PdfUpload = memo(({
  file = null,
  onChange,
  label = 'Berita Acara (PDF)',
  helperText = `Hanya file PDF. Maksimal ${MAX_SIZE_LABEL}.`,
  error,
  required = true,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');

  const validate = useCallback((f) => {
    if (!f) return required ? 'Berita Acara wajib diunggah.' : null;
    if (f.type !== 'application/pdf') {
      return 'Hanya file PDF yang diperbolehkan.';
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `Ukuran file maksimal ${MAX_SIZE_LABEL}. Saat ini: ${(f.size / 1024).toFixed(1)}KB.`;
    }
    return '';
  }, [required]);

  const handleChange = useCallback((e) => {
    const f = e.target.files?.[0];
    setLocalError('');
    if (!f) {
      onChange(null);
      return;
    }
    const err = validate(f);
    if (err) {
      setLocalError(err);
      onChange(null);
      return;
    }
    onChange(f);
  }, [onChange, validate]);

  const handleRemove = useCallback(() => {
    setLocalError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  const displayError = error || localError;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {helperText && (
        <p className="text-xs text-neutral-500">{helperText}</p>
      )}
      {!file ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
            id="pdf-upload-berita-acara"
          />
          <label
            htmlFor="pdf-upload-berita-acara"
            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              displayError
                ? 'border-red-300 bg-red-50/50 hover:bg-red-50'
                : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <HiDocument className="w-5 h-5 text-neutral-500" />
            <span className="text-sm text-neutral-600">
              Pilih file PDF (maks. {MAX_SIZE_LABEL})
            </span>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <HiDocument className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium text-neutral-800 truncate" title={file.name}>
              {file.name}
            </span>
            <span className="text-xs text-neutral-500 shrink-0">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Hapus file"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {displayError && (
        <p className="text-sm text-red-600">{displayError}</p>
      )}
    </div>
  );
});

PdfUpload.displayName = 'PdfUpload';

export default PdfUpload;
export { MAX_SIZE_BYTES, MAX_SIZE_LABEL };
