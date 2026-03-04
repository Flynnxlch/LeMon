import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HiCheckCircle, HiX } from 'react-icons/hi';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import PhotoUpload from '../components/common/PhotoUpload/PhotoUpload';
import GeolocationPicker from '../components/common/GeolocationPicker/GeolocationPicker';
import AssetInventoryTable from '../components/features/AssetInventoryTable/AssetInventoryTable';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { invalidateData } from '../utils/dataInvalidation';
import { api } from '../api/client';
import { useAssets, useSettings } from '../hooks/useQueries';
import { CONDITION_OPTIONS, addDaysToDate } from '../utils/assetConstants';

function applyDueUpdateStatus(assets) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (assets || []).map((a) => {
    if (a.dueUpdate && new Date(a.dueUpdate).getTime() <= now.getTime()) {
      return { ...a, status: 'Late' };
    }
    return a;
  });
}

const AssignAsset = memo(() => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [activeAsset, setActiveAsset] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState('assign');
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    holderFullName: '',
    holderNip: '',
    holderBranchCode: '',
    holderDivision: '',
    holderEmail: '',
    holderPhone: '',
    reassignReason: '',
    condition: '',
    conditionNote: '',
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});

  const assetParams = useMemo(() => {
    if (!user?.branch_id) return null;
    return { branchId: user.branch_id };
  }, [user?.branch_id]);

  const { data: rawAssets = [], isLoading: loading } = useAssets(assetParams, {
    enabled: !!user?.branch_id,
  });

  const { data: settings } = useSettings();
  const globalUpdateIntervalDays = settings?.defaultUpdateIntervalDays ? Number(settings.defaultUpdateIntervalDays) : 7;

  const allAssets = useMemo(() => applyDueUpdateStatus(rawAssets), [rawAssets]);

  const selectedAsset = useMemo(() => {
    return allAssets.find(asset => asset.id === selectedAssetId);
  }, [allAssets, selectedAssetId]);

  const getAssetActions = useCallback((assetStatus) => {
    if (assetStatus === 'Available') {
      return [{ id: 'assign', label: 'Assign' }];
    }
    if (assetStatus === 'Late' || assetStatus === 'Rented') {
      return [
        { id: 'reassign', label: 'ReAssign' },
        { id: 'update', label: 'Update' },
        { id: 'balikkan', label: 'Kembalikan' },
      ];
    }
    return [];
  }, []);

  const getFormTitle = useCallback(() => {
    if (activeAction === 'assign') return 'Assign Asset';
    if (activeAction === 'reassign') return 'ReAssign Asset';
    return 'Update Asset';
  }, [activeAction]);

  const isUpdateAction = activeAction === 'update';

  const resetFormState = useCallback(() => {
    setFormData({
      latitude: '',
      longitude: '',
      holderFullName: '',
      holderNip: '',
      holderBranchCode: '',
      holderDivision: '',
      holderEmail: '',
      holderPhone: '',
      reassignReason: '',
      condition: '',
      conditionNote: '',
    });
    setPhotos([]);
    setErrors({});
  }, []);

  // Load existing data when asset is selected
  const handleAssetSelect = useCallback((asset) => {
    setSelectedAssetId(asset.id);
    setActiveAsset(asset);
    setIsActionMenuOpen(true);
    
    if (asset) {
      setFormData({
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
      setPhotos([]);
    }
    setErrors({});
  }, []);

  const refetchAssets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    invalidateData('assets');
  }, [queryClient]);

  const handleActionSelect = useCallback((actionId) => {
    if (!activeAsset) return;

    if (actionId === 'balikkan') {
      api.assets
        .update(activeAsset.id, {
          status: 'Available',
          dueUpdate: null,
          latitude: null,
          longitude: null,
          condition: null,
          conditionNote: null,
        })
        .then(() => {
          invalidateData('assets');
          refetchAssets();
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsActionMenuOpen(false);
        })
        .catch((err) => alert(err.message || 'Gagal mengembalikan aset.'));
      return;
    }

    setActiveAction(actionId);
    setIsActionMenuOpen(false);
    setIsFormModalOpen(true);
    setFormData({
      latitude: activeAsset.latitude || '',
      longitude: activeAsset.longitude || '',
      holderFullName: activeAsset.holder?.fullName || '',
      holderNip: activeAsset.holder?.nip || '',
      holderBranchCode: activeAsset.holder?.branchCode || '',
      holderDivision: activeAsset.holder?.division || '',
      holderEmail: activeAsset.holder?.email || '',
      holderPhone: activeAsset.holder?.phone || '',
      condition: activeAsset.condition || '',
      conditionNote: activeAsset.conditionNote || '',
    });
    setErrors({});
  }, [activeAsset, refetchAssets]);

  const handleCloseActionMenu = useCallback(() => {
    setIsActionMenuOpen(false);
    setSelectedAssetId('');
    setActiveAsset(null);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setSelectedAssetId('');
    setActiveAsset(null);
    resetFormState();
  }, [resetFormState]);

  const handleChange = useCallback((e) => {
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
  }, [errors]);

  const handleLocationChange = useCallback(({ latitude, longitude }) => {
    setFormData(prev => ({
      ...prev,
      latitude: latitude || '',
      longitude: longitude || ''
    }));
    if (errors.location) {
      setErrors(prev => ({
        ...prev,
        location: ''
      }));
    }
  }, [errors.location]);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!selectedAssetId) {
      newErrors.asset = 'Please select an asset from the table';
    }

    // Location, photos, holder required for assign/reassign/update (non-Available)
    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Location is required for non-available assets';
    }
    if (photos.length < 3) {
      newErrors.photos = 'Please upload at least 3 photos for verification';
    }
    if (!isUpdateAction) {
      if (!formData.holderFullName) {
        newErrors.holderFullName = 'Holder name is required';
      }
      if (!formData.holderNip) {
        newErrors.holderNip = 'NIP is required';
      }
      if (!formData.holderBranchCode) {
        newErrors.holderBranchCode = 'Branch code is required';
      }
      if (!formData.holderDivision) {
        newErrors.holderDivision = 'Division is required';
      }
      if (!formData.holderEmail) {
        newErrors.holderEmail = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.holderEmail)) {
        newErrors.holderEmail = 'Email is invalid';
      }
      if (!formData.holderPhone) {
        newErrors.holderPhone = 'Phone is required';
      }
      if (activeAction === 'reassign' && (!formData.reassignReason || formData.reassignReason.trim().length < 10)) {
        newErrors.reassignReason = 'Alasan reassign minimal 10 karakter';
      }
    }
    const needsCondition = (activeAction === 'assign' || activeAction === 'update') && photos.length >= 3;
    if (needsCondition && !formData.condition) {
      newErrors.condition = 'Pilih kondisi aset setelah mengunggah foto kondisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedAssetId, formData, photos, isUpdateAction, activeAction]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const intervalDays = globalUpdateIntervalDays || 7;
    const now = new Date();
    const dueUpdate = addDaysToDate(now, intervalDays);

    // Reassign: submit request for Admin Pusat approval
    if (activeAction === 'reassign') {
      api.reassignmentRequests
        .create({
          assetId: selectedAsset.id,
          newHolderFullName: formData.holderFullName,
          newHolderNip: formData.holderNip || undefined,
          newHolderBranchCode: formData.holderBranchCode || undefined,
          newHolderDivision: formData.holderDivision || undefined,
          newHolderEmail: formData.holderEmail || undefined,
          newHolderPhone: formData.holderPhone || undefined,
          notes: formData.reassignReason?.trim() || undefined,
        })
        .then(() => {
          invalidateData('reassignmentRequests');
          toast.success('Permintaan reassignment telah dikirim. Menunggu persetujuan Admin Pusat.');
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          refetchAssets();
        })
        .catch((err) => toast.error(err.message || 'Gagal mengirim permintaan reassignment.'));
      return;
    }

    const lat = formData.latitude ? parseFloat(formData.latitude) : null;
    const lng = formData.longitude ? parseFloat(formData.longitude) : null;

    if (activeAction === 'assign') {
      const assignPayload = {
        holderFullName: formData.holderFullName,
        holderNip: formData.holderNip || undefined,
        holderBranchCode: formData.holderBranchCode || undefined,
        holderDivision: formData.holderDivision || undefined,
        holderEmail: formData.holderEmail || undefined,
        holderPhone: formData.holderPhone || undefined,
        dueUpdate,
        latitude: lat,
        longitude: lng,
        condition: formData.condition || 'Bagus',
        conditionNote: formData.conditionNote?.trim() || undefined,
      };
      const bodyOrFormData =
        photos.length > 0 && photos.every((p) => p.file)
          ? (() => {
              const fd = new FormData();
              Object.entries(assignPayload).forEach(([k, v]) => {
                if (v != null && v !== '') {
                  const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : String(v));
                  fd.append(k, val);
                }
              });
              photos.forEach((p) => p.file && fd.append('photos', p.file));
              return fd;
            })()
          : assignPayload;
      api.assets
        .assign(selectedAsset.id, bodyOrFormData)
        .then(() => {
          invalidateData('assets');
          toast.success(`Asset ${selectedAsset.serialNumber} telah di-assign. Due Update: ${new Date(dueUpdate).toLocaleDateString('id-ID')}.`);
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          refetchAssets();
        })
        .catch((err) => toast.error(err.message || 'Gagal assign aset.'));
      return;
    }

    if (activeAction === 'update') {
      const payload = {
        status: 'Rented',
        dueUpdate,
        latitude: lat,
        longitude: lng,
        condition: formData.condition || undefined,
        conditionNote: formData.conditionNote?.trim() || undefined,
      };
      api.assets
        .update(selectedAsset.id, payload)
        .then(() => {
          if (formData.condition) {
            const conditionPayload = {
              condition: formData.condition,
              conditionNote: formData.conditionNote?.trim() || undefined,
              latitude: lat,
              longitude: lng,
            };
            const bodyOrFormData =
              photos.length > 0 && photos.every((p) => p.file)
                ? (() => {
                    const fd = new FormData();
                    Object.entries(conditionPayload).forEach(([k, v]) => {
                      if (v != null && v !== '') {
                        const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : String(v));
                        fd.append(k, val);
                      }
                    });
                    photos.forEach((p) => p.file && fd.append('photos', p.file));
                    return fd;
                  })()
                : conditionPayload;
            return api.assets.updateCondition(selectedAsset.id, bodyOrFormData);
          }
        })
        .then(() => {
          invalidateData('assets');
          toast.success(`Asset ${selectedAsset.serialNumber} telah di-update. Due Update berikutnya: ${new Date(dueUpdate).toLocaleDateString('id-ID')}.`);
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          refetchAssets();
        })
        .catch((err) => toast.error(err?.message || 'Gagal update aset.'));
    }
  }, [selectedAsset, formData, photos, validate, activeAction, resetFormState, user, refetchAssets, globalUpdateIntervalDays]);

  const handleClearHolder = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      holderFullName: '',
      holderNip: '',
      holderBranchCode: '',
      holderDivision: '',
      holderEmail: '',
      holderPhone: '',
    }));
  }, []);

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Assign Asset
        </h1>
        <p className="text-sm text-neutral-500">
          Assign assets to holders or reassign existing assignments with photo verification and location tracking
        </p>
      </div>

      {/* Asset Inventory Table */}
      <div className="mb-8">
        <AssetInventoryTable
          assets={allAssets}
          onAssetClick={handleAssetSelect}
          selectedAssetId={selectedAssetId}
          filterByStatus={['Available', 'Late', 'Rented']}
        />
      </div>

      {/* Action Menu Overlay */}
      {isActionMenuOpen && activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseActionMenu}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Pilih Aksi untuk {activeAsset.serialNumber}
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              Status saat ini: <span className="font-semibold text-neutral-900">{activeAsset.status}</span>
            </p>
            <div className="space-y-3">
              {getAssetActions(activeAsset.status).map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => handleActionSelect(action.id)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <Button type="button" variant="secondary" className="w-full justify-center" onClick={handleCloseActionMenu}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {isFormModalOpen && selectedAssetId && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseFormModal}
          />
          <Card title={getFormTitle()} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={handleCloseFormModal}
                className="text-neutral-400 hover:text-neutral-900"
                aria-label="Close form"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selected Asset Info */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                Selected Asset
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-neutral-500">Serial:</span>
                  <span className="ml-2 font-medium text-neutral-900">
                    {selectedAsset.serialNumber}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Type:</span>
                  <span className="ml-2 font-medium text-neutral-900">
                    {selectedAsset.type}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Brand:</span>
                  <span className="ml-2 font-medium text-neutral-900">
                    {selectedAsset.brand}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Current Status:</span>
                  <span className="ml-2 font-medium text-neutral-900">
                    {selectedAsset.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Asset Condition Photos - then Kondisi Aset (Update only) */}
            {(
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <PhotoUpload
                  photos={photos}
                  onChange={setPhotos}
                  maxPhotos={4}
                  label="Asset Condition Photos"
                  error={errors.photos}
                />
                {((activeAction === 'assign' || activeAction === 'update') && photos.length >= 3) && (
                  <div className="pt-4 border-t border-neutral-100 space-y-4">
                    <h4 className="text-md font-semibold text-neutral-900">Kondisi Aset</h4>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Kondisi <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                          errors.condition ? 'border-red-500' : 'border-neutral-300'
                        }`}
                      >
                        <option value="">Pilih kondisi</option>
                        {CONDITION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.condition && (
                        <p className="mt-1 text-sm text-red-500">{errors.condition}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Keterangan tambahan (opsional)
                      </label>
                      <textarea
                        name="conditionNote"
                        value={formData.conditionNote}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Detail atau keterangan tambahan tentang kondisi aset..."
                        className="block w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Location Picker */}
            {(
              <div className="border-t border-gray-100 pt-6">
                <GeolocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={handleLocationChange}
                  error={errors.location}
                  label="Asset Location"
                  showAddress={true}
                />
              </div>
            )}

            {/* Alasan Reassign - only for reassign action */}
            {activeAction === 'reassign' && (
              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Alasan Reassign <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reassignReason"
                  value={formData.reassignReason}
                  onChange={handleChange}
                  placeholder="Jelaskan alasan reassign aset ke holder baru (min. 10 karakter)..."
                  rows={3}
                  className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none ${
                    errors.reassignReason ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                {errors.reassignReason && (
                  <p className="mt-1 text-sm text-red-500">{errors.reassignReason}</p>
                )}
              </div>
            )}

            {/* Holder Information */}
            {(
              <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-neutral-900">
                        Holder Information
                      </h4>
                      {formData.holderFullName && !isUpdateAction && (
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
                        <Input
                          label="Nama Lengkap"
                          name="holderFullName"
                          value={formData.holderFullName}
                          onChange={handleChange}
                          error={errors.holderFullName}
                          required
                          disabled={isUpdateAction}
                          placeholder="Ahmad Santoso"
                        />
                        <Input
                          label="NIP"
                          name="holderNip"
                          value={formData.holderNip}
                          onChange={handleChange}
                          error={errors.holderNip}
                          required
                          disabled={isUpdateAction}
                          placeholder="198501012010011001"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Three Letter Code Cabang"
                          name="holderBranchCode"
                          value={formData.holderBranchCode}
                          onChange={handleChange}
                          error={errors.holderBranchCode}
                          required
                          maxLength={3}
                          disabled={isUpdateAction}
                          placeholder="JKT"
                        />
                        <Input
                          label="Divisi/Unit Kerja"
                          name="holderDivision"
                          value={formData.holderDivision}
                          onChange={handleChange}
                          error={errors.holderDivision}
                          required
                          disabled={isUpdateAction}
                          placeholder="IT Operations"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Email"
                          name="holderEmail"
                          type="email"
                          value={formData.holderEmail}
                          onChange={handleChange}
                          error={errors.holderEmail}
                          required
                          disabled={isUpdateAction}
                          placeholder="ahmad.santoso@company.com"
                        />
                        <Input
                          label="Nomor Telepon"
                          name="holderPhone"
                          value={formData.holderPhone}
                          onChange={handleChange}
                          error={errors.holderPhone}
                          required
                          disabled={isUpdateAction}
                          placeholder="+62 812 3456 7890"
                        />
                  </div>
                </div>
                {isUpdateAction && (
                  <p className="mt-3 text-sm text-neutral-500">
                    Holder Information terkunci pada mode Update.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseFormModal}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex items-center gap-2">
                <HiCheckCircle className="w-5 h-5" />
                {getFormTitle()}
              </Button>
            </div>
          </form>
          </Card>
        </div>
      )}
    </MainLayout>
  );
});

AssignAsset.displayName = 'AssignAsset';

export default AssignAsset;
