import { memo, useCallback } from 'react';
import { HiArrowRight, HiTrash, HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Card from '../../common/Card/Card';
import { STATUS_LABELS } from '../../../utils/assetConstants';

const AssetDetailPanel = memo(({ asset, onClose, onTransfer, canTransfer = false, onDelete, canDelete = false, onOpenPastHolders }) => {
  if (!asset) return null;

  return (
    <Card title="Asset Details" subtitle="Complete asset information" className="relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {canTransfer && onTransfer && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTransfer(asset)}
            className="flex items-center gap-1"
          >
            <HiArrowRight className="w-4 h-4" />
            Transfer
          </Button>
        )}
        {canDelete && onDelete && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete(asset)}
            className="flex items-center gap-1 text-red-600 hover:bg-red-50 border-red-200"
          >
            <HiTrash className="w-4 h-4" />
            Delete
          </Button>
        )}
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close details"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Asset Image */}
        <div className="flex justify-center">
          <img
            src={asset.photoUrl || `https://picsum.photos/400/300?random=${asset.id}`}
            alt={asset.serialNumber}
            className="w-full max-w-md h-64 object-cover rounded-lg border-2 border-gray-200"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />
        </div>

        {/* Basic Information */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-neutral-500 block mb-1">
                Serial Number
              </span>
              <span className="text-base font-medium text-neutral-900">
                {asset.serialNumber}
              </span>
            </div>
            <div>
              <span className="text-sm text-neutral-500 block mb-1">
                Type
              </span>
              <span className="text-base font-medium text-neutral-900">
                {asset.type}
              </span>
            </div>
            <div>
              <span className="text-sm text-neutral-500 block mb-1">
                Brand Name
              </span>
              <span className="text-base font-medium text-neutral-900">
                {asset.brand}
              </span>
            </div>
            <div>
              <span className="text-sm text-neutral-500 block mb-1">
                Model/Type
              </span>
              <span className="text-base font-medium text-neutral-900">
                {asset.model}
              </span>
            </div>
            <div>
              <span className="text-sm text-neutral-500 block mb-1">
                Status
              </span>
              <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${
                asset.status === 'Available' ? 'bg-green-50 text-green-700' :
                asset.status === 'Perlu Diupdate' ? 'bg-amber-50 text-amber-700' :
                asset.status === 'Diperbaiki' ? 'bg-blue-50 text-blue-700' :
                asset.status === 'Rusak' ? 'bg-red-50 text-red-700' :
                asset.status === 'Hilang' ? 'bg-neutral-200 text-neutral-700' :
                'bg-neutral-100 text-neutral-700'
              }`}>
                {STATUS_LABELS[asset.status] ?? asset.status}
              </span>
            </div>
          </div>

          {/* Detail (Optional) - preserve line breaks (e.g. 1. / 2.) */}
          {asset.detail && (
            <div className="mt-4">
              <span className="text-sm text-neutral-500 block mb-1">
                Detail
              </span>
              <span className="text-base text-neutral-900 whitespace-pre-line wrap-break-word block">
                {asset.detail}
              </span>
            </div>
          )}
        </div>

        {/* Current Holder Information + Lihat past holder di samping judul */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">
              Current Holder Information
            </h3>
            {onOpenPastHolders && (
              <button
                type="button"
                onClick={onOpenPastHolders}
                className="text-sm font-medium text-neutral-900 hover:underline underline-offset-2"
              >
                Lihat past holder
              </button>
            )}
          </div>
          {asset.holder ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  Nama Lengkap
                </span>
                <span className="text-base font-medium text-neutral-900">
                  {asset.holder.fullName}
                </span>
              </div>
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  NIP
                </span>
                <span className="text-base font-medium text-neutral-900">
                  {asset.holder.nip}
                </span>
              </div>
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  Cabang
                </span>
                <span className="text-base font-medium text-neutral-900">
                  {asset.holder.branchName || asset.holder.branchCode || '—'}
                </span>
              </div>
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  Divisi/Unit Kerja
                </span>
                <span className="text-base font-medium text-neutral-900">
                  {asset.holder.division}
                </span>
              </div>
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  Email
                </span>
                <span className="text-base text-neutral-900">
                  {asset.holder.email}
                </span>
              </div>
              <div>
                <span className="text-sm text-neutral-500 block mb-1">
                  Nomor Telepon
                </span>
                <span className="text-base text-neutral-900">
                  {asset.holder.phone}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-neutral-400 italic">Not assigned</p>
          )}
        </div>

      </div>
    </Card>
  );
});

AssetDetailPanel.displayName = 'AssetDetailPanel';

export default AssetDetailPanel;
