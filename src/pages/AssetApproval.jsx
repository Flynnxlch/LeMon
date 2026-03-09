import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiCheck, HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Input from '../components/common/Input/Input';
import PdfUpload from '../components/common/PdfUpload';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import ModalWrapper from '../components/common/ModalWrapper/ModalWrapper';
import { useToast } from '../context/ToastContext';
import {
  useAssetRequests,
  useApproveAssetRequest,
  useRejectAssetRequest,
} from '../hooks/useQueries';
import { ASSET_TYPES, getBrandsForType, getModelsForBrand } from '../utils/assetTypeOptions';

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Pending':
      return 'bg-amber-50 text-amber-700';
    case 'Approved':
      return 'bg-green-50 text-green-700';
    case 'Rejected':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ITEMS_PER_PAGE = 10;

const AssetApproval = memo(() => {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [beritaAcara, setBeritaAcara] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: requests = [], isLoading: loading } = useAssetRequests();
  const approveMutation = useApproveAssetRequest();
  const rejectMutation = useRejectAssetRequest();

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const statusCounts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === 'Pending').length,
      approved: requests.filter((r) => r.status === 'Approved').length,
      rejected: requests.filter((r) => r.status === 'Rejected').length,
    }),
    [requests]
  );

  const openDetail = useCallback((req) => {
    setSelectedRequest(req);
    const type = req.type === 'Desktop Computer' ? 'Computer Desktop (PC)' : (req.type || '');
    setEditForm({
      serialNumber: req.serialNumber || '',
      type,
      brand: req.brand || '',
      model: req.model || '',
      detail: req.detail || '',
      contractEndDate: '',
    });
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedRequest(null);
    setEditForm(null);
    setBeritaAcara(null);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      if (!prev) return null;
      const next = { ...prev, [name]: value };
      if (name === 'type') {
        next.brand = '';
        next.model = '';
      } else if (name === 'brand') {
        next.model = '';
      }
      return next;
    });
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedRequest || !editForm) return;
    if (!editForm.contractEndDate || !String(editForm.contractEndDate).trim()) {
      toast.error('Tanggal akhir kontrak wajib diisi sebelum approve.');
      return;
    }
    if (!beritaAcara) {
      toast.error('Berita Acara (PDF) wajib diunggah sebelum approve.');
      return;
    }
    approveMutation.mutate(
      {
        id: selectedRequest.id,
        body: {
          serialNumber: editForm.serialNumber,
          type: editForm.type,
          brand: editForm.brand,
          model: editForm.model,
          detail: editForm.detail,
          contractEndDate: editForm.contractEndDate ? `${editForm.contractEndDate}T00:00:00.000Z` : undefined,
        },
        beritaAcara,
      },
      {
        onSuccess: () => {
          closeDetail();
          toast.success('Request aset baru disetujui dan aset telah ditambahkan.');
        },
        onError: (err) => toast.error(err.message || 'Gagal approve.'),
      }
    );
  }, [selectedRequest, editForm, beritaAcara, closeDetail, approveMutation, toast]);

  const handleReject = useCallback(
    (requestId) => {
      rejectMutation.mutate(requestId, {
        onSuccess: () => {
          closeDetail();
          toast.info('Request aset baru ditolak.');
        },
        onError: (err) => toast.error(err.message || 'Gagal reject.'),
      });
    },
    [closeDetail, rejectMutation, toast]
  );

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Asset Approval
        </h1>
        <p className="text-sm text-neutral-500">
          Review dan setujui pengajuan aset baru dari Admin Cabang. Klik baris untuk membuka detail. Approve akan menambahkan aset; Reject tidak menambahkan.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              statusFilter === status
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {status === 'all' ? `Semua (${statusCounts.all})` : `${status} (${statusCounts[status.toLowerCase()]})`}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Serial / Tipe
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                  Cabang
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                  Tanggal
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <Motion.tr
                    key={request.id}
                    layout
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(request)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(request);
                      }
                    }}
                    className="hover:bg-neutral-50 transition-colors border-b border-neutral-100 cursor-pointer"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-medium text-neutral-900">{request.serialNumber}</div>
                      <div className="text-sm text-neutral-500">{request.type}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell text-sm text-neutral-700">
                      {request.branchName || '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell text-sm text-neutral-500">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                  </Motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-neutral-500">
                    Tidak ada pengajuan aset
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRequests.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} dari {filteredRequests.length}
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

      <AnimatePresence>
        {selectedRequest && editForm && (
          <ModalWrapper isOpen={!!selectedRequest} maxWidth="max-w-2xl" onClose={closeDetail} className="max-h-[90vh] overflow-y-auto">
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">Detail Pengajuan Aset</h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-all duration-200"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Info (line breaks); status dalam label warna */}
              <div className="text-sm text-neutral-600 mb-4">
                <p className="whitespace-pre-line">
                  {[`Diajukan oleh ${selectedRequest.requestedBy ?? '—'}`, formatDate(selectedRequest.requestDate)]
                    .filter(Boolean)
                    .join('\n')}
                </p>
                {selectedRequest.status !== 'Pending' && (
                  <span
                    className={`inline-flex mt-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedRequest.status === 'Approved'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {selectedRequest.status === 'Approved'
                      ? 'Sudah disetujui dan ditambahkan ke Asset'
                      : 'Ditolak'}
                  </span>
                )}
              </div>

              <hr className="border-t border-neutral-200 my-6" />

              {/* Section 2: Detail (Serial Number, Tipe Aset, Brand, Model, Detail, Foto pengajuan) */}
              <div className="space-y-4">
                {selectedRequest.status === 'Pending' ? (
                  <>
                    <Input
                      label="Serial Number"
                      name="serialNumber"
                      value={editForm.serialNumber}
                      onChange={handleEditChange}
                    />
                    <Input
                      label="Tanggal Akhir Kontrak"
                      name="contractEndDate"
                      type="date"
                      value={editForm.contractEndDate}
                      onChange={handleEditChange}
                      required
                      helperText="Wajib diisi. Jika sudah lewat, aset akan masuk menu Kontrak Habis."
                    />
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Tipe Aset</label>
                      <select
                        name="type"
                        value={editForm.type}
                        onChange={handleEditChange}
                        className="block w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      >
                        <option value="">Pilih tipe</option>
                        {ASSET_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {editForm.type && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Brand</label>
                          <select
                            name="brand"
                            value={editForm.brand}
                            onChange={handleEditChange}
                            className="block w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          >
                            <option value="">Pilih brand</option>
                            {getBrandsForType(editForm.type).map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">Model</label>
                          <select
                            name="model"
                            value={editForm.model}
                            onChange={handleEditChange}
                            className="block w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          >
                            <option value="">Pilih model</option>
                            {getModelsForBrand(editForm.type, editForm.brand).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Detail</label>
                      <textarea
                        name="detail"
                        value={editForm.detail}
                        onChange={handleEditChange}
                        rows={3}
                        className="block w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-1">Serial Number</label>
                      <p className="text-neutral-900 font-medium">{editForm.serialNumber || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-1">Tanggal Akhir Kontrak</label>
                      <p className="text-neutral-900 font-medium">{editForm.contractEndDate || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-1">Tipe Aset</label>
                      <p className="text-neutral-900 font-medium">{editForm.type || '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-500 mb-1">Brand</label>
                        <p className="text-neutral-900 font-medium">{editForm.brand || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-500 mb-1">Model</label>
                        <p className="text-neutral-900 font-medium">{editForm.model || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-1">Detail</label>
                      <p className="text-neutral-900 whitespace-pre-wrap">{editForm.detail || '—'}</p>
                    </div>
                  </>
                )}
                {selectedRequest.photoUrl && (
                  <div>
                    <span className="block text-sm font-medium text-neutral-700 mb-2">Foto pengajuan</span>
                    <img
                      src={selectedRequest.photoUrl}
                      alt="Asset"
                      className="w-40 h-32 object-cover rounded-lg border border-neutral-200"
                    />
                  </div>
                )}
              </div>

              {selectedRequest.status === 'Pending' && (
                <>
                  <hr className="border-t border-neutral-200 my-6" />
                  <PdfUpload file={beritaAcara} onChange={setBeritaAcara} required />
                  <hr className="border-t border-neutral-200 my-6" />
                  {/* Section 3: Tombol Approve & Reject */}
                  <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleApprove}
                    className="bg-black hover:bg-neutral-800 transition-all duration-200"
                  >
                    <HiCheck className="w-5 h-5 mr-2 inline" />
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleReject(selectedRequest.id)}
                    className="border border-neutral-300 bg-white hover:bg-neutral-50 transition-all duration-200"
                  >
                    <HiX className="w-5 h-5 mr-2 inline" />
                    Reject
                  </Button>
                  </div>
                </>
              )}
            </Motion.div>
          </ModalWrapper>
        )}
      </AnimatePresence>
    </MainLayout>
  );
});

AssetApproval.displayName = 'AssetApproval';

export default AssetApproval;
