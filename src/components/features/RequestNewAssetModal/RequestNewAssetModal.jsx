import imageCompression from 'browser-image-compression';
import { memo, useCallback, useState } from 'react';
import { HiUpload, HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import ModalWrapper from '../../common/ModalWrapper/ModalWrapper';
import { useAuth } from '../../../context/AuthContext';
import { ASSET_TYPES, getBrandsForType, getModelsForBrand } from '../../../utils/assetTypeOptions';

const RequestNewAssetModal = memo(({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    type: '',
    brand: '',
    model: '',
    detail: '',
    photo: null,
    photoPreview: null,
  });
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'type') {
        next.brand = '';
        next.model = '';
      } else if (name === 'brand') {
        next.model = '';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photo: 'Pilih file gambar yang valid' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'Ukuran file maksimal 10MB' }));
      return;
    }
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      const previewUrl = URL.createObjectURL(compressed);
      setFormData((prev) => ({ ...prev, photo: compressed, photoPreview: previewUrl }));
      setErrors((prev) => ({ ...prev, photo: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, photo: 'Gagal memproses gambar' }));
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
    setFormData((prev) => ({ ...prev, photo: null, photoPreview: null }));
  }, [formData.photoPreview]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Serial number wajib';
    if (!formData.type) newErrors.type = 'Tipe aset wajib';
    if (formData.type && (!formData.brand?.trim())) newErrors.brand = 'Brand wajib';
    if (formData.type && (!formData.model?.trim())) newErrors.model = 'Model wajib';
    if (!formData.photo) newErrors.photo = 'Foto aset wajib';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      serialNumber: '',
      type: '',
      brand: '',
      model: '',
      detail: '',
      photo: null,
      photoPreview: null,
    });
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
    resetForm();
    onClose();
  }, [onClose, resetForm, formData.photoPreview]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;
      if (!onSubmit) return;
      setSubmitting(true);
      try {
        const payload = {
          serialNumber: formData.serialNumber.trim(),
          type: formData.type,
          brand: formData.brand?.trim() || '',
          model: formData.model?.trim() || '',
          detail: formData.detail?.trim() || '',
        };
        await onSubmit(payload, formData.photo);
        if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
        resetForm();
        onClose();
      } catch (err) {
        setErrors((prev) => ({ ...prev, submit: err.message || 'Gagal mengirim pengajuan' }));
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validate, onSubmit, onClose, resetForm]
  );

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-2xl" className="flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h3 className="text-lg font-semibold text-neutral-900">
          Request New Asset
        </h3>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors"
          aria-label="Tutup"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable form body */}
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <Input
            label="Serial Number"
            name="serialNumber"
            value={formData.serialNumber}
            onChange={handleChange}
            placeholder="e.g. SN-ABC123456"
            error={errors.serialNumber}
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tipe Aset <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                errors.type ? 'border-red-500' : 'border-neutral-200'
              }`}
            >
              <option value="">Pilih tipe aset</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
          </div>

          {formData.type && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Brand <span className="text-red-500">*</span></label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${errors.brand ? 'border-red-500' : 'border-neutral-200'}`}
                >
                  <option value="">Pilih brand</option>
                  {getBrandsForType(formData.type).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Model <span className="text-red-500">*</span></label>
                <select
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${errors.model ? 'border-red-500' : 'border-neutral-200'}`}
                >
                  <option value="">Pilih model</option>
                  {getModelsForBrand(formData.type, formData.brand).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Detail (opsional)</label>
            <textarea
              name="detail"
              value={formData.detail}
              onChange={handleChange}
              placeholder="Detail tambahan..."
              rows={3}
              className="block w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Foto Aset <span className="text-red-500">*</span>
            </label>
            {!formData.photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" disabled={isUploading} />
                <HiUpload className="w-10 h-10 text-neutral-400 mb-2" />
                <span className="text-sm text-neutral-500">Klik untuk upload</span>
                {errors.photo && <p className="mt-1 text-sm text-red-500">{errors.photo}</p>}
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={formData.photoPreview} alt="Preview" className="h-48 object-cover rounded-lg border border-neutral-200" />
                <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200">
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="px-6 py-2">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}
        {/* Footer buttons */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isUploading || submitting}>
            {submitting ? 'Mengirim...' : isUploading ? 'Memproses...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </form>
    </ModalWrapper>
  );
});

RequestNewAssetModal.displayName = 'RequestNewAssetModal';

export default RequestNewAssetModal;
