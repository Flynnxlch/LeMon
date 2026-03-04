import imageCompression from 'browser-image-compression';
import { memo, useCallback, useRef, useState } from 'react';
import {
    HiCamera,
    HiCheckCircle,
    HiExclamationCircle,
    HiLocationMarker,
    HiX
} from 'react-icons/hi';
import { validateSerialNumber } from '../../../utils/validation';
import Button from '../../common/Button/Button';
import Card from '../../common/Card/Card';
import Input from '../../common/Input/Input';

const PhotoPreview = memo(({ photo, onRemove, index }) => (
  <div className="relative group">
    <img
      src={photo.preview}
      alt={`Preview ${index + 1}`}
      className="w-full h-32 object-cover rounded-lg border border-gray-200"
    />
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute top-2 right-2 p-1.5 bg-neutral-900 hover:bg-neutral-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label={`Remove photo ${index + 1}`}
    >
      <HiX className="w-4 h-4" />
    </button>
    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
      {(photo.file.size / 1024).toFixed(1)} KB
    </div>
  </div>
));

PhotoPreview.displayName = 'PhotoPreview';

const AssetSubmissionForm = memo(() => {
  const [serialNumber, setSerialNumber] = useState('');
  const [serialNumberError, setSerialNumberError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handleSerialNumberChange = useCallback((e) => {
    const value = e.target.value;
    setSerialNumber(value);
    if (serialNumberError) {
      setSerialNumberError('');
    }
  }, [serialNumberError]);

  const compressImage = useCallback(async (file) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  }, []);

  const handlePhotoSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    
    if (photos.length + files.length > 4) {
      alert('You can upload a maximum of 4 photos');
      return;
    }

    const newPhotos = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Compress the image
      const compressedFile = await compressImage(file);
      
      newPhotos.push({
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile)
      });
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [photos, compressImage]);

  const handleRemovePhoto = useCallback((index) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }, []);

  // Reverse geocoding function
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        return {
          address: data.display_name || 'Address not available',
          city: data.address.city || data.address.town || data.address.village || data.address.municipality || 'City not available',
          postalCode: data.address.postcode || 'Postal code not available',
          province: data.address.state || data.address.province || 'Province not available',
          country: data.address.country || 'Country not available'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }, []);

  const handleGetLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Get address details using reverse geocoding
        const addressDetails = await reverseGeocode(lat, lng);
        
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: position.coords.accuracy,
          address: addressDetails?.address || 'Fetching address...',
          city: addressDetails?.city || 'N/A',
          postalCode: addressDetails?.postalCode || 'N/A',
          province: addressDetails?.province || 'N/A',
          country: addressDetails?.country || 'N/A'
        });
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred.';
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [reverseGeocode]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate serial number
    const snError = validateSerialNumber(serialNumber);
    if (snError) {
      setSerialNumberError(snError);
      return;
    }

    // Validate photos (3-4 required)
    if (photos.length < 3 || photos.length > 4) {
      alert('Please upload 3 to 4 photos');
      return;
    }

    // Validate location
    if (!location) {
      setLocationError('Please capture your location');
      return;
    }

    setUploading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, you would upload the photos and data to your API
      const formData = new FormData();
      formData.append('serialNumber', serialNumber);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('address', location.address || '');
      formData.append('city', location.city || '');
      formData.append('postalCode', location.postalCode || '');
      formData.append('province', location.province || '');
      photos.forEach((photo, index) => {
        formData.append(`photo${index + 1}`, photo.file);
      });

      console.log('Submission data:', {
        serialNumber,
        location,
        address: {
          full: location.address,
          city: location.city,
          postalCode: location.postalCode,
          province: location.province
        },
        photoCount: photos.length,
        totalSize: photos.reduce((sum, p) => sum + p.file.size, 0)
      });

      setSubmitted(true);
      
      // Clean up
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [serialNumber, photos, location]);

  const handleReset = useCallback(() => {
    setSerialNumber('');
    setPhotos([]);
    setLocation(null);
    setSubmitted(false);
    setSerialNumberError('');
    setLocationError('');
  }, []);

  if (submitted) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
            <HiCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight">
            Submission Successful!
          </h3>
          <p className="text-neutral-500 mb-6">
            Your asset status update has been recorded.
          </p>
          <Button variant="primary" onClick={handleReset}>
            Submit Another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Submit Asset Status" subtitle="Scan or enter serial number and upload photos">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Serial Number Input */}
        <div>
          <Input
            label="Asset Serial Number"
            type="text"
            name="serialNumber"
            value={serialNumber}
            onChange={handleSerialNumberChange}
            placeholder="e.g., SN-ABC12345"
            required
            error={serialNumberError}
            helperText="Enter or scan the asset's serial number"
            autoComplete="off"
          />
        </div>

        {/* Photo Upload Section */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Asset Photos <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-neutral-500">
              (Required: 3-4 photos)
            </span>
          </label>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {photos.map((photo, index) => (
              <PhotoPreview
                key={index}
                photo={photo}
                index={index}
                onRemove={handleRemovePhoto}
              />
            ))}
            
            {photos.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-32 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                aria-label="Add photo"
              >
                <HiCamera className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Add Photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
            aria-label="Upload photos"
          />

          <p className="text-xs text-neutral-500">
            {photos.length}/4 photos uploaded. 
            {photos.length < 3 && ` ${3 - photos.length} more required.`}
            {photos.length >= 3 && ' Photos will be automatically compressed.'}
          </p>
        </div>

        {/* Location Section */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Location <span className="text-red-500">*</span>
          </label>

          {!location ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="w-full sm:w-auto"
              >
                <HiLocationMarker className="w-5 h-5 mr-2" />
                {locationLoading ? 'Getting Location...' : 'Capture Location'}
              </Button>
              
              {locationError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <HiExclamationCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{locationError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <HiCheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Location Captured
                    </p>
                    
                    {/* Coordinates */}
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-green-700">
                        <span className="font-semibold">Lat:</span> {location.latitude.toFixed(6)}, <span className="font-semibold">Lng:</span> {location.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-green-600">
                        <span className="font-semibold">Accuracy:</span> &plusmn;{location.accuracy.toFixed(0)}m
                      </p>
                    </div>
                    
                    {/* Address Details */}
                    {location.address && (
                      <div className="pt-3 border-t border-green-200 space-y-1.5">
                        <p className="text-xs font-semibold text-green-900 mb-1.5">
                          Address Details:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-green-700 font-medium min-w-[80px]">Address:</span>
                            <span className="text-xs text-green-800 flex-1">{location.address}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-green-700 font-medium min-w-[80px]">City:</span>
                            <span className="text-xs text-green-800">{location.city}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-green-700 font-medium min-w-[80px]">Postal Code:</span>
                            <span className="text-xs text-green-800">{location.postalCode}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="text-green-600 hover:text-green-800 shrink-0 ml-2"
                  aria-label="Remove location"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={uploading || photos.length < 3 || !location}
            className="flex-1"
          >
            {uploading ? 'Submitting...' : 'Submit Asset Status'}
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleReset}
            disabled={uploading}
          >
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
});

AssetSubmissionForm.displayName = 'AssetSubmissionForm';

export default AssetSubmissionForm;
