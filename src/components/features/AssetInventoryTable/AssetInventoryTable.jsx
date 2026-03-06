import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { HiSearch, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { STATUS_LABELS, truncate } from '../../../utils/assetConstants';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';

const PAGE_SIZE = 10;

const AssetInventoryTable = memo(({ 
  assets = [], 
  onSelectAsset, 
  onAssetClick,
  selectedAssetId,
  filterByStatus = ['Available', 'Perlu Diupdate', 'Diperbaiki', 'Rusak', 'Dalam Perbaikan', 'Hilang']
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search assets
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by allowed status
    filtered = filtered.filter(asset => 
      filterByStatus.includes(asset.status)
    );

    // Filter by selected status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.serialNumber?.toLowerCase().includes(query) ||
        asset.type?.toLowerCase().includes(query) ||
        asset.brand?.toLowerCase().includes(query) ||
        asset.holder?.fullName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assets, filterByStatus, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = {
      all: assets.filter(a => filterByStatus.includes(a.status)).length,
    };
    
    filterByStatus.forEach(status => {
      counts[status] = assets.filter(a => a.status === status).length;
    });

    return counts;
  }, [assets, filterByStatus]);

  const getStatusBadgeClass = useCallback((status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-50 text-green-700';
      case 'Perlu Diupdate':
        return 'bg-amber-50 text-amber-700';
      case 'Diperbaiki':
        return 'bg-blue-50 text-blue-700';
      case 'Rusak':
      case 'Dalam Perbaikan':
        return 'bg-red-50 text-red-700';
      case 'Hilang':
        return 'bg-neutral-200 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }, []);

  const handleRowClick = useCallback((asset) => {
    if (onAssetClick) {
      onAssetClick(asset);
      return;
    }
    if (onSelectAsset) {
      onSelectAsset(asset);
    }
  }, [onAssetClick, onSelectAsset]);

  return (
    <Card>
      <div className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by serial number, type, brand, or holder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Status Filter - Dropdown */}
          <div className="w-full sm:w-56">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            >
              <option value="all">Semua Status ({statusCounts.all})</option>
              {filterByStatus.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] ?? status} ({statusCounts[status] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Type / Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Current Holder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedAssets.length > 0 ? (
                paginatedAssets.map((asset) => (
                  <tr 
                    key={asset.id}
                    onClick={() => handleRowClick(asset)}
                    className={`bg-white border-b border-gray-100 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      selectedAssetId === asset.id
                        ? 'bg-neutral-50 ring-1 ring-neutral-900 ring-inset'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" title={asset.serialNumber}>
                      <div className="text-sm font-medium text-neutral-900">
                        {truncate(asset.serialNumber, 20)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" title={`${asset.type} / ${asset.brand}`}>
                      <div className="text-sm text-neutral-900">
                        {truncate(asset.type, 20)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {truncate(asset.brand, 20)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(asset.status)}`}>
                        {STATUS_LABELS[asset.status] ?? asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" title={asset.holder?.fullName}>
                      {asset.holder ? (
                        <div>
                          <div className="text-sm text-neutral-900">
                            {truncate(asset.holder.fullName, 20)}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {asset.holder.nip}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500 italic">
                          No holder
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-neutral-500">
                    {searchQuery ? 'No assets found matching your search' : 'No assets available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAssets.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Menampilkan <span className="font-medium text-neutral-900">{(currentPage - 1) * PAGE_SIZE + 1}</span>–<span className="font-medium text-neutral-900">{Math.min(currentPage * PAGE_SIZE, filteredAssets.length)}</span> dari <span className="font-medium text-neutral-900">{filteredAssets.length}</span> aset
              {searchQuery && <span> (filter: &quot;{searchQuery}&quot;)</span>}
            </p>
            {totalPages > 1 && (
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
                <span className="text-sm text-neutral-600 px-2">
                  Halaman {currentPage} dari {totalPages}
                </span>
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
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

AssetInventoryTable.displayName = 'AssetInventoryTable';

export default AssetInventoryTable;
