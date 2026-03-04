import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { STATUS_LABELS } from '../../../utils/assetConstants';
import Card from '../../common/Card/Card';

// Reverse geocoding function using Nominatim API
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AssetTrackingApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    // Format the address nicely
    const address = data.address;
    let formattedAddress = '';
    
    if (address.road) {
      formattedAddress = address.road;
      if (address.suburb || address.neighbourhood) {
        formattedAddress += ', ' + (address.suburb || address.neighbourhood);
      }
      if (address.city || address.town || address.village) {
        formattedAddress += ', ' + (address.city || address.town || address.village);
      }
    } else if (data.display_name) {
      // Fallback to display name if detailed address not available
      const parts = data.display_name.split(',');
      formattedAddress = parts.slice(0, 3).join(',');
    } else {
      formattedAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    
    return formattedAddress;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Return coordinates as fallback
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// Fix Leaflet default icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom marker icons for different statuses
const createCustomIcon = (status) => {
  const colors = {
    Available: '#22c55e',
    'Perlu Diupdate': '#f59e0b',
    Diperbaiki: '#3b82f6',
    Rusak: '#dc2626',
    Hilang: '#737373',
  };

  return L.divIcon({
    html: `
      <div style="
        background-color: ${colors[status] || colors.Available};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Component to handle map bounds adjustment and centering
const MapBoundsHandler = memo(({ assets, selectedAsset }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedAsset) {
      // Center on selected asset with closer zoom
      map.setView([selectedAsset.latitude, selectedAsset.longitude], 16, {
        animate: true,
        duration: 0.5
      });
    } else if (assets.length > 0) {
      // Fit all assets in view
      const bounds = L.latLngBounds(
        assets.map(asset => [asset.latitude, asset.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [assets, selectedAsset, map]);

  return null;
});

MapBoundsHandler.displayName = 'MapBoundsHandler';

const AssetMap = memo(({ assets = [], selectedAsset, onClearSelection, branchName: branchNameProp }) => {
  const branchName = branchNameProp ?? assets[0]?.branch_name ?? null;
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAssetWithAddress, setSelectedAssetWithAddress] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Only show assets that have coordinates
  const allAssets = useMemo(() => {
    return (assets || []).filter(
      (asset) => asset.latitude != null && asset.longitude != null
    );
  }, [assets]);

  // Only fetch address when a specific asset is selected for viewing
  useEffect(() => {
    if (selectedAsset) {
      setIsLoadingAddress(true);
      
      // Fetch address only for the selected asset
      reverseGeocode(selectedAsset.latitude, selectedAsset.longitude)
        .then(address => {
          setSelectedAssetWithAddress({
            ...selectedAsset,
            location: address
          });
          setIsLoadingAddress(false);
        })
        .catch(error => {
          console.error('Error fetching address:', error);
          setSelectedAssetWithAddress({
            ...selectedAsset,
            location: `${selectedAsset.latitude.toFixed(4)}, ${selectedAsset.longitude.toFixed(4)}`
          });
          setIsLoadingAddress(false);
        });
    } else {
      setSelectedAssetWithAddress(null);
      setIsLoadingAddress(false);
    }
  }, [selectedAsset]);

  // Filter assets by status and selected asset
  const filteredAssets = useMemo(() => {
    // If an asset is selected via View button, show only that asset
    if (selectedAsset) {
      const asset = allAssets.find(a => a.id === selectedAsset.id);
      return asset ? [asset] : [];
    }
    
    // Otherwise, filter by status
    if (selectedStatus === 'all') return allAssets;
    return allAssets.filter(asset => asset.status === selectedStatus);
  }, [allAssets, selectedStatus, selectedAsset]);

  const handleStatusFilter = useCallback((e) => {
    setSelectedStatus(e.target.value);
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getNextUpdateDate = useCallback((lastUpdate) => {
    const date = new Date(lastUpdate);
    date.setDate(date.getDate() + 30); // 30 days from last update
    return formatDate(date.toISOString());
  }, [formatDate]);

  // Default center (Jakarta)
  const defaultCenter = useMemo(() => [-6.2088, 106.8456], []);

  return (
    <Card title="Asset Location Map" subtitle="Real-time tracking of all rental assets" className="relative" padding="sm">
      <button
        onClick={onClearSelection}
        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors z-10"
        aria-label="Close map"
      >
        <HiX className="w-5 h-5" />
      </button>

      {/* Selected Asset Indicator */}
      {selectedAsset && (
        <div className="mb-2 flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neutral-900 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-neutral-900">
              Viewing: {selectedAsset.serialNumber}
            </span>
          </div>
        </div>
      )}
      
      {/* Filter Controls - Hidden when viewing specific asset */}
      {!selectedAsset && (
        <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Filter by status:</span>
          <select
            value={selectedStatus}
            onChange={handleStatusFilter}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            aria-label="Filter assets by status"
          >
            <option value="all">All ({allAssets.length})</option>
            <option value="Available">{STATUS_LABELS.Available} ({allAssets.filter(a => a.status === 'Available').length})</option>
            <option value="Perlu Diupdate">{STATUS_LABELS['Perlu Diupdate']} ({allAssets.filter(a => a.status === 'Perlu Diupdate').length})</option>
            <option value="Diperbaiki">{STATUS_LABELS.Diperbaiki} ({allAssets.filter(a => a.status === 'Diperbaiki').length})</option>
            <option value="Rusak">{STATUS_LABELS.Rusak} ({allAssets.filter(a => a.status === 'Rusak').length})</option>
            <option value="Hilang">{STATUS_LABELS.Hilang} ({allAssets.filter(a => a.status === 'Hilang').length})</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full"></div>
            <span className="text-neutral-500">{STATUS_LABELS.Available}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            <span className="text-neutral-500">{STATUS_LABELS['Perlu Diupdate']}</span>
          </div>
        </div>
      </div>
      )}

      {/* Map Container */}
      <div className="h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-gray-200 relative z-10 transition-all duration-300">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredAssets.map((asset) => (
            <Marker
              key={asset.id}
              position={[asset.latitude, asset.longitude]}
              icon={createCustomIcon(asset.status)}
              eventHandlers={{
                click: () => {
                  // Optional: could trigger callback to highlight in table
                }
              }}
            >
              <Popup maxWidth={320} className="custom-popup">
                <div className="p-3">
                  {/* Top Section: Image and Serial Number */}
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={asset.photoUrl}
                      alt={asset.name}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/96?text=No+Image';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-neutral-900 mb-1 truncate" title={asset.serialNumber}>
                        {asset.serialNumber}
                      </h3>
                      <a
                        href={asset.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-900 font-medium hover:underline"
                      >
                        View Full Photo &rarr;
                      </a>
                    </div>
                  </div>
                  
                  {/* Middle Section: Details */}
                  <div className="space-y-2 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-medium min-w-[80px]">Holder:</span>
                      <span className="text-neutral-900 font-semibold">
                        {asset.holder?.fullName || 'Not assigned'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-medium min-w-[80px]">Coordinates:</span>
                      <span className="text-neutral-900 font-medium text-xs">
                        {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-medium min-w-[80px]">Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        asset.status === 'Available' ? 'bg-green-50 text-green-700' :
                        asset.status === 'Perlu Diupdate' ? 'bg-amber-50 text-amber-700' :
                        asset.status === 'Diperbaiki' ? 'bg-blue-50 text-blue-700' :
                        asset.status === 'Rusak' ? 'bg-red-50 text-red-700' :
                        asset.status === 'Hilang' ? 'bg-neutral-200 text-neutral-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {STATUS_LABELS[asset.status] ?? asset.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Bottom Section: Last Update */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium">Last Update:</span>
                      <span className="text-xs text-neutral-900 font-medium">
                        {formatDate(asset.lastUpdate)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          <MapBoundsHandler assets={filteredAssets} selectedAsset={selectedAsset} />
        </MapContainer>
      </div>

      {/* Selected Asset Details - Shown below map */}
      {selectedAssetWithAddress && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-base font-semibold text-neutral-900 mb-2">
            Asset Details
          </h3>
          <div className="bg-neutral-50 rounded-lg p-4 border border-gray-200">
            {/* Asset Image and Basic Info */}
            <div className="flex items-start gap-4 mb-4">
              <img
                src={selectedAssetWithAddress.photoUrl || `https://picsum.photos/200/200?random=${selectedAssetWithAddress.id}`}
                alt={selectedAssetWithAddress.serialNumber}
                className="w-32 h-32 object-cover rounded-lg border border-gray-200 shrink-0"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/128?text=No+Image';
                }}
              />
              <div className="flex-1">
                <h4 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">
                  {selectedAssetWithAddress.serialNumber}
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedAssetWithAddress.status === 'Available' ? 'bg-green-50 text-green-700' :
                    selectedAssetWithAddress.status === 'Perlu Diupdate' ? 'bg-amber-50 text-amber-700' :
                    selectedAssetWithAddress.status === 'Diperbaiki' ? 'bg-blue-50 text-blue-700' :
                    selectedAssetWithAddress.status === 'Rusak' ? 'bg-red-50 text-red-700' :
                    selectedAssetWithAddress.status === 'Hilang' ? 'bg-neutral-200 text-neutral-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {STATUS_LABELS[selectedAssetWithAddress.status] ?? selectedAssetWithAddress.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Type
                  </span>
                  <span className="text-base font-semibold text-neutral-900">
                    {selectedAssetWithAddress.type}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Current Holder
                  </span>
                  <span className="text-base font-semibold text-neutral-900">
                    {selectedAssetWithAddress.holder?.fullName || 'Not assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Location Address
                  </span>
                  <span className="text-base font-semibold text-neutral-900">
                    {isLoadingAddress ? (
                      <span className="text-neutral-400">Loading address...</span>
                    ) : (
                      selectedAssetWithAddress.location
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Coordinates
                  </span>
                  <span className="text-base font-semibold text-neutral-900">
                    {selectedAssetWithAddress.latitude.toFixed(6)}, {selectedAssetWithAddress.longitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Last Updated
                  </span>
                  <span className="text-base font-semibold text-neutral-900">
                    {formatDate(selectedAssetWithAddress.lastUpdate)}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-500 block mb-1">
                    Due Update
                  </span>
                  <span className="text-base font-semibold text-amber-700">
                    {getNextUpdateDate(selectedAssetWithAddress.lastUpdate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedAsset && (
        <div className="mt-4 text-sm text-neutral-500">
          Showing {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} on the map
          {branchName && (
            <span className="ml-2 text-neutral-700 font-medium">
              (Cabang: {branchName})
            </span>
          )}
        </div>
      )}
    </Card>
  );
});

AssetMap.displayName = 'AssetMap';

export default AssetMap;
