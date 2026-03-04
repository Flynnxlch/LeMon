import { AnimatePresence, motion as Motion } from 'framer-motion';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  HiCheckCircle,
  HiChevronDown,
  HiChevronUp,
  HiCube,
  HiExclamationCircle,
} from 'react-icons/hi';
import AssetMap from '../components/features/AssetMap/AssetMap';
import AssetTable from '../components/features/AssetTable/AssetTable';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useAssets, useBranches } from '../hooks/useQueries';

function applyDueUpdateStatus(assets) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (assets || []).map((a) => {
    if (a.dueUpdate && new Date(a.dueUpdate).getTime() <= now.getTime()) {
      return { ...a, status: 'Late' };
    }
    return a;
  });
}

const getStatsFromAssets = (assets, role) => {
  const total = assets.length;
  const active = assets.filter((a) => a.status === 'Rented').length;
  const late = assets.filter((a) => a.status === 'Late').length;

  if (role === 'Admin Pusat') {
    return [
      { id: 1, label: 'Total Assets', value: total.toLocaleString(), icon: HiCube, expandable: true },
      { id: 2, label: 'Sedang Disewa', value: active.toLocaleString(), icon: HiCheckCircle },
      { id: 3, label: 'Perlu Update', value: late.toLocaleString(), icon: HiExclamationCircle },
    ];
  }
  if (role === 'Admin Cabang') {
    return [
      { id: 1, label: 'Branch Assets', value: total.toLocaleString(), icon: HiCube, expandable: true },
      { id: 2, label: 'Active', value: active.toLocaleString(), icon: HiCheckCircle },
      { id: 3, label: 'Perlu Diupdate', value: late.toLocaleString(), icon: HiExclamationCircle },
    ];
  }
  return [];
};

const getTypeBreakdown = (assets) => {
  const map = {};
  assets.forEach((a) => {
    map[a.type] = (map[a.type] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

const StatCard = memo(({ stat, expanded, onToggle, typeBreakdown = [] }) => {
  const IconComponent = stat.icon;
  const breakdownList = typeBreakdown;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:border-neutral-300 transition-all duration-200 overflow-hidden h-full flex flex-col min-h-0">
      <button
        type="button"
        onClick={stat.expandable ? onToggle : undefined}
        className={`w-full text-left flex-1 min-h-0 flex flex-col ${stat.expandable ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-500 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">
              {stat.value}
            </h3>
            {stat.change != null && (
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.changeType === 'increase' ? '↑' : '↓'} {stat.change}
                </span>
                <span className="text-xs text-neutral-400 ml-2">vs last month</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="p-2.5 rounded-lg bg-neutral-100">
              <IconComponent className="w-6 h-6 text-neutral-600" />
            </div>
            {stat.expandable && (
              <span className="p-1 text-neutral-400">
                {expanded ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
              </span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {stat.expandable && expanded && breakdownList.length > 0 && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-neutral-200 mt-4 pt-4 shrink-0"
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

  const stats = useMemo(
    () => getStatsFromAssets(filteredAssets, user?.role),
    [filteredAssets, user?.role]
  );

  const typeBreakdown = useMemo(() => getTypeBreakdown(filteredAssets), [filteredAssets]);

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

  const toggleExpand = useCallback((statId) => {
    setExpandedStatId((prev) => (prev === statId ? null : statId));
  }, []);

  const tableBranchId = isAdminPusat && branchFilter ? branchFilter : user?.branch_id;

  const leftStatId = expandedStatId ?? stats[0]?.id;
  const leftStat = stats.find((s) => s.id === leftStatId) ?? stats[0];
  const rightStats = stats.filter((s) => s.id !== leftStatId);

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
        className={`grid gap-4 mb-8 items-stretch transition-all duration-300 ${
          !expandedStatId ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {!expandedStatId ? (
          stats.map((stat) => (
            <StatCard
              key={stat.id}
              stat={stat}
              expanded={false}
              onToggle={() => toggleExpand(stat.id)}
              typeBreakdown={stat.id === 1 ? typeBreakdown : []}
            />
          ))
        ) : (
          <>
            <div className="min-h-0 flex flex-col">
              <StatCard
                stat={leftStat}
                expanded={true}
                onToggle={() => toggleExpand(leftStat.id)}
                typeBreakdown={leftStat.id === 1 ? typeBreakdown : []}
              />
            </div>
            <div className="flex flex-col gap-4 min-h-0 flex-1">
              <AnimatePresence mode="wait">
                {expandedStatId === 1 && isAdminPusat ? (
                  <Motion.div
                    key="top-branches"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl border border-neutral-200 p-6 h-full flex flex-col min-h-0"
                  >
                    <h3 className="text-sm font-medium text-neutral-500 mb-2">Top Branches</h3>
                    <div
                      className="border-t border-neutral-200 pt-3 flex flex-col gap-[2px] max-h-[200px] overflow-y-auto overflow-x-hidden scroll-smooth flex-1 min-h-0"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      {top5Branches.map((branch, index) => (
                        <Motion.div
                          key={branch.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 py-1.5 border-t border-neutral-200 first:border-t-0 first:pt-0"
                        >
                          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-700 shrink-0">
                            {index + 1}
                          </span>
                          <span className="flex-1 font-medium text-neutral-900 truncate">{branch.name}</span>
                          <span className="text-sm font-semibold text-neutral-600 shrink-0">
                            {branch.assetCount ?? 0} aset
                          </span>
                        </Motion.div>
                      ))}
                    </div>
                  </Motion.div>
                ) : (
                  <Motion.div
                    key="sub-cards"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4 h-full"
                  >
                    {rightStats.map((stat) => (
                      <StatCard
                        key={stat.id}
                        stat={stat}
                        expanded={false}
                        onToggle={() => toggleExpand(stat.id)}
                        typeBreakdown={stat.id === 1 ? typeBreakdown : []}
                      />
                    ))}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`${selectedAsset ? 'lg:col-span-1' : 'lg:col-span-2'} transition-all duration-300`}
        >
          <AssetTable
            assets={filteredAssets.filter((a) => a.status !== 'Available')}
            loading={loading}
            userRole={user?.role}
            branchId={tableBranchId}
            onViewAsset={handleViewAsset}
            selectedAssetId={selectedAsset?.id}
            excludeAvailable={true}
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
