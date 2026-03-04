import { AnimatePresence, motion as Motion } from 'framer-motion';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  HiChartPie,
  HiChevronDown,
  HiChevronUp,
  HiCube,
  HiExclamationCircle,
} from 'react-icons/hi';
import AssetMap from '../components/features/AssetMap/AssetMap';
import AssetTable from '../components/features/AssetTable/AssetTable';
import StatusPieChart from '../components/features/StatusPieChart/StatusPieChart';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useAssets, useBranches } from '../hooks/useQueries';

function applyDueUpdateStatus(assets) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (assets || []).map((a) => {
    if (a.status === 'Available' && a.dueUpdate && new Date(a.dueUpdate).getTime() <= now.getTime()) {
      return { ...a, status: 'Perlu Diupdate' };
    }
    return a;
  });
}

/** Status counts for pie chart and Perlu Diupdate card */
const getStatusCounts = (assets) => ({
  Available: assets.filter((a) => a.status === 'Available').length,
  'Perlu Diupdate': assets.filter((a) => a.status === 'Perlu Diupdate').length,
  Diperbaiki: assets.filter((a) => a.status === 'Diperbaiki').length,
  Rusak: assets.filter((a) => a.status === 'Rusak').length,
  Hilang: assets.filter((a) => a.status === 'Hilang').length,
});

