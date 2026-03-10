import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { HiCheckCircle, HiX } from 'react-icons/hi';
import { api } from '../api/client';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import GeolocationPicker from '../components/common/GeolocationPicker/GeolocationPicker';
import Input from '../components/common/Input/Input';
import PdfUpload from '../components/common/PdfUpload';
import PhotoUpload from '../components/common/PhotoUpload/PhotoUpload';
import AssetInventoryTable from '../components/features/AssetInventoryTable/AssetInventoryTable';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAssets, useSettings } from '../hooks/useQueries';
import { addDaysToDate } from '../utils/assetConstants';
import { invalidateData } from '../utils/dataInvalidation';

function applyDueUpdateStatus(assets) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (assets || []).map((a) => {
    if (a.status === 'Available' && a.dueUpdate && new Date(a.dueUpdate).getTime() <= now.getTime()) {
      return { ...a, status: 'Perlu Diupdate' };
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
  });
  const [photos, setPhotos] = useState([]);
  const [beritaAcara, setBeritaAcara] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateVariantRef = useRef('Available'); // 'Available' | 'Rusak' for update submit
  const formRef = useRef(null);

  const assetParams = useMemo(() => {
    if (!user?.branch_id) return null;
    return { branchId: user.branch_id };
  }, [user.branch_id]);

  const { data: rawAssets = [] } = useAssets(assetParams, {
    enabled: !!user?.branch_id,
  });

  const { data: settings } = useSettings();
  const globalUpdateIntervalDays = settings?.defaultUpdateIntervalDays ? Number(settings.defaultUpdateIntervalDays) : 7;

  const allAssets = useMemo(() => applyDueUpdateStatus(rawAssets), [rawAssets]);

  const selectedAsset = useMemo(() => {
    return allAssets.find(asset => asset.id === selectedAssetId);
  }, [allAssets, selectedAssetId]);

  const getAssetActions = useCallback((asset) => {
    const status = asset?.status;
    const hasHolder = !!asset?.holder;
    if (status === 'Available' && !hasHolder) {
      return [{ id: 'assign', label: 'Assign' }];
    }
    if (status === 'Hilang') return [];
    if ((status === 'Available' && hasHolder) || status === 'Perlu Diupdate' || status === 'Diperbaiki' || status === 'Rusak') {
      return [
        { id: 'reassign', label: 'Reassign' },
        { id: 'update', label: 'Update' },
        { id: 'laporkan_hilang', label: 'Laporkan Kehilangan' },
      ];
    }
    return [];
  }, []);

  const getFormTitle = useCallback(() => {
    if (activeAction === 'assign') return 'Assign Asset';
    if (activeAction === 'reassign') return 'ReAssign Asset';
    if (activeAction === 'laporkan_hilang') return 'Laporkan Aset Hilang';
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
    });
    setPhotos([]);
    setBeritaAcara(null);
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

    if (actionId === 'laporkan_hilang') {
      setActiveAction('laporkan_hilang');
      setBeritaAcara(null);
      setErrors({});
      setIsActionMenuOpen(false);
      setIsFormModalOpen(true);
      return;
    }

    setActiveAction(actionId);
    updateVariantRef.current = 'Available';
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
    });
    setErrors({});
  }, [activeAsset, refetchAssets, toast]);

  const handleCloseActionMenu = useCallback(() => {
    setIsActionMenuOpen(false);
    setSelectedAssetId('');
    setActiveAsset(null);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    if (isSubmitting) return;
    setIsFormModalOpen(false);
    setSelectedAssetId('');
    setActiveAsset(null);
    resetFormState();
    setIsSubmitting(false);
  }, [resetFormState, isSubmitting]);

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

    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Location is required';
    }
    if (activeAction === 'assign' && (photos.length < 1 || photos.length > 4)) {
      newErrors.photos = 'Upload 1 sampai 4 foto untuk verifikasi';
    }
    if ((activeAction === 'update' || activeAction === 'updateRusak') && photos.length > 4) {
      newErrors.photos = 'Maksimal 4 foto';
    }
    if ((activeAction === 'assign' || activeAction === 'update' || activeAction === 'updateRusak' || activeAction === 'laporkan_hilang') && !beritaAcara) {
      newErrors.beritaAcara = 'Berita Acara (PDF) wajib diunggah';
    }
    if (activeAction === 'laporkan_hilang') {
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }
    if (!isUpdateAction) {
      if (!formData.holderFullName) {
        newErrors.holderFullName = 'Holder name is required';
      }
      if (!formData.holderNip) {
        newErrors.holderNip = 'NIP is required';
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedAssetId, formData, photos, beritaAcara, isUpdateAction, activeAction]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!validate()) return;
    setIsSubmitting(true);

    if (activeAction === 'laporkan_hilang') {
      const fd = new FormData();
      fd.append('status', 'Hilang');
      fd.append('dueUpdate', '');
      if (beritaAcara) fd.append('beritaAcara', beritaAcara);
      api.assets
        .update(selectedAsset.id, fd)
        .then(() => {
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          setIsSubmitting(false);
          toast.success('Status aset telah diubah menjadi Hilang.');
          invalidateData('assets');
          refetchAssets();
        })
        .catch((err) => {
          setIsSubmitting(false);
          toast.error(err?.message || 'Gagal melaporkan kehilangan.');
        });
      return;
    }

    // Due Update mengikuti rule Admin Pusat (Reminder Settings: defaultUpdateIntervalDays)
    const intervalDays = globalUpdateIntervalDays || 7;
    const now = new Date();
    const dueUpdate = addDaysToDate(now, intervalDays);

    const lat = formData.latitude ? parseFloat(formData.latitude) : null;
    const lng = formData.longitude ? parseFloat(formData.longitude) : null;

    // Reassign: submit request for Admin Pusat approval (with location + photos)
    if (activeAction === 'reassign') {
      const reassignPayload = {
        assetId: selectedAsset.id,
        newHolderFullName: formData.holderFullName,
        newHolderNip: formData.holderNip || undefined,
        newHolderBranchId: user?.branch_id || undefined,
        newHolderDivision: formData.holderDivision || undefined,
        newHolderEmail: formData.holderEmail || undefined,
        newHolderPhone: formData.holderPhone || undefined,
        newHolderLatitude: lat,
        newHolderLongitude: lng,
        notes: formData.reassignReason?.trim() || undefined,
      };
      const reassignBodyOrFormData =
        photos.length > 0 && photos.every((p) => p.file)
          ? (() => {
              const fd = new FormData();
              Object.entries(reassignPayload).forEach(([k, v]) => {
                if (v != null && v !== '') {
                  const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : String(v));
                  fd.append(k, val);
                }
              });
              photos.forEach((p) => p.file && fd.append('photos', p.file));
              return fd;
            })()
          : reassignPayload;
      api.reassignmentRequests
        .create(reassignBodyOrFormData)
        .then(() => {
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          setIsSubmitting(false);
          toast.success('Permintaan reassignment telah dikirim. Menunggu persetujuan Admin Pusat.');
          invalidateData('reassignmentRequests');
          refetchAssets();
        })
        .catch((err) => {
          setIsSubmitting(false);
          toast.error(err.message || 'Gagal mengirim permintaan reassignment.');
        });
      return;
    }

    if (activeAction === 'assign') {
      const assignPayload = {
        holderFullName: formData.holderFullName,
        holderNip: formData.holderNip || undefined,
        holderBranchId: user?.branch_id || undefined,
        holderDivision: formData.holderDivision || undefined,
        holderEmail: formData.holderEmail || undefined,
        holderPhone: formData.holderPhone || undefined,
        dueUpdate,
        latitude: lat,
        longitude: lng,
      };
      const fd = new FormData();
      Object.entries(assignPayload).forEach(([k, v]) => {
        if (v != null && v !== '') {
          const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : String(v));
          fd.append(k, val);
        }
      });
      photos.forEach((p) => p.file && fd.append('photos', p.file));
      if (beritaAcara) fd.append('beritaAcara', beritaAcara);
      api.assets
        .assign(selectedAsset.id, fd)
        .then(() => {
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          setIsSubmitting(false);
          toast.success(`Asset ${selectedAsset.serialNumber} telah di-assign. Due Update: ${new Date(dueUpdate).toLocaleDateString('id-ID')}.`);
          invalidateData('assets');
          refetchAssets();
        })
        .catch((err) => {
          setIsSubmitting(false);
          toast.error(err.message || 'Gagal assign aset.');
        });
      return;
    }

    if (activeAction === 'update' || activeAction === 'updateRusak') {
      const newStatus = updateVariantRef.current === 'Rusak' ? 'Rusak' : 'Available';
      const payload = {
        status: newStatus,
        dueUpdate,
        latitude: lat,
        longitude: lng,
      };
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v != null && v !== '') {
          const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' ? JSON.stringify(v) : String(v));
          fd.append(k, val);
        }
      });
      photos.forEach((p) => p.file && fd.append('photos', p.file));
      if (beritaAcara) fd.append('beritaAcara', beritaAcara);
      api.assets
        .update(selectedAsset.id, fd)
        .then(() => {
          setSelectedAssetId('');
          setActiveAsset(null);
          setIsFormModalOpen(false);
          resetFormState();
          setIsSubmitting(false);
          toast.success(
            newStatus === 'Rusak'
              ? `Asset ${selectedAsset.serialNumber} telah ditandai Rusak.`
              : `Asset ${selectedAsset.serialNumber} telah di-update. Due Update: ${new Date(dueUpdate).toLocaleDateString('id-ID')}.`
          );
          invalidateData('assets');
          refetchAssets();
        })
        .catch((err) => {
          setIsSubmitting(false);
          toast.error(err?.message || 'Gagal update aset.');
        });
    }
  }, [selectedAsset, formData, photos, beritaAcara, validate, activeAction, resetFormState, refetchAssets, globalUpdateIntervalDays, toast, user.branch_id]);

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
          Assign aset ke holder atau reassign penugasan yang sudah ada dengan verifikasi foto dan pelacakan lokasi. {/* Changed to Indonesian */}
        </p>
      </div>

      {/* Asset Inventory Table */}
      <div className="mb-8">
        <AssetInventoryTable
          assets={allAssets}
          onAssetClick={handleAssetSelect}
          selectedAssetId={selectedAssetId}
          filterByStatus={['Available', 'Perlu Diupdate', 'Diperbaiki', 'Rusak', 'Hilang']}
        />
      </div>

      {/* Action Menu Overlay */}
      {isActionMenuOpen && activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 bg-black/40 ${isSubmitting ? 'cursor-wait' : ''}`}
            onClick={isSubmitting ? undefined : handleCloseActionMenu}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Select Action for {activeAsset.serialNumber} {/* Changed to English */}
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              {/* CLARIFY: "Status saat ini:" is metadata text before a value — confirm if "Current Status:" (English) is preferred */}
              Status saat ini: <span className="font-semibold text-neutral-900">{activeAsset.status}</span>
            </p>
            <div className="space-y-3">
              {getAssetActions(activeAsset).map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant="primary"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                  onClick={() => handleActionSelect(action.id)}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    action.label
                  )}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <Button type="button" variant="secondary" className="w-full justify-center" onClick={handleCloseActionMenu} disabled={isSubmitting}>
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
            className={`absolute inset-0 bg-black/40 ${isSubmitting ? 'cursor-wait' : ''}`}
            onClick={isSubmitting ? undefined : handleCloseFormModal}
          />
          <Card title={getFormTitle()} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={handleCloseFormModal}
                disabled={isSubmitting}
                className="text-neutral-400 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close form"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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

            {activeAction === 'laporkan_hilang' ? (
              <>
                <p className="text-sm text-neutral-600">Unggah Berita Acara (PDF) untuk melaporkan aset ini hilang.</p>
                <PdfUpload file={beritaAcara} onChange={setBeritaAcara} error={errors.beritaAcara} required />
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <Button type="button" variant="secondary" onClick={handleCloseFormModal} disabled={isSubmitting}>Batal</Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Laporkan Hilang'}
                  </Button>
                </div>
              </>
            ) : (
            <>
            {/* Holder Information (read-only, only for Update) - same style as Selected Asset */}
            {isUpdateAction && selectedAsset?.holder && (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                  Holder Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-neutral-500">Name: {/* Changed to English */}</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.fullName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">NIP:</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.nip || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Branch: {/* Changed to English */}</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.branchName || selectedAsset.holder.branchCode || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Division: {/* Changed to English */}</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.division || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Email:</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.email || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Phone: {/* Changed to English */}</span>
                    <span className="ml-2 font-medium text-neutral-900">
                      {selectedAsset.holder.phone || '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Asset photos: min 1, max 4 */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <PhotoUpload
                photos={photos}
                onChange={setPhotos}
                maxPhotos={4}
                label="Asset Condition Photo" // Changed to English
                helperText={activeAction === 'assign' ? 'Upload 1–4 foto untuk verifikasi (min. 1, max. 4)' : 'Upload 0–4 foto (opsional untuk update)'}
                error={errors.photos}
              />
              {(activeAction === 'assign' || activeAction === 'update' || activeAction === 'updateRusak') && (
                <PdfUpload
                  file={beritaAcara}
                  onChange={setBeritaAcara}
                  error={errors.beritaAcara}
                  required
                />
              )}
            </div>

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
                  Reassign Reason <span className="text-red-500">*</span> {/* Changed to English */}
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

            {/* Holder Information (editable form - only for Assign/ReAssign) */}
            {!isUpdateAction && (
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
                    <Input
                      label="Full Name" // Changed to English
                      name="holderFullName"
                      value={formData.holderFullName}
                      onChange={handleChange}
                      error={errors.holderFullName}
                      required
                      placeholder="Ahmad Santoso"
                    />
                    <Input
                      label="NIP"
                      name="holderNip"
                      value={formData.holderNip}
                      onChange={handleChange}
                      error={errors.holderNip}
                      required
                      placeholder="198501012010011001"
                    />
                  </div>
                  {/* Cabang otomatis dari Admin Cabang yang login */}
                  {user?.branch_name && (
                    <div className="mb-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">Branch (automatic) {/* Changed to English */}</p>
                      <p className="text-sm font-medium text-neutral-900 mt-0.5">{user.branch_name}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Division/Work Unit" // Changed to English
                      name="holderDivision"
                      value={formData.holderDivision}
                      onChange={handleChange}
                      error={errors.holderDivision}
                      required
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
                      placeholder="ahmad.santoso@company.com"
                    />
                    <Input
                      label="Phone Number" // Changed to English
                      name="holderPhone"
                      value={formData.holderPhone}
                      onChange={handleChange}
                      error={errors.holderPhone}
                      required
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseFormModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {isUpdateAction && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={isSubmitting}
                    onClick={() => {
                      updateVariantRef.current = 'Rusak';
                      formRef.current?.requestSubmit();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      'Update Rusak'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={isSubmitting}
                    onClick={() => {
                      updateVariantRef.current = 'Available';
                      formRef.current?.requestSubmit();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <HiCheckCircle className="w-5 h-5" />
                        Update
                      </>
                    )}
                  </Button>
                </>
              )}
              {!isUpdateAction && (
                <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {activeAction === 'assign' ? 'Assigning...' : 'Mengirim...'}
                    </>
                  ) : (
                    <>
                      <HiCheckCircle className="w-5 h-5" />
                      {getFormTitle()}
                    </>
                  )}
                </Button>
              )}
            </div>
            </>
            )}
          </form>
          </Card>
        </div>
      )}
    </MainLayout>
  );
});

AssignAsset.displayName = 'AssignAsset';

export default AssignAsset;
