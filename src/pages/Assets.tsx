import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getAssets } from '../services/assetService';
import { debugAuthState } from '../utils/tokenDebugger';

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
    zoom: 12
  });

  const [optimizedViewState, setOptimizedViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);

  // Add a function to handle viewing asset details
  const handleViewAssetDetails = (assetId: string) => {
    navigate(`/assets/${assetId}`);
  };

  // Define fetchAssetData function
  const fetchAssetData = async () => {
    let companyId = user?.companyId;

    // Log the user object for debugging
    console.log('🔍 User object:', user);

    // Fallback to localStorage if companyId is not available in the user object
    if (!companyId) {
      console.log('⚠️ CompanyId not found in user object. Checking localStorage...');
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          console.log('🔄 Retrieved user data from localStorage:', savedUser);
          companyId = savedUser.companyId;
        } catch (e) {
          console.error('❌ Error parsing user data from localStorage:', e);
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
      console.log(`🔄 Fetching assets for company ID: ${companyId}`);
      // Explicitly pass the companyId string to getAssets
      const assetsData = await getAssets(companyId.toString());
      
      if (assetsData.length === 0) {
        console.warn('⚠️ No assets found in the API response');
      }
      
      console.log('Fetched assets:', assetsData);
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
      console.error('Error fetching assets:', err);

      // Disable automatic redirects on auth errors - let user manually retry
      if (err.message && (
          err.message.includes('401') || 
          err.message.includes('Unauthorized') ||
          err.message.includes('Authentication')
        )) {
        setError('Authentication error: Please refresh the page or log in again.');
        // Comment out the automatic redirect to prevent unwanted navigation
        // setTimeout(() => {
        //   navigate('/login');
        // }, 3000);
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
          console.error('Error parsing saved user data', e);
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

  const calculateOptimalMapView = (assetList: Asset[]) => {
    const assetsWithCoords = assetList.filter(
      asset => asset.CenterPoint || asset.Coordinates
    );
    
    if (assetsWithCoords.length === 0) return null;
    
    const allPoints: [number, number][] = [];
    
    assetsWithCoords.forEach(asset => {
      if (asset.CenterPoint) {
        allPoints.push([asset.CenterPoint[0], asset.CenterPoint[1]]);
      }
      
      if (asset.Coordinates && asset.Coordinates.length > 0) {
        asset.Coordinates[0].forEach(coord => {
          allPoints.push([coord[0], coord[1]]);
        });
      }
    });
    
    if (allPoints.length === 0) return null;
    
    const bounds = allPoints.reduce<[[number, number], [number, number]]>(
      (acc, point) => {
        return [
          [Math.min(acc[0][0], point[0]), Math.min(acc[0][1], point[1])],
          [Math.max(acc[1][0], point[0]), Math.max(acc[1][1], point[1])]
        ];
      },
      [
        [Number.MAX_VALUE, Number.MAX_VALUE],
        [Number.MIN_VALUE, Number.MIN_VALUE]
      ]
    );
    
    const centerLongitude = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLatitude = (bounds[0][1] + bounds[1][1]) / 2;
    
    const latDiff = Math.abs(bounds[1][1] - bounds[0][1]);
    const lngDiff = Math.abs(bounds[1][0] - bounds[0][0]);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 14;
    if (maxDiff > 0) {
      zoom = Math.min(15, Math.max(5, 14 - Math.log2(maxDiff * 111) * 1.5));
    }
    
    if (assetsWithCoords.length === 1) {
      zoom = 15;
    }
    
    console.log('📍 Calculated optimal bounds:', bounds);
    console.log('📍 Calculated center:', [centerLongitude, centerLatitude]);
    console.log('📍 Calculated zoom level:', zoom);
    
    return {
      longitude: centerLongitude,
      latitude: centerLatitude,
      zoom,
      bounds
    };
  };

  useEffect(() => {
    if (assets.length > 0) {
      const optimalView = calculateOptimalMapView(assets);
      if (optimalView) {
        setOptimizedViewState(optimalView);
        
        if (viewState.zoom === 12) {
          setViewState({
            longitude: optimalView.longitude,
            latitude: optimalView.latitude,
            zoom: optimalView.zoom
          });
        }
      }
    }
  }, [assets]);

  const handleAddNewAsset = () => {
    navigate('/new-asset');
  };

  const handleViewAllAssets = () => {
    if (optimizedViewState) {
      setViewState({
        longitude: optimizedViewState.longitude,
        latitude: optimizedViewState.latitude,
        zoom: optimizedViewState.zoom
      });
      setSelectedAsset(null);
    }
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">My Assets</h1>
              <p className="text-blue-100">Manage and monitor all your property assets in one place</p>
            </div>
            <button
              onClick={handleAddNewAsset}
              className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Asset
            </button>
          </div>
        </div>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Assets', isCurrent: true }
        ]} 
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
          </div>
          {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center">
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
          </div> */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center">
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
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-450px)] min-h-[500px]">
          <div className="lg:w-2/5 bg-white rounded-xl border border-gray-200 shadow overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Assets List
              </h2>
              <div className="text-sm text-gray-500">
                {assets.length} {assets.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              {loading ? (
                <div className="p-10 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                    <button 
                      onClick={() => navigate('/login')}
                      className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    >
                      Go to Login
                    </button>
                  </div>
                </div>
              ) : assets.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mb-5">
                    <svg className="w-20 h-20 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No assets found</h3>
                  <p className="text-gray-500 mb-6">Get started by adding your first property asset</p>
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
                <ul className="divide-y divide-gray-100">
                  {assets.map(asset => (
                    <li 
                      key={asset.AssetId}
                      className={`hover:bg-gray-50 cursor-pointer transition-all duration-200 ${selectedAsset?.AssetId === asset.AssetId ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                      onClick={() => {
                        setSelectedAsset(asset);
                        if (asset.CenterPoint) {
                          setViewState({
                            longitude: asset.CenterPoint[0],
                            latitude: asset.CenterPoint[1],
                            zoom: 16
                          });
                        }
                      }}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center mt-1`} style={{ backgroundColor: `${getAssetColor(asset.AssetType)}20`}}>
                            <svg className="w-6 h-6" fill="none" stroke={getAssetColor(asset.AssetType)} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between">
                              <h3 className="text-base font-semibold text-gray-900">{asset.Name}</h3>
                              {selectedAsset?.AssetId === asset.AssetId && (
                                <span className="flex-shrink-0 text-blue-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                  </svg>
                                  {asset.Area.toLocaleString()} m²
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(asset.CreatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent onClick
                                  handleViewAssetDetails(asset.AssetId);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:w-3/5 bg-white rounded-xl border border-gray-200 shadow overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Asset Map
              </h2>
              {selectedAsset && (
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset View
                </button>
              )}
            </div>
            
            <div className="h-full w-full relative flex-grow">
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
                mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                onLoad={() => {
                  console.log('Map loaded successfully!');
                  setMapLoaded(true);
                }}
                attributionControl={true}
                reuseMaps
              >
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                      className="p-2 hover:bg-gray-100"
                      onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom + 1 }))}
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <button 
                      className="p-2 hover:bg-gray-100"
                      onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom - 1 }))}
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {mapLoaded && assets.map(asset => (
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
                            'fill-opacity': selectedAsset?.AssetId === asset.AssetId ? 0.7 : 0.4,
                            'fill-outline-color': getAssetColor(asset.AssetType)
                          }}
                        />
                        <Layer
                          id={`asset-outline-${asset.AssetId}`}
                          type="line"
                          paint={{
                            'line-color': selectedAsset?.AssetId === asset.AssetId ? '#ffffff' : getAssetColor(asset.AssetType),
                            'line-width': selectedAsset?.AssetId === asset.AssetId ? 3 : 2,
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
                        <div className="relative">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 ${selectedAsset?.AssetId === asset.AssetId ? 'border-white animate-pulse' : 'border-white'}`} style={{ backgroundColor: getAssetColor(asset.AssetType) }}>
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          {selectedAsset?.AssetId === asset.AssetId && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-9 h-9 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
                          )}
                        </div>
                      </Marker>
                    )}
                  </React.Fragment>
                ))}
                
                {selectedAsset && selectedAsset.CenterPoint && (
                  <Popup
                    longitude={selectedAsset.CenterPoint[0]}
                    latitude={selectedAsset.CenterPoint[1]}
                    anchor="bottom"
                    closeButton={true}
                    closeOnClick={false}
                    onClose={() => setSelectedAsset(null)}
                    className="asset-popup max-w-sm"
                  >
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900">{selectedAsset.Name}</h3>
                      <div className="mt-2 flex items-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full`} style={{ backgroundColor: `${getAssetColor(selectedAsset.AssetType)}20`, color: getAssetColor(selectedAsset.AssetType) }}>
                          {selectedAsset.AssetType}
                        </span>
                      </div>
                      {selectedAsset.Address && (
                        <p className="text-xs text-gray-500 mt-2">{selectedAsset.Address}</p>
                      )}
                      {selectedAsset.Area && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Area:</span> {selectedAsset.Area.toLocaleString()} m²
                        </div>
                      )}
                      <button 
                        className="mt-3 w-full bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium py-1.5 px-3 rounded transition-colors"
                        onClick={() => handleViewAssetDetails(selectedAsset.AssetId)}
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                )}
              </Map>
              
              {/* {!mapLoaded && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
        
        {assets.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Types</h3>
            <div className="flex flex-wrap gap-4">
              {Array.from(new Set(assets.map(a => a.AssetType))).map((type) => (
                <div key={type} className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: getAssetColor(type) }}></div>
                  <span className="text-sm text-gray-700">{type}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({assets.filter(a => a.AssetType === type).length})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Assets;