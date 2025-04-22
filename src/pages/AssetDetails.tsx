import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getAssetById } from '../services/assetService';

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
    console.warn('Error formatting coordinate value:', value, error);
    return 'N/A';
  }
};

const AssetDetails: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: assetId } = useParams<{ id: string }>();
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    try {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q';
    } catch (error) {
      console.error('Error setting Mapbox token:', error);
      setMapError('Failed to initialize map: invalid access token');
    }
  }, []);

  useEffect(() => {
    if (user) {
      setUserInfo({ 
        name: user.username || 'Demo User',
        companyId: user.companyId
      });
    } else {
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

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (location.state && location.state.asset) {
        console.log('Using asset from location state:', location.state.asset);
        setAsset(location.state.asset);
        setLoading(false);
        
        if (location.state.asset.CenterPoint) {
          setViewState({
            longitude: location.state.asset.CenterPoint[0],
            latitude: location.state.asset.CenterPoint[1],
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
        const assetData = await getAssetById(assetId);
        
        console.log('Asset details response:', assetData);
        
        if (assetData) {
          setAsset(assetData);
          
          if (assetData.CenterPoint) {
            setViewState({
              longitude: assetData.CenterPoint[0],
              latitude: assetData.CenterPoint[1],
              zoom: 18
            });
          } else if (assetData.Coordinates && assetData.Coordinates.length > 0) {
            try {
              const polygon = turf.polygon(assetData.Coordinates);
              const center = turf.centroid(polygon);
              const centerPoint = center.geometry.coordinates;
              
              setViewState({
                longitude: centerPoint[0],
                latitude: centerPoint[1],
                zoom: 18
              });
            } catch (error) {
              console.error('Error calculating center point:', error);
            }
          }
        } else {
          setError('Asset not found or invalid response format');
        }
      } catch (err: any) {
        console.error('Error fetching asset details:', err);
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

  useEffect(() => {
    return () => {
      console.log('AssetDetails component unmounting, cleaning up map');
      
      try {
        // Safely clean up the map to prevent indoor_manager errors
        if (mapRef.current) {
          try {
            // First remove all sources and layers to prevent internal errors
            const map = mapRef.current;
            if (map) {
              try {
                const style = map.getStyle && map.getStyle();
                if (style && style.layers) {
                  style.layers.forEach((layer: { id: string }) => {
                    if (map.getLayer && map.getLayer(layer.id)) {
                      map.removeLayer(layer.id);
                    }
                  });
                }
                if (style && style.sources) {
                  Object.keys(style.sources).forEach(source => {
                    if (map.getSource && map.getSource(source)) {
                      map.removeSource(source);
                    }
                  });
                }
              } catch (styleError) {
                console.warn('Error accessing map style:', styleError);
              }
            }
            mapRef.current = null;
          } catch (cleanupError) {
            console.warn('Non-critical map cleanup error:', cleanupError);
          }
        }
        
        sessionStorage.removeItem('navigating_to_booking');
      } catch (error) {
        console.warn('Error cleaning up map in AssetDetails:', error);
      }
    };
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
      console.log('Navigation already in progress, ignoring duplicate click');
      return;
    }
    
    sessionStorage.setItem('navigating_to_assets', 'true');
    
    try {
      if (mapRef.current) {
        console.log('Cleaning up map instance before navigation to Assets');
        mapRef.current.remove();
        mapRef.current = null;
      }
    } catch (e) {
      console.warn('Error during map cleanup during Assets navigation:', e);
    }
    
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
  }, [navigate, mapRef]);

  const handleBookService = useCallback(() => {
    if (sessionStorage.getItem('navigating_to_booking')) {
      console.log('Navigation already in progress, ignoring duplicate click');
      return;
    }
    
    sessionStorage.setItem('navigating_to_booking', 'true');
    
    try {
      // Safely clean up the map to prevent indoor_manager errors
      if (mapRef.current) {
        console.log('Cleaning up map instance before navigation');
        try {
          // First set map loaded state to false to prevent further rendering
          setMapLoaded(false);
          
          // Add a small delay to ensure React state update before map removal
          setTimeout(() => {
            try {
              // Check if mapRef is still valid before removing
              if (mapRef.current) {
                const map = mapRef.current;
                // Remove all sources and layers to prevent internal errors
                if (map) {
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
    const essentialAssetData = asset ? {
      AssetId: asset.AssetId,
      name: asset.Name,
      type: asset.AssetType || 'buildings',
      area: asset.Area,
      address: asset.Address,
      postcode: asset.Postcode || asset.PostCode || asset.postcode || '',
      // Safe handling of coordinates
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
  }, [asset, navigate, mapRef]);

  function calculateAssetBounds(coordinates: any): [mapboxgl.LngLatLike, mapboxgl.LngLatLike] {
    if (!coordinates || coordinates.length === 0) {
      throw new Error('Invalid coordinates provided.');
    }

    const allPoints = coordinates.flat(1);

    const bounds = allPoints.reduce(
      (acc: [number, number, number, number], point: [number, number]) => {
        const [minLng, minLat, maxLng, maxLat] = acc;
        const [lng, lat] = point;
        return [
          Math.min(minLng, lng),
          Math.min(minLat, lat),
          Math.max(maxLng, lng),
          Math.max(maxLat, lat),
        ];
      },
      [Infinity, Infinity, -Infinity, -Infinity]
    );

    return [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ];
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
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
                <button
                onClick={handleBookService}
                  className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book a Flight
                </button>
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
                <div className="h-full" ref={mapContainerRef}>
                  {mapError ? (
                    <div className="flex items-center justify-center h-full bg-gray-50">
                      <div className="text-center p-6 max-w-sm">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Map Error</h3>
                        <p className="text-gray-600 mb-4">{mapError}</p>
                      </div>
                    </div>
                  ) : (
                    <Map
                      {...viewState}
                      onMove={(evt: any) => setViewState(evt.viewState)}
                      style={{ width: '100%', height: '100%' }}
                      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                      mapboxAccessToken="pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q"
                      scrollZoom={true}
                      onLoad={(event: any) => {
                        console.log("Map loaded");
                        mapRef.current = event.target;
                        setMapLoaded(true);
                        
                        if (asset && asset.Coordinates) {
                          setTimeout(() => {
                            try {
                              const bounds = calculateAssetBounds(asset.Coordinates);
                              if (bounds) {
                                mapRef.current?.fitBounds(bounds, {
                                  padding: 80,
                                  maxZoom: 19,
                                  duration: 800
                                });
                              }
                            } catch (e) {
                              console.warn('Error zooming to asset after map load:', e);
                            }
                          }, 200);
                        }
                      }}
                    >
                      {mapLoaded && asset?.Coordinates && asset.Coordinates.length > 0 && (
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
                      
                      {mapLoaded && asset?.CenterPoint && (
                        <Marker 
                          longitude={parseFloat(asset.CenterPoint[0])} 
                          latitude={parseFloat(asset.CenterPoint[1])}
                          anchor="bottom"
                        >
                          <div className="w-8 h-8 rounded-full bg-white p-1 shadow-lg flex items-center justify-center">
                            <svg className="w-5 h-5" fill={getAssetTypeInfo(asset.AssetType).color} viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                          </div>
                        </Marker>
                      )}
                    </Map>
                  )}
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAssetTypeInfo(asset.AssetType).icon} />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-gray-900">Asset Information</h2>
                  </div>
                </div>

                <div className="p-4">
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
                      <dd className="text-sm text-gray-900 text-right">{asset.Postcode || asset.PostCode || asset.postcode || "Not specified"}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Asset Type</dt>
                      <dd className="text-sm text-gray-900 text-right">{getAssetTypeInfo(asset.AssetType).title}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Area Size</dt>
                      <dd className="text-sm text-gray-900 text-right">{asset.Area ? parseFloat(asset.Area).toLocaleString() : '0'} m²</dd>
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
                          {asset.status || 'Active'}
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
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
