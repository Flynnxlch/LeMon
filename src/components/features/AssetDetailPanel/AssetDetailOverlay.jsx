import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { STATUS_LABELS } from '../../../utils/assetConstants';

const reverseGeocodeCache = new Map();
async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'TrackstuAssetApp/1.0' } }
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const address = data.address;
    let formatted = '';
    if (address?.road) {
      formatted = address.road;
      if (address.suburb || address.neighbourhood) formatted += ', ' + (address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) formatted += ', ' + (address.city || address.town || address.village);
    } else if (data.display_name) {
      formatted = data.display_name.split(',').slice(0, 3).join(',').trim();
    }
    const result = formatted || null;
    reverseGeocodeCache.set(key, result);
    return result;
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    reverseGeocodeCache.set(key, null);
    return null;
  }
}

function useReverseGeocode(lat, lng) {
  const hasCoords = lat != null && lng != null;
  const [state, setState] = useState({ address: null, loading: !!hasCoords });
  useEffect(() => {
    if (!hasCoords) {
      queueMicrotask(() => setState({ address: null, loading: false }));
      return;
    }
    let cancelled = false;
    reverseGeocode(Number(lat), Number(lng)).then((address) => {
      if (!cancelled) setState({ address, loading: false });
    });
    return () => { cancelled = true; };
  }, [lat, lng, hasCoords]);
  return hasCoords ? state : { address: null, loading: false };
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [-6.2088, 106.8456];

const FlyToPoint = memo(({ point }) => {
  const map = useMap();
  useEffect(() => {
    if (!point || point.latitude == null || point.longitude == null) return;
    map.setView([point.latitude, point.longitude], 14, { animate: true });
  }, [point, map]);
  return null;
});
FlyToPoint.displayName = 'FlyToPoint';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateOnly = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
};

const formatPeriod = (start, end) => {
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  if (!s && !e) return '—';
  if (!s) return e ?? '—';
  if (!e) return s ?? '—';
  return `${s} → ${e}`;
};

const formatDateOnly = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const EVENT_LABELS = {
  created: 'Aset dibuat',
  assigned: 'Aset di-assign',
  condition_update: 'Update kondisi',
  status_change: 'Perubahan status',
  repair_started: 'Perbaikan dimulai',
  repair_completed: 'Perbaikan selesai',
};

function getHistoryEventLabel(entry) {
  if (entry.eventType === 'status_change') {
    const fromStatus = entry.payload?.fromStatus;
    const toStatus = entry.payload?.toStatus;
    if (toStatus === 'Hilang') return 'Aset Hilang';
    if (fromStatus === 'Hilang' && toStatus === 'Available') return 'Pengadaan Ulang';
  }
  return EVENT_LABELS[entry.eventType] ?? entry.eventType;
}

