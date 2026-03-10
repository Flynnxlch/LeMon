import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiX, HiCog, HiCheckCircle, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Input from '../components/common/Input/Input';
import PdfUpload from '../components/common/PdfUpload';
import PhotoUpload from '../components/common/PhotoUpload/PhotoUpload';
import GeolocationPicker from '../components/common/GeolocationPicker/GeolocationPicker';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useToast } from '../context/ToastContext';
import { useAssets, useBranches } from '../hooks/useQueries';
import { invalidateData } from '../utils/dataInvalidation';
import { STATUS_LABELS } from '../utils/assetConstants';

const TAB_RUSAK = 'rusak';
const TAB_DALAM_PERBAIKAN = 'dalam_perbaikan';
const ITEMS_PER_PAGE = 10;

const AssetRusak = memo(() => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(TAB_RUSAK);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showPerbaikanModal, setShowPerbaikanModal] = useState(false);
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [perbaikanForm, setPerbaikanForm] = useState({
    repairType: 'at_branch',
    toBranchId: '',
    notes: '',
  });
  const [selesaiForm, setSelesaiForm] = useState({
    returnToPreviousUser: true,
    holderFullName: '',
    holderNip: '',
    holderBranchCode: '',
    holderBranchId: '',
    holderDivision: '',
    holderEmail: '',
    holderPhone: '',
    latitude: '',
    longitude: '',
    address: '',
  });
  const [photos, setPhotos] = useState([]);
  const [perbaikanBeritaAcara, setPerbaikanBeritaAcara] = useState(null);
  const [selesaiBeritaAcara, setSelesaiBeritaAcara] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repairInfo, setRepairInfo] = useState(null);

  const { data: assetsRusak = [] } = useAssets({ status: 'Rusak' }, { enabled: tab === TAB_RUSAK });
  const { data: assetsDalamPerbaikan = [] } = useAssets(
    { status: 'Dalam Perbaikan' },
    { enabled: tab === TAB_DALAM_PERBAIKAN }
  );
  const { data: branches = [] } = useBranches();

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    invalidateData('assets');
  }, [queryClient]);

  const openPerbaikan = useCallback((asset) => {
    setSelectedAsset(asset);
    setPerbaikanForm({
      repairType: 'at_branch',
      toBranchId: asset?.branch_id ?? '',
      notes: '',
    });
    setPerbaikanBeritaAcara(null);
    setErrors({});
    setShowPerbaikanModal(true);
  }, []);

  const openSelesai = useCallback(async (asset) => {
    setSelectedAsset(asset);
    setPhotos([]);
    setSelesaiBeritaAcara(null);
    setSelesaiForm({
      returnToPreviousUser: true,
      holderFullName: asset?.holder?.fullName ?? '',
      holderNip: asset?.holder?.nip ?? '',
      holderBranchCode: asset?.holder?.branchCode ?? '',
      holderBranchId: asset?.holder?.branchId ?? '',
      holderDivision: asset?.holder?.division ?? '',
      holderEmail: asset?.holder?.email ?? '',
      holderPhone: asset?.holder?.phone ?? '',
      latitude: asset?.latitude ?? '',
      longitude: asset?.longitude ?? '',
      address: '',
    });
    setErrors({});
    setShowSelesaiModal(true);
    try {
      const repair = await api.assets.getRepair(asset.id);
      setRepairInfo(repair);
    } catch {
      setRepairInfo(null);
    }
  }, []);

  const closePerbaikan = useCallback(() => {
    if (!isSubmitting) {
      setShowPerbaikanModal(false);
      setSelectedAsset(null);
    }
  }, [isSubmitting]);

  const closeSelesai = useCallback(() => {
    if (!isSubmitting) {
      setShowSelesaiModal(false);
      setSelectedAsset(null);
      setRepairInfo(null);
    }
  }, [isSubmitting]);

  const handlePerbaikanChange = useCallback((e) => {
    const { name, value } = e.target;
    setPerbaikanForm((prev) => ({ ...prev, [name]: value }));
    if (name in errors) setErrors((prev) => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleSelesaiChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'returnToPreviousUser') {
      setSelesaiForm((prev) => ({ ...prev, returnToPreviousUser: value === 'true' }));
    } else {
      setSelesaiForm((prev) => ({ ...prev, [name]: value }));
    }
    if (name in errors) setErrors((prev) => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleLocationChange = useCallback(({ latitude, longitude }) => {
    setSelesaiForm((prev) => ({
      ...prev,
      latitude: latitude ?? '',
      longitude: longitude ?? '',
    }));
  }, []);

  const submitPerbaikan = useCallback(async () => {
    const newErrors = {};
    if (perbaikanForm.repairType === 'transfer') {
      if (!perbaikanForm.toBranchId?.trim()) newErrors.toBranchId = 'Pilih cabang tujuan';
      if (perbaikanForm.toBranchId === selectedAsset?.branch_id) newErrors.toBranchId = 'Pilih cabang yang berbeda';
    }
    if (!perbaikanBeritaAcara) newErrors.beritaAcara = 'Berita Acara (PDF) wajib diunggah';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.assets.startRepair(selectedAsset.id, {
        repairType: perbaikanForm.repairType,
        toBranchId: perbaikanForm.repairType === 'transfer' ? perbaikanForm.toBranchId : undefined,
        notes: perbaikanForm.notes?.trim() || undefined,
      }, perbaikanBeritaAcara);
      toast.success(
        perbaikanForm.repairType === 'at_branch'
          ? 'Status aset diubah menjadi Dalam Perbaikan (di cabang ini).'
          : 'Permintaan transfer untuk perbaikan telah dibuat. Setelah disetujui, status akan Dalam Perbaikan.'
      );
      refetch();
      setPerbaikanBeritaAcara(null);
      closePerbaikan();
    } catch (err) {
      toast.error(err?.message || 'Gagal memulai perbaikan.');
    } finally {
      setIsSubmitting(false);
    }
  }, [perbaikanForm, perbaikanBeritaAcara, selectedAsset, toast, refetch, closePerbaikan]);

  const submitSelesai = useCallback(async () => {
    const newErrors = {};
    if (photos.length < 1 || photos.length > 4) newErrors.photos = 'Upload 1–4 foto kondisi aset';
    if (!selesaiBeritaAcara) newErrors.beritaAcara = 'Berita Acara (PDF) wajib diunggah';
    if (!selesaiForm.returnToPreviousUser) {
      if (!selesaiForm.holderFullName?.trim()) newErrors.holderFullName = 'Nama holder wajib';
      if (!selesaiForm.holderNip?.trim()) newErrors.holderNip = 'NIP wajib';
      if (!selesaiForm.holderDivision?.trim()) newErrors.holderDivision = 'Divisi wajib';
      if (!selesaiForm.holderEmail?.trim()) newErrors.holderEmail = 'Email wajib';
      else if (!/\S+@\S+\.\S+/.test(selesaiForm.holderEmail)) newErrors.holderEmail = 'Email tidak valid';
      if (!selesaiForm.holderPhone?.trim()) newErrors.holderPhone = 'Telepon wajib';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        returnToPreviousUser: selesaiForm.returnToPreviousUser,
        latitude: selesaiForm.latitude ? Number(selesaiForm.latitude) : null,
        longitude: selesaiForm.longitude ? Number(selesaiForm.longitude) : null,
        address: selesaiForm.address || undefined,
      };
      if (!selesaiForm.returnToPreviousUser) {
        payload.holderFullName = selesaiForm.holderFullName;
        payload.holderNip = selesaiForm.holderNip;
        payload.holderBranchCode = selesaiForm.holderBranchCode;
        payload.holderBranchId = selesaiForm.holderBranchId || undefined;
        payload.holderDivision = selesaiForm.holderDivision;
        payload.holderEmail = selesaiForm.holderEmail;
        payload.holderPhone = selesaiForm.holderPhone;
      }
      const body = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v != null && v !== '') body.append(k, typeof v === 'boolean' ? String(v) : String(v));
      });
      photos.forEach((p) => p.file && body.append('photos', p.file));
      if (selesaiBeritaAcara) body.append('beritaAcara', selesaiBeritaAcara);
      await api.assets.completeRepair(selectedAsset.id, body);
      toast.success('Perbaikan selesai. Aset kembali Available.');
      refetch();
      setSelesaiBeritaAcara(null);
      closeSelesai();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyelesaikan perbaikan.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selesaiForm, photos, selesaiBeritaAcara, selectedAsset, toast, refetch, closeSelesai]);

  const branchesForTransfer = useMemo(() => {
    if (!selectedAsset?.branch_id) return branches;
    return branches.filter((b) => b.id !== selectedAsset.branch_id);
  }, [branches, selectedAsset?.branch_id]);

  const listForTab = tab === TAB_RUSAK ? assetsRusak : assetsDalamPerbaikan;
  const totalPages = Math.max(1, Math.ceil(listForTab.length / ITEMS_PER_PAGE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return listForTab.slice(start, start + ITEMS_PER_PAGE);
  }, [listForTab, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">Damaged Assets</h1> {/* Changed to English */}
        <p className="text-sm text-neutral-500">
          Kelola aset dengan status Rusak: tentukan perbaikan di cabang atau transfer sementara, lalu selesaikan perbaikan dan kembalikan ke user.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-200 pb-4">
        <button
          type="button"
          onClick={() => setTab(TAB_RUSAK)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            tab === TAB_RUSAK ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          Damaged ({assetsRusak.length}) {/* Changed to English */}
        </button>
        <button
          type="button"
          onClick={() => setTab(TAB_DALAM_PERBAIKAN)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            tab === TAB_DALAM_PERBAIKAN ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          Under Repair ({assetsDalamPerbaikan.length}) {/* Changed to English */}
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Asset</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Branch {/* Changed to English */}</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {tab === TAB_DALAM_PERBAIKAN ? 'Repair Type' : 'Condition (Photo)'} {/* Changed to English */}
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions {/* Changed to English */}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {tab === TAB_RUSAK &&
                paginatedList.map((asset) => (
                  <tr key={asset.id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-medium text-neutral-900">{asset.serialNumber}</div>
                      <div className="text-sm text-neutral-500">{asset.type} · {asset.brand}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell text-sm text-neutral-700">{asset.branch_name ?? '—'}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(asset.updateImages && Array.isArray(asset.updateImages) ? asset.updateImages : []).slice(0, 4).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block w-10 h-10 rounded border border-neutral-200 overflow-hidden bg-neutral-100"
                          >
                            <img src={url} alt={`Kondisi ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                        {(!asset.updateImages || asset.updateImages.length === 0) && (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <Button type="button" variant="primary" size="sm" onClick={() => openPerbaikan(asset)}>
                        <HiCog className="w-4 h-4 mr-1 inline" />
                        Form Perbaikan
                      </Button>
                    </td>
                  </tr>
                ))}
              {tab === TAB_DALAM_PERBAIKAN &&
                paginatedList.map((asset) => (
                  <tr key={asset.id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-medium text-neutral-900">{asset.serialNumber}</div>
                      <div className="text-sm text-neutral-500">{asset.type} · {asset.branch_name ?? '—'}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell text-sm text-neutral-700">{asset.branch_name ?? '—'}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-sm font-medium text-neutral-700">
                        {asset.repairType === 'at_branch' ? 'Perbaikan Sendiri' : asset.repairType === 'transfer' ? 'Perbaikan Transfer' : '—'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <Button type="button" variant="primary" size="sm" onClick={() => openSelesai(asset)}>
                        <HiCheckCircle className="w-4 h-4 mr-1 inline" />
                        Selesai Perbaikan
                      </Button>
                    </td>
                  </tr>
                ))}
              {((tab === TAB_RUSAK && assetsRusak.length === 0) || (tab === TAB_DALAM_PERBAIKAN && assetsDalamPerbaikan.length === 0)) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                    Tidak ada aset dengan status {tab === TAB_RUSAK ? STATUS_LABELS.Rusak : STATUS_LABELS['Dalam Perbaikan']}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {listForTab.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, listForTab.length)} dari {listForTab.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous">
                <HiChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm text-neutral-600 px-2">Halaman {currentPage} dari {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next">
                <HiChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Form Perbaikan */}
      {showPerbaikanModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePerbaikan} aria-hidden="true" />
          <Card title="Repair Form" className="relative w-full max-w-md"> {/* Changed to English */}
            <div className="absolute top-4 right-4">
              <button type="button" onClick={closePerbaikan} disabled={isSubmitting} className="text-neutral-400 hover:text-neutral-900" aria-label="Tutup">
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Aset: <strong>{selectedAsset.serialNumber}</strong> · Cabang: {selectedAsset.branch_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Repair {/* Changed to English */}</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="repairType"
                      value="at_branch"
                      checked={perbaikanForm.repairType === 'at_branch'}
                      onChange={handlePerbaikanChange}
                    />
                    <span className="text-sm">Repaired at this branch {/* Changed to English */}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="repairType"
                      value="transfer"
                      checked={perbaikanForm.repairType === 'transfer'}
                      onChange={handlePerbaikanChange}
                    />
                    <span className="text-sm">Temporarily transfer to another branch for repair {/* Changed to English */}</span>
                  </label>
                </div>
              </div>
              {perbaikanForm.repairType === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Target Branch {/* Changed to English */}</label>
                    <select
                      name="toBranchId"
                      value={perbaikanForm.toBranchId}
                      onChange={handlePerbaikanChange}
                      className={`block w-full px-3 py-2 border rounded-lg text-sm ${errors.toBranchId ? 'border-red-500' : 'border-neutral-300'}`}
                    >
                      <option value="">— Pilih cabang —</option>
                      {branchesForTransfer.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    {errors.toBranchId && <p className="mt-1 text-sm text-red-500">{errors.toBranchId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional) {/* Changed to English */}</label>
                    <textarea
                      name="notes"
                      value={perbaikanForm.notes}
                      onChange={handlePerbaikanChange}
                      rows={2}
                      className="block w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                      placeholder="Catatan transfer perbaikan..."
                    />
                  </div>
                </>
              )}
              <PdfUpload
                file={perbaikanBeritaAcara}
                onChange={setPerbaikanBeritaAcara}
                error={errors.beritaAcara}
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200">
              <Button type="button" variant="secondary" onClick={closePerbaikan} disabled={isSubmitting}>Batal</Button>
              <Button type="button" variant="primary" onClick={submitPerbaikan} disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Simpan'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Selesai Perbaikan */}
      {showSelesaiModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={closeSelesai} aria-hidden="true" />
          <Card title="Complete Repair" className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto my-8"> {/* Changed to English */}
            <div className="absolute top-4 right-4">
              <button type="button" onClick={closeSelesai} disabled={isSubmitting} className="text-neutral-400 hover:text-neutral-900" aria-label="Tutup">
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Aset: <strong>{selectedAsset.serialNumber}</strong> · Cabang saat ini: {selectedAsset.branch_name}
            </p>
            {repairInfo?.repairType === 'transfer' && repairInfo.fromBranchId && selectedAsset.branch_id !== repairInfo.fromBranchId && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-4">
                Aset akan dikembalikan ke cabang asal (<strong>{repairInfo.fromBranchName ?? repairInfo.fromBranchId}</strong>) sebelum diselesaikan.
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Asset Condition Photos After Repair (1–4 photos) {/* Changed to English */}</label>
                <PhotoUpload photos={photos} onChange={setPhotos} maxPhotos={4} label="" helperText="Upload 1–4 foto" error={errors.photos} />
              </div>
              <PdfUpload file={selesaiBeritaAcara} onChange={setSelesaiBeritaAcara} error={errors.beritaAcara} required />
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Location (optional) {/* Changed to English */}</label>
                <GeolocationPicker
                  latitude={selesaiForm.latitude}
                  longitude={selesaiForm.longitude}
                  onChange={handleLocationChange}
                  label=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Assignment After Repair {/* Changed to English */}</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="returnToPreviousUser"
                      value="true"
                      checked={selesaiForm.returnToPreviousUser === true}
                      onChange={handleSelesaiChange}
                    />
                    <span className="text-sm">Return to Previous User {/* Changed to English */}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="returnToPreviousUser"
                      value="false"
                      checked={selesaiForm.returnToPreviousUser === false}
                      onChange={handleSelesaiChange}
                    />
                    <span className="text-sm">Reassign to Another User {/* Changed to English */}</span>
                  </label>
                </div>
              </div>
              {!selesaiForm.returnToPreviousUser && (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
                  <h4 className="text-sm font-semibold text-neutral-900">New Holder Data {/* Changed to English */}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Full Name" name="holderFullName" value={selesaiForm.holderFullName} onChange={handleSelesaiChange} error={errors.holderFullName} required /> {/* Changed to English */}
                    <Input label="NIP" name="holderNip" value={selesaiForm.holderNip} onChange={handleSelesaiChange} error={errors.holderNip} required />
                    <Input label="Division" name="holderDivision" value={selesaiForm.holderDivision} onChange={handleSelesaiChange} error={errors.holderDivision} required /> {/* Changed to English */}
                    <Input label="Email" name="holderEmail" type="email" value={selesaiForm.holderEmail} onChange={handleSelesaiChange} error={errors.holderEmail} required />
                    <Input label="Phone" name="holderPhone" value={selesaiForm.holderPhone} onChange={handleSelesaiChange} error={errors.holderPhone} required /> {/* Changed to English */}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200">
              <Button type="button" variant="secondary" onClick={closeSelesai} disabled={isSubmitting}>Batal</Button>
              <Button type="button" variant="primary" onClick={submitSelesai} disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Selesai Perbaikan'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
});

AssetRusak.displayName = 'AssetRusak';
export default AssetRusak;
