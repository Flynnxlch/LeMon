import { useState, useMemo, useCallback, memo } from 'react';
import { motion as Motion } from 'framer-motion';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import { HiSearch, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { STATUS_LABELS, truncate } from '../../../utils/assetConstants';

const statusClasses = {
  Available: 'bg-green-50 text-green-700',
  Rented: 'bg-neutral-100 text-neutral-700',
  Late: 'bg-red-50 text-red-700',
};

const StatusBadge = memo(({ status }) => {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses['Available']}`}>
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

const AssetTable = memo(({ assets: assetsProp = [], loading = false, userRole, branchId, onViewAsset, selectedAssetId, excludeAvailable = false, branchFilter = '', branches = [], onBranchFilterChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const itemsPerPage = 10;

  const allAssets = useMemo(() => {
    if (excludeAvailable) {
      return (assetsProp || []).filter((asset) => asset.status !== 'Available');
    }
    return assetsProp || [];
  }, [assetsProp, excludeAvailable]);

  // Filter assets based on search and status
  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      const holderName = asset.holder?.fullName || '';
      const matchesSearch = 
        asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holderName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [allAssets, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage]);

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleStatusFilter = useCallback((e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const handleDetailClick = useCallback((asset) => {
    if (onViewAsset) {
      onViewAsset(asset);
    }
  }, [onViewAsset]);
  
  return (
    <Card title="Asset Inventory" subtitle="Manage and track all rental assets">
      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiSearch className="h-5 w-5 text-neutral-500" aria-hidden="true" />
          </div>
          <input
            type="text"
            placeholder="Search by serial number, type, or holder..."
            value={searchQuery}
            onChange={handleSearch}
            className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            aria-label="Search assets"
          />
        </div>
        <div className="flex gap-3">
          {branches.length > 0 && onBranchFilterChange && (
            <select
              value={branchFilter}
              onChange={(e) => onBranchFilterChange(e.target.value)}
              className="block w-full sm:w-48 px-4 py-2 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all duration-200"
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
            onChange={handleStatusFilter}
            className="block w-full sm:w-40 px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            {!excludeAvailable && <option value="Available">Available</option>}
            <option value="Rented">{STATUS_LABELS.Rented}</option>
            <option value="Late">{STATUS_LABELS.Late}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Holder
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">
                    Loading assets...
                  </td>
                </tr>
              ) : paginatedAssets.length > 0 ? (
                paginatedAssets.map((asset) => (
                  <Motion.tr
                    layout
                    key={asset.id}
                    onClick={() => handleDetailClick(asset)}
                    className={`bg-white border-b border-gray-100 hover:bg-neutral-50 transition-colors duration-200 cursor-pointer ${
                      selectedAssetId === asset.id ? 'bg-neutral-50 ring-1 ring-neutral-900 ring-inset' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900" title={asset.serialNumber}>
                      {truncate(asset.serialNumber, 20)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900" title={asset.type}>
                      {truncate(asset.type, 20)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {asset.holder ? (
                        <div title={asset.holder.fullName}>
                          <div className="font-medium text-neutral-900">{truncate(asset.holder.fullName, 20)}</div>
                          <div className="text-xs text-neutral-500">{truncate(asset.holder.division, 20)}</div>
                        </div>
                      ) : (
                        <span className="italic text-neutral-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {formatDate(asset.lastUpdate)}
                    </td>
                  </Motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">
                    No assets found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-neutral-500">
            Showing <span className="font-medium text-neutral-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium text-neutral-900">
              {Math.min(currentPage * itemsPerPage, filteredAssets.length)}
            </span>{' '}
            of <span className="font-medium text-neutral-900">{filteredAssets.length}</span> results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <HiChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
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
              aria-label="Next page"
            >
              <HiChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
});

AssetTable.displayName = 'AssetTable';

export default AssetTable;
