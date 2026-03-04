import { memo, useState, useCallback, useMemo } from 'react';
import { HiX } from 'react-icons/hi';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';

const ROLES = ['Admin Pusat', 'Admin Cabang'];

const AddUserToBranchModal = memo(({ isOpen, onClose, onSubmit, branches }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    branchId: '',
    role: 'Admin Cabang'
  });
  const [errors, setErrors] = useState({});

  const isAdminPusat = useMemo(() => formData.role === 'Admin Pusat', [formData.role]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'role' && value === 'Admin Pusat') {
      setFormData(prev => ({ ...prev, branchId: '' }));
      setErrors(prev => ({ ...prev, branchId: '' }));
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isAdminPusat && !formData.branchId) {
      newErrors.branchId = 'Please select a branch';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isAdminPusat]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      ...formData,
      branchId: isAdminPusat ? null : formData.branchId
    };
    onSubmit(payload);

    setFormData({
      name: '',
      email: '',
      branchId: '',
      role: 'Admin Cabang'
    });
    setErrors({});
  }, [formData, isAdminPusat, onSubmit, validateForm]);

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      branchId: '',
      role: 'Admin Cabang'
    });
    setErrors({});
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">
            Add User
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close modal"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., John Doe"
            error={errors.name}
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g., john@example.com"
            error={errors.email}
            required
          />

          {/* Role: only Admin Pusat / Admin Cabang */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`block w-full px-4 py-3 text-sm border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                errors.role ? 'border-red-500' : 'border-neutral-200'
              }`}
              required
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Branch: hidden when Admin Pusat, required when Admin Cabang */}
          {!isAdminPusat && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className={`block w-full px-4 py-3 text-sm border rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${
                  errors.branchId ? 'border-red-500' : 'border-neutral-200'
                }`}
                required={!isAdminPusat}
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-sm text-red-500">{errors.branchId}</p>
              )}
            </div>
          )}

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
              className="bg-black text-white"
            >
              Add User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddUserToBranchModal.displayName = 'AddUserToBranchModal';

export default AddUserToBranchModal;
