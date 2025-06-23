import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, Marker, NavigationControl, MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getAssetById } from '../services/assetService';
import { format } from 'date-fns';

const assetTypeDetails = {
  buildings: {
    title: 'Building',
    icon: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
    color: '#3182ce',
    strokeColor: '#2c5282',
    description: 'Rooftop inspection and surveying services'
  },
  construction: {
    title: 'Construction Site',
    icon: 'M13.7 19C13.9 19.3 14 19.6 14 20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20C10 19.6 10.1 19.3 10.3 19H2V21H14V23H2C1.5 23 1 22.5 1 22V3C1 2.5 1.5 2 2 2H22C22.5 2 23 2.5 23 3V15C23 15.5 22.5 16 22 16H13.7ZM16 10.4L21 5.4V3H3V17H11.2C11.6 16.4 12.3 16 13 16C13.7 16 14.4 16.4 14.8 17H21V16C21 11.8 16.5 10.9 16 10.4ZM4 5H20V7H4V5ZM4 9H20V11H4V9ZM4 13H14V15H4V13Z',
    color: '#dd6b20',
    strokeColor: '#9c4221',
    description: 'Aerial mapping, orthophotos and progress monitoring services'
  },
  area: {
    title: 'Area/Estate',
    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z',
    color: '#38a169',
    strokeColor: '#276749',
    description: 'High-resolution orthomasaics and detailed 3D models of defined areas'
  },
  security: {
    title: 'Security & Surveillance',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    color: '#805ad5',
    strokeColor: '#553c9a',
    description: 'Security and surveillance services for buildings, sites and infrastructure'
  },
  agriculture: {
    title: 'Agriculture',
    icon: 'M19.5 12c0-1.1-.9-2-2-2H13V7h1.5c.28 0 .5-.22.5-.5V5c0-.28-.22-.5-.5-.5h-7c-.28 0-.5.22-.5.5v1.5c0 .28.22.5.5.5H8v3H4.5c-1.1 0-2 .9-2 2v5H1v2h22v-2h-1.5v-5zm-4 5.5h-2V17h2v.5zm-6-11H11V7H9.5v-.5zM13 17H9.5v-5H13v5zm5 .5h-2V17h2v.5z',
    color: '#4299e1',
    strokeColor: '#2b6cb0',
    description: 'Crop monitoring and agricultural management services'
  },
  infrastructure: {
    title: 'Infrastructure',
    icon: 'M17.66 5.84C17.43 5.31 16.95 5 16.4 5H7.6c-.55 0-1.03.31-1.26.84l-3.23 8.94C2.97 15.33 3.34 16 4 16h16c.67 0 1.03-.67.9-1.22l-3.24-8.94zM12 13.5 7 9h10l-5 4.5zM3 18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1H3v1z',
    color: '#e53e3e',
    strokeColor: '#c53030',
    description: 'Inspection and condition surveys for infrastructure'
  },
};

const safelyFormatCoordinate = (value: any): string => {
  try {
    if (typeof value === 'number') {
      return value.toFixed(6);
    } else if (typeof value === 'string') {
      return parseFloat(value).toFixed(6);
    } else {
      return 'N/A';
    }
  } catch (error) {
    return 'N/A';
  }
};

// Update booking status colors
const bookingStatusColors = {
  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  inProgress: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  scheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
};

