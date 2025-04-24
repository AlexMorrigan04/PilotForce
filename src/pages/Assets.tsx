import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getAssets } from '../services/assetService';
import { debugAuthState } from '../utils/tokenDebugger';
import { motion, AnimatePresence } from 'framer-motion';

// Set Mapbox token directly (replace with your actual token in production)
const MAPBOX_TOKEN = "pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q";

// Define asset type
interface Asset {
  AssetId: string;
  Name: string;
  Description?: string;
  AssetType: string;
  Address?: string;
  Coordinates?: number[][][];
  CenterPoint?: number[];
  Area?: number;
  CompanyId: string;
  UserId: string;
  CreatedAt: string;
  Tags?: string[];
  GeoJSON?: any;
  Postcode?: string;
  PostCode?: string;
}

const Assets: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const navigate = useNavigate();
  
  // Assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Set initial view state
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12,
    mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12',
    pitch: 0
  });

  const [optimizedViewState, setOptimizedViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);

  // Filter state
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add a function to handle viewing asset details
  const handleViewAssetDetails = (assetId: string) => {
    navigate(`/assets/${assetId}`);
  };

  // Enhanced navigation function for booking a flight
  const handleBookFlight = useCallback((asset: Asset, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the parent onClick
    
    if (sessionStorage.getItem('navigating_to_booking')) {
      return;
    }
    
    sessionStorage.setItem('navigating_to_booking', 'true');
    
    try {
      // Safely clean up the map to prevent errors
      if (mapRef.current) {
        try {
          setMapLoaded(false);
          
          setTimeout(() => {
            try {
              if (mapRef.current) {
                const map = mapRef.current;
                if (map) {
                  try {
                    const style = map.getStyle();
                    if (style && style.layers) {
                      style.layers.forEach((layer: { id: string }) => {
                        if (map.getLayer(layer.id)) {
                          map.removeLayer(layer.id);
                        }
                      });
                    }
                    if (style && style.sources) {
                      Object.keys(style.sources).forEach(source => {
                        if (map.getSource(source)) {
                          map.removeSource(source);
                        }
                      });
                    }
                  } catch (styleError) {
                    console.warn('Error accessing map style:', styleError);
                  }
                }
                mapRef.current = null;
              }
            } catch (cleanupError) {
              console.warn('Non-critical map cleanup error:', cleanupError);
            }
          }, 10);
        } catch (e) {
          console.warn('Error during map cleanup:', e);
        }
      }
    } catch (e) {
      console.warn('Error during map cleanup:', e);
    }
    
    sessionStorage.removeItem('makeBookings_loaded');
    
    // Prepare a clean asset object with only needed properties
    const essentialAssetData = {
      AssetId: asset.AssetId,
      name: asset.Name,
      type: asset.AssetType || 'buildings',
      area: asset.Area,
      address: asset.Address,
      postcode: asset.Postcode || asset.PostCode || '',
      coordinates: asset.Coordinates || [],
      CenterPoint: asset.CenterPoint || null
    };
    
    setTimeout(() => {
      navigate('/make-booking', { 
        state: { 
          selectedAsset: essentialAssetData,
          fromAssetsList: true,
          timestamp: Date.now()
        } 
      });
      
      setTimeout(() => {
        sessionStorage.removeItem('navigating_to_booking');
      }, 1000);
    }, 100);
  }, [navigate]);

  // Define fetchAssetData function
  const fetchAssetData = async () => {
    let companyId = user?.companyId;

    // Log the user object for debugging

    // Fallback to localStorage if companyId is not available in the user object
    if (!companyId) {
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          companyId = savedUser.companyId;
        } catch (e) {
        }
      } else {
        console.warn('⚠️ No user data found in localStorage.');
      }
    }

    if (!companyId) {
      console.warn('⚠️ No CompanyId found. Cannot fetch assets.');
      setError('Missing company ID. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Explicitly pass the companyId string to getAssets
      const assetsData = await getAssets(companyId.toString());
      
      if (assetsData.length === 0) {
        console.warn('⚠️ No assets found in the API response');
      }
      
      setAssets(assetsData);

      // If assets found, center the map on the first asset's center point
      if (assetsData.length > 0 && assetsData[0].CenterPoint) {
        const [longitude, latitude] = assetsData[0].CenterPoint;
        setViewState(prev => ({
          ...prev,
          longitude,
          latitude,
          zoom: 15
        }));
      }
    } catch (err: any) {

      // Disable automatic redirects on auth errors - let user manually retry
      if (err.message && (
          err.message.includes('401') || 
          err.message.includes('Unauthorized') ||
          err.message.includes('Authentication')
        )) {
        setError('Authentication error: Please refresh the page or log in again.');
      } else {
        setError(err.message || 'Failed to load assets');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get user info and fetch assets
  useEffect(() => {
    // Add this debug call
    debugAuthState();
    
    if (user) {
      setUserInfo({ 
        name: user.username || 'Demo User',
        companyId: user.companyId
      });
    } else {
      // Try to get from localStorage
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          setUserInfo({
            name: savedUser.username || savedUser.name || 'Demo User',
            companyId: savedUser.companyId
          });
        } catch (e) {
          setUserInfo({ name: 'Demo User' });
        }
      } else {
        setUserInfo({ name: 'Demo User' });
      }
    }
  }, [user]);

  // Fetch assets when userInfo is set
  useEffect(() => {
    // Only fetch assets if user or userInfo is available AND has a companyId
    if ((user && user.companyId) || (userInfo && userInfo.companyId)) {
      fetchAssetData();
    }
  }, [user, userInfo, navigate]);

  const calculateOptimalMapView = useCallback((assetList: Asset[]) => {
    const assetsWithCoords = assetList.filter(
      asset => asset.CenterPoint || (asset.Coordinates && asset.Coordinates.length > 0)
    );
    
    if (assetsWithCoords.length === 0) return null;
    
    // Collect all coordinate points from assets
    const allPoints: [number, number][] = [];
    
    assetsWithCoords.forEach(asset => {
      if (asset.CenterPoint && Array.isArray(asset.CenterPoint) && asset.CenterPoint.length >= 2) {
        // Make sure coordinates are valid numbers
        const lng = parseFloat(asset.CenterPoint[0].toString());
        const lat = parseFloat(asset.CenterPoint[1].toString());
        
        if (!isNaN(lng) && !isNaN(lat) && 
            lng >= -180 && lng <= 180 && 
            lat >= -90 && lat <= 90) {
          allPoints.push([lng, lat]);
        }
      }
      
      if (asset.Coordinates && Array.isArray(asset.Coordinates) && 
          asset.Coordinates.length > 0 && Array.isArray(asset.Coordinates[0])) {
        asset.Coordinates[0].forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            const lng = parseFloat(coord[0].toString());
            const lat = parseFloat(coord[1].toString());
            
            if (!isNaN(lng) && !isNaN(lat) && 
                lng >= -180 && lng <= 180 && 
                lat >= -90 && lat <= 90) {
              allPoints.push([lng, lat]);
            }
          }
        });
      }
    });
    
    if (allPoints.length === 0) {
      console.warn('No valid coordinates found in assets');
      return null;
    }
    
    // Calculate bounds using more robust approach
    let minLng = 180;
    let maxLng = -180;
    let minLat = 90;
    let maxLat = -90;
    
    allPoints.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    
    // Add padding to bounds (about 10% on each side)
    const lngPadding = (maxLng - minLng) * 0.1;
    const latPadding = (maxLat - minLat) * 0.1;
    
    const paddedBounds: [[number, number], [number, number]] = [
      [minLng - lngPadding, minLat - latPadding],
      [maxLng + lngPadding, maxLat + latPadding]
    ];
    
    const centerLongitude = (minLng + maxLng) / 2;
    const centerLatitude = (minLat + maxLat) / 2;
    
    // Use explicit bounds rather than trying to calculate zoom mathematically
    // The actual zoom will be determined by fitBounds in the UI
    const defaultZoom = 12; // Will be overridden by fitBounds
    
    
    return {
      longitude: centerLongitude,
      latitude: centerLatitude,
      zoom: defaultZoom,
      bounds: paddedBounds
    };
  }, []);

  useEffect(() => {
    if (assets.length > 0) {
      const optimalView = calculateOptimalMapView(assets);
      if (optimalView) {
        setOptimizedViewState(optimalView);
        
        // Only set initial view on first load
        if (viewState.zoom === 12) {
          // Allow map to fully initialize before setting bounds
          setTimeout(() => {
            if (mapRef.current && optimalView.bounds) {
              try {
                // Use fitBounds for a more accurate fit
                mapRef.current.fitBounds(optimalView.bounds, {
                  padding: 100, // Padding around bounds in pixels
                  maxZoom: 16, // Don't zoom in too far if only one asset
                  duration: 1000 // Smooth animation
                });
              } catch (e) {
                console.warn('Error fitting bounds on initial load:', e);
                // Fallback to just setting the center point and zoom
                setViewState({
                  ...viewState,
                  longitude: optimalView.longitude,
                  latitude: optimalView.latitude,
                  zoom: 14
                });
              }
            } else {
              setViewState({
                ...viewState,
                longitude: optimalView.longitude,
                latitude: optimalView.latitude,
                zoom: 14
              });
            }
          }, 500);
        }
      }
    }
  }, [assets, calculateOptimalMapView]);

  const handleAddNewAsset = () => {
    navigate('/new-asset');
  };

  const handleViewAllAssets = useCallback(() => {
    if (!optimizedViewState) return;
    
    if (optimizedViewState.bounds && mapRef.current) {
      try {
        
        // Use fitBounds instead of just setting center and zoom
        mapRef.current.fitBounds(optimizedViewState.bounds, {
          padding: 100, // Padding around bounds in pixels
          maxZoom: 16, // Don't zoom in too far if only one asset
          duration: 1000 // Smooth animation
        });
        
        setSelectedAsset(null);
      } catch (e) {
        console.warn('Error in fitBounds:', e);
        
        // Fallback to direct viewState setting if fitBounds fails
        setViewState({
          ...viewState,
          longitude: optimizedViewState.longitude,
          latitude: optimizedViewState.latitude,
          zoom: optimizedViewState.zoom || 13
        });
      }
    } else {
      // Fallback if bounds not available or mapRef not ready
      setViewState({
        ...viewState,
        longitude: optimizedViewState.longitude,
        latitude: optimizedViewState.latitude,
        zoom: optimizedViewState.zoom || 13
      });
    }
  }, [optimizedViewState, viewState]);

  const getAssetColor = (assetType: string) => {
    switch(assetType.toLowerCase()) {
      case 'buildings':
        return '#3182ce';
      case 'construction':
        return '#dd6b20';
      case 'area':
        return '#38a169';
      case 'security':
        return '#805ad5';
      case 'infrastructure':
        return '#e53e3e';
      default:
        return '#3182ce';
    }
  };
  
  // Filter assets based on type and search query
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Filter by asset type
      const typeMatch = assetTypeFilter === 'all' || asset.AssetType === assetTypeFilter;
      
      // Filter by search query
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = asset.Name.toLowerCase().includes(searchLower);
      const addressMatch = asset.Address ? asset.Address.toLowerCase().includes(searchLower) : false;
      const descriptionMatch = asset.Description ? asset.Description.toLowerCase().includes(searchLower) : false;
      
      return typeMatch && (nameMatch || addressMatch || descriptionMatch || searchLower === '');
    });
  }, [assets, assetTypeFilter, searchQuery]);

  // Get unique asset types for filter
  const assetTypes = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.AssetType)));
  }, [assets]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">My Assets</h1>
              <p className="text-blue-100">Manage and monitor all your property assets in one place</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddNewAsset}
              className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Asset
            </motion.button>
          </div>
        </div>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Assets', isCurrent: true }
        ]} 
      />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <motion.div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center"
            whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.05)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
          </motion.div>
          
          {/* <motion.div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center"
            whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.05)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Area</p>
              <p className="text-2xl font-bold text-gray-900">
                {assets.reduce((total, asset) => total + (asset.Area || 0), 0).toLocaleString()} m²
              </p>
            </div>
          </motion.div> */}
          
          <motion.div 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center"
            whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.05)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Asset Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(assets.map(a => a.AssetType)).size}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search assets by name, address or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="assetTypeFilter" className="text-sm font-medium text-gray-700">
                Filter by type:
              </label>
              <select
                id="assetTypeFilter"
                className="block w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {assetTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => {
                setAssetTypeFilter('all');
                setSearchQuery('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-500px)] min-h-[500px]">
          <motion.div 
            className="lg:w-2/5 bg-white rounded-xl border border-gray-200 shadow overflow-hidden flex flex-col"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Assets List
              </h2>
              <div className="text-sm text-gray-500">
                {filteredAssets.length} {filteredAssets.length === 1 ? 'item' : 'items'}
                {filteredAssets.length !== assets.length && (
                  <span className="ml-1 text-blue-600">(filtered)</span>
                )}
              </div>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              {loading ? (
                <div className="p-10 text-center">
                  <motion.div 
                    className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="text-gray-600">Loading assets...</p>
                </div>
              ) : error ? (
                <div className="p-10 text-center">
                  <div className="text-red-500 mb-3">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <p className="text-gray-500 mt-2 mb-4">There was a problem loading your assets.</p>
                  <div className="flex justify-center space-x-4">
                    <button 
                      onClick={() => {
                        debugAuthState(); // Log debug info
                        window.location.reload();
                      }}
                      className="px-5 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                    >
                      Reload Page
                    </button>
                    <button 
                      onClick={() => {
                        debugAuthState(); // Log debug info
                        // Try to fetch assets again without page reload
                        if ((user && user.companyId) || (userInfo && userInfo.companyId)) {
                          setLoading(true);
                          setError(null);
                          fetchAssetData();
                        }
                      }}
                      className="px-5 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mb-5">
                    <svg className="w-20 h-20 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No assets found</h3>
                  {searchQuery || assetTypeFilter !== 'all' ? (
                    <p className="text-gray-500 mb-6">No assets match your current filters</p>
                  ) : (
                    <p className="text-gray-500 mb-6">Get started by adding your first property asset</p>
                  )}
                  <button
                    onClick={handleAddNewAsset}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Asset
                    </span>
                  </button>
                </div>
              ) : (
                <motion.ul 
                  className="divide-y divide-gray-100"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredAssets.map(asset => (
                    <motion.li 
                      key={asset.AssetId}
                      className={`hover:bg-gray-50 cursor-pointer transition-all duration-200 ${selectedAsset?.AssetId === asset.AssetId ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                      onClick={() => {
                        setSelectedAsset(asset);
                        if (asset.CenterPoint) {
                          setViewState({
                            ...viewState,
                            longitude: asset.CenterPoint[0],
                            latitude: asset.CenterPoint[1],
                            zoom: 16
                          });
                        }
                      }}
                      variants={itemVariants}
                      whileHover={{ 
                        backgroundColor: "rgba(243, 244, 246, 1)",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                      }}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center mt-1`} style={{ backgroundColor: `${getAssetColor(asset.AssetType)}15`}}>
                            <svg className="w-6 h-6" fill="none" stroke={getAssetColor(asset.AssetType)} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex justify-between">
                              <h3 className="text-base font-medium text-gray-900 truncate">{asset.Name}</h3>
                              {selectedAsset?.AssetId === asset.AssetId && (
                                <span className="flex-shrink-0 text-blue-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate max-w-[200px]">{asset.Address || 'No address'}</span>
                            </div>
                            <div className="mt-2 flex items-center flex-wrap gap-1.5">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full`} style={{ backgroundColor: `${getAssetColor(asset.AssetType)}20`, color: getAssetColor(asset.AssetType) }}>
                                {asset.AssetType}
                              </span>
                              {asset.Area && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full flex items-center">
                                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                  </svg>
                                  {asset.Area.toLocaleString()} m²
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center space-x-3">
                              <motion.button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent onClick
                                  handleViewAssetDetails(asset.AssetId);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </motion.button>
                              <motion.button
                                onClick={(e) => handleBookFlight(asset, e)}
                                className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Book Flight
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </motion.div>

          <motion.div 
            className="lg:w-3/5 bg-white rounded-xl border border-gray-200 shadow overflow-hidden flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Asset Map
              </h2>
              <div className="flex space-x-2">
                {selectedAsset && (
                  <button 
                    onClick={() => setSelectedAsset(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Selection
                  </button>
                )}
                <button 
                  onClick={handleViewAllAssets}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                  Fit All
                </button>
              </div>
            </div>
            
            <div className="h-full w-full relative flex-grow">
              <Map
                ref={(ref) => { mapRef.current = ref?.getMap() as mapboxgl.Map | null; }}
                mapboxAccessToken={MAPBOX_TOKEN}
                {...viewState}
                onMove={(evt) => setViewState(prev => ({ ...prev, ...evt.viewState }))}
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
                mapStyle={viewState.mapStyle}
                onLoad={(evt) => {
                  mapRef.current = evt.target;
                  setMapLoaded(true);
                  
                  // When map loads, if we have optimized bounds, fit to them
                  if (optimizedViewState && optimizedViewState.bounds) {
                    setTimeout(() => {
                      handleViewAllAssets();
                    }, 300);
                  }
                }}
                attributionControl={true}
                reuseMaps
                fog={{
                  "horizon-blend": 0.1,
                  "color": "white",
                  "high-color": "#add8e6",
                  "space-color": "#d8f2ff",
                  "star-intensity": 0.0
                }}
              >
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                      className="p-2 hover:bg-gray-100 transition-colors"
                      onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom + 1 }))}
                      aria-label="Zoom in"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <div className="border-t border-gray-200"></div>
                    <button 
                      className="p-2 hover:bg-gray-100 transition-colors"
                      onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom - 1 }))}
                      aria-label="Zoom out"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                      className="p-2 hover:bg-gray-100 transition-colors"
                      onClick={handleViewAllAssets}
                      aria-label="View all assets"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                      className={`p-2 hover:bg-gray-100 transition-colors ${viewState.pitch > 0 ? 'bg-blue-50' : ''}`}
                      onClick={() => setViewState({...viewState, pitch: (viewState.pitch || 0) === 0 ? 45 : 0})}
                      aria-label="Toggle 3D view"
                    >
                      <svg className={`w-5 h-5 ${viewState.pitch > 0 ? 'text-blue-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="absolute bottom-8 right-4">
                  <div className="bg-white rounded-lg shadow-md p-2">
                    <div className="flex space-x-1">
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded ${viewState.mapStyle === 'mapbox://styles/mapbox/light-v11' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setViewState({...viewState, mapStyle: 'mapbox://styles/mapbox/light-v11'})}
                      >
                        Map
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded ${viewState.mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setViewState({...viewState, mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12'})}
                      >
                        Satellite
                      </button>
                    </div>
                  </div>
                </div>
                
                {filteredAssets.map(asset => (
                  <React.Fragment key={asset.AssetId}>
                    {asset.Coordinates && (
                      <Source
                        id={`asset-source-${asset.AssetId}`}
                        type="geojson"
                        data={{
                          type: 'Feature',
                          properties: {
                            assetName: asset.Name,
                            assetType: asset.AssetType
                          },
                          geometry: {
                            type: 'Polygon',
                            coordinates: asset.Coordinates
                          }
                        }}
                      >
                        <Layer
                          id={`asset-fill-${asset.AssetId}`}
                          type="fill"
                          paint={{
                            'fill-color': getAssetColor(asset.AssetType),
                            'fill-opacity': selectedAsset?.AssetId === asset.AssetId ? 0.5 : 0.3,
                          }}
                        />
                        <Layer
                          id={`asset-outline-${asset.AssetId}`}
                          type="line"
                          paint={{
                            'line-color': selectedAsset?.AssetId === asset.AssetId ? '#ffffff' : getAssetColor(asset.AssetType),
                            'line-width': selectedAsset?.AssetId === asset.AssetId ? 3 : 1.5,
                            'line-opacity': 0.9
                          }}
                        />
                      </Source>
                    )}
                    
                    {asset.CenterPoint && (
                      <Marker
                        longitude={asset.CenterPoint[0]}
                        latitude={asset.CenterPoint[1]}
                        anchor="bottom"
                        onClick={(e: { originalEvent: MouseEvent }) => {
                          e.originalEvent.stopPropagation();
                          setSelectedAsset(asset);
                        }}
                      >
                        <motion.div 
                          className="relative"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 ${selectedAsset?.AssetId === asset.AssetId ? 'border-white animate-pulse' : 'border-white'}`} style={{ backgroundColor: getAssetColor(asset.AssetType) }}>
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          {selectedAsset?.AssetId === asset.AssetId && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 0.3, scale: 1.2 }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-9 h-9 bg-blue-500 rounded-full"
                            />
                          )}
                        </motion.div>
                      </Marker>
                    )}
                  </React.Fragment>
                ))}
                
                <AnimatePresence>
                  {selectedAsset && selectedAsset.CenterPoint && (
                    <Popup
                      longitude={selectedAsset.CenterPoint[0]}
                      latitude={selectedAsset.CenterPoint[1]}
                      anchor="bottom"
                      closeButton={true}
                      closeOnClick={false}
                      onClose={() => setSelectedAsset(null)}
                      className="asset-popup z-10"
                      maxWidth="300px"
                    >
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${getAssetColor(selectedAsset.AssetType)}20`}}>
                              <svg className="w-6 h-6" fill="none" stroke={getAssetColor(selectedAsset.AssetType)} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 flex-grow ml-3">{selectedAsset.Name}</h3>
                          </div>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center mb-2">
                            <div className="w-6 flex-shrink-0">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <div className="ml-2">
                              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full`} style={{ backgroundColor: `${getAssetColor(selectedAsset.AssetType)}20`, color: getAssetColor(selectedAsset.AssetType) }}>
                                {selectedAsset.AssetType}
                              </span>
                            </div>
                          </div>
                          
                          {selectedAsset.Address && (
                            <div className="flex items-start mb-2">
                              <div className="w-6 flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <p className="ml-2 text-sm text-gray-600">{selectedAsset.Address}</p>
                            </div>
                          )}
                          
                          {selectedAsset.Area && (
                            <div className="flex items-center mb-2">
                              <div className="w-6 flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                </svg>
                              </div>
                              <p className="ml-2 text-sm text-gray-600">
                                <span className="font-medium">Area:</span> {selectedAsset.Area.toLocaleString()} m²
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <motion.button 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-3 rounded-md text-sm transition-colors"
                            onClick={() => handleViewAssetDetails(selectedAsset.AssetId)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Details
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-3 rounded-md text-sm transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookFlight(selectedAsset, e);
                            }}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Book Flight
                          </motion.button>
                        </div>
                      </motion.div>
                    </Popup>
                  )}
                </AnimatePresence>
              </Map>
              
              {!mapLoaded && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                  <div className="text-center">
                    <motion.div 
                      className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        
        {assets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Types</h3>
            <div className="flex flex-wrap gap-4">
              {Array.from(new Set(assets.map(a => a.AssetType))).map((type) => (
                <div 
                  key={type} 
                  className="flex items-center px-4 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: `${getAssetColor(type)}10`,
                    borderColor: `${getAssetColor(type)}30`
                  }}
                >
                  <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: getAssetColor(type) }}></div>
                  <span className="font-medium" style={{ color: getAssetColor(type) }}>{type}</span>
                  <span className="ml-2 text-xs text-gray-500 bg-white bg-opacity-50 px-2 rounded-full">
                    {assets.filter(a => a.AssetType === type).length}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-2 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Terms</a>
            <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Assets;