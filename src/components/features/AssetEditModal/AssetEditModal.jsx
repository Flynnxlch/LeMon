import { memo, useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import PhotoUpload from '../../common/PhotoUpload/PhotoUpload';
import GeolocationPicker from '../../common/GeolocationPicker/GeolocationPicker';
import { STATUS_OPTIONS } from '../../../utils/assetConstants';

const AssetEditModal = memo(({ isOpen, onClose, onSubmit, asset }) => {
  const [formData, setFormData] = useState({
    status: '',
    latitude: '',
    longitude: '',
    holderFullName: '',
    holderNip: '',
    holderBranchCode: '',
    holderDivision: '',
    holderEmail: '',
    holderPhone: '',
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (asset) {
      setFormData({
        status: asset.status || '',
        latitude: asset.latitude || '',
        longitude: asset.longitude || '',
        holderFullName: asset.holder?.fullName || '',
        holderNip: asset.holder?.nip || '',
        holderBranchCode: asset.holder?.branchCode || '',
        holderDivision: asset.holder?.division || '',
        holderEmail: asset.holder?.email || '',
        holderPhone: asset.holder?.phone || '',
        condition: asset.condition || '',
        conditionNote: asset.conditionNote || '',
      });
      setPhotos(
        (asset.photos || []).length > 0
          ? (asset.photos || []).map((p, i) => ({
              id: p.id || `p-${i}`,
              preview: typeof p.preview === 'string' ? p.preview : p.preview,
              name: p.name || `photo-${i + 1}`,
              uploadedAt: p.uploadedAt || new Date().toISOString(),
            }))
          : []
      );
    }
  }, [asset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationChange = ({ latitude, longitude }) => {
    setFormData(prev => ({
      ...prev,
      latitude: latitude || '',
      longitude: longitude || ''
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    // If status is not Available, location, photos and holder are required
    if (formData.status !== 'Available') {
      if (!formData.latitude) {
        newErrors.latitude = 'Latitude is required for non-available assets';
      }
      if (!formData.longitude) {
        newErrors.longitude = 'Longitude is required for non-available assets';
      }
      if (photos.length < 1 || photos.length > 4) {
        newErrors.photos = 'Upload 1 sampai 4 foto untuk verifikasi';
      }
      if (!formData.holderFullName) {
        newErrors.holderFullName = 'Holder name is required for non-available assets';
      }
      if (!formData.holderNip) {
        newErrors.holderNip = 'NIP is required for non-available assets';
      }
      if (!formData.holderBranchCode) {
        newErrors.holderBranchCode = 'Branch code is required for non-available assets';
      }
      if (!formData.holderDivision) {
        newErrors.holderDivision = 'Division is required for non-available assets';
      }
      if (!formData.holderEmail) {
        newErrors.holderEmail = 'Email is required for non-available assets';
      } else if (!/\S+@\S+\.\S+/.test(formData.holderEmail)) {
        newErrors.holderEmail = 'Email is invalid';
      }
      if (!formData.holderPhone) {
        newErrors.holderPhone = 'Phone is required for non-available assets';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const newHolder = formData.status !== 'Available' && formData.holderFullName
      ? {
          fullName: formData.holderFullName,
          nip: formData.holderNip,
          branchCode: formData.holderBranchCode,
          division: formData.holderDivision,
          email: formData.holderEmail,
          phone: formData.holderPhone,
        }
      : null;

    const updatedAsset = {
      ...asset,
      status: formData.status,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      photos: photos.map((p) => ({
        id: p.id,
        preview: p.preview,
        name: p.name,
        uploadedAt: p.uploadedAt,
      })),
      holder: newHolder,
      lastUpdate: new Date().toISOString(),
    };

    onSubmit(updatedAsset);
  };

  const handleClearHolder = () => {
    setFormData(prev => ({
      ...prev,
      holderFullName: '',
      holderNip: '',
      holderBranchCode: '',
      holderDivision: '',
      holderEmail: '',
      holderPhone: '',
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black/40" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-xl border border-gray-200 shadow-lg text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-neutral-900">
              Edit Asset - {asset?.serialNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                    errors.status ? 'border-red-500' : 'border-neutral-300'
                  }`}
                >
                  <option value="">Pilih Status</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-500">{errors.status}</p>
                )}
              </div>

              {formData.status !== 'Available' && formData.status && (
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <PhotoUpload
                    photos={photos}
                    onChange={setPhotos}
                    maxPhotos={4}
                    label="Foto Kondisi Aset (1–4)"
                    helperText="Upload 1–4 foto untuk verifikasi"
                    error={errors.photos}
                  />
                </div>
              )}

              {/* Location Picker - Required for non-Available status */}
              {formData.status !== 'Available' && formData.status && (
                <div className="border-t border-gray-100 pt-6">
                  <GeolocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={handleLocationChange}
                    error={errors.latitude || errors.longitude}
                    label="Asset Location"
                    showAddress={true}
                    disabled={formData.status === 'Available'}
                  />
                </div>
              )}

              {/* Holder Information */}
              {formData.status !== 'Available' && (
                <div className="border-t border-gray-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-neutral-900">
                      Holder Information
                    </h4>
                    {formData.holderFullName && (
                      <button
                        type="button"
                        onClick={handleClearHolder}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Holder
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="holderFullName" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderFullName"
                          name="holderFullName"
                          value={formData.holderFullName}
                          onChange={handleChange}
                          error={errors.holderFullName}
                        />
                      </div>
                      <div>
                        <label htmlFor="holderNip" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          NIP <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderNip"
                          name="holderNip"
                          value={formData.holderNip}
                          onChange={handleChange}
                          error={errors.holderNip}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="holderBranchCode" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Three Letter Code Cabang <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderBranchCode"
                          name="holderBranchCode"
                          value={formData.holderBranchCode}
                          onChange={handleChange}
                          error={errors.holderBranchCode}
                          maxLength={3}
                        />
                      </div>
                      <div>
                        <label htmlFor="holderDivision" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Divisi/Unit Kerja <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderDivision"
                          name="holderDivision"
                          value={formData.holderDivision}
                          onChange={handleChange}
                          error={errors.holderDivision}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="holderEmail" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderEmail"
                          name="holderEmail"
                          type="email"
                          value={formData.holderEmail}
                          onChange={handleChange}
                          error={errors.holderEmail}
                        />
                      </div>
                      <div>
                        <label htmlFor="holderPhone" className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Nomor Telepon <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="holderPhone"
                          name="holderPhone"
                          value={formData.holderPhone}
                          onChange={handleChange}
                          error={errors.holderPhone}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

AssetEditModal.displayName = 'AssetEditModal';

export default AssetEditModal;
