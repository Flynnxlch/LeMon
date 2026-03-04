import { memo, useCallback, useMemo, useState } from 'react';
import { HiCheck, HiPencil, HiPlus, HiTrash, HiX } from 'react-icons/hi';
import Button from '../components/common/Button/Button';
import AddBranchModal from '../components/features/BranchManagement/AddBranchModal';
import AssignUserToBranchModal from '../components/features/BranchManagement/AssignUserToBranchModal';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useToast } from '../context/ToastContext';
import {
  useAccountRequests,
  useApproveAccountRequest,
  useApprovePasswordRequest,
  useBranches,
  useCreateBranch,
  useDeleteBranch,
  useDeleteUser,
  usePasswordApprovalDetail,
  usePasswordApprovals,
  useRejectAccountRequest,
  useRejectPasswordRequest,
  useUpdateUserBranch,
  useUsers,
} from '../hooks/useQueries';

const BranchUserManagement = memo(() => {
  const toast = useToast();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState({
    open: false,
    mode: null,
    request: null,
    user: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteBranchConfirm, setDeleteBranchConfirm] = useState(null);
  const [passwordApprovalDetailId, setPasswordApprovalDetailId] = useState(null);

  const { data: branches = [], isLoading: branchesLoading } = useBranches();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: accountRequests = [], isLoading: requestsLoading } = useAccountRequests();
  const { data: passwordApprovals = [], isLoading: passwordApprovalsLoading } = usePasswordApprovals('Pending');
  const { data: passwordApprovalDetail } = usePasswordApprovalDetail(passwordApprovalDetailId);
  const loading = branchesLoading || usersLoading || requestsLoading;

  const createBranchMutation = useCreateBranch();
  const deleteBranchMutation = useDeleteBranch();
  const approveAccountMutation = useApproveAccountRequest();
  const rejectAccountMutation = useRejectAccountRequest();
  const approvePasswordMutation = useApprovePasswordRequest();
  const rejectPasswordMutation = useRejectPasswordRequest();
  const updateUserBranchMutation = useUpdateUserBranch();
  const deleteUserMutation = useDeleteUser();

  const pendingRequestsCount = useMemo(
    () => accountRequests.filter((r) => r.status === 'Pending').length,
    [accountRequests]
  );

  /** Hanya tampilkan request yang masih Pending; Approved/Rejected tidak ditampilkan */
  const pendingOnlyRequests = useMemo(
    () => accountRequests.filter((r) => r.status === 'Pending'),
    [accountRequests]
  );

  const handleAddBranch = useCallback((branchData) => {
    createBranchMutation.mutate(
      {
        name: branchData.name,
        address: branchData.address,
        city: branchData.city,
        phone: branchData.phone,
      },
      {
        onSuccess: () => {
          setIsAddBranchModalOpen(false);
          toast.success('Cabang berhasil ditambahkan.');
        },
        onError: (err) => toast.error(err.message || 'Gagal menambah cabang.'),
      }
    );
  }, [createBranchMutation, toast]);

  const handleSelectBranch = useCallback((branch) => {
    setSelectedBranch(prev => (prev?.id === branch?.id ? null : branch));
  }, []);

  const openAssignModalForApprove = useCallback((request) => {
    setAssignModal({ open: true, mode: 'approve', request, user: null });
  }, []);

  const openAssignModalForEdit = useCallback((user) => {
    setAssignModal({ open: true, mode: 'edit', request: null, user });
  }, []);

  const handleAssignConfirm = useCallback((branchId, _branchName) => {
    if (assignModal.mode === 'approve' && assignModal.request) {
      approveAccountMutation.mutate(
        { id: assignModal.request.id, body: { branchId } },
        {
          onSuccess: () => {
            setAssignModal({ open: false, mode: null, request: null, user: null });
            toast.success('Request akun berhasil disetujui dan assign ke cabang.');
          },
          onError: (err) => toast.error(err.message || 'Gagal approve request.'),
        }
      );
    } else if (assignModal.mode === 'edit' && assignModal.user) {
      updateUserBranchMutation.mutate(
        { id: assignModal.user.id, body: { branchId } },
        {
          onSuccess: () => {
            setAssignModal({ open: false, mode: null, request: null, user: null });
            toast.success('Cabang user berhasil diubah.');
          },
          onError: (err) => toast.error(err.message || 'Gagal mengubah cabang user.'),
        }
      );
    }
  }, [assignModal.mode, assignModal.request, assignModal.user, approveAccountMutation, updateUserBranchMutation, toast]);

  const handleApproveRequest = useCallback((request) => {
    openAssignModalForApprove(request);
  }, [openAssignModalForApprove]);

  const handleRejectRequest = useCallback((requestId) => {
    rejectAccountMutation.mutate(requestId, {
      onSuccess: () => toast.info('Request akun ditolak.'),
      onError: (err) => toast.error(err.message || 'Gagal menolak request.'),
    });
  }, [rejectAccountMutation, toast]);

  const handleApprovePasswordRequest = useCallback((id) => {
    approvePasswordMutation.mutate(id, {
      onSuccess: () => {
        setPasswordApprovalDetailId(null);
        toast.success('Password berhasil diubah.');
      },
      onError: (err) => toast.error(err.message || 'Gagal menyetujui.'),
    });
  }, [approvePasswordMutation, toast]);

  const handleRejectPasswordRequest = useCallback((id) => {
    rejectPasswordMutation.mutate(id, {
      onSuccess: () => {
        setPasswordApprovalDetailId(null);
        toast.info('Request perubahan password ditolak.');
      },
      onError: (err) => toast.error(err.message || 'Gagal menolak.'),
    });
  }, [rejectPasswordMutation, toast]);

  const handleDeleteBranch = useCallback((branch) => {
    deleteBranchMutation.mutate(branch.id, {
      onSuccess: () => {
        setDeleteBranchConfirm(null);
        setSelectedBranch((prev) => (prev?.id === branch.id ? null : prev));
        toast.success('Cabang berhasil dihapus.');
      },
      onError: (err) => toast.error(err.message || 'Gagal menghapus cabang.'),
    });
  }, [deleteBranchMutation, toast]);

  const handleDeleteUser = useCallback((user) => {
    deleteUserMutation.mutate(user.id, {
      onSuccess: () => {
        setDeleteConfirm(null);
        toast.success('User berhasil dihapus.');
      },
      onError: (err) => toast.error(err.message || 'Gagal menghapus user.'),
    });
  }, [deleteUserMutation, toast]);

  const closeAssignModal = useCallback(() => {
    setAssignModal({ open: false, mode: null, request: null, user: null });
  }, []);

  const branchesWithAdmin = useMemo(() => {
    return branches.map((b) => ({
      ...b,
      assignedAdminName: users.find((u) => u.branchId === b.id)?.name || '—',
    }));
  }, [branches, users]);

  /** Semua user (termasuk Admin Pusat tanpa cabang) saat tidak pilih cabang; kalau pilih cabang, filter per cabang */
  const filteredUsers = useMemo(() => {
    if (!selectedBranch) return users;
    return users.filter((user) => user.branchId === selectedBranch.id);
  }, [users, selectedBranch]);

  return (
    <MainLayout>
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-base font-semibold text-neutral-900 sm:text-lg">
            Branch & User Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage branches and users
          </p>
        </div>

        {/* Split View: Branch (left) | User (right) */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Left Panel: Branch List (35%) */}
            <div className="lg:w-[35%] flex flex-col rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Branches
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="flex items-center gap-1.5 bg-white border border-neutral-300 text-black"
                >
                  <HiPlus className="w-4 h-4" />
                  Add Branch
                </Button>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Branch Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Assigned Admin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-500">
                          Memuat...
                        </td>
                      </tr>
                    ) : branchesWithAdmin.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-500">
                          Belum ada cabang. Klik &quot;Add Branch&quot; untuk menambah.
                        </td>
                      </tr>
                    ) : (
                      branchesWithAdmin.map((branch) => (
                        <tr
                          key={branch.id}
                          onClick={() => handleSelectBranch(branch)}
                          className={`
                            cursor-pointer px-4 py-3 transition-colors
                            ${selectedBranch?.id === branch.id ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
                          `}
                        >
                          <td className="px-4 py-3 font-medium text-neutral-900">
                            {branch.name}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {branch.city || '—'}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {branch.assignedAdminName || '—'}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setDeleteBranchConfirm(branch)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1 rounded"
                              aria-label="Delete branch"
                              title="Hapus cabang"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: User List & Details (65%) */}
            <div className="lg:w-[65%] flex flex-col rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Users
                  </h2>
                  {selectedBranch && (
                    <span className="text-sm text-neutral-500">
                      {selectedBranch.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Assigned Branch
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                          Memuat...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                          {selectedBranch ? 'Tidak ada user di cabang ini.' : 'Tidak ada user.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-neutral-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-neutral-900">
                            {user.name}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {user.email}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-neutral-900">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {user.branchName || (user.role === 'Admin Pusat' ? 'Pusat' : '—')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`
                                text-xs font-medium
                                ${user.status === 'Active' ? 'text-neutral-700' : 'text-neutral-500'}
                              `}
                            >
                              {user.status ?? 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAssignModalForEdit(user)}
                                className="text-neutral-500 hover:text-neutral-900 transition-colors"
                                aria-label="Edit branch"
                                title="Ubah cabang"
                              >
                                <HiPencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(user)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                aria-label="Delete"
                                title="Hapus user"
                              >
                                <HiTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            Register Request
            {pendingRequestsCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                ({pendingRequestsCount} pending)
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Request Info
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Assign to Branch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Memuat...
                    </td>
                  </tr>
                ) : pendingOnlyRequests.length > 0 ? (
                  pendingOnlyRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="text-neutral-900 font-medium">{request.name}</div>
                        <div className="text-sm text-neutral-500">{request.email}</div>
                        {request.phone && (
                          <div className="text-sm text-neutral-500">{request.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{request.nip ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {request.branchName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-amber-700">
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(request)}
                            className="text-neutral-500 hover:text-neutral-900"
                            title="Approve & assign ke cabang"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(request.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Tidak ada register request pending. Yang sudah Approved/Rejected tidak ditampilkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 mt-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            Password Approval
            {passwordApprovals.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                ({passwordApprovals.length} pending)
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {passwordApprovalsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Memuat...
                    </td>
                  </tr>
                ) : passwordApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                      Tidak ada permintaan perubahan password pending.
                    </td>
                  </tr>
                ) : (
                  passwordApprovals.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setPasswordApprovalDetailId(req.id)}
                      className="cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {req.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {req.email}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {req.nip ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {req.requestedAt
                          ? new Date(req.requestedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePasswordRequest(req.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Accept"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPasswordRequest(req.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AddBranchModal
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          onSubmit={handleAddBranch}
        />

        <AssignUserToBranchModal
          isOpen={assignModal.open}
          onClose={closeAssignModal}
          branches={branches}
          title={assignModal.mode === 'approve' ? 'Assign ke Cabang' : 'Ubah Cabang User'}
          subtitle={
            assignModal.mode === 'approve' && assignModal.request
              ? `Pilih cabang untuk Admin Cabang "${assignModal.request.name}". Setelah approve, akun akan aktif di cabang yang dipilih.`
              : assignModal.mode === 'edit' && assignModal.user
              ? `Pilih cabang untuk ${assignModal.user.name}:`
              : null
          }
          initialBranchId={assignModal.user?.branchId || null}
          onConfirm={handleAssignConfirm}
        />

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-sm w-full p-4">
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Hapus User?</h3>
              <p className="text-sm text-neutral-500 mb-4">
                User &quot;{deleteConfirm.name}&quot; akan dihapus. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleDeleteUser(deleteConfirm)}
                >
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        )}

        {deleteBranchConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-sm w-full p-4">
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Hapus Cabang?</h3>
              <p className="text-sm text-neutral-500 mb-4">
                Cabang &quot;{deleteBranchConfirm.name}&quot; akan dihapus. Cabang yang masih memiliki aset tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDeleteBranchConfirm(null)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleDeleteBranch(deleteBranchConfirm)}
                >
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        )}

        {passwordApprovalDetailId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPasswordApprovalDetailId(null)}>
            <div className="bg-white rounded-lg border border-neutral-200 shadow-lg max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Detail Permintaan Perubahan Password</h3>
              {passwordApprovalDetail ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-neutral-700">Name:</span> {passwordApprovalDetail.name}</p>
                  <p><span className="font-medium text-neutral-700">Email:</span> {passwordApprovalDetail.email}</p>
                  <p><span className="font-medium text-neutral-700">NIP:</span> {passwordApprovalDetail.nip ?? '—'}</p>
                  <p><span className="font-medium text-neutral-700">Phone:</span> {passwordApprovalDetail.phone ?? '—'}</p>
                  <p><span className="font-medium text-neutral-700">Role:</span> {passwordApprovalDetail.role}</p>
                  <p><span className="font-medium text-neutral-700">Branch:</span> {passwordApprovalDetail.branchName ?? '—'}</p>
                  <p><span className="font-medium text-neutral-700">Requested at:</span> {passwordApprovalDetail.requestedAt ? new Date(passwordApprovalDetail.requestedAt).toLocaleString() : '—'}</p>
                </div>
              ) : (
                <p className="text-neutral-500">Memuat...</p>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={() => setPasswordApprovalDetailId(null)}>
                  Tutup
                </Button>
                {passwordApprovalDetail && passwordApprovalDetail.status === 'Pending' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprovePasswordRequest(passwordApprovalDetailId)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleRejectPasswordRequest(passwordApprovalDetailId)}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
});

BranchUserManagement.displayName = 'BranchUserManagement';

export default BranchUserManagement;
