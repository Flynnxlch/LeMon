import imageCompression from 'browser-image-compression';
import { memo, useCallback, useEffect, useState } from 'react';
import { HiUpload, HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import ModalWrapper from '../../common/ModalWrapper/ModalWrapper';
import { ASSET_TYPES, getBrandsForType, getModelsForBrand } from '../../../utils/assetTypeOptions';

const AddAssetModal = memo(({ isOpen, onClose, onSubmit, branches = [], branchesLoading = false }) => {
  const [formData, setFormData] = useState({
    serialNumber: '',
    type: '',
    brand: '',
    model: '',
    detail: '',
    branchId: '',
    photo: null,
    photoPreview: null,
  });
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'type') {
        next.brand = '';
        next.model = '';
      } else if (name === 'brand') {
        next.model = '';
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Please select a valid image file' }));
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'File size should be less than 10MB' }));
      return;
    }

    setIsUploading(true);

    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };

      const compressedFile = await imageCompression(file, options);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);

      setFormData(prev => ({
        ...prev,
        photo: compressedFile,
        photoPreview: previewUrl
      }));
      setErrors(prev => ({ ...prev, photo: '' }));
    } catch (error) {
      console.error('Error compressing image:', error);
      setErrors(prev => ({ ...prev, photo: 'Error processing image' }));
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    if (formData.photoPreview) {
      URL.revokeObjectURL(formData.photoPreview);
    }
    setFormData(prev => ({ ...prev, photo: null, photoPreview: null }));
  }, [formData.photoPreview]);

  // When modal opens with branches, preselect if only one branch
  useEffect(() => {
    if (!isOpen || branches.length === 0) return;
    setFormData(prev => {
      if (prev.branchId) return prev;
      if (branches.length === 1) return { ...prev, branchId: branches[0].id };
      return prev;
    });
  }, [isOpen, branches]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Serial number is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    } else {
      // Validate conditional fields
      if (!formData.brand.trim()) {
        newErrors.brand = 'Brand name is required';
      }
      if (!formData.model.trim()) {
        newErrors.model = 'Model/Type is required';
      }
    }

    if (!formData.branchId || !String(formData.branchId).trim()) {
      newErrors.branchId = 'Branch is required';
    }
    if (!formData.photo) {
      newErrors.photo = 'Photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, branches.length]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData });
      if (formData.photoPreview) {
        URL.revokeObjectURL(formData.photoPreview);
      }
      setFormData({
        serialNumber: '',
        type: '',
        brand: '',
        model: '',
        detail: '',
        branchId: formData.branchId,
        photo: null,
        photoPreview: null,
      });
      setErrors({});
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err?.message || 'Gagal menambah aset. Periksa Branch dan data lalu coba lagi.' }));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, validateForm, isSubmitting]);

  const handleClose = useCallback(() => {
    if (formData.photoPreview) {
      URL.revokeObjectURL(formData.photoPreview);
    }
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
    onClose();
  }, [formData.photoPreview, onClose]);

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-2xl" className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Add New Asset
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close modal"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errors.submit}
            </div>
          )}
          {/* Serial Number */}
          <div>
            <Input
              label="Serial Number"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="e.g., SN-ABC123456"
              error={errors.serialNumber}
              required
            />
          </div>

          {/* Branch - data dari database */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                errors.branchId ? 'border-red-500' : 'border-neutral-300'
              }`}
              required
            >
              <option value="">Pilih branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="mt-1 text-sm text-red-500">{errors.branchId}</p>}
            {branchesLoading && branches.length === 0 && (
              <p className="mt-1 text-sm text-neutral-500">Memuat daftar branch...</p>
            )}
            {!branchesLoading && branches.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">Belum ada cabang. Tambah cabang di Branch &amp; User Management terlebih dahulu.</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tipe Aset <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors ${
                errors.type
                  ? 'border-red-500'
                  : 'border-neutral-300'
              }`}
              required
            >
              <option value="">Pilih tipe aset</option>
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Brand & Model dropdowns per type */}
          {formData.type && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                      errors.brand ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    required
                  >
                    <option value="">Pilih brand</option>
                    {getBrandsForType(formData.type).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                      errors.model ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    required
                  >
                    <option value="">Pilih model</option>
                    {getModelsForBrand(formData.type, formData.brand).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Detail <span className="text-neutral-400 text-xs font-normal">(Optional)</span>
                </label>
                <textarea
                  name="detail"
                  value={formData.detail}
                  onChange={handleChange}
                  placeholder="Additional details about the asset..."
                  rows={3}
                  className="block w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Asset Photo <span className="text-red-500">*</span>
            </label>

            {!formData.photoPreview ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    errors.photo
                      ? 'border-red-500 bg-red-50'
                      : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <HiUpload className="w-12 h-12 mb-3 text-neutral-400" />
                    <p className="mb-2 text-sm text-neutral-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-neutral-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    {isUploading && (
                      <p className="mt-2 text-sm text-neutral-600">
                        Compressing image...
                      </p>
                    )}
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={formData.photoPreview}
                  alt="Asset preview"
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  aria-label="Remove photo"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            )}

            {errors.photo && (
              <p className="mt-1 text-sm text-red-500">{errors.photo}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : isUploading ? (
                'Processing...'
              ) : (
                'Add Asset'
              )}
            </Button>
          </div>
        </form>
    </ModalWrapper>
  );
});

AddAssetModal.displayName = 'AddAssetModal';

export default AddAssetModal;
