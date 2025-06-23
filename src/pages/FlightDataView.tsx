import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Source, Layer, Marker, Popup, MapRef, ViewStateChangeEvent } from 'react-map-gl';
import type { LngLatBounds } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BookingImageGallery, ImageProps } from '../components/bookings/BookingImageGallery';
import { FiMaximize2, FiMinimize2, FiImage, FiLayers, FiCrosshair, FiPlus, FiMinus, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
import { Navbar } from '../components/Navbar';
import { refreshMultipleUrls, needsUrlRefresh } from '../utils/s3UrlRefresh';
import secureLogger from '../utils/secureLogger';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  padding?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

interface ImageLocation {
  url: string;
  latitude: number;
  longitude: number;
  name?: string;
  heading?: number;
  altitude?: number;
  timestamp?: string;
  cameraModel?: string;
  droneModel?: string;
}

const FlightDataView: React.FC = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageProps[]>([]);
  const [imageLocations, setImageLocations] = useState<ImageLocation[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageLocation | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGallery, setShowGallery] = useState(true);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });
  
  const galleryRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

  const mapStyles = [
    { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
    { id: 'satellite-streets', label: 'Satellite with Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'light', label: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
    { id: 'dark', label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' }
  ];

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedForDownload, setSelectedForDownload] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch booking data and images here
    const fetchBookingData = async () => {
      setIsLoadingImages(true);
      setIsLoadingMap(true);
      if (!bookingId) {
        setIsLoadingImages(false);
        setIsLoadingMap(false);
        return;
      }

      // Check for preloaded data first
      const preloadedData = localStorage.getItem('preloadedFlightData');
      if (preloadedData) {
        try {
          const parsedData = JSON.parse(preloadedData);
          
          // Verify the data matches the current booking
          if (parsedData.bookingId === bookingId && 
              // Ensure data isn't too old (5 minutes)
              Date.now() - parsedData.processedAt < 5 * 60 * 1000) {
            setImages(parsedData.images);
            setImageLocations(parsedData.imageLocations);
            
            // Set initial map view if locations exist
            if (parsedData.imageLocations.length > 0) {
              setViewState(prev => ({
                ...prev,
                latitude: parsedData.imageLocations[0].latitude,
                longitude: parsedData.imageLocations[0].longitude,
                zoom: 15
              }));
            }
            
            // Clear the preloaded data
            localStorage.removeItem('preloadedFlightData');
            setIsLoadingImages(false);
            return;
          }
        } catch (error) {
          localStorage.removeItem('preloadedFlightData');
        }
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
        const token = localStorage.getItem('idToken') || localStorage.getItem('token');

        if (!token || !apiUrl) {
          throw new Error('Missing authentication token or API endpoint');
        }

        const requestUrl = `${apiUrl}/bookings/${bookingId}`;
        secureLogger.info('Making API request to:', requestUrl);
        
        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        secureLogger.info('API response status:', response.status);
        secureLogger.info('API response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          secureLogger.error('API error response:', errorText);
          throw new Error(`Failed to fetch booking data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.images) {
          // Extract all image URLs for potential refresh
          const imageUrls = data.images.map((img: any) => 
            img.url || img.presignedUrl || img.ResourceUrl || ''
          ).filter((url: string) => url);
          
          // Refresh expired pre-signed URLs
          let refreshedUrls: Record<string, string> = {};
          if (imageUrls.length > 0) {
            try {
              const refreshedMap = await refreshMultipleUrls(imageUrls);
              // Convert Map to plain object
              refreshedMap.forEach((value, key) => {
                refreshedUrls[key] = value;
              });
            } catch (refreshError) {
              secureLogger.warn('Failed to refresh some URLs:', refreshError);
            }
          }
          
          const processedImages = data.images.map((img: any) => {
            const originalUrl = img.url || img.presignedUrl || img.ResourceUrl || '';
            const refreshedUrl = refreshedUrls[originalUrl] || originalUrl;
            
            return {
              url: refreshedUrl,
              name: img.name || img.FileName || 'Unnamed Image',
              type: img.type || img.ContentType,
              size: img.Size || img.size,
              uploadDate: img.uploadDate || img.CreatedAt,
              resourceId: img.resourceId || img.ResourceId
            };
          });
          setImages(processedImages);

          // Process image locations
          const locations = data.images
            .filter((img: any) => {
              // Check for latitude/longitude in the new metadata structure
              const hasLocation = 
                img.metadata?.latitude?.M?.S?.S || // New structure
                img.metadata?.coordinates?.M?.latitude?.M?.S?.S || // Legacy nested structure
                img.geolocation?.latitude; // Old structure
              
              if (!hasLocation) {
              }
              return hasLocation;
            })
            .map((img: any) => {
              // Helper function to extract value from DynamoDB structure
              const extractDynamoValue = (field: any): string | undefined => {
                if (!field) return undefined;
                // Handle new structure: { M: { S: { S: "value" } } }
                if (field.M?.S?.S) return field.M.S.S;
                // Handle new structure: { M: { N: { S: "value" } } }
                if (field.M?.N?.S) return field.M.N.S;
                // Handle direct value
                if (typeof field === 'string' || typeof field === 'number') return String(field);
                return undefined;
              };

              // Extract all metadata values using the new structure
              const metadata = img.metadata || {};
              
              // Get coordinates from either new or legacy structure
              let latitude, longitude;
              if (metadata.latitude) {
                latitude = extractDynamoValue(metadata.latitude);
                longitude = extractDynamoValue(metadata.longitude);
              } else if (metadata.coordinates?.M) {
                latitude = extractDynamoValue(metadata.coordinates.M.latitude);
                longitude = extractDynamoValue(metadata.coordinates.M.longitude);
              } else if (img.geolocation) {
                latitude = String(img.geolocation.latitude);
                longitude = String(img.geolocation.longitude);
              }

              // Extract other metadata fields
              const heading = extractDynamoValue(metadata.imageDirection) || 
                            extractDynamoValue(metadata.direction);
              const altitude = extractDynamoValue(metadata.altitude);
              const cameraModel = extractDynamoValue(metadata.cameraModel);
              const timestamp = extractDynamoValue(metadata.timestamp);

              // Log processed location data for debugging
              const locationData = {
                url: img.url || img.ResourceUrl,
                latitude: parseFloat(latitude || '0'),
                longitude: parseFloat(longitude || '0'),
                name: img.name || img.FileName,
                heading: heading ? parseFloat(heading) : undefined,
                altitude: altitude ? parseFloat(altitude) : undefined,
                timestamp: timestamp,
                cameraModel: cameraModel
              };
              return locationData;
            });
          setImageLocations(locations);

          // Set initial map view to first image location
          if (locations.length > 0) {
            setViewState(prev => ({
              ...prev,
              latitude: locations[0].latitude,
              longitude: locations[0].longitude,
              zoom: 15
            }));
          } else {
          }
        } else {
        }

      } catch (error) {
        if (error instanceof Error) {
        }
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchBookingData();
  }, [bookingId]);

  // Periodic URL refresh to prevent expiration during long viewing sessions
  useEffect(() => {
    if (images.length === 0) return;

    const refreshInterval = setInterval(async () => {
      try {
        // Check if any URLs need refreshing
        const urlsToRefresh = images
          .map(img => img.url)
          .filter(url => needsUrlRefresh(url));

        if (urlsToRefresh.length > 0) {
          secureLogger.info(`Refreshing ${urlsToRefresh.length} URLs before expiration...`);
          
          const { refreshMultipleUrls } = await import('../utils/s3UrlRefresh');
          const refreshedMap = await refreshMultipleUrls(urlsToRefresh);
          
          // Update images with refreshed URLs
          setImages(prevImages => {
            return prevImages.map(img => {
              const refreshedUrl = refreshedMap.get(img.url);
              if (refreshedUrl && refreshedUrl !== img.url) {
                return { ...img, url: refreshedUrl };
              }
              return img;
            });
          });
          
          // Update image locations with refreshed URLs
          setImageLocations(prevLocations => {
            return prevLocations.map(loc => {
              const refreshedUrl = refreshedMap.get(loc.url);
              if (refreshedUrl && refreshedUrl !== loc.url) {
                return { ...loc, url: refreshedUrl };
              }
              return loc;
            });
          });
        }
      } catch (error) {
        secureLogger.warn('Failed to refresh URLs periodically:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [images]);

  // Calculate centroid of image locations
  const calculateCentroid = (locations: ImageLocation[]) => {
    if (locations.length === 0) return null;
    
    const sum = locations.reduce(
      (acc, loc) => ({
        latitude: acc.latitude + loc.latitude,
        longitude: acc.longitude + loc.longitude
      }),
      { latitude: 0, longitude: 0 }
    );
    
    return {
      latitude: sum.latitude / locations.length,
      longitude: sum.longitude / locations.length
    };
  };

  // Calculate the bounds of all image locations
  const calculateBounds = (locations: ImageLocation[]): [[number, number], [number, number]] | null => {
    if (locations.length === 0) return null;

    const bounds = locations.reduce(
      (acc, loc) => ({
        minLng: Math.min(acc.minLng, loc.longitude),
        maxLng: Math.max(acc.maxLng, loc.longitude),
        minLat: Math.min(acc.minLat, loc.latitude),
        maxLat: Math.max(acc.maxLat, loc.latitude)
      }),
      {
        minLng: locations[0].longitude,
        maxLng: locations[0].longitude,
        minLat: locations[0].latitude,
        maxLat: locations[0].latitude
      }
    );

    return [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]];
  };

  // Center map on all images with appropriate zoom
  const centerOnAllImages = () => {
    if (imageLocations.length === 0 || !mapRef.current) return;

    const bounds = calculateBounds(imageLocations);
    if (!bounds) return;

    // Calculate padding based on UI state and screen size
    const selectedImagePanelWidth = selectedImage ? 800 : 0; // Width of the image panel when open
    const galleryHeight = showGallery ? 140 : 0; // Height of the gallery when shown
    
    // Get the map container dimensions
    const map = mapRef.current.getMap() as mapboxgl.Map;
    const mapContainer = map.getContainer();
    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    // Calculate the center offset to account for the selected image panel
    const horizontalOffset = selectedImagePanelWidth / 2;
    
    // Calculate padding to ensure markers aren't hidden behind UI elements
    const padding = {
      top: 100,
      bottom: Math.max(100, galleryHeight + 50), // Add extra padding if gallery is shown
      left: selectedImage ? selectedImagePanelWidth + 50 : 100, // Account for image panel
      right: 100
    };

    // If the map is very wide and panel is open, adjust right padding to maintain center
    if (selectedImage && mapWidth > 1600) {
      padding.right = Math.max(100, horizontalOffset);
    }

    mapRef.current.fitBounds(
      bounds,
      {
        padding,
        duration: 1000,
        offset: [-horizontalOffset, 0] // Offset center to account for image panel
      }
    );
  };

  // Center map on a specific image
  const centerOnImage = (location: ImageLocation) => {
    if (!mapRef.current) return;

    // Get the map container dimensions
    const map = mapRef.current.getMap() as mapboxgl.Map;
    const mapContainer = map.getContainer();
    const mapWidth = mapContainer.offsetWidth;
    
    // Calculate the horizontal offset for the selected image panel (800px width)
    const selectedImagePanelWidth = 800;
    const horizontalOffset = selectedImagePanelWidth / 2;
    
    // Calculate the new center point
    // If map is wide enough, adjust longitude to account for panel
    const bounds = map.getBounds();
    const longitudeOffset = bounds ? (horizontalOffset / mapWidth) * 
      (bounds.getEast() - bounds.getWest()) : 0;

    setViewState({
      longitude: location.longitude + (mapWidth > 1600 ? longitudeOffset : 0),
      latitude: location.latitude,
      zoom: 18.5,
      bearing: 0,
      pitch: viewState.pitch || 0,
      transitionDuration: 1000
    });
  };

  // Effect to center map when images are loaded
  useEffect(() => {
    if (imageLocations.length > 0) {
      centerOnAllImages();
    }
  }, [imageLocations]);

  const handleImageClick = (location: ImageLocation, index: number) => {
    setSelectedImage(location);
    setSelectedImageIndex(index);
    
    const selectedGalleryImage = images.find(img => img.url === location.url);
    if (selectedGalleryImage) {
      const galleryIndex = images.findIndex(img => img.url === location.url);
      if (galleryIndex !== -1) {
        const galleryElement = galleryRef.current;
        if (galleryElement) {
          const imageElements = galleryElement.getElementsByClassName('flex-none');
          if (imageElements[galleryIndex]) {
            imageElements[galleryIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      }
    }
    
    // Add a slight delay to ensure the panel animation has started
    // and adjust the centering calculation
    setTimeout(() => {
      centerOnImage(location);
    }, 300); // Increased delay to account for panel animation
  };

  // Update the gallery click handler to match
  const handleGalleryClick = (image: ImageProps) => {
    // Find the corresponding location
    const locationIndex = imageLocations.findIndex(loc => loc.url === image.url);
    if (locationIndex !== -1) {
      handleImageClick(imageLocations[locationIndex], locationIndex);
    }
  };

  // Update the marker click handler to ensure it uses the same behavior
  const handleMarkerClick = (location: ImageLocation, index: number) => {
    handleImageClick(location, index);
  };

  // Update the map click handler to clear selection
  const handleMapClick = (event: any) => {
    if (!event.features?.length) {
      setSelectedImage(null);
      setSelectedImageIndex(-1);
      centerOnAllImages();
    }
  };

  const navigateToImage = (direction: 'prev' | 'next') => {
    if (imageLocations.length === 0) return;
    
    const newIndex = direction === 'next'
      ? (selectedImageIndex + 1) % imageLocations.length
      : (selectedImageIndex - 1 + imageLocations.length) % imageLocations.length;
    
    const newLocation = imageLocations[newIndex];
    handleImageClick(newLocation, newIndex);
  };

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateToImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateToImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, imageLocations]);

  const markerLayer = useMemo(() => ({
    id: 'image-locations',
    type: 'circle',
    paint: {
      'circle-radius': 8,
      'circle-color': '#2563eb',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  }), []);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify({
          action: 'downloadImages',
          urls: images.map(img => img.url),
          names: images.map(img => img.name || 'image.jpg')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download images');
      }

      // Get the zip file blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight_images_${bookingId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // You could add a toast notification here
    }
    setIsDownloading(false);
  };

  const handleDownloadSelected = async () => {
    if (selectedForDownload.size === 0) {
      return;
    }
    
    setIsDownloading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      if (!apiUrl) {
        throw new Error('API endpoint not configured');
      }

      // Filter selected images and ensure they exist
      const selectedImages = images.filter(img => selectedForDownload.has(img.url));
      if (selectedImages.length === 0) {
        throw new Error('No valid images selected for download');
      }

      const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify({
          action: 'downloadImages',
          urls: selectedImages.map(img => img.url),
          names: selectedImages.map(img => img.name || 'image.jpg')
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Failed to download images');
      }

      // Get the zip file blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected_images_${bookingId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // You could add a toast notification here
    }
    setIsDownloading(false);
    // Clear selection after successful download
    setSelectedForDownload(new Set());
  };

  const toggleImageSelection = (url: string) => {
    setSelectedForDownload(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedForDownload.size === images.length) {
      setSelectedForDownload(new Set());
    } else {
      setSelectedForDownload(new Set(images.map(img => img.url)));
    }
  };

  // Add progress simulation effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoadingImages || isLoadingMap) {
      // Reset progress when loading starts
      setLoadingProgress(0);
      
      // Simulate progress in stages
      const simulateProgress = () => {
        setLoadingProgress(current => {
          if (current >= 100) {
            return 100;
          }
          
          // Slow down progress as it gets higher
          if (current < 30) return current + 12;
          if (current < 60) return current + 8;
          if (current < 85) return current + 4;
          return current + 1;
        });
      };
      
      // Update progress every 250ms
      timer = setInterval(simulateProgress, 250);
      
      // Cleanup interval
      return () => clearInterval(timer);
    } else {
      // Quickly complete progress when loading is done
      setLoadingProgress(100);
    }
  }, [isLoadingImages, isLoadingMap]);

  // Update the LoadingOverlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center w-full max-w-sm mx-auto px-4">
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-white"></div>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading Flight Data</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">
          {loadingProgress < 30 && "Loading flight images..."}
          {loadingProgress >= 30 && loadingProgress < 60 && "Processing location data..."}
          {loadingProgress >= 60 && loadingProgress < 85 && "Preparing map view..."}
          {loadingProgress >= 85 && "Almost ready..."}
        </p>
        {isLoadingImages && isLoadingMap && (
          <p className="text-xs text-gray-400 mt-2">
            Loading images and map data...
          </p>
        )}
        {isLoadingImages && !isLoadingMap && (
          <p className="text-xs text-gray-400 mt-2">
            Loading remaining images...
          </p>
        )}
        {!isLoadingImages && isLoadingMap && (
          <p className="text-xs text-gray-400 mt-2">
            Finalizing map view...
          </p>
        )}
      </div>
    </div>
  );

  // Function to handle individual image load failures
  const handleImageLoadError = async (imageUrl: string, imageIndex: number) => {
    secureLogger.warn(`Image failed to load: ${imageUrl}`);
    
    // Add to error set
    setImageLoadErrors(prev => new Set(prev).add(imageUrl));
    
    // Try to refresh the URL if it's a pre-signed URL
    if (needsUrlRefresh(imageUrl)) {
      try {
        const { refreshPresignedUrl } = await import('../utils/s3UrlRefresh');
        const refreshedUrl = await refreshPresignedUrl(imageUrl);
        
        if (refreshedUrl !== imageUrl) {
          // Update the image with the refreshed URL
          setImages(prevImages => {
            const updatedImages = [...prevImages];
            if (updatedImages[imageIndex]) {
              updatedImages[imageIndex] = {
                ...updatedImages[imageIndex],
                url: refreshedUrl
              };
            }
            return updatedImages;
          });
          
          // Remove from error set
          setImageLoadErrors(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageUrl);
            return newSet;
          });
          
          secureLogger.info('Successfully refreshed and retried image URL');
        }
      } catch (error) {
        secureLogger.error('Failed to refresh image URL:', error);
      }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Show loading overlay when either images or map is loading */}
      {(isLoadingImages || isLoadingMap) && <LoadingOverlay />}
      
      <Navbar />
      
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-2 font-medium"
              >
                <FiChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-200 mx-4" />
              <h1 className="text-xl font-semibold text-gray-900">Flight Data View</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowGallery(!showGallery)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={showGallery ? "Hide Gallery" : "Show Gallery"}
              >
                <FiImage size={18} className="mr-2" />
                {showGallery ? "Hide Gallery" : "Show Gallery"}
              </button>
              <button
                onClick={toggleFullscreen}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <><FiMinimize2 size={18} className="mr-2" />Exit Fullscreen</>
                ) : (
                  <><FiMaximize2 size={18} className="mr-2" />Fullscreen</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        {/* Map and Selected Image Container */}
        <div className="flex-1 flex min-h-0 p-4 lg:p-6 gap-4">
          {/* Selected Image Panel */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '800px', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="h-full bg-white rounded-lg shadow-lg z-10 overflow-hidden flex flex-col"
              >
                <div className="flex-none px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Selected Image</h3>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setSelectedImageIndex(-1);
                        centerOnAllImages();
                      }}
                      className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <div className="w-full relative rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={selectedImage.url} 
                        alt={selectedImage.name || 'Selected Image'} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Find the image index and refresh the URL
                          const imageIndex = images.findIndex(img => img.url === selectedImage.url);
                          if (imageIndex !== -1) {
                            handleImageLoadError(selectedImage.url, imageIndex);
                          }
                        }}
                      />
                      {imageLoadErrors.has(selectedImage.url) && (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <div className="text-lg mb-2">Failed to load image</div>
                            <button 
                              onClick={(e) => {
                                const imageIndex = images.findIndex(img => img.url === selectedImage.url);
                                if (imageIndex !== -1) {
                                  handleImageLoadError(selectedImage.url, imageIndex);
                                }
                              }}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4">
                        <div className="text-white">
                          {selectedImage.timestamp && (
                            <div>
                              <p className="text-sm opacity-75">Captured</p>
                              <p className="font-medium">{new Date(selectedImage.timestamp).toLocaleString()}</p>
                            </div>
                          )}
                          {selectedImage.cameraModel && (
                            <div className="mt-2">
                              <p className="text-sm opacity-75">Camera</p>
                              <p className="font-medium">{selectedImage.cameraModel}</p>
                            </div>
                          )}
                          {selectedImage.droneModel && (
                            <div className="mt-2">
                              <p className="text-sm opacity-75">Drone</p>
                              <p className="font-medium">{selectedImage.droneModel}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-none p-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between">
                    <button
                      onClick={() => navigateToImage('prev')}
                      className="flex items-center px-3 py-2 bg-white rounded-md hover:bg-gray-50 transition-colors text-gray-700 border border-gray-200 shadow-sm"
                    >
                      <FiChevronLeft size={20} className="mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() => navigateToImage('next')}
                      className="flex items-center px-3 py-2 bg-white rounded-md hover:bg-gray-50 transition-colors text-gray-700 border border-gray-200 shadow-sm"
                    >
                      Next
                      <FiChevronRight size={20} className="ml-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Container */}
          <div className="flex-1 relative rounded-lg overflow-hidden bg-white shadow-lg">
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              onClick={handleMapClick}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              mapStyle="mapbox://styles/mapbox/satellite-v9"
              mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
              ref={mapRef}
              onLoad={() => setIsLoadingMap(false)}
            >
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom + 1 }))}
                  className="p-2 hover:bg-gray-50 text-gray-700 block w-full text-center border-b border-gray-200"
                  title="Zoom in"
                >
                  <FiPlus size={20} />
                </button>
                <button
                  onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom - 1 }))}
                  className="p-2 hover:bg-gray-50 text-gray-700 block w-full text-center"
                  title="Zoom out"
                >
                  <FiMinus size={20} />
                </button>
              </div>

              {/* Center All Button */}
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={centerOnAllImages}
                  className="bg-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-50 text-gray-700 flex items-center space-x-2 transition-colors"
                  title="Center on all images"
                >
                  <FiCrosshair size={18} />
                  <span className="text-sm font-medium">Center All</span>
                </button>
              </div>

              {/* Image Markers */}
              {imageLocations.map((location, index) => {
                // Determine if this marker is selected
                const isSelected = selectedImageIndex === index;
                
                return (
                  <Marker
                    key={`marker-${index}`}
                    longitude={location.longitude}
                    latitude={location.latitude}
                    // Offset the marker upward when selected to prevent overlap
                    offset={isSelected ? [0, -10] : [0, 0]}
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: isSelected ? 1.2 : 1,
                        opacity: 1,
                        zIndex: isSelected ? 1000 : index // Ensure selected marker is always on top
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkerClick(location, index);
                      }}
                      className={`relative group cursor-pointer transform-gpu ${
                        isSelected ? 'z-[1000]' : 'z-0'
                      }`}
                      style={{
                        filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' : 'none'
                      }}
                    >
                      {isSelected && (
                        <>
                          {/* Outer glow effect */}
                          <motion.div
                            className="absolute -inset-4 rounded-full bg-blue-500/30"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 0.1, 0.3]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          {/* Additional highlight ring */}
                          <motion.div
                            className="absolute -inset-2 rounded-full bg-white/50"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        </>
                      )}
                      
                      <div 
                        className={`w-8 h-8 rounded-full border-2 transform-gpu transition-all duration-300
                          ${isSelected
                            ? 'bg-blue-600 border-white shadow-lg scale-110'
                            : 'bg-white border-blue-500 shadow-md group-hover:scale-110'
                          }`}
                      >
                        {location.heading !== undefined && (
                          <div 
                            className="absolute inset-0"
                            style={{ transform: `rotate(${location.heading}deg)` }}
                          >
                            <div 
                              className={`absolute -top-5 left-1/2 -translate-x-1/2 w-4 h-5 
                                       flex items-center justify-center transition-transform duration-300
                                       ${isSelected ? 'scale-125' : ''}`}
                            >
                              <svg 
                                viewBox="0 0 24 30" 
                                className={`w-full h-full transition-all duration-300 ${
                                  isSelected ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' : 
                                             'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                                }`}
                              >
                                <path 
                                  d="M12 2L22 28L12 22L2 28L12 2Z"
                                  fill={isSelected ? 'white' : '#3B82F6'}
                                  stroke={isSelected ? '#3B82F6' : 'white'}
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hover Preview - Only show for non-selected markers */}
                      {!isSelected && (
                        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <div className="bg-white rounded-lg shadow-lg p-2 w-48">
                            <div className="relative w-full h-24 rounded mb-2 overflow-hidden">
                              <img 
                                src={location.url} 
                                alt={location.name || 'Image preview'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Add error styling to the image container
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const container = target.parentElement;
                                  if (container) {
                                    // Use React's dangerouslySetInnerHTML with sanitized content
                                    const sanitizedContent = `
                                      <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <div class="text-center text-gray-500 text-xs">
                                          <div>Failed to load</div>
                                        </div>
                                      </div>
                                    `.replace(/[<>]/g, ''); // Basic sanitization
                                    
                                    // Create a temporary div to set the content
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = sanitizedContent;
                                    
                                    // Clear container and append sanitized content
                                    container.innerHTML = '';
                                    container.appendChild(tempDiv.firstElementChild!);
                                  }
                                }}
                              />
                            </div>
                            <div className="text-xs text-gray-600">
                              {location.heading !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span>Heading:</span>
                                  <span>{location.heading.toFixed(1)}°</span>
                                </div>
                              )}
                              {location.altitude !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span>Altitude:</span>
                                  <span>{location.altitude.toFixed(0)}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-white transform rotate-45 -translate-x-1/2 translate-y-1/2" />
                        </div>
                      )}
                    </motion.div>
                  </Marker>
                );
              })}
            </Map>
          </div>
        </div>

        {/* Image Gallery */}
        <AnimatePresence>
          {showGallery && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-none bg-white border-t border-gray-200"
            >
              <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-medium text-gray-900">Flight Images</h3>
                  <span className="text-sm text-gray-500">
                    {isLoadingImages ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Loading images...
                      </div>
                    ) : (
                      `${images.length} images • ${imageLocations.length} with location data`
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isSelectMode && (
                    <>
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 
                                 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {selectedForDownload.size === images.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={handleDownloadSelected}
                        disabled={selectedForDownload.size === 0 || isDownloading}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                          ${selectedForDownload.size === 0 || isDownloading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                      >
                        {isDownloading ? 'Downloading...' : `Download Selected (${selectedForDownload.size})`}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsSelectMode(!isSelectMode)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                      ${isSelectMode
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {isSelectMode ? 'Cancel Selection' : 'Select Images'}
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloading}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                      ${isDownloading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    {isDownloading ? 'Downloading...' : 'Download All'}
                  </button>
                </div>
              </div>
              <div 
                ref={galleryRef}
                className="overflow-x-auto py-4 px-6"
                style={{ height: '140px' }}
              >
                <div className="flex gap-4 h-full items-center">
                  {images.map((image, index) => {
                    const locationIndex = imageLocations.findIndex(loc => loc.url === image.url);
                    const hasLocation = locationIndex !== -1;
                    
                    return (
                      <motion.div
                        key={`gallery-${index}`}
                        className={`relative flex-none cursor-pointer transition-all duration-300 ${
                          selectedImageIndex === locationIndex ? 'ring-4 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-2'
                        }`}
                        onClick={() => {
                          if (isSelectMode) {
                            toggleImageSelection(image.url);
                          } else {
                            handleGalleryClick(image);
                          }
                        }}
                      >
                        <div className="w-28 h-28 relative">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover rounded-lg shadow-md"
                            onError={() => handleImageLoadError(image.url, index)}
                            onLoad={() => {
                              // Remove from error set if image loads successfully
                              if (imageLoadErrors.has(image.url)) {
                                setImageLoadErrors(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(image.url);
                                  return newSet;
                                });
                              }
                            }}
                          />
                          {imageLoadErrors.has(image.url) && (
                            <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <div className="text-xs">Failed to load</div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageLoadError(image.url, index);
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                                >
                                  Retry
                                </button>
                              </div>
                            </div>
                          )}
                          {hasLocation && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" 
                                 title="Has location data" />
                          )}
                          {isSelectMode && (
                            <div 
                              className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 
                                ${selectedForDownload.has(image.url)
                                  ? 'bg-blue-500 border-blue-600'
                                  : 'bg-white/80 border-gray-400 hover:border-blue-400'
                                } transition-colors`}
                            >
                              {selectedForDownload.has(image.url) && (
                                <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FlightDataView; 