function HistoryItem({ entry }) {
  const payload = entry.payload || {};
  const images = payload.updateImages && Array.isArray(payload.updateImages) ? payload.updateImages : [];

  return (
    <li className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-medium text-neutral-500">{formatDateTime(entry.createdAt)}</span>
        <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700">
          {getHistoryEventLabel(entry)}
        </span>
      </div>
      {entry.eventType === 'status_change' && (
        <p className="text-sm text-neutral-700 mb-2">
          <span className="font-medium">{STATUS_LABELS[payload.fromStatus] ?? payload.fromStatus}</span>
          {' → '}
          <span className="font-medium">{STATUS_LABELS[payload.toStatus] ?? payload.toStatus}</span>
        </p>
      )}
      {entry.eventType === 'assigned' && payload.holderFullName && (
        <p className="text-sm text-neutral-700 mb-2">Pemegang: <span className="font-medium">{payload.holderFullName}</span></p>
      )}
      {entry.eventType === 'repair_started' && (
        <p className="text-sm text-neutral-700 mb-2">
          {payload.repairType === 'transfer'
            ? `Transfer perbaikan ke ${payload.toBranchName ?? 'cabang tujuan'}`
            : 'Perbaikan di cabang'}
        </p>
      )}
      {entry.eventType === 'repair_completed' && payload.holderFullName && (
        <p className="text-sm text-neutral-700 mb-2">Dikembalikan ke: <span className="font-medium">{payload.holderFullName}</span></p>
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {images.slice(0, 4).map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Kondisi ${idx + 1}`}
              className="w-full aspect-video object-cover rounded-lg border border-neutral-200"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/160x90?text=No+Image'; }}
            />
          ))}
        </div>
      )}
    </li>
  );
}

const TABS = [
  { id: 'current', label: 'Informasi Saat Ini' },
  { id: 'past', label: 'Past Holder' },
  { id: 'history', label: 'Asset History' },
];

const AssetDetailOverlay = memo(({ isOpen, onClose, asset, pastHolders = [], history = [], isLoadingHistory = false }) => {
  const [activeTab, setActiveTab] = useState('current');
  const [mapPoint, setMapPoint] = useState(null);

  const currentHolderPoint = useMemo(() => {
    if (asset?.holder && asset?.latitude != null && asset?.longitude != null) {
      return { latitude: asset.latitude, longitude: asset.longitude };
    }
    return null;
  }, [asset]);

  const pastHoldersWithLocation = useMemo(
    () => pastHolders.filter((h) => h.latitude != null && h.longitude != null),
    [pastHolders]
  );

  const showMap = useMemo(
    () => !!currentHolderPoint || pastHoldersWithLocation.length > 0,
    [currentHolderPoint, pastHoldersWithLocation.length]
  );

  const mapCenter = useMemo(() => {
    if (mapPoint) return [mapPoint.latitude, mapPoint.longitude];
    if (currentHolderPoint) return [currentHolderPoint.latitude, currentHolderPoint.longitude];
    return DEFAULT_CENTER;
  }, [mapPoint, currentHolderPoint]);

  const mapZoom = mapPoint || currentHolderPoint ? 14 : 11;

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setActiveTab('current');
        setMapPoint(null);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'current') {
      queueMicrotask(() => setMapPoint(null));
    }
  }, [activeTab]);

  const handlePastHolderClick = useCallback((holder) => {
    if (holder.latitude != null && holder.longitude != null) {
      setMapPoint({ latitude: holder.latitude, longitude: holder.longitude });
    }
  }, []);

  const { address: reverseAddress, loading: addressLoading } = useReverseGeocode(
    asset?.latitude ?? null,
    asset?.longitude ?? null
  );
  const displayAddress = asset?.latitude != null && asset?.longitude != null
    ? (addressLoading ? 'Memuat alamat...' : (reverseAddress || 'Alamat tidak tersedia'))
    : null;

  const footerLocationText = useMemo(() => {
    if (!showMap) return null;
    if (activeTab === 'current' && currentHolderPoint) return 'Lokasi pemegang saat ini';
    if (activeTab === 'past' && mapPoint) return 'Lokasi past holder yang dipilih';
    if (activeTab === 'history' && currentHolderPoint) return 'Lokasi pemegang saat ini';
    if (!currentHolderPoint && !mapPoint && pastHoldersWithLocation.length > 0) return 'Pilih past holder untuk lihat lokasi';
    return null;
  }, [showMap, activeTab, currentHolderPoint, mapPoint, pastHoldersWithLocation.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" aria-modal="true">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl w-full max-w-6xl h-[65vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">
            Detail Aset
            {asset?.serialNumber && <span className="text-neutral-500 font-normal ml-2">({asset.serialNumber})</span>}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Tutup"
          >
            <HiX className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Map (jika ada koordinat) atau Foto Aset */}
          <div className="w-80 lg:w-96 shrink-0 border-r border-neutral-200 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex items-center justify-center bg-neutral-50 overflow-hidden">
              {showMap ? (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {currentHolderPoint && (
                    <Marker position={[currentHolderPoint.latitude, currentHolderPoint.longitude]} />
                  )}
                  {mapPoint && mapPoint !== currentHolderPoint && (
                    <Marker position={[mapPoint.latitude, mapPoint.longitude]} />
                  )}
                  <FlyToPoint point={mapPoint ?? currentHolderPoint} />
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <img
                    src={asset?.photoUrl || `https://picsum.photos/400/300?random=${asset?.id ?? 'asset'}`}
                    alt={asset?.serialNumber ?? 'Asset'}
                    className="w-full h-full object-contain rounded-lg border border-neutral-200"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Foto+Aset';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Tabs + Content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex border-b border-neutral-200 px-4 gap-1 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {activeTab === 'current' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-neutral-500">Serial Number</span><p className="font-medium">{asset?.serialNumber ?? '—'}</p></div>
                      <div><span className="text-neutral-500">Type</span><p className="font-medium">{asset?.type ?? '—'}</p></div>
                      <div><span className="text-neutral-500">Brand</span><p className="font-medium">{asset?.brand ?? '—'}</p></div>
                      <div><span className="text-neutral-500">Model</span><p className="font-medium">{asset?.model ?? '—'}</p></div>
                      <div><span className="text-neutral-500">Status</span>
                        <p>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            asset?.status === 'Available' ? 'bg-green-50 text-green-700' :
                            asset?.status === 'Rusak' ? 'bg-red-50 text-red-700' :
                            asset?.status === 'Dalam Perbaikan' ? 'bg-amber-100 text-amber-800' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {STATUS_LABELS[asset?.status] ?? asset?.status ?? '—'}
                          </span>
                        </p>
                      </div>
                      <div><span className="text-neutral-500">Masa Kontrak</span><p className="font-medium">{formatDateOnly(asset?.contractEndDate) ?? '—'}</p></div>
                      <div className="col-span-2"><span className="text-neutral-500">Due Update (kapan past due)</span><p className="font-medium">{formatDateOnly(asset?.dueUpdate) ?? '—'}</p></div>
                      <div className="col-span-2"><span className="text-neutral-500">Address</span><p className="font-medium">{displayAddress ?? '—'}</p></div>
                      <div className="col-span-2"><span className="text-neutral-500">Last Updated</span><p className="font-medium">{asset?.lastUpdate ? formatDateTime(asset.lastUpdate) : '—'}</p></div>
                    </div>
                    {asset?.detail && <p className="mt-3 text-sm text-neutral-700 whitespace-pre-line">{asset.detail}</p>}
                  </div>
                  <div className="border-t border-neutral-100 pt-4">
                    <h3 className="text-sm font-semibold text-neutral-700 mb-3">Current Holder Information</h3>
                    {asset?.holder ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-neutral-500">Nama</span><p className="font-medium">{asset.holder.fullName}</p></div>
                        <div><span className="text-neutral-500">NIP</span><p className="font-medium">{asset.holder.nip ?? '—'}</p></div>
                        <div><span className="text-neutral-500">Cabang</span><p className="font-medium">{asset.holder.branchName ?? asset.holder.branchCode ?? '—'}</p></div>
                        <div><span className="text-neutral-500">Divisi</span><p className="font-medium">{asset.holder.division ?? '—'}</p></div>
                        <div><span className="text-neutral-500">Email</span><p className="font-medium">{asset.holder.email ?? '—'}</p></div>
                        <div><span className="text-neutral-500">Telepon</span><p className="font-medium">{asset.holder.phone ?? '—'}</p></div>
                      </div>
                    ) : (
                      <p className="text-neutral-500 italic text-sm">Belum ada pemegang</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'past' && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Daftar Pemegang Sebelumnya</h3>
                  {pastHolders.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic py-4">Belum ada riwayat pemegang.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pastHolders.map((holder, index) => (
                        <li
                          key={`${holder.nip ?? index}-${index}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handlePastHolderClick(holder)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePastHolderClick(holder); } }}
                          className={`p-3 rounded-lg border text-sm ${
                            holder.latitude != null && holder.longitude != null
                              ? 'cursor-pointer hover:bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                              : 'border-neutral-100 bg-neutral-50'
                          }`}
                        >
                          <p className="font-medium text-neutral-900">{holder.fullName}</p>
                          <p className="text-neutral-500 text-xs mt-1">{formatPeriod(holder.periodStart, holder.periodEnd)}</p>
                          {(holder.latitude != null && holder.longitude != null) && (
                            <p className="text-xs text-neutral-400 mt-1">Klik untuk lihat di peta</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Riwayat Aset</h3>
                  {isLoadingHistory ? (
                    <p className="text-sm text-neutral-500 py-4">Memuat riwayat...</p>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic py-4">Belum ada riwayat.</p>
                  ) : (
                    <ul className="space-y-3">
                      {history.map((entry) => (
                        <HistoryItem key={entry.id} entry={entry} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="shrink-0 px-4 py-3 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-500 flex items-center justify-between flex-wrap gap-2 min-h-[44px]">
          <span>{footerLocationText ?? (!showMap ? 'Foto aset' : '')}</span>
          {asset?.serialNumber && <span>{asset.serialNumber}</span>}
        </footer>
      </div>
    </div>
  );
});

AssetDetailOverlay.displayName = 'AssetDetailOverlay';

export default AssetDetailOverlay;
