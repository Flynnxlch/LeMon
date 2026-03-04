import { memo, useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HiPlus } from 'react-icons/hi';
import Button from '../components/common/Button/Button';
import AddAssetModal from '../components/features/AddAssetModal/AddAssetModal';
import AssetDetailPanel from '../components/features/AssetDetailPanel/AssetDetailPanel';
import PastHoldersOverlay from '../components/features/AssetDetailPanel/PastHoldersOverlay';
import ConditionHistoryOverlay from '../components/features/AssetDetailPanel/ConditionHistoryOverlay';
import AssetTable from '../components/features/AssetTable/AssetTable';
import AssetTransferModal from '../components/features/AssetTransferModal/AssetTransferModal';
import RequestNewAssetModal from '../components/features/RequestNewAssetModal/RequestNewAssetModal';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useAssets,
  useAssetDetail,
  useBranches,
  useDeleteAsset,
  useCreateAsset,
  useDirectTransfer,
  useCreateTransferRequest,
  useCreateAssetRequest,
} from '../hooks/useQueries';

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

const Assets = memo(() => {
  const { user, isAdminCabang, isAdminPusat } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedAssetPreview, setSelectedAssetPreview] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRequestNewAssetModalOpen, setIsRequestNewAssetModalOpen] = useState(false);
  const [assetToTransfer, setAssetToTransfer] = useState(null);
  const [showPastHoldersOverlay, setShowPastHoldersOverlay] = useState(false);
  const [showConditionHistoryOverlay, setShowConditionHistoryOverlay] = useState(false);

  const assetParams = useMemo(() => {
    const p = {};
    // Admin Cabang: filter by assigned branch. Admin Pusat: see all branches (no branchId).
    if (isAdminCabang && user?.branch_id) p.branchId = user.branch_id;
    return p;
  }, [isAdminCabang, user?.branch_id]);

  const { data: rawAssets = [], isLoading: assetsLoading } = useAssets(assetParams, {
    enabled: !!user,
  });

  const { data: branches = [], isLoading: branchesLoading } = useBranches({
    enabled: !!user,
  });

  const { data: assetDetail, isLoading: detailLoading } = useAssetDetail(selectedAssetId, {
    enabled: !!selectedAssetId,
  });

  const selectedAsset = assetDetail ?? selectedAssetPreview;
  const loading = assetsLoading || branchesLoading;

  const deleteAssetMutation = useDeleteAsset();
  const createAssetMutation = useCreateAsset();
  const directTransferMutation = useDirectTransfer();
  const createTransferMutation = useCreateTransferRequest();
  const createAssetRequestMutation = useCreateAssetRequest();

  const branchAssets = useMemo(() => applyDueUpdateStatus(rawAssets), [rawAssets]);

  const handleViewAsset = useCallback((asset) => {
    setSelectedAssetPreview(asset);
    setSelectedAssetId(asset.id);
    if (window.innerWidth < 1024) {
      document.getElementById('asset-detail-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedAssetId(null);
    setSelectedAssetPreview(null);
  }, []);

  const openPastHoldersOverlay = useCallback(() => setShowPastHoldersOverlay(true), []);
  const closePastHoldersOverlay = useCallback(() => setShowPastHoldersOverlay(false), []);
  const openConditionHistoryOverlay = useCallback(() => setShowConditionHistoryOverlay(true), []);
  const closeConditionHistoryOverlay = useCallback(() => setShowConditionHistoryOverlay(false), []);

  const handleOpenAddModal = useCallback(() => {
    if (isAdminCabang) {
      setIsRequestNewAssetModalOpen(true);
      return;
    }
    setIsAddModalOpen(true);
  }, [isAdminCabang]);

  const handleCloseAddModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleAddAsset = useCallback(
    async (assetData) => {
      const branchId = assetData.branchId || user?.branch_id;
      if (!branchId) {
        throw new Error('Branch wajib dipilih.');
      }
      await createAssetMutation.mutateAsync({
        payload: {
          serialNumber: assetData.serialNumber,
          type: assetData.type,
          brand: assetData.brand,
          model: assetData.model,
          detail: assetData.detail || '',
          branchId: String(branchId),
        },
        photo: assetData.photo || null,
      });
      setIsAddModalOpen(false);
      toast.success('Aset berhasil ditambahkan.');
    },
    [createAssetMutation, user?.branch_id, toast]
  );

  const handleTransferAsset = useCallback((asset) => {
    setAssetToTransfer(asset);
    setIsTransferModalOpen(true);
  }, []);

  const handleCloseTransferModal = useCallback(() => {
    setIsTransferModalOpen(false);
    setAssetToTransfer(null);
  }, []);

  const handleDeleteAsset = useCallback(
    async (asset) => {
      if (
        !window.confirm(
          `Hapus aset ${asset.serialNumber} (${asset.type}) secara permanen? Tindakan ini tidak dapat dibatalkan.`
        )
      )
        return;
      try {
        await deleteAssetMutation.mutateAsync(asset.id);
        handleClearSelection();
        toast.success('Aset berhasil dihapus.');
      } catch (err) {
        toast.error(err.message || 'Gagal menghapus aset.');
      }
    },
    [deleteAssetMutation, handleClearSelection, toast]
  );

  const handleSubmitTransferRequest = useCallback(
    async (transferRequest) => {
      if (isAdminPusat) {
        await directTransferMutation.mutateAsync({
          assetId: transferRequest.assetId,
          toBranchId: transferRequest.toBranchId,
          notes: transferRequest.notes || undefined,
        });
        setIsTransferModalOpen(false);
        setAssetToTransfer(null);
        toast.success('Aset berhasil ditransfer ke cabang tujuan.');
      } else {
        await createTransferMutation.mutateAsync({
          assetId: transferRequest.assetId,
          toBranchId: transferRequest.toBranchId,
          notes: transferRequest.notes,
        });
        setIsTransferModalOpen(false);
        setAssetToTransfer(null);
        toast.success('Permintaan transfer aset berhasil dikirim.');
      }
    },
    [toast, isAdminPusat, directTransferMutation, createTransferMutation]
  );

  const handleRequestNewAsset = useCallback(
    async (payload, photoFile) => {
      await createAssetRequestMutation.mutateAsync({
        body: {
          serialNumber: payload.serialNumber,
          type: payload.type,
          brand: payload.brand,
          model: payload.model,
          detail: payload.detail || '',
          branchId: user?.branch_id,
        },
        photo: photoFile,
      });
      setIsRequestNewAssetModalOpen(false);
      toast.success('Request aset baru berhasil dikirim. Menunggu persetujuan Admin Pusat.');
    },
    [createAssetRequestMutation, user?.branch_id, toast]
  );

  return (
    <MainLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
            Asset Management
          </h1>
          <p className="text-sm text-neutral-500">
            {isAdminPusat
              ? 'View and monitor all assets across branches'
              : 'Manage and track all rental assets'}
          </p>
        </div>
        {(isAdminCabang || isAdminPusat) && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 transition-all duration-200"
          >
            <HiPlus className="w-5 h-5" />
            {isAdminCabang ? 'Request New Asset' : 'Add Asset'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          className={`${selectedAsset ? 'lg:col-span-1' : 'lg:col-span-2'} transition-all duration-300`}
        >
          <AssetTable
            assets={branchAssets}
            loading={loading}
            userRole={user?.role}
            branchId={user?.branch_id}
            onViewAsset={handleViewAsset}
            selectedAssetId={selectedAssetId}
            branches={branches}
          />
        </div>

        {selectedAsset && (
          <div className="lg:col-span-1 animate-fade-in" id="asset-detail-section">
            {detailLoading && !assetDetail ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-neutral-500 text-sm">Memuat detail aset...</p>
              </div>
            ) : (
              <AssetDetailPanel
                asset={selectedAsset}
                onClose={handleClearSelection}
                onTransfer={handleTransferAsset}
                canTransfer={isAdminCabang || isAdminPusat}
                onDelete={handleDeleteAsset}
                canDelete={isAdminPusat}
                onOpenPastHolders={openPastHoldersOverlay}
                onOpenConditionHistory={openConditionHistoryOverlay}
              />
            )}
          </div>
        )}
      </div>

      {isAdminPusat && (
        <AddAssetModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onSubmit={handleAddAsset}
          branches={branches}
          branchesLoading={loading}
        />
      )}

      {(isAdminCabang || isAdminPusat) && (
        <AssetTransferModal
          isOpen={isTransferModalOpen}
          onClose={handleCloseTransferModal}
          onSubmit={handleSubmitTransferRequest}
          asset={assetToTransfer}
          assets={branchAssets}
          branches={branches}
          currentBranchId={isAdminPusat ? (assetToTransfer?.branch_id ?? user?.branch_id) : user?.branch_id}
          isDirectTransfer={isAdminPusat}
        />
      )}

      {isAdminCabang && (
        <RequestNewAssetModal
          isOpen={isRequestNewAssetModalOpen}
          onClose={() => setIsRequestNewAssetModalOpen(false)}
          onSubmit={handleRequestNewAsset}
        />
      )}

      <PastHoldersOverlay
        isOpen={showPastHoldersOverlay}
        onClose={closePastHoldersOverlay}
        pastHolders={selectedAsset?.pastHolders ?? []}
        assetSerialNumber={selectedAsset?.serialNumber}
      />
      <ConditionHistoryOverlay
        isOpen={showConditionHistoryOverlay}
        onClose={closeConditionHistoryOverlay}
        conditionHistory={selectedAsset?.conditionHistory ?? []}
        assetSerialNumber={selectedAsset?.serialNumber}
      />
    </MainLayout>
  );
});

Assets.displayName = 'Assets';

export default Assets;
