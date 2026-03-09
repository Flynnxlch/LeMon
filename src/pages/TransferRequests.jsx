import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiArrowRight, HiCheck, HiChevronLeft, HiChevronRight, HiFilter, HiX } from 'react-icons/hi';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import PdfUpload from '../components/common/PdfUpload';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import ModalWrapper from '../components/common/ModalWrapper/ModalWrapper';
import { useToast } from '../context/ToastContext';
import {
  useTransferRequests,
  useApproveTransferRequest,
  useRejectTransferRequest,
} from '../hooks/useQueries';

const ITEMS_PER_PAGE = 10;

const TransferRequests = memo(() => {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [beritaAcara, setBeritaAcara] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: requests = [], isLoading: loading } = useTransferRequests();
  const approveMutation = useApproveTransferRequest();
  const rejectMutation = useRejectTransferRequest();

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((req) => req.status === statusFilter);
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


  const handleReject = useCallback(
    (requestId) => {
      rejectMutation.mutate(requestId, {
        onSuccess: () => {
          setSelectedRequest(null);
          toast.info('Permintaan transfer aset ditolak.');
        },
        onError: (err) => toast.error(err.message || 'Gagal reject.'),
      });
    },
    [rejectMutation, toast]
  );

  const openDetail = useCallback((req) => {
    setSelectedRequest(req);
    setBeritaAcara(null);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedRequest(null);
    setBeritaAcara(null);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handleApproveFromDetail = useCallback(() => {
    if (!selectedRequest) return;
    if (!beritaAcara) {
      toast.error('Berita Acara (PDF) wajib diunggah sebelum approve.');
      return;
    }
    approveMutation.mutate(
      { id: selectedRequest.id, beritaAcaraFile: beritaAcara },
      {
        onSuccess: () => {
          setSelectedRequest(null);
          setBeritaAcara(null);
          toast.success('Permintaan transfer aset disetujui. Aset telah berpindah ke cabang tujuan.');
        },
        onError: (err) => toast.error(err.message || 'Gagal approve.'),
      }
    );
  }, [selectedRequest, beritaAcara, approveMutation, toast]);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout>
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Asset Transfer Requests
        </h1>
        <p className="text-sm text-neutral-500">
          Review and approve asset transfers between branches
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <HiFilter className="w-5 h-5 text-neutral-500" />
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'Pending'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Pending ({statusCounts.pending})
          </button>
          <button
            onClick={() => setStatusFilter('Approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'Approved'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Approved ({statusCounts.approved})
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'Rejected'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Rejected ({statusCounts.rejected})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Transfer Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <tr
                    key={request.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(request)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(request);
                      }
                    }}
                    className="hover:bg-neutral-50 transition-colors border-b border-gray-100 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {request.assetSerialNumber}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {request.assetType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-neutral-900">
                          {request.fromBranchName ?? '—'}
                        </span>
                        <HiArrowRight className="w-5 h-5 text-neutral-500 shrink-0" />
                        <span className="font-medium text-neutral-900">
                          {request.toBranchName ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {request.requestedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">
                    No transfer requests found
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

      {/* Request Details – popup (3 section seperti Detail Pengajuan Aset) */}
      <AnimatePresence>
        {selectedRequest && (
          <ModalWrapper
            isOpen={!!selectedRequest}
            maxWidth="max-w-2xl"
            onClose={closeDetail}
            className="max-h-[90vh] overflow-y-auto"
          >
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">Detail Permintaan Transfer</h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Info (line breaks); status dalam label warna */}
              <div className="text-sm text-neutral-600 mb-4">
                <p className="whitespace-pre-line">
                  {[
                    `Diajukan oleh ${selectedRequest.requestedBy ?? '—'}`,
                    formatDate(selectedRequest.requestDate),
                  ].join('\n')}
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
                      ? 'Sudah disetujui — aset telah berpindah ke cabang tujuan'
                      : 'Ditolak'}
                  </span>
                )}
              </div>

              <hr className="border-t border-neutral-200 my-6" />

              {/* Section 2: Detail (Asset, Transfer route nama cabang saja, Notes) */}
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">Aset</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Serial Number</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.assetSerialNumber ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Tipe</span>
                      <p className="font-medium text-neutral-900">{selectedRequest.assetType ?? '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">Rute Transfer</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-900">{selectedRequest.fromBranchName ?? '—'}</span>
                    <HiArrowRight className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span className="font-medium text-neutral-900">{selectedRequest.toBranchName ?? '—'}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">Alasan / Catatan</h3>
                  <p className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-200 whitespace-pre-wrap">
                    {selectedRequest.notes ?? '—'}
                  </p>
                </div>
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
                      onClick={handleApproveFromDetail}
                      className="bg-black hover:bg-neutral-800"
                    >
                      <HiCheck className="w-5 h-5 mr-2 inline" />
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => handleReject(selectedRequest.id)}
                      className="border border-neutral-300 bg-white hover:bg-neutral-50"
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

TransferRequests.displayName = 'TransferRequests';

export default TransferRequests;
