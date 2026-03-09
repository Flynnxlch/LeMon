import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiRefresh, HiX } from 'react-icons/hi';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useToast } from '../context/ToastContext';
import { useAssets } from '../hooks/useQueries';
import { api } from '../api/client';
import { STATUS_LABELS } from '../utils/assetConstants';

const ITEMS_PER_PAGE = 10;

const AssetHilang = memo(() => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: assetsHilang = [] } = useAssets({ status: 'Hilang' });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decision, setDecision] = useState('procure'); // procure | no_procure

  const totalPages = Math.max(1, Math.ceil(assetsHilang.length / ITEMS_PER_PAGE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return assetsHilang.slice(start, start + ITEMS_PER_PAGE);
  }, [assetsHilang, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assetsHilang.length]);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const openDecision = useCallback((asset) => {
    setSelectedAsset(asset);
    setDecision('procure');
    setShowDecisionModal(true);
  }, []);

  const closeDecision = useCallback(() => {
    if (!isSubmitting) {
      setShowDecisionModal(false);
      setSelectedAsset(null);
    }
  }, [isSubmitting]);

  const submitDecision = useCallback(async () => {
    if (!selectedAsset) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (decision === 'procure') {
        await api.assets.update(selectedAsset.id, { status: 'Available' });
        toast.success('Pengadaan dipilih. Status aset dikembalikan menjadi Available.');
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      } else {
        toast.info('Tidak melakukan pengadaan. Status aset tetap Hilang.');
      }
      closeDecision();
    } catch (err) {
      toast.error(err?.message || 'Gagal memproses keputusan.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAsset, decision, isSubmitting, toast, queryClient, closeDecision]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">Asset Hilang</h1>
        <p className="text-sm text-neutral-500">
          Daftar aset dengan status {STATUS_LABELS.Hilang}. Admin Pusat dapat memutuskan untuk melakukan pengadaan lagi (mengembalikan status ke Available) atau tidak.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Asset</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Cabang</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedList.map((asset) => (
                <tr key={asset.id} className="hover:bg-neutral-50">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm font-medium text-neutral-900">{asset.serialNumber}</div>
                    <div className="text-sm text-neutral-500">{asset.type} · {asset.brand}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell text-sm text-neutral-700">{asset.branch_name ?? '—'}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Button type="button" variant="primary" size="sm" onClick={() => openDecision(asset)}>
                      <HiRefresh className="w-4 h-4 mr-1 inline" />
                      Keputusan Pengadaan
                    </Button>
                  </td>
                </tr>
              ))}
              {assetsHilang.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                    Tidak ada aset dengan status {STATUS_LABELS.Hilang}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {assetsHilang.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, assetsHilang.length)} dari {assetsHilang.length}
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

      {showDecisionModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDecision} aria-hidden="true" />
          <Card title="Keputusan Pengadaan" className="relative w-full max-w-md">
            <div className="absolute top-4 right-4">
              <button type="button" onClick={closeDecision} disabled={isSubmitting} className="text-neutral-400 hover:text-neutral-900" aria-label="Tutup">
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Aset: <strong>{selectedAsset.serialNumber}</strong> · Cabang: {selectedAsset.branch_name ?? '—'}
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  value="procure"
                  checked={decision === 'procure'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <span className="text-sm">Lakukan pengadaan lagi (status kembali Available)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  value="no_procure"
                  checked={decision === 'no_procure'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <span className="text-sm">Tidak melakukan pengadaan (status tetap Hilang)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200">
              <Button type="button" variant="secondary" onClick={closeDecision} disabled={isSubmitting}>Batal</Button>
              <Button type="button" variant="primary" onClick={submitDecision} disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Simpan'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
});

AssetHilang.displayName = 'AssetHilang';
export default AssetHilang;

