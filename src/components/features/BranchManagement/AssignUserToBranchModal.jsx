import { memo, useCallback, useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';

const AssignUserToBranchModal = memo(({ isOpen, onClose, branches, title, subtitle, initialBranchId, onConfirm }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId || '');

  useEffect(() => {
    if (isOpen) setSelectedBranchId(initialBranchId || '');
  }, [isOpen, initialBranchId]);

  const handleChange = useCallback((e) => {
    setSelectedBranchId(e.target.value);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    const branch = branches.find((b) => b.id === selectedBranchId);
    if (branch) {
      onConfirm(branch.id, branch.name);
    }
    setSelectedBranchId(initialBranchId || '');
    onClose();
  }, [selectedBranchId, branches, onConfirm, onClose, initialBranchId]);

  const handleClose = useCallback(() => {
    setSelectedBranchId(initialBranchId || '');
    onClose();
  }, [onClose, initialBranchId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close modal"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {subtitle && (
          <p className="px-4 pt-3 text-sm text-neutral-500">{subtitle}</p>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={handleChange}
              className="block w-full px-4 py-3 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              required
            >
              <option value="">Pilih cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.city ? ` (${branch.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={!selectedBranchId}>
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

AssignUserToBranchModal.displayName = 'AssignUserToBranchModal';

export default AssignUserToBranchModal;
