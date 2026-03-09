import { memo, useMemo, useState, useEffect } from 'react';
import { HiX, HiArrowRight } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import PdfUpload from '../../common/PdfUpload';
import ModalWrapper from '../../common/ModalWrapper/ModalWrapper';

const AssetTransferModal = memo(({ isOpen, onClose, onSubmit, asset, assets = [], branches = [], currentBranchId, isDirectTransfer = false }) => {
  const [formData, setFormData] = useState({
    assetId: '',
    toBranchId: '',
    notes: '',
  });
  const [beritaAcara, setBeritaAcara] = useState(null);
  const [errors, setErrors] = useState({});

  const selectedAsset = useMemo(() => {
    const targetId = formData.assetId || asset?.id;
    if (!targetId) return null;
    return assets.find((item) => item.id === targetId) || asset || null;
  }, [assets, formData.assetId, asset]);

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

  const validate = () => {
    const newErrors = {};

    if (!selectedAsset) {
      newErrors.assetId = 'Asset is required';
    }

    if (!formData.toBranchId) {
      newErrors.toBranchId = 'Destination branch is required';
    }

    if (formData.toBranchId === currentBranchId) {
      newErrors.toBranchId = 'Cannot transfer to the same branch';
    }

    if (!isDirectTransfer && (!formData.notes || formData.notes.trim().length < 10)) {
      newErrors.notes = 'Please provide a reason (at least 10 characters)';
    }

    if (isDirectTransfer && !beritaAcara) {
      newErrors.beritaAcara = 'Berita Acara (PDF) wajib diunggah';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const transferRequest = {
      id: `TRF${Date.now()}`,
      assetId: selectedAsset.id,
      assetSerialNumber: selectedAsset.serialNumber,
      assetType: selectedAsset.type,
      fromBranchId: currentBranchId,
      fromBranchName: selectedAsset.branch_name,
      toBranchId: formData.toBranchId,
      toBranchName: branches.find(b => b.id === formData.toBranchId)?.name || '',
      notes: formData.notes,
      status: 'Pending',
      requestDate: new Date().toISOString(),
      requestedBy: 'Current User',
    };

    onSubmit(transferRequest, isDirectTransfer ? beritaAcara : null);
    
    setFormData({
      assetId: '',
      toBranchId: '',
      notes: '',
    });
    setBeritaAcara(null);
  };

  const handleClose = () => {
    setFormData({
      assetId: '',
      toBranchId: '',
      notes: '',
    });
    setBeritaAcara(null);
    setErrors({});
    onClose();
  };

  // Filter out current branch from destination options
  const availableBranches = branches.filter(b => b.id !== currentBranchId);
  const transferableAssets = useMemo(() => {
    return assets.filter((item) => item.branch_id === currentBranchId);
  }, [assets, currentBranchId]);

  useEffect(() => {
    if (!isOpen) return;
    if (asset?.id) {
      setFormData((prev) => ({ ...prev, assetId: asset.id }));
    }
  }, [isOpen, asset]);

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-lg" className="flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h3 className="text-lg font-semibold text-neutral-900">
          {isDirectTransfer ? 'Asset Transfer' : 'Request Asset Transfer'}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Asset by Serial Number */}
          <div>
            <label htmlFor="assetId" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Asset Serial Number <span className="text-red-500">*</span>
            </label>
            <select
              id="assetId"
              name="assetId"
              value={formData.assetId}
              onChange={handleChange}
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                errors.assetId ? 'border-red-500' : 'border-neutral-300'
              }`}
            >
              <option value="">Select Asset</option>
              {transferableAssets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.serialNumber} - {item.type}
                </option>
              ))}
            </select>
            {errors.assetId && (
              <p className="mt-1 text-sm text-red-500">{errors.assetId}</p>
            )}
            {transferableAssets.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                No transferable assets found in this branch.
              </p>
            )}
          </div>

          {selectedAsset && (
            <div className="px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Selected Asset</p>
                  <p className="font-semibold text-neutral-900">
                    {selectedAsset.serialNumber} - {selectedAsset.type}
                  </p>
                </div>
                <HiArrowRight className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="mt-2">
                <p className="text-sm text-neutral-500">Current Branch</p>
                <p className="font-semibold text-neutral-900">{selectedAsset.branch_name}</p>
              </div>
            </div>
          )}

          {/* Destination Branch */}
          <div>
            <label htmlFor="toBranchId" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Destination Branch <span className="text-red-500">*</span>
            </label>
            <select
              id="toBranchId"
              name="toBranchId"
              value={formData.toBranchId}
              onChange={handleChange}
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                errors.toBranchId ? 'border-red-500' : 'border-neutral-300'
              }`}
            >
              <option value="">Select Destination Branch</option>
              {availableBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {errors.toBranchId && (
              <p className="mt-1 text-sm text-red-500">{errors.toBranchId}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Reason for Transfer {!isDirectTransfer && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Explain why this asset needs to be transferred..."
              className={`block w-full px-4 py-2.5 border rounded-lg bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                errors.notes ? 'border-red-500' : 'border-neutral-300'
              }`}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-500">{errors.notes}</p>
            )}
          </div>

          {isDirectTransfer && (
            <PdfUpload
              file={beritaAcara}
              onChange={setBeritaAcara}
              error={errors.beritaAcara}
              required
            />
          )}

          {/* Warning - only for request flow (Admin Cabang) */}
          {!isDirectTransfer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This transfer request will be sent to Admin Pusat for approval. The asset will remain in the current branch until the request is approved.
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isDirectTransfer ? 'Transfer' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </ModalWrapper>
  );
});

AssetTransferModal.displayName = 'AssetTransferModal';

export default AssetTransferModal;