const getTypeBreakdown = (assets) => {
  const map = {};
  assets.forEach((a) => {
    map[a.type] = (map[a.type] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

/** Shared card layout: header (label + icon), divider, then content below */
const CardHeader = memo(({ label, icon: IconComponent, expandable, expanded }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      {IconComponent && (
        <div className="p-2 rounded-lg bg-neutral-100 shrink-0">
          <IconComponent className="w-5 h-5 text-neutral-600" />
        </div>
      )}
      <p className="text-sm font-medium text-neutral-500 truncate">{label}</p>
    </div>
    {expandable && (
      <span className="p-1 text-neutral-400 shrink-0">
        {expanded ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
      </span>
    )}
  </div>
));
CardHeader.displayName = 'CardHeader';

const StatCard = memo(({ stat, expanded, onToggle, typeBreakdown = [] }) => {
  const IconComponent = stat.icon;
  const breakdownList = typeBreakdown;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-all duration-200 overflow-hidden flex flex-col min-h-0">
      <button
        type="button"
        onClick={stat.expandable ? onToggle : undefined}
        className={`w-full text-left flex flex-col gap-0 ${stat.expandable ? 'cursor-pointer' : ''}`}
      >
        <CardHeader
          label={stat.label}
          icon={IconComponent}
          expandable={stat.expandable}
          expanded={expanded}
        />
        <div className="border-t border-neutral-200 my-3" />
        <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {stat.value}
        </h3>
      </button>

      <AnimatePresence>
        {stat.expandable && expanded && breakdownList.length > 0 && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-neutral-200 mt-3 pt-3 shrink-0"
          >
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Breakdown per tipe
            </p>
            <div
              className="flex flex-col gap-[2px] max-h-28 overflow-y-auto overflow-x-hidden scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              {breakdownList.map(([type, count], i) => (
                <Motion.div
                  key={type}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex justify-between text-sm py-1.5 pr-2"
                >
                  <span className="text-neutral-700 truncate">{type}</span>
                  <span className="font-medium text-neutral-900 shrink-0">{count}</span>
                </Motion.div>
              ))}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const Dashboard = memo(() => {
  const { user, isAdminPusat } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [branchFilter, setBranchFilter] = useState('');
  const [expandedStatId, setExpandedStatId] = useState(null);

  const assetParams = useMemo(() => {
    const p = {};
    // Admin Pusat: all branches unless a branch filter is selected. Admin Cabang: only their branch.
    if (isAdminPusat) {
      if (branchFilter) p.branchId = branchFilter;
    } else if (user?.branch_id) {
      p.branchId = user.branch_id;
    }
    return p;
  }, [user?.branch_id, isAdminPusat, branchFilter]);

  const { data: rawAssets = [], isLoading: assetsLoading } = useAssets(assetParams, {
    enabled: !!user,
    refetchInterval: isAdminPusat ? 30_000 : false,
  });

  const { data: branches = [], isLoading: branchesLoading } = useBranches({
    enabled: !!user,
  });

  const loading = assetsLoading || branchesLoading;

  const allAssets = useMemo(() => applyDueUpdateStatus(rawAssets), [rawAssets]);

  const filteredAssets = useMemo(() => {
    if (!isAdminPusat || !branchFilter) return allAssets;
    return allAssets.filter((a) => a.branch_id === branchFilter);
  }, [allAssets, isAdminPusat, branchFilter]);

  const statusCounts = useMemo(() => getStatusCounts(filteredAssets), [filteredAssets]);
  const typeBreakdown = useMemo(() => getTypeBreakdown(filteredAssets), [filteredAssets]);

  const totalLabel = isAdminPusat ? 'Total Assets' : 'Branch Assets';
  const totalValue = filteredAssets.length;

  const top5Branches = useMemo(
    () => [...branches].sort((a, b) => (b.assetCount || 0) - (a.assetCount || 0)).slice(0, 5),
    [branches]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleViewAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    if (window.innerWidth < 1024) {
      document.getElementById('asset-map-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleClearSelection = useCallback(() => setSelectedAsset(null), []);

  const toggleExpand = useCallback(() => {
    setExpandedStatId((prev) => (prev === 1 ? null : 1));
  }, []);

  const tableBranchId = isAdminPusat && branchFilter ? branchFilter : user?.branch_id;
  const isExpanded = expandedStatId === 1;

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1 tracking-tight">
          {greeting}, {user?.name}!
        </h1>
        <p className="text-neutral-500 text-sm">
          {isAdminPusat
            ? "Here's an overview of all assets across all branches."
            : `Here's what's happening at ${user?.branch_name || 'your branch'}.`}
        </p>
      </div>

      <div
        className={`grid gap-4 mb-8 transition-all duration-300 ${
          !isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {!isExpanded ? (
          <>
            {/* Kiri: Branch/Total Asset + Perlu Diupdate (stacked, tidak stretch mengikuti chart) */}
            <div className="flex flex-col gap-4">
              <StatCard
                stat={{
                  id: 1,
                  label: totalLabel,
                  value: totalValue.toLocaleString(),
                  icon: HiCube,
                  expandable: true,
                }}
                expanded={false}
                onToggle={toggleExpand}
                typeBreakdown={typeBreakdown}
              />
              <div className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-all duration-200 flex flex-col min-h-0">
                <CardHeader label="Perlu Diupdate" icon={HiExclamationCircle} />
                <div className="border-t border-neutral-200 my-3" />
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">
                  {statusCounts['Perlu Diupdate'].toLocaleString()}
                </h3>
              </div>
            </div>
            {/* Kanan: Status Aset (chart) */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-all duration-200 flex flex-col min-h-0">
              <CardHeader label="Status Aset" icon={HiChartPie} />
              <div className="border-t border-neutral-200 my-3" />
              <div className="flex-1 min-h-0 flex items-center">
                <StatusPieChart
                  byStatus={statusCounts}
                  includePerluDiupdate={false}
                  size={140}
                  showLegend={true}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Kiri: Total/Branch Assets expanded (breakdown per tipe) */}
            <div className="min-h-0 flex flex-col">
              <StatCard
                stat={{
                  id: 1,
                  label: totalLabel,
                  value: totalValue.toLocaleString(),
                  icon: HiCube,
                  expandable: true,
                }}
                expanded={true}
                onToggle={toggleExpand}
                typeBreakdown={typeBreakdown}
              />
            </div>
            {/* Kanan: Admin Pusat = Top Branches; Admin Cabang = Status Aset chart */}
            {isAdminPusat ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col min-h-0">
                <CardHeader label="Top Branches" icon={HiCube} />
                <div className="border-t border-neutral-200 my-3" />
                <div className="flex flex-col gap-[2px] max-h-[200px] overflow-y-auto overflow-x-hidden scroll-smooth flex-1 min-h-0">
                  {top5Branches.map((branch, index) => (
                    <div
                      key={branch.id}
                      className="flex items-center gap-3 py-1.5 border-t border-neutral-200 first:border-t-0 first:pt-0"
                    >
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-700 shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium text-neutral-900 truncate">{branch.name}</span>
                      <span className="text-sm font-semibold text-neutral-600 shrink-0">
                        {branch.assetCount ?? 0} aset
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col min-h-0">
                <CardHeader label="Status Aset" icon={HiChartPie} />
                <div className="border-t border-neutral-200 my-3" />
                <div className="flex-1 min-h-0 flex items-center">
                  <StatusPieChart
                    byStatus={statusCounts}
                    includePerluDiupdate={true}
                    size={200}
                    showLegend={true}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`${selectedAsset ? 'lg:col-span-1' : 'lg:col-span-2'} transition-all duration-300`}
        >
          <AssetTable
            assets={filteredAssets.filter((a) => {
              if (a.status !== 'Available') return true;
              return !!a.holder;
            })}
            loading={loading}
            userRole={user?.role}
            branchId={tableBranchId}
            onViewAsset={handleViewAsset}
            selectedAssetId={selectedAsset?.id}
            excludeAvailable={false}
            branchFilter={branchFilter}
            branches={isAdminPusat ? branches : []}
            onBranchFilterChange={setBranchFilter}
          />
        </div>
        {selectedAsset && (
          <div className="lg:col-span-1" id="asset-map-section">
            <AssetMap
              assets={filteredAssets}
              selectedAsset={selectedAsset}
              onClearSelection={handleClearSelection}
              branchName={
                isAdminPusat && branchFilter
                  ? branches.find((b) => b.id === branchFilter)?.name
                  : branches.find((b) => b.id === user?.branch_id)?.name
              }
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
