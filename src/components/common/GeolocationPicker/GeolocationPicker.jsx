import { memo, useCallback, useEffect, useState } from 'react';
import { HiLocationMarker } from 'react-icons/hi';
import Button from '../Button/Button';
import Input from '../Input/Input';

const GeolocationPicker = memo(({ 
  latitude, 
  longitude, 
  onChange, 
  error,
  disabled = false,
  label = "Location",
  showAddress = true
}) => {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [geoError, setGeoError] = useState('');
  const [getLocationFailureCount, setGetLocationFailureCount] = useState(0);

  const allowManualEdit = getLocationFailureCount >= 3;

  // Reverse Geocoding using OpenStreetMap Nominatim API
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
            'User-Agent': 'TrackSTU-AssetApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();

      if (data.display_name) {
        setAddress(data.display_name);
        return data.display_name;
      } else {
        setAddress('Address not found');
        return null;
      }
    } catch (err) {
      const message = err?.message || String(err);
      if (message !== 'Failed to fetch' && !message.includes('NetworkError')) {
        console.warn('Reverse geocoding error:', err);
      }
      setAddress('Unable to fetch address');
      return null;
    }
  }, []);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setGeoError('');
    setAddress('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setGetLocationFailureCount(0);

        // Update parent component
        onChange({
          latitude: lat,
          longitude: lon
        });

        // Fetch address if enabled
        if (showAddress) {
          await reverseGeocode(lat, lon);
        }

        setLoading(false);
      },
      (error) => {
        setGetLocationFailureCount((c) => c + 1);

        let errorMessage = 'Unable to retrieve your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get your location timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
        }

        setGeoError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onChange, showAddress, reverseGeocode]);

  const handleManualChange = useCallback((field, value) => {
    onChange({
      latitude: field === 'latitude' ? value : latitude,
      longitude: field === 'longitude' ? value : longitude
    });
    // Clear address when manually changed
    if (address) {
      setAddress('');
    }
  }, [latitude, longitude, onChange, address]);

  useEffect(() => {
    if (!showAddress || !latitude || !longitude || address) return;
    reverseGeocode(latitude, longitude);
  }, [showAddress, latitude, longitude, address, reverseGeocode]);

  return (
    <div className="space-y-4">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}

      {/* Get Location Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleGetLocation}
        disabled={loading || disabled}
        className="w-full flex items-center justify-center gap-2"
      >
        <HiLocationMarker className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
        {loading ? 'Getting Location...' : 'Get Current Location'}
      </Button>

      {/* Geolocation Error */}
      {geoError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{geoError}</p>
        </div>
      )}

      {/* Manual Edit Fallback Message */}
      {allowManualEdit && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Location detection failed 3 times. You can edit manually.
        </p>
      )}

      {/* Manual Input Fields - editable only after 3 failures */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitude"
          type="number"
          step="any"
          value={latitude || ''}
          onChange={(e) => allowManualEdit && handleManualChange('latitude', e.target.value)}
          error={error?.latitude}
          disabled={disabled || !allowManualEdit}
          placeholder="-6.2088"
        />
        <Input
          label="Longitude"
          type="number"
          step="any"
          value={longitude || ''}
          onChange={(e) => allowManualEdit && handleManualChange('longitude', e.target.value)}
          error={error?.longitude}
          disabled={disabled || !allowManualEdit}
          placeholder="106.8456"
        />
      </div>

      {/* Address Input */}
      {showAddress && (
        <Input
          label="Address"
          value={address || ''}
          onChange={() => {}}
          placeholder="Address will appear automatically from reverse geolocation"
          disabled
          error={typeof error === 'string' ? error : ''}
          helperText="Gunakan tombol Get Current Location untuk mengisi alamat otomatis"
        />
      )}

      {/* General Error */}
      {error && typeof error === 'string' && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

GeolocationPicker.displayName = 'GeolocationPicker';

export default GeolocationPicker;