const AssetDetails: React.FC = (): JSX.Element => {
  const { user } = useAuth();
  const location = useLocation();
  const { id: assetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 16
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAsset, setEditedAsset] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showInfoNotification, setShowInfoNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const handleCleanup = () => {
      setMapLoaded(false);
    };

    return handleCleanup;
  }, []);

  useEffect(() => {
    try {
      if (!mapboxgl.accessToken) {
        mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';
      }
    } catch (error) {
      setMapError('Failed to initialize map: invalid access token');
    }

    // Check if we're navigating to the booking page
    const navigatingToBooking = sessionStorage.getItem('navigating_to_booking');
    if (navigatingToBooking) {
      sessionStorage.removeItem('navigating_to_booking');
    }

    return () => {
      setMapLoaded(false);
    };
  }, []);

  // Add a separate effect for map initialization
  useEffect(() => {
    if (!mapLoaded && mapRef.current && asset?.Coordinates) {
      try {
        const map = mapRef.current.getMap() as mapboxgl.Map;
        if (map) {
          setMapLoaded(true);
          
          // Calculate and fit bounds
          const bounds = calculateAssetBounds(asset.Coordinates);
          if (bounds) {
            map.fitBounds(bounds as [[number, number], [number, number]], {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 18,
              duration: 1000,
              essential: true
            });
          }
        }
      } catch (error) {
      }
    }
  }, [mapRef.current, asset?.Coordinates, mapLoaded]);

  useEffect(() => {
    if (user) {
      setUserInfo({
        username: user.username || '',
        email: user.email || '',
        name: user.name || user.username || ''
      });
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (location.state && location.state.asset) {
        setAsset(location.state.asset);
        setLoading(false);
        
        if (location.state.asset.CenterPoint) {
          setViewState({
            longitude: parseFloat(location.state.asset.CenterPoint[0]),
            latitude: parseFloat(location.state.asset.CenterPoint[1]),
            zoom: 18
          });
        }
        return;
      }
      
      if (!assetId) {
        setError('Asset ID is missing');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await getAssetById(assetId);
        const assetData = response.asset;
        const bookingsData = response.bookings || [];
        
        if (assetData) {
          // Ensure all required fields have default values
          const processedAsset = {
            ...assetData,
            Name: assetData.Name || 'Unnamed Asset',
            Address: assetData.Address || 'Not specified',
            Postcode: assetData.Postcode || 'Not specified',
            AssetType: assetData.AssetType || 'buildings',
            Area: typeof assetData.Area === 'number' ? assetData.Area : 0,
            CreatedAt: assetData.CreatedAt || new Date().toISOString(),
            UpdatedAt: assetData.UpdatedAt || assetData.CreatedAt || new Date().toISOString(),
            Description: assetData.Description || '',
            Tags: Array.isArray(assetData.Tags) ? assetData.Tags : [],
            CenterPoint: assetData.CenterPoint || null,
            Coordinates: assetData.Coordinates || [],
            GeoJSON: assetData.GeoJSON || null
          };
          
          setAsset(processedAsset);
          setBookings(bookingsData);
          
          if (processedAsset.CenterPoint && Array.isArray(processedAsset.CenterPoint)) {
            setViewState({
              longitude: parseFloat(processedAsset.CenterPoint[0]),
              latitude: parseFloat(processedAsset.CenterPoint[1]),
              zoom: 18
            });
          } else if (processedAsset.Coordinates && processedAsset.Coordinates.length > 0) {
            try {
              const polygon = turf.polygon([processedAsset.Coordinates]);
              const center = turf.centroid(polygon);
              const centerPoint = center.geometry.coordinates;
              
              setViewState({
                longitude: centerPoint[0],
                latitude: centerPoint[1],
                zoom: 18
              });
            } catch (error) {
            }
          }
        } else {
          setError('Asset not found or invalid response format');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load asset details');
        
        if (err.message && err.message.includes('Authentication error')) {
          setTimeout(() => navigate('/login'), 3000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssetDetails();
  }, [assetId, location.state, navigate]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Unknown date';
    }
  };

  const getAssetTypeInfo = (type: string) => {
    return assetTypeDetails[type as keyof typeof assetTypeDetails] || {
      title: 'Unknown Type',
      icon: '',
      color: '#718096',
      strokeColor: '#4a5568',
      description: 'No description available'
    };
  };

  const handleBackToList = useCallback(() => {
    if (sessionStorage.getItem('navigating_to_assets')) {
      return;
    }
    
    sessionStorage.setItem('navigating_to_assets', 'true');
    setMapLoaded(false);
    
    sessionStorage.setItem('reloadAssetsPage', 'true');
    
    setTimeout(() => {
      navigate('/assets', {
        state: {
          fromAssetDetails: true,
          timestamp: Date.now()
        }
      });
      
      setTimeout(() => {
        sessionStorage.removeItem('navigating_to_assets');
      }, 1000);
    }, 100);
  }, [navigate]);

  const handleBookService = useCallback(() => {
    if (sessionStorage.getItem('navigating_to_booking')) {
      return;
    }
    
    sessionStorage.setItem('navigating_to_booking', 'true');
    setMapLoaded(false);
    
    sessionStorage.removeItem('makeBookings_loaded');
    
    // Prepare a clean asset object with only needed properties
    const essentialAssetData = asset ? {
      AssetId: asset.AssetId,
      name: asset.Name,
      type: asset.AssetType || 'buildings',
      area: asset.Area,
      address: asset.Address,
      postcode: asset.Postcode || asset.PostCode || asset.postcode || '',
      coordinates: asset.Coordinates || [],
      CenterPoint: asset.CenterPoint || null
    } : null;
    
    setTimeout(() => {
      navigate('/make-booking', { 
        state: { 
          selectedAsset: essentialAssetData,
          fromAssetDetails: true,
          timestamp: Date.now()
        } 
      });
      
      setTimeout(() => {
        sessionStorage.removeItem('navigating_to_booking');
      }, 1000);
    }, 100);
  }, [asset, navigate]);

  function calculateAssetBounds(coordinates: number[][][]): [[number, number], [number, number]] | null {
    try {
      const polygon = turf.polygon(coordinates);
      const bbox = turf.bbox(polygon);
      // Reduce padding to approximately 150 meters
      const padding = 0.0015;
      return [[bbox[0] - padding, bbox[1] - padding], [bbox[2] + padding, bbox[3] + padding]];
    } catch (error) {
      return null;
    }
  }

  // Add a function to format the booking date
  const formatBookingDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Modify the showTemporarySuccessNotification to be more generic
  const showTemporaryNotification = (message: string, isSuccess: boolean = true) => {
    setNotificationMessage(message);
    if (isSuccess) {
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 3000);
    } else {
      setShowInfoNotification(true);
      setTimeout(() => setShowInfoNotification(false), 3000);
    }
  };

  // Add these functions for editing and deleting assets
  const handleEditAsset = async () => {
    try {
      setError(null);
      
      // Get the token from localStorage
      const token = localStorage.getItem('idToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Check if there are any actual changes
      const hasChanged = (oldVal: any, newVal: any): boolean => {
        if (oldVal === newVal) return false;
        if (oldVal === null || newVal === null) return true;
        if (typeof oldVal !== typeof newVal) return true;
        if (typeof oldVal === 'object') {
          const oldKeys = Object.keys(oldVal);
          const newKeys = Object.keys(newVal);
          if (oldKeys.length !== newKeys.length) return true;
          return oldKeys.some(key => hasChanged(oldVal[key], newVal[key]));
        }
        return oldVal !== newVal;
      };

      // Compare each editable field
      const fieldsToCompare = ['name', 'description', 'type', 'address', 'postcode', 'coordinates', 'area', 'centerPoint', 'tags'];
      const hasChanges: boolean = fieldsToCompare.some(field => 
        hasChanged(asset[field], editedAsset[field])
      );

      if (!hasChanges) {
        showTemporaryNotification('No changes detected', false);
        setIsEditing(false);
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/assets/${asset.AssetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedAsset)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error updating asset: ${errorData.message || response.statusText}`);
      }

      const updatedAsset = await response.json();
      setAsset(updatedAsset.asset);
      setIsEditing(false);
      showTemporaryNotification('Asset updated successfully');
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error updating asset: ${err.message}`);
      } else {
        setError('An unknown error occurred while updating the asset');
      }
    }
  };

  const handleDeleteAsset = async () => {
    if (!asset || !window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('idToken');
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/assets/${asset.AssetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      // Navigate back to assets page after successful deletion
      handleBackToList();
    } catch (error: any) {
      // You might want to show an error message to the user here
    }
  };

  // Add this function to handle input changes
  const handleInputChange = (field: string, value: any) => {
    setEditedAsset((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Add this useEffect to properly initialize editedAsset when asset changes
  useEffect(() => {
    if (asset) {
      // Create a clean copy of the asset data
      const cleanAsset = {
        Name: asset.Name || '',
        Description: asset.Description || '',
        Address: asset.Address || '',
        Postcode: asset.Postcode || '',
        Area: typeof asset.Area === 'number' ? asset.Area : 0,
        AssetType: asset.AssetType || 'buildings',
        Tags: Array.isArray(asset.Tags) ? [...asset.Tags] : []
      };
      setEditedAsset(cleanAsset);
    }
  }, [asset]);

  // Function to handle booking navigation
  const handleBookingNavigation = () => {
    sessionStorage.setItem('navigating_to_booking', 'true');
    setMapLoaded(false);
    navigate(`/make-booking`, { state: { selectedAsset: asset } });
  };

  // Function to handle asset deletion
  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    setMapLoaded(false);
    try {
      // ... rest of delete logic ...
    } catch (error) {
      // ... error handling ...
    }
  };

  const handleNavigateToAssets = useCallback(() => {
    if (sessionStorage.getItem('navigating_to_assets')) {
      return;
    }
    
    sessionStorage.setItem('navigating_to_assets', 'true');
    setMapLoaded(false);
    
    sessionStorage.setItem('reloadAssetsPage', 'true');
    
    setTimeout(() => {
      navigate('/assets', {
        state: {
          fromAssetDetails: true,
          timestamp: Date.now()
        }
      });
      
      setTimeout(() => {
        sessionStorage.removeItem('navigating_to_assets');
      }, 1000);
    }, 100);
  }, [navigate]);

  useEffect(() => {
    if (asset?.Coordinates && mapRef.current && mapLoaded) {
      try {
        const bounds = calculateAssetBounds(asset.Coordinates);
        if (bounds) {
          const map = mapRef.current.getMap() as mapboxgl.Map;
          // Adjust padding and zoom parameters
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 18,
            duration: 1000
          });

          // Fine-tune the zoom level after initial fit
          setTimeout(() => {
            const currentZoom = map.getZoom();
            if (currentZoom > 17.5) {
              map.easeTo({
                zoom: 17.5,
                duration: 500
              });
            } else if (currentZoom < 16) {
              map.easeTo({
                zoom: 16,
                duration: 500
              });
            }
          }, 1100);
        }
      } catch (error) {
      }
    }
  }, [asset?.Coordinates, mapLoaded]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Success notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {notificationMessage}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setShowSuccessNotification(false)}
                    className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info notification */}
      {showInfoNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  {notificationMessage}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setShowInfoNotification(false)}
                    className="inline-flex rounded-md p-1.5 text-blue-500 hover:bg-blue-100 focus:outline-none"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <button
                  onClick={handleBackToList}
                  className="mr-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold">
                  {loading ? 'Loading Asset...' : asset?.Name || 'Asset Details'}
                </h1>
              </div>
              {!loading && asset?.AssetType && (
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mr-2">
                    {getAssetTypeInfo(asset.AssetType).title}
                  </span>
                  <p className="text-blue-100">
                    {asset.Address ? `${asset.Address} • ` : ''}
                    Created {asset.CreatedAt ? formatDate(asset.CreatedAt).split(',')[0] : 'Unknown date'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              {!loading && asset && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center px-4 py-2 bg-white/20 text-white border border-transparent rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isEditing ? 'Cancel Edit' : 'Edit Asset'}
                  </button>
                  {isEditing ? (
                    <button
                      onClick={handleEditAsset}
                      className="inline-flex items-center px-4 py-2 bg-green-500 text-white border border-transparent rounded-lg font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm transition duration-150"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                  ) : (
                    <button
                      onClick={handleDeleteAsset}
                      className="inline-flex items-center px-4 py-2 bg-red-500 text-white border border-transparent rounded-lg font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition duration-150"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Asset
                    </button>
                  )}
                  <button
                    onClick={handleBookService}
                    className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book a Flight
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { 
            label: 'Assets', 
            onClick: handleBackToList 
          },
          { 
            label: asset?.Name || 'Asset Details', 
            isCurrent: true 
          }
        ]} 
      />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading asset details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        ) : asset ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 md:order-2 order-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[500px]">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Asset Location</h2>
                  {asset?.Area && (
                    <span className="text-sm font-medium text-gray-500">
                      {parseFloat(asset.Area).toLocaleString()} m²
                    </span>
                  )}
                </div>
                <div className="h-[400px] relative">
                  <Map
                    {...viewState}
                    onMove={(evt: any) => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
                    onLoad={() => setMapLoaded(true)}
                    ref={mapRef}
                    reuseMaps={false}
                    attributionControl={true}
                  >
                    {mapLoaded && asset?.Coordinates && (
                      <Source
                        id="asset-polygon"
                        type="geojson"
                        data={{
                          type: 'Feature',
                          properties: {},
                          geometry: {
                            type: 'Polygon',
                            coordinates: asset.Coordinates,
                          },
                        }}
                      >
                        <Layer
                          id="asset-polygon-fill"
                          type="fill"
                          paint={{
                            'fill-color': getAssetTypeInfo(asset.AssetType).color,
                            'fill-opacity': 0.4,
                          }}
                        />
                        <Layer
                          id="asset-polygon-outline"
                          type="line"
                          paint={{
                            'line-color': getAssetTypeInfo(asset.AssetType).strokeColor,
                            'line-width': 2,
                          }}
                        />
                      </Source>
                    )}
                  </Map>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  className="inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                  onClick={handleBookService}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book a Flight
                </button>
                <button
                  className="inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this asset?')) {
                      navigate('/assets');
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Asset
                </button>
              </div>
            </div>

            <div className="md:col-span-5 md:order-1 order-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{
                    backgroundColor: getAssetTypeInfo(asset.AssetType).color,
                    color: 'white'
                  }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAssetTypeInfo(asset.AssetType).icon} />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-gray-900">Asset Information</h2>
                  </div>
                </div>

                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                        <input
                          type="text"
                          value={editedAsset.Name}
                          onChange={(e) => handleInputChange('Name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editedAsset.Description}
                          onChange={(e) => handleInputChange('Description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={editedAsset.Address}
                          onChange={(e) => handleInputChange('Address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                        <input
                          type="text"
                          value={editedAsset.Postcode}
                          onChange={(e) => handleInputChange('Postcode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                        <input
                          type="number"
                          value={editedAsset.Area}
                          onChange={(e) => handleInputChange('Area', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                        <select
                          value={editedAsset.AssetType}
                          onChange={(e) => handleInputChange('AssetType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="buildings">Building</option>
                          <option value="construction">Construction Site</option>
                          <option value="area">Area/Estate</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                        <input
                          type="text"
                          value={editedAsset.Tags.join(', ')}
                          onChange={(e) => handleInputChange('Tags', e.target.value.split(',').map((tag: string) => tag.trim()))}
                          placeholder="Enter tags separated by commas"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {asset.Description && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                          {asset.Description}
                        </div>
                      )}

                      <dl className="divide-y divide-gray-200">
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Asset Name</dt>
                          <dd className="text-sm text-gray-900 text-right">{asset.Name || 'Unnamed Asset'}</dd>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="text-sm text-gray-900 text-right">{asset.Address || "Not specified"}</dd>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Postcode</dt>
                          <dd className="text-sm text-gray-900 text-right">{asset.Postcode || "Not specified"}</dd>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Asset Type</dt>
                          <dd className="text-sm text-gray-900 text-right">{getAssetTypeInfo(asset.AssetType || 'buildings').title}</dd>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Area Size</dt>
                          <dd className="text-sm text-gray-900 text-right">{asset.Area ? parseFloat(asset.Area.toString()).toLocaleString() : '0'} m²</dd>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Created On</dt>
                          <dd className="text-sm text-gray-900 text-right">{formatDate(asset.CreatedAt)}</dd>
                        </div>
                        {asset.UpdatedAt && (
                          <div className="py-2.5 flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                            <dd className="text-sm text-gray-900 text-right">{formatDate(asset.UpdatedAt)}</dd>
                          </div>
                        )}
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status</dt>
                          <dd className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </dd>
                        </div>
                        {asset.Tags && asset.Tags.length > 0 && (
                          <div className="py-2.5">
                            <dt className="text-sm font-medium text-gray-500 mb-1.5">Tags</dt>
                            <dd className="flex flex-wrap gap-1">
                              {asset.Tags.map((tag: string, index: number) => (
                                <span 
                                  key={index} 
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </dd>
                          </div>
                        )}
                        <div className="py-2.5 flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Asset ID</dt>
                          <dd className="text-sm text-gray-900 font-mono truncate max-w-[180px] text-right">{asset.AssetId}</dd>
                        </div>
                      </dl>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-4 rounded-lg border-l-4" style={{
                  borderLeftColor: getAssetTypeInfo(asset.AssetType).color
                }}>
                  <h3 className="text-md font-medium text-gray-900 mb-1">{getAssetTypeInfo(asset.AssetType).title}</h3>
                  <p className="text-sm text-gray-600">{getAssetTypeInfo(asset.AssetType).description}</p>
                </div>
              </div>
            </div>

            {/* Add the bookings section */}
            <div className="md:col-span-12">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Flight History</h2>
                </div>
                
                <div className="overflow-x-auto">
                  {bookings.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking, index) => {
                          const statusColor = bookingStatusColors[(booking.status || 'pending').toLowerCase() as keyof typeof bookingStatusColors] || bookingStatusColors.pending;
                          
                          return (
                            <tr key={booking.BookingId || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={statusColor.icon} />
                                  </svg>
                                  {booking.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>{booking.scheduling?.date ? formatDate(booking.scheduling.date) : 'No date'}</div>
                                {booking.scheduling?.timeSlot && (
                                  <div className="text-gray-500 text-xs mt-1">
                                    {booking.scheduling.timeSlot.charAt(0).toUpperCase() + booking.scheduling.timeSlot.slice(1)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {booking.jobTypes?.map((jobType: string, idx: number) => (
                                  <div key={idx} className="mb-1">{jobType}</div>
                                ))}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {booking.siteContact ? (
                                  <div>
                                    <div className="font-medium">{booking.siteContact.name}</div>
                                    <div className="text-gray-500 text-xs mt-1">{booking.siteContact.phone}</div>
                                    <div className="text-gray-500 text-xs">{booking.siteContact.email}</div>
                                    {booking.siteContact.isAvailableOnsite && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                        Available on-site
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-500">No contact info</div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {Object.entries(booking.serviceOptions || {}).map(([service, options]: [string, any]) => {
                                  // Skip empty service options
                                  if (!options || ((!options.coverage || options.coverage.length === 0) && !options.detail)) {
                                    return null;
                                  }
                                  return (
                                    <div key={service} className="mb-3 last:mb-0">
                                      <div className="flex items-center">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                          {service}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 pl-2 border-l-2 border-gray-100">
                                        {options.coverage && options.coverage.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mb-1">
                                            {options.coverage.map((item: string, idx: number) => (
                                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-50 text-gray-600">
                                                {item}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {options.detail && (
                                          <div className="flex items-center text-xs text-gray-500">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                                              {options.detail} Detail
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {booking.quote && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center">
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                                        Quote
                                      </span>
                                      <span className="ml-2 text-sm font-medium text-gray-900">
                                        {booking.quote.currency} {booking.quote.amount}
                                      </span>
                                    </div>
                                    {booking.quote.notes && (
                                      <div className="mt-1 text-xs text-gray-500 pl-2 border-l-2 border-gray-100">
                                        {booking.quote.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="text-xs text-gray-500">
                                  <div>Booked by: {booking.userName || 'Unknown'}</div>
                                  <div>{booking.userEmail || ''}</div>
                                  {booking.userPhone && <div>{booking.userPhone}</div>}
                                  <div className="mt-1">Created: {booking.createdAt ? formatDate(booking.createdAt) : 'Unknown'}</div>
                                  {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                                    <div>Updated: {formatDate(booking.updatedAt)}</div>
                                  )}
                                  {booking.notes && (
                                    <div className="mt-2 font-medium text-gray-700">Notes: {booking.notes}</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No flights booked</h3>
                      <p className="mt-1 text-gray-500">No flight history available for this asset.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Asset Found</h3>
            <p className="mt-1 text-gray-500 mb-6">The requested asset could not be found or doesn't exist.</p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Assets
            </button>
          </div>
        )}
      </main>

      {bookingModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Book a Flight</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Services booking is not yet available in this demo version.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-8">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AssetDetails;
