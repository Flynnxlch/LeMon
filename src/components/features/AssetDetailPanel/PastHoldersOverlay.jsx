import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { HiX } from 'react-icons/hi';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [-6.2088, 106.8456];

const PastHolderMapBounds = memo(({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude])
      );
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
  }, [points, map]);

  return null;
});
PastHolderMapBounds.displayName = 'PastHolderMapBounds';

/** When flyToPoint is set, fly the map to that coordinate (e.g. after user clicks a past holder card). */
const FlyToPoint = memo(({ flyToPoint }) => {
  const map = useMap();

  useEffect(() => {
    if (!flyToPoint) return;
    map.setView([flyToPoint.latitude, flyToPoint.longitude], 14, { animate: true });
  }, [flyToPoint, map]);

  return null;
});
FlyToPoint.displayName = 'FlyToPoint';

/** Format ISO date string to yyyy-mm-dd only */
const toDateOnly = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

const reverseGeocodeCache = new Map();

async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeCache.has(key)) {
    return reverseGeocodeCache.get(key);
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'TrackstuAssetApp/1.0' }
      }
    );
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    const address = data.address;
    let formatted = '';
    if (address?.road) {
      formatted = address.road;
      if (address.suburb || address.neighbourhood) formatted += ', ' + (address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) formatted += ', ' + (address.city || address.town || address.village);
    } else if (data.display_name) {
      const parts = data.display_name.split(',');
      formatted = parts.slice(0, 3).join(',').trim();
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
  const [state, setState] = useState({ address: null, loading: true });
  useEffect(() => {
    if (lat == null || lng == null) {
      setState({ address: null, loading: false });
      return;
    }
    let cancelled = false;
    reverseGeocode(Number(lat), Number(lng)).then((address) => {
      if (!cancelled) setState({ address, loading: false });
    });
    return () => { cancelled = true; };
  }, [lat, lng]);
  return state;
}

const PastHolderRow = memo(({ holder, index, onHolderClick }) => {
  const hasLocation = holder.latitude != null && holder.longitude != null;
  const { address: reverseAddress, loading: addressLoading } = useReverseGeocode(
    hasLocation ? holder.latitude : null,
    hasLocation ? holder.longitude : null
  );
  const displayAddress = hasLocation
    ? (addressLoading ? 'Memuat alamat...' : (reverseAddress || 'Alamat tidak tersedia'))
    : null;

  return (
    <li
      key={`${holder.nip}-${index}`}
      role={hasLocation ? 'button' : undefined}
      tabIndex={hasLocation ? 0 : undefined}
      onClick={hasLocation ? () => onHolderClick(holder) : undefined}
      onKeyDown={(e) => {
        if (hasLocation && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onHolderClick(holder);
        }
      }}
      className={`p-3 rounded-lg border border-neutral-100 ${
        hasLocation
          ? 'bg-neutral-50 cursor-pointer hover:bg-neutral-100 hover:border-neutral-200 transition-colors'
          : 'bg-neutral-50'
      }`}
    >
      <div className="space-y-3 text-sm">
        {/* Address (reverse geocode) ditampilkan di atas Periode */}
        {displayAddress != null && (
          <div>
            <span className="text-neutral-500 block text-xs">Alamat (lokasi)</span>
            <p className="font-medium text-neutral-900">{displayAddress}</p>
          </div>
        )}
        <div className="pt-1 border-t border-neutral-100">
          <span className="text-neutral-500 block text-xs">Periode</span>
          <p className="font-medium text-neutral-900">
            {formatPeriod(holder.periodStart, holder.periodEnd)}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-100">
          <div>
            <span className="text-neutral-500">Nama</span>
            <p className="font-medium text-neutral-900">{holder.fullName}</p>
          </div>
          <div>
            <span className="text-neutral-500">NIP</span>
            <p className="font-medium text-neutral-900">{holder.nip ?? '—'}</p>
          </div>
          <div>
            <span className="text-neutral-500">Cabang</span>
            <p className="font-medium text-neutral-900">{holder.branchName ?? holder.branchCode ?? '—'}</p>
          </div>
          <div>
            <span className="text-neutral-500">Divisi</span>
            <p className="font-medium text-neutral-900">{holder.division ?? '—'}</p>
          </div>
        </div>
      </div>
    </li>
  );
});
PastHolderRow.displayName = 'PastHolderRow';

const PastHoldersOverlay = memo(({ isOpen, onClose, pastHolders = [], assetSerialNumber }) => {
  const [flyToPoint, setFlyToPoint] = useState(null);

  const holdersWithLocation = useMemo(
    () => pastHolders.filter((h) => h.latitude != null && h.longitude != null),
    [pastHolders]
  );
  const showMap = holdersWithLocation.length > 0;

  const handleHolderClick = useCallback((holder) => {
    if (holder.latitude != null && holder.longitude != null) {
      setFlyToPoint({ latitude: holder.latitude, longitude: holder.longitude });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" aria-modal="true">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">
            Riwayat Pemegang (Past Holder)
            {assetSerialNumber && (
              <span className="text-neutral-500 font-normal ml-2">({assetSerialNumber})</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable: Map di atas, divider, lalu daftar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Map - di atas, dengan pin lokasi past holder; klik card akan fly ke titik */}
          {showMap && (
            <div className="mb-4">
              <div className="h-56 rounded-lg overflow-hidden border border-neutral-200">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {holdersWithLocation.map((holder, index) => (
                    <Marker
                      key={`marker-${holder.nip ?? index}-${index}`}
                      position={[holder.latitude, holder.longitude]}
                    />
                  ))}
                  <PastHolderMapBounds points={holdersWithLocation} />
                  <FlyToPoint flyToPoint={flyToPoint} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Divider di atas Daftar Pemegang Sebelumnya */}
          {pastHolders.length > 0 && <hr className="border-t border-neutral-200 my-4" />}

          {/* Daftar Pemegang Sebelumnya - tiap card: Address (reverse geocode) di atas Periode */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Daftar Pemegang Sebelumnya</h3>
            {pastHolders.length > 0 ? (
              <ul className="space-y-3">
                {pastHolders.map((holder, index) => (
                  <PastHolderRow
                    key={`${holder.nip ?? holder.fullName ?? index}-${index}`}
                    holder={holder}
                    index={index}
                    onHolderClick={handleHolderClick}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 italic py-4">Belum ada riwayat pemegang untuk aset ini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
PastHoldersOverlay.displayName = 'PastHoldersOverlay';

export default PastHoldersOverlay;
