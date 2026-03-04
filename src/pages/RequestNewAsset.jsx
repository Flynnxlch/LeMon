import imageCompression from 'browser-image-compression';
import { memo, useCallback, useState } from 'react';
import { HiUpload, HiX } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import Card from '../components/common/Card/Card';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ASSET_TYPES, getBrandsForType, getModelsForBrand } from '../utils/assetTypeOptions';

const RequestNewAsset = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;
      if (!user?.branch_id) {
        setErrors((prev) => ({ ...prev, submit: 'Branch tidak ditemukan.' }));
        return;
      }
      setSubmitting(true);
      try {
        await api.assetRequests.create(
          {
            serialNumber: formData.serialNumber.trim(),
            type: formData.type,
            brand: formData.brand?.trim() || '',
            model: formData.model?.trim() || '',
            detail: formData.detail?.trim() || '',
            branchId: user.branch_id,
          },
          formData.photo || null
        );
        if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
        alert('Pengajuan aset baru berhasil dikirim. Menunggu persetujuan Admin Pusat.');
        navigate('/assets');
      } catch (err) {
        setErrors((prev) => ({ ...prev, submit: err.message || 'Gagal mengirim pengajuan.' }));
      } finally {
        setSubmitting(false);
      }
    },
    [formData, user, validate, navigate]
  );

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Request New Asset
        </h1>
        <p className="text-sm text-neutral-500">
          Ajukan permintaan aset baru. Persetujuan Admin Pusat diperlukan.
        </p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {errors.submit && (
            <p className="text-sm text-red-600">{errors.submit}</p>
          )}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" onClick={() => navigate('/assets')} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isUploading || submitting}>
              {submitting ? 'Mengirim...' : isUploading ? 'Memproses...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Card>
    </MainLayout>
  );
});

RequestNewAsset.displayName = 'RequestNewAsset';

export default RequestNewAsset;
