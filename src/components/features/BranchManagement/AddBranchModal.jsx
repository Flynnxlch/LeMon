import { memo, useCallback, useState } from 'react';
import { HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';

const AddBranchModal = memo(({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    city: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSubmit(formData);
    
    // Reset form
    setFormData({
      name: '',
      city: ''
    });
    setErrors({});
  }, [formData, onSubmit, validateForm]);

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      city: ''
    });
    setErrors({});
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">
            Add New Branch
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close modal"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            label="Branch Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Jakarta Pusat Branch"
            error={errors.name}
            required
          />

          <Input
            label="City (optional)"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g., Jakarta"
            error={errors.city}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Branch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddBranchModal.displayName = 'AddBranchModal';

export default AddBranchModal;
