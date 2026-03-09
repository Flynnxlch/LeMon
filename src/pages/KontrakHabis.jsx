import { memo, useCallback, useMemo, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAssets } from '../hooks/useQueries';

const ITEMS_PER_PAGE = 10;

function formatDateOnly(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

const KontrakHabis = memo(() => {
  const { data: assetsExpired = [] } = useAssets({ contract: 'expired' });
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(assetsExpired.length / ITEMS_PER_PAGE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return assetsExpired.slice(start, start + ITEMS_PER_PAGE);
  }, [assetsExpired, currentPage]);

  const goToPage = useCallback((page) => {
    setCurrentPage((p) => Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">Kontrak Habis</h1>
        <p className="text-sm text-neutral-500">
          Aset yang tanggal akhir kontraknya sudah lewat otomatis dipindahkan dari inventory dan muncul di sini.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Asset</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Cabang</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tanggal Akhir Kontrak</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {paginatedList.map((asset) => (
                <tr key={asset.id} className="hover:bg-neutral-50">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm font-medium text-neutral-900">{asset.serialNumber}</div>
                    <div className="text-sm text-neutral-500">{asset.type} · {asset.brand}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell text-sm text-neutral-700">{asset.branch_name ?? '—'}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-neutral-700">{formatDateOnly(asset.contractEndDate)}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
              {assetsExpired.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                    Tidak ada aset dengan kontrak habis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {assetsExpired.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, assetsExpired.length)} dari {assetsExpired.length}
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
    </MainLayout>
  );
});

KontrakHabis.displayName = 'KontrakHabis';
export default KontrakHabis;

