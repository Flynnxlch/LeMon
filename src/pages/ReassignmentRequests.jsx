import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiCheck, HiX, HiArrowRight, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import PdfUpload from '../components/common/PdfUpload';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import ModalWrapper from '../components/common/ModalWrapper/ModalWrapper';
import { useToast } from '../context/ToastContext';
import {
  useReassignmentRequests,
  useApproveReassignmentRequest,
  useRejectReassignmentRequest,
} from '../hooks/useQueries';

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

const ReassignmentRequests = memo(() => {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [beritaAcara, setBeritaAcara] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: requests = [], isLoading: loading } = useReassignmentRequests();
  const approveMutation = useApproveReassignmentRequest();
  const rejectMutation = useRejectReassignmentRequest();

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

  useEffect(() => {
    if (selectedRequest) setBeritaAcara(null);
  }, [selectedRequest?.id]);

  const statusCounts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === 'Pending').length,
      approved: requests.filter((r) => r.status === 'Approved').length,
      rejected: requests.filter((r) => r.status === 'Rejected').length,
    }),
    [requests]
  );

  const handleApprove = useCallback(() => {
    if (!selectedRequest) return;
    if (!beritaAcara) {
      toast.error('Berita Acara (PDF) wajib diunggah sebelum approve.');
      return;
    }
    approveMutation.mutate(
      { id: selectedRequest.id, beritaAcaraFile: beritaAcara },
      {
        onSuccess: () => {
          setSelectedRequest((prev) => (prev ? { ...prev, status: 'Approved' } : null));
          setBeritaAcara(null);
          toast.success('Permintaan reassignment disetujui.');
        },
        onError: (err) => toast.error(err.message || 'Gagal approve.'),
      }
    );
  }, [selectedRequest, beritaAcara, approveMutation, toast]);

  const handleReject = useCallback(
    (requestId) => {
      rejectMutation.mutate(requestId, {
        onSuccess: () => {
          setSelectedRequest((prev) => (prev?.id === requestId ? { ...prev, status: 'Rejected' } : prev));
          toast.info('Permintaan reassignment ditolak.');
        },
        onError: (err) => toast.error(err.message || 'Gagal reject.'),
      });
    },
    [rejectMutation, toast]
  );

  const closeDetail = useCallback(() => {
    setSelectedRequest(null);
    setBeritaAcara(null);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Reassignment Requests
        </h1>
        <p className="text-sm text-neutral-500">
          Review and approve asset reassignment requests from Admin Cabang
        </p>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
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
            {status === 'all' ? `All (${statusCounts.all})` : `${status} (${statusCounts[status.toLowerCase()]})`}
          </button>
        ))}
      </div>

      {/* Table / List - Responsive */}
      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                  From → To
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                  Requested
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <Motion.tr
                    key={request.id}
                    layout
                    onClick={() => setSelectedRequest(request)}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer border-b border-neutral-100"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {request.assetSerialNumber}
                        </div>
                        <div className="text-sm text-neutral-500">{request.assetType}</div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-neutral-700 truncate max-w-[100px]">
                          {request.currentHolderName || '—'}
                        </span>
                        <HiArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span className="text-neutral-900 font-medium truncate max-w-[100px]">
                          {request.newHolderFullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell text-sm text-neutral-500">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(request.status)}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(request);
                        }}
                        className="text-sm font-medium text-neutral-900 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </Motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-neutral-500">
                    No reassignment requests found
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

      {/* Detail Modal - Read-only form */}
      <AnimatePresence>
        {selectedRequest && (
          <ModalWrapper
            isOpen={!!selectedRequest}
            onClose={closeDetail}
            maxWidth="max-w-2xl"
            className="max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Detail Request Reassignment
                </h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-all duration-200"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">Asset</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Serial</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.assetSerialNumber}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Tipe</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.assetType}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Cabang</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.branchName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">Holder Lama → Baru</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-sm">
                      <span className="text-neutral-500">Dari: </span>
                      <span className="font-medium text-neutral-900">
                        {selectedRequest.currentHolderName || 'Tidak ada'}
                      </span>
                    </div>
                    <HiArrowRight className="w-5 h-5 text-neutral-400" />
                    <div className="text-sm">
                      <span className="text-neutral-500">Ke: </span>
                      <span className="font-medium text-neutral-900">
                        {selectedRequest.newHolderFullName}
                      </span>
                      {selectedRequest.newHolderNip && (
                        <span className="text-neutral-500 ml-1">(NIP: {selectedRequest.newHolderNip})</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-500">Divisi</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.newHolderDivision}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.newHolderEmail}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">Alasan Reassign</h3>
                  <p className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    {selectedRequest.reason ?? selectedRequest.notes ?? '—'}
                  </p>
                </div>

                <div className="text-sm text-neutral-500">
                  Diajukan oleh <span className="font-medium text-neutral-700">{selectedRequest.requestedBy}</span>
                  {' · '}
                  {formatDate(selectedRequest.requestDate)}
                </div>
              </div>

              {selectedRequest.status === 'Pending' && (
                <>
                  <div className="mt-6">
                    <PdfUpload file={beritaAcara} onChange={setBeritaAcara} required />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-neutral-200">
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
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>
    </MainLayout>
  );
});

ReassignmentRequests.displayName = 'ReassignmentRequests';

export default ReassignmentRequests;
