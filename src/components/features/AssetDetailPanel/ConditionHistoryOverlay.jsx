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

const ConditionMapBounds = memo(({ points }) => {
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
ConditionMapBounds.displayName = 'ConditionMapBounds';

const FlyToPoint = memo(({ flyToPoint }) => {
  const map = useMap();

  useEffect(() => {
    if (!flyToPoint) return;
    map.setView([flyToPoint.latitude, flyToPoint.longitude], 14, { animate: true });
  }, [flyToPoint, map]);

  return null;
});
FlyToPoint.displayName = 'FlyToPoint';

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

const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getConditionBadgeClass = (condition) => {
  switch (condition) {
    case 'Bagus':
      return 'bg-green-50 text-green-700';
    case 'Rusak':
      return 'bg-red-50 text-red-700';
    case 'Dalam Perbaikan':
      return 'bg-amber-50 text-amber-700';
    case 'Hilang':
      return 'bg-neutral-100 text-neutral-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

const ConditionHistoryRow = memo(({ entry, onEntryClick }) => {
  const hasLocation = entry.latitude != null && entry.longitude != null;
  const { address: reverseAddress, loading: addressLoading } = useReverseGeocode(
    hasLocation ? entry.latitude : null,
    hasLocation ? entry.longitude : null
  );
  const displayAddress = hasLocation
    ? (addressLoading ? 'Memuat alamat...' : (reverseAddress || 'Alamat tidak tersedia'))
    : null;

  return (
    <li
      key={entry.id}
      role={hasLocation ? 'button' : undefined}
      tabIndex={hasLocation ? 0 : undefined}
      onClick={hasLocation ? () => onEntryClick(entry) : undefined}
      onKeyDown={(e) => {
        if (hasLocation && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onEntryClick(entry);
        }
      }}
      className={`p-4 rounded-lg border border-neutral-200 ${
        hasLocation
          ? 'bg-neutral-50 cursor-pointer hover:bg-neutral-100 hover:border-neutral-300 transition-colors'
          : 'bg-neutral-50'
      }`}
    >
      <div className="text-xs font-medium text-neutral-500 mb-2">
        {formatDateTime(entry.updatedAt)}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm text-neutral-600">Holder:</span>
        <span className="text-sm font-medium text-neutral-900">
          {(entry.holderSnapshot?.fullName ?? entry.holder?.fullName) || 'Tidak ada data holder'}
        </span>
      </div>
      {displayAddress != null && (
        <div className="mb-2">
          <span className="text-sm text-neutral-600">Address: </span>
          <span className="text-sm font-medium text-neutral-900">{displayAddress}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm text-neutral-600">Kondisi:</span>
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-sm font-medium ${getConditionBadgeClass(entry.condition)}`}
        >
          {entry.condition || '—'}
        </span>
      </div>
      <p className="text-sm text-neutral-700 mb-3">
        {entry.conditionNote?.trim() ? entry.conditionNote : 'Tidak ada keterangan'}
      </p>
      {entry.conditionImages && entry.conditionImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {entry.conditionImages.slice(0, 4).map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Kondisi ${idx + 1}`}
              className="w-full aspect-video object-cover rounded-lg border border-neutral-200"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/160x90?text=No+Image';
              }}
            />
          ))}
        </div>
      )}
    </li>
  );
});
ConditionHistoryRow.displayName = 'ConditionHistoryRow';

const ConditionHistoryOverlay = memo(({ isOpen, onClose, conditionHistory = [], assetSerialNumber }) => {
  const [flyToPoint, setFlyToPoint] = useState(null);

  const entriesWithLocation = useMemo(
    () => conditionHistory.filter((e) => e.latitude != null && e.longitude != null),
    [conditionHistory]
  );
  const showMap = entriesWithLocation.length > 0;

  const handleEntryClick = useCallback((entry) => {
    if (entry.latitude != null && entry.longitude != null) {
      setFlyToPoint({ latitude: entry.latitude, longitude: entry.longitude });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" aria-modal="true">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">
            Histori Kondisi Aset
            {assetSerialNumber && (
              <span className="text-neutral-500 font-normal ml-2">({assetSerialNumber})</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-all duration-200"
            aria-label="Tutup"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-0">
          {conditionHistory.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">Belum ada riwayat kondisi.</p>
          ) : (
            <>
              {showMap && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">Lokasi riwayat kondisi</h3>
                  <div className="h-64 rounded-lg overflow-hidden border border-neutral-200">
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
                      {entriesWithLocation.map((entry, index) => (
                        <Marker
                          key={`marker-${entry.id}-${index}`}
                          position={[entry.latitude, entry.longitude]}
                        />
                      ))}
                      <ConditionMapBounds points={entriesWithLocation} />
                      <FlyToPoint flyToPoint={flyToPoint} />
                    </MapContainer>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Daftar riwayat</h3>
                <ul className="space-y-4">
                  {conditionHistory.map((entry) => (
                    <ConditionHistoryRow
                      key={entry.id}
                      entry={entry}
                      onEntryClick={handleEntryClick}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ConditionHistoryOverlay.displayName = 'ConditionHistoryOverlay';

export default ConditionHistoryOverlay;
