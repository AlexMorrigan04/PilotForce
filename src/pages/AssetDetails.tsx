import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import AWS from 'aws-sdk';
import 'mapbox-gl/dist/mapbox-gl.css';

// Define the asset type colors and icons for display
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

const AssetDetails: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams<{ assetId: string }>();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 13
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Set Mapbox token explicitly
  useEffect(() => {
    try {
      // Use your actual valid token
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';
    } catch (error) {
      console.error('Error setting Mapbox token:', error);
      setMapError('Failed to initialize map: invalid access token');
    }
  }, []);

  // Configure AWS SDK
  const awsRegion = 'eu-north-1';
  AWS.config.update({
    region: awsRegion,
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Get user info simplified for demo
  useEffect(() => {
    setUserInfo({ name: 'Demo User' });
  }, []);

  // Check if asset was passed via location state
  useEffect(() => {
    if (location.state && location.state.asset) {
      setAsset(location.state.asset);
      setLoading(false);
      
      // Update view state to focus on asset
      if (location.state.asset.centerPoint) {
        setViewState({
          longitude: location.state.asset.centerPoint[0],
          latitude: location.state.asset.centerPoint[1],
          zoom: 16
        });
      }
    } else if (assetId && user) {
      // Fetch asset from DynamoDB if not passed in location state
      fetchAssetDetails();
    }
  }, [location, assetId, user]);

  // Fetch asset details from DynamoDB
  const fetchAssetDetails = () => {
    setLoading(true);
    
    if (!user) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    const params = {
      TableName: 'Assets',
      Key: {
        UserId: user.id,
        AssetId: assetId
      }
    };

    dynamoDb.get(params, (err, data) => {
      if (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to load asset details.');
        setLoading(false);
      } else if (!data.Item) {
        setError('Asset not found.');
        setLoading(false);
      } else {
        setAsset(data.Item);
        setLoading(false);

        // Update map viewport to center on asset
        if (data.Item.centerPoint) {
          setViewState({
            longitude: data.Item.centerPoint[0],
            latitude: data.Item.centerPoint[1],
            zoom: 16
          });
        } else if (data.Item.coordinates && data.Item.coordinates.length > 0) {
          // Calculate center from coordinates if centerPoint not available
          try {
            const polygon = turf.polygon(data.Item.coordinates);
            const center = turf.centroid(polygon);
            const centerPoint = center.geometry.coordinates;
            
            setViewState({
              longitude: centerPoint[0],
              latitude: centerPoint[1],
              zoom: 16
            });
          } catch (error) {
            console.error('Error calculating center point:', error);
          }
        }
      }
    });
  };

  // Initialize mapbox when the component loads
  const onMapLoad = (event: any) => {
    console.log("Map loaded");
    const map = event.target;
    mapRef.current = map;
    setMapLoaded(true);
    setMapError(null);
  };

  // Handle map errors
  const onMapError = (event: any) => {
    console.error("Map error:", event);
    setMapError('Error loading map: ' + (event.error?.message || 'Unknown error'));
    setMapLoaded(false);
  };

  // Add a cleanup effect that safely removes the map
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Format date string for display
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

  // Get asset type information
  const getAssetTypeInfo = (type: string) => {
    return assetTypeDetails[type as keyof typeof assetTypeDetails] || {
      title: 'Unknown Type',
      icon: '',
      color: '#718096',
      strokeColor: '#4a5568',
      description: 'No description available'
    };
  };

  // Return to assets list page
  const handleBackToList = () => {
    sessionStorage.setItem('reloadAssetsPage', 'true');
    navigate('/assets');
  };

  // Open booking modal
  const handleOpenBookingModal = () => {
    setBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      {/* Hero section with gradient background */}
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
                  {loading ? 'Loading Asset...' : asset?.name || 'Asset Details'}
                </h1>
              </div>
              {!loading && asset?.type && (
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mr-2">
                    {getAssetTypeInfo(asset.type).title}
                  </span>
                  <p className="text-blue-100">
                    {asset.postcode && `${asset.postcode} • `}
                    Created {asset.createdAt ? formatDate(asset.createdAt).split(',')[0] : 'Unknown date'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              {!loading && asset && (
                <button
                onClick={() => navigate('/make-booking', { state: { selectedAsset: asset } })}
                  className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Services
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        ) : asset ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Asset Information */}
            <div className="lg:col-span-1 space-y-6">
              {/* Asset Basic Info Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                  <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{
                    backgroundColor: getAssetTypeInfo(asset.type).color,
                    color: 'white'
                  }}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAssetTypeInfo(asset.type).icon} />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-gray-900">Asset Information</h2>
                  </div>
                </div>

                <div className="p-6">
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Asset ID</dt>
                      <dd className="text-sm text-gray-900 font-mono truncate max-w-[200px]">{asset.AssetId}</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Created By</dt>
                      <dd className="text-sm text-gray-900">{asset.userName || 'Unknown'}</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Created On</dt>
                      <dd className="text-sm text-gray-900">{formatDate(asset.createdAt)}</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {asset.status || 'Active'}
                        </span>
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Area Size</dt>
                      <dd className="text-sm text-gray-900">{asset.area ? asset.area.toLocaleString() : '0'} m²</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Postcode</dt>
                      <dd className="text-sm text-gray-900">{asset.postcode || "Not specified"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Asset Type Info Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Asset Type</h2>
                </div>
                <div className="p-6">
                  <div className="rounded-lg border border-gray-200 bg-white p-5" style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: getAssetTypeInfo(asset.type).color
                  }}>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{getAssetTypeInfo(asset.type).title}</h3>
                    <p className="text-sm text-gray-600">{getAssetTypeInfo(asset.type).description}</p>
                  </div>
                </div>
              </div>
              
              {/* Actions Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                </div>
                <div className="p-6 space-y-4">
                  <button
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                    onClick={() => navigate('/make-booking', { state: { selectedAsset: asset } })}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book Services
                  </button>
                  
                  {/* <button
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                    onClick={() => navigate(`/edit-asset/${asset.AssetId}`, { state: { asset } })}
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Asset
                  </button> */}
                  
                  <button
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this asset?')) {
                        // Handle asset deletion
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
            </div>
            
            {/* Right Panel - Map */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Asset Location</h2>
                </div>
                <div className="h-[600px]" ref={mapContainerRef}>
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
                      mapStyle="mapbox://styles/mapbox/satellite-v9"
                      mapboxAccessToken="pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q"
                      scrollZoom={true}
                      onLoad={(event: any) => {
                        console.log("Map loaded");
                        mapRef.current = event.target;
                        setMapLoaded(true);
                      }}
                    >
                      {/* <NavigationControl position="top-right" /> */}
                      
                      {/* Display the asset polygon */}
                      {mapLoaded && asset?.coordinates && asset.coordinates.length > 0 && (
                        <Source
                          id="asset-polygon"
                          type="geojson"
                          data={{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                              type: 'Polygon',
                              coordinates: asset.coordinates,
                            },
                          }}
                        >
                          <Layer
                            id="asset-polygon-fill"
                            type="fill"
                            paint={{
                              'fill-color': getAssetTypeInfo(asset.type).color,
                              'fill-opacity': 0.4,
                            }}
                          />
                          <Layer
                            id="asset-polygon-outline"
                            type="line"
                            paint={{
                              'line-color': getAssetTypeInfo(asset.type).strokeColor,
                              'line-width': 2,
                            }}
                          />
                        </Source>
                      )}
                    </Map>
                  )}
                </div>
              </div>
              
              {/* Asset Features & Services Card */}
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Available Services</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {asset.type === 'buildings' && (
                      <>
                        <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                          <div className="flex-shrink-0 bg-blue-100 rounded-md p-2">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">Roof Inspection</h3>
                            <p className="mt-1 text-xs text-gray-600">Detailed assessment of roof conditions</p>
                          </div>
                        </div>
                        <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                          <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">Thermal Imaging</h3>
                            <p className="mt-1 text-xs text-gray-600">Detect heat loss and insulation issues</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {asset.type === 'construction' && (
                      <>
                        <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                          <div className="flex-shrink-0 bg-orange-100 rounded-md p-2">
                            <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">Progress Monitoring</h3>
                            <p className="mt-1 text-xs text-gray-600">Regular aerial surveys to track progress</p>
                          </div>
                        </div>
                        <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                          <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                            <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">Orthomosaic Mapping</h3>
                            <p className="mt-1 text-xs text-gray-600">Highly detailed site maps for planning</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Service buttons for other asset types would go here */}
                    
                    {/* <div className="sm:col-span-2 mt-2">
                      <button
                        onClick={handleOpenBookingModal}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View All Available Services
                      </button>
                    </div> */}
                  </div>
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
      
      {/* Booking Modal */}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Book Services</h3>
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
