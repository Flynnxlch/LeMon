import { memo, useCallback, useMemo, useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useProgressTrack, useBranches } from '../hooks/useQueries';
import { STATUS_LABELS, truncate } from '../utils/assetConstants';

const ITEMS_PER_PAGE = 25;

const statusClasses = {
  Available: 'bg-green-50 text-green-700',
  'Perlu Diupdate': 'bg-amber-50 text-amber-700',
  Diperbaiki: 'bg-blue-50 text-blue-700',
  Rusak: 'bg-red-50 text-red-700',
  'Dalam Perbaikan': 'bg-amber-100 text-amber-800',
  Hilang: 'bg-neutral-200 text-neutral-700',
  Pending: 'bg-neutral-100 text-neutral-700',
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
};

function StatusBadge({ status }) {
  if (!status) return <span className="text-neutral-500 text-sm">—</span>;
  const label = STATUS_LABELS[status] ?? status;
  const cls = statusClasses[status] || statusClasses.Available;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ProgressTrack = memo(() => {
  const { user, isAdminCabang, isAdminPusat } = useAuth();
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const params = useMemo(() => {
    const p = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
    if (isAdminPusat && branchFilter) p.branchId = branchFilter;
    if (statusFilter && statusFilter !== 'all') p.status = statusFilter;
    if (searchQuery.trim()) p.search = searchQuery.trim();
    return p;
  }, [isAdminPusat, branchFilter, statusFilter, searchQuery, currentPage]);

  const { data, isLoading } = useProgressTrack(params, {
    enabled: !!user,
  });

  const { data: branches = [] } = useBranches({ enabled: !!user });

  const list = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleBranchChange = useCallback((value) => {
    setBranchFilter(value);
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handleRowClick = useCallback((item) => {
    if (!item.serialNumber) return;
    navigate(`/assets?serial=${encodeURIComponent(item.serialNumber)}`);
  }, [navigate]);

  const statusOptions = useMemo(() => {
    const opts = [
      { value: 'all', label: 'Semua Status' },
      { value: 'Available', label: STATUS_LABELS.Available },
      { value: 'Perlu Diupdate', label: STATUS_LABELS['Perlu Diupdate'] },
      { value: 'Diperbaiki', label: STATUS_LABELS.Diperbaiki },
      { value: 'Rusak', label: STATUS_LABELS.Rusak },
      { value: 'Dalam Perbaikan', label: STATUS_LABELS['Dalam Perbaikan'] },
      { value: 'Hilang', label: STATUS_LABELS.Hilang },
    ];
    if (isAdminCabang) {
      opts.push({ value: 'Pending', label: 'Pending' });
      opts.push({ value: 'Approved', label: 'Approved' });
      opts.push({ value: 'Rejected', label: 'Rejected' });
    }
    return opts;
  }, [isAdminCabang]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Progress Track
        </h1>
        <p className="text-sm text-neutral-500">
          {isAdminPusat
            ? 'Riwayat perubahan aset di seluruh cabang'
            : 'Riwayat perubahan aset di cabang Anda'}
        </p>
      </div>

      <Card title="Daftar Perubahan Asset" subtitle="Klik baris untuk membuka detail aset">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiSearch className="h-5 w-5 text-neutral-500" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Cari serial number, pelaku, atau deskripsi..."
              value={searchQuery}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              aria-label="Cari progress track"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            {isAdminPusat && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="block w-full sm:w-48 px-4 py-2 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                aria-label="Filter per Cabang"
              >
                <option value="">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="block w-full sm:w-44 px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              aria-label="Filter status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Dilakukan Oleh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    Memuat data...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    Tidak ada data yang sesuai
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="bg-white border-b border-gray-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900" title={item.serialNumber}>
                      {truncate(item.serialNumber || '—', 24)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600" title={item.performedBy || '—'}>
                      {truncate(item.performedBy || '—', 24)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700 max-w-xs" title={item.description}>
                      {truncate(item.description || '—', 40)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-neutral-500">
              Menampilkan{' '}
              <span className="font-medium text-neutral-900">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              –{' '}
              <span className="font-medium text-neutral-900">
                {Math.min(currentPage * ITEMS_PER_PAGE, total)}
              </span>{' '}
              dari <span className="font-medium text-neutral-900">{total}</span> hasil
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <HiChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                      aria-label={`Ke halaman ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Halaman berikutnya"
              >
                <HiChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </MainLayout>
  );
});

ProgressTrack.displayName = 'ProgressTrack';
export default ProgressTrack;
