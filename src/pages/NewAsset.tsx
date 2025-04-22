import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import AWS from 'aws-sdk';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Asset type definitions
type AssetType = 'buildings' | 'construction' | 'area' | 'security' | 'infrastructure';

interface AssetTypeInfo {
  id: AssetType;
  title: string;
  description: string;
  icon: string;
}

const assetTypes: AssetTypeInfo[] = [
  {
    id: 'buildings',
    title: 'Buildings',
    description: 'Enable rooftop inspection, and surveying services.',
    icon: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z' // Building icon
  },
  {
    id: 'construction',
    title: 'Construction Site',
    description: 'Enables aerial mapping, orthophotos and progress monitoring services.',
    icon: 'M13.7 19C13.9 19.3 14 19.6 14 20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20C10 19.6 10.1 19.3 10.3 19H2V21H14V23H2C1.5 23 1 22.5 1 22V3C1 2.5 1.5 2 2 2H22C22.5 2 23 2.5 23 3V15C23 15.5 22.5 16 22 16H13.7ZM16 10.4L21 5.4V3H3V17H11.2C11.6 16.4 12.3 16 13 16C13.7 16 14.4 16.4 14.8 17H21V16C21 11.8 16.5 10.9 16 10.4ZM4 5H20V7H4V5ZM4 9H20V11H4V9ZM4 13H14V15H4V13Z' // Construction/crane icon
  },
  {
    id: 'area',
    title: 'Area/Estate',
    description: 'Generate high-resolution orthomasaics and detailed 3D models of defined areas.',
    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z' // Map/area icon
  },
  {
    id: 'security',
    title: 'Security & Surveillance',
    description: 'Assets around which security and surveillance services must be delivered. Assets include individual buildings, large sites and campuses as well as key infrastructure.',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' // Shield/security icon
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    description: 'Select from a range of infrastructure types to request inspection and condition surveys jobs.',
    icon: 'M17.66 5.84C17.43 5.31 16.95 5 16.4 5H7.6c-.55 0-1.03.31-1.26.84l-3.23 8.94C2.97 15.33 3.34 16 4 16h16c.67 0 1.03-.67.9-1.22l-3.24-8.94zM12 13.5 7 9h10l-5 4.5zM3 18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1H3v1z' // Infrastructure/bridge icon
  }
];

const NewAsset: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [drawnArea, setDrawnArea] = useState<any>(null);
  const [areaSize, setAreaSize] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 13
  });
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [address, setAddress] = useState(''); // Added state for address
  const [postcode, setPostcode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPostcode, setIsLoadingPostcode] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string>(
    "https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/assets"
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);

  // Configure AWS SDK
  AWS.config.update({
    region: process.env.REACT_APP_AWS_REGION,
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Enhanced user info setup
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // First check if user context already has what we need
        if (user && user.username) {
          console.log('Using user from AuthContext:', user);
          setUserInfo({
            name: user.username,
            userId: user.sub || user.userId || user.id,
            companyId: user.companyId,
            email: user.email
          });
          return;
        }
        
        // If not in user context, try to get from localStorage
        const idToken = localStorage.getItem('idToken');
        const tokensStr = localStorage.getItem('tokens');
        const savedUserStr = localStorage.getItem('user');
        
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            console.log('Using user data from localStorage:', savedUser);
            setUserInfo({
              name: savedUser.username || savedUser.name || 'Demo User',
              userId: savedUser.sub || savedUser.userId || savedUser.id,
              companyId: savedUser.companyId,
              email: savedUser.email
            });
            return;
          } catch (error) {
            console.error('Error parsing saved user data:', error);
          }
        }
        
        // If we still don't have user info, try getting from API
        if (idToken || tokensStr) {
          // Ideally here we would call an API endpoint to get user info
          console.log('Would fetch user data from API using token');
        }
        
        // Fallback to demo data if nothing else works
        setUserInfo({
          name: 'Demo User',
          userId: 'demo-user-id',
          companyId: 'demo-company-id',
          email: 'demo@example.com'
        });
      } catch (error) {
        console.error('Error fetching user details:', error);
        setUserInfo({
          name: 'Demo User',
          userId: 'demo-user-id',
          companyId: 'demo-company-id'
        });
      }
    };
    
    fetchUserDetails();
  }, [user]);

  // Log userInfo whenever it changes
  useEffect(() => {
    if (userInfo) {
      console.log('Current user info:', userInfo);
    }
  }, [userInfo]);

  // Initialize MapboxDraw when the map loads
  const onMapLoad = (event: any) => {
    console.log("Map loaded");
    const map = event.target;
    mapRef.current = map;
    setMapLoaded(true);

    try {
      // Set the mapbox token explicitly
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

      // Initialize draw tool
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true
        },
      });
      
      // Store draw control ref to remove later
      drawControlRef.current = draw;
      
      // Add control to map
      map.addControl(draw);
      drawRef.current = draw;

      // Handle drawing events
      map.on('draw.create', updateDrawnArea);
      map.on('draw.update', updateDrawnArea);
      map.on('draw.delete', () => {
        setDrawnArea(null);
        setAreaSize(0);
      });
    } catch (error) {
      console.error("Error initializing drawing tools:", error);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("Cleanup map");
      try {
        // Remove draw control first
        if (mapRef.current && drawControlRef.current) {
          mapRef.current.removeControl(drawControlRef.current);
          drawControlRef.current = null;
        }
        
        // Clear refs
        drawRef.current = null;
        mapRef.current = null;
      } catch (error) {
        console.error("Error cleaning up map:", error);
      }
    };
  }, []);

  // Update the drawn area and calculate its size
  const updateDrawnArea = (e: any) => {
    if (!drawRef.current) return;
    
    if (e.features && e.features.length > 0) {
      const data = drawRef.current.getAll();
      setDrawnArea(data);

      // Calculate area using turf.js
      try {
        const area = turf.area(data);
        setAreaSize(Math.round(area * 100) / 100); // Round to 2 decimal places
      } catch (err) {
        console.error('Error calculating area:', err);
        setAreaSize(0);
      }
    }
  };

  // Toggle drawing mode
  const handleToggleDrawing = () => {
    if (!mapRef.current || !drawRef.current) return;

    if (isDrawing) {
      // When stopping drawing, do nothing special
    } else {
      // When starting to draw, clear existing features first
      drawRef.current.deleteAll();
      setDrawnArea(null);
      setAreaSize(0);
      // Change to draw mode
      drawRef.current.changeMode('draw_polygon');
    }
    
    setIsDrawing(!isDrawing);
  };

  // Handle asset type selection
  const handleSelectType = (type: AssetType) => {
    setSelectedType(type);
  };

  const getAuthToken = (): string | null => {
    const idToken = localStorage.getItem('idToken');
    if (idToken) return idToken;
    
    const tokensStr = localStorage.getItem('tokens');
    if (tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr);
        if (tokens.idToken) return tokens.idToken;
      } catch (e) {
        console.error('Error parsing tokens:', e);
      }
    }
    
    return null;
  };

  // Save the new asset to DynamoDB
  const handleSaveAsset = async () => {
    if (!userInfo) {
      setError('User information is not available. Please log in again.');
      return;
    }

    if (!assetName.trim()) {
      setError('Please provide a name for the asset');
      return;
    }

    if (!selectedType) {
      setError('Please select an asset type');
      return;
    }

    if (!postcode.trim()) {
      setError('Please enter a postcode for the asset');
      return;
    }

    if (!drawnArea || !drawnArea.features || drawnArea.features.length === 0) {
      setError('Please draw the asset area on the map');
      return;
    }

    // Set saving state to show loading indicator
    setIsSaving(true);
    setError(null);

    // Get the coordinates from the drawn polygon
    const coordinates = drawnArea.features[0].geometry.coordinates;
    
    // Get center point for the asset
    let centerPoint;
    try {
      const polygon = turf.polygon(coordinates);
      const center = turf.centroid(polygon);
      centerPoint = center.geometry.coordinates;
    } catch (err) {
      console.error('Error calculating center point:', err);
      centerPoint = [viewState.longitude, viewState.latitude];
    }

    // Create the asset object with user info - ensure the field names match exactly what the Lambda function expects
    const assetData = {
      name: assetName,
      assetType: selectedType,
      description: `Asset created from postal code: ${postcode}`,
      address: address, // Use address input value for address field
      postcode: postcode, // Use postcode input value for postcode field
      coordinates: coordinates,
      area: areaSize,
      centerPoint: centerPoint,
      userId: userInfo.userId,  // This must match the field name in the Lambda
      companyId: userInfo.companyId, // This must match the field name in the Lambda
      createdBy: userInfo.name,
      tags: [selectedType],
      geojson: {
        type: 'Feature',
        properties: {
          name: assetName,
          type: selectedType,
          area: areaSize,
          userId: userInfo.userId,
          companyId: userInfo.companyId
        },
        geometry: {
          type: 'Polygon',
          coordinates: coordinates
        }
      }
    };

    console.log('Saving asset with data:', assetData);

    try {
      // Get auth token for API request
      const token = getAuthToken();
      
      console.log('Saving asset with API endpoint:', apiEndpoint);
      console.log('Authorization available:', !!token);
      console.log('User info included:', {
        userId: userInfo.userId,
        companyId: userInfo.companyId,
        name: userInfo.name
      });
      
      // Make API request to create asset
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(assetData)
      });
      
      const responseText = await response.text();
      console.log('API Response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (err) {
        console.error('Error parsing response:', err);
        throw new Error(`API returned invalid JSON: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(responseData.message || `API error: ${response.status}`);
      }
      
      console.log('Asset created successfully:', responseData);
      
      // Navigate back to the assets page
      navigate('/assets');
    } catch (err: any) {
      console.error('Error creating asset via API:', err);
      setError(err.message || 'Failed to create asset');
      
      // Fallback to direct Lambda invocation through AWS SDK
      try {
        console.log('Attempting fallback with direct Lambda invocation...');
        
        // Configure AWS SDK for Lambda access
        const lambda = new AWS.Lambda({
          region: 'eu-north-1', // Update to your Lambda region
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
        });
        
        // Invoke Lambda function directly
        const params = {
          FunctionName: 'pilotforce-create-asset',
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify(assetData)
        };
        
        const lambdaResponse = await lambda.invoke(params).promise();
        console.log('Lambda response:', lambdaResponse);
        
        if (lambdaResponse.StatusCode === 200) {
          console.log('Asset saved successfully via Lambda');
          navigate('/assets');
        } else {
          throw new Error(`Lambda error: ${lambdaResponse.FunctionError || 'Unknown error'}`);
        }
      } catch (lambdaErr: any) {
        console.error('Lambda fallback failed:', lambdaErr);
        
        // Last resort: fall back to DynamoDB direct access
        if (process.env.NODE_ENV === 'development') {
          try {
            console.log('Attempting last fallback with direct DynamoDB access...');
            
            // Generate a unique AssetId
            const assetId = `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Create the asset object with all required fields
            const newAsset = {
              CompanyId: userInfo.companyId || 'unknown-company',
              AssetId: assetId,
              UserId: userInfo.userId || 'unknown-user',
              userName: userInfo.name || 'Unknown User',
              name: assetName,
              type: selectedType,
              coordinates: coordinates,
              centerPoint: centerPoint,
              area: areaSize,
              createdAt: new Date().toISOString(),
              status: 'active',
              address: address, // Add address separately
              postcode: postcode, // Add postcode separately
              geojson: {
                type: 'Feature',
                properties: {
                  name: assetName,
                  type: selectedType,
                  area: areaSize,
                  userId: userInfo.userId,
                  companyId: userInfo.companyId
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: coordinates
                }
              }
            };

            // Save to DynamoDB
            const params = {
              TableName: 'Assets',
              Item: newAsset,
            };

            dynamoDb.put(params, (dbErr) => {
              if (dbErr) {
                console.error('Error saving asset with fallback method:', dbErr);
                setError(`Failed to save asset: ${dbErr.message}`);
              } else {
                console.log('Asset saved successfully with fallback method');
                // Navigate back to the assets page
                navigate('/assets');
              }
            });
          } catch (fallbackErr: any) {
            console.error('All fallback methods failed:', fallbackErr);
            setError(`All attempts to save asset failed: ${fallbackErr.message}`);
          }
        } else {
          setError(`Failed to create asset: ${lambdaErr.message}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel and return to assets page
  const handleCancel = () => {
    navigate('/assets');
  };

  // Replace the Google Maps geocoding function with Mapbox geocoding
  const handleGeocodePostcode = async () => {
    if (!postcode) {
      setPostcodeError('Please enter a postcode');
      return;
    }
  
    try {
      setGeocodingLoading(true);
      const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
      
      // Use Mapbox geocoding API instead of Google
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?country=gb&types=postcode&access_token=${mapboxToken}`;
      
      const response = await fetch(geocodeUrl);
      
      if (!response.ok) {
        throw new Error(`Geocoding failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mapbox returns coordinates as [longitude, latitude]
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        
        console.log(`Geocoded coordinates: ${latitude}, ${longitude}`);
        
        // Update the map view
        setViewState({
          latitude,
          longitude,
          zoom: 16
        });
        
        // Set coordinates for the new asset
        setCoordinates([longitude, latitude]);
        setPostcodeError('');
      } else {
        setPostcodeError('Postcode not found');
      }
    } catch (error) {
      console.error('Error geocoding postcode:', error);
      setPostcodeError('Failed to geocode postcode. Please try again.');
    } finally {
      setGeocodingLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Create New Asset</h1>
              <p className="text-blue-100">Draw your asset on the map and define its properties</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-transparent bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsset}
                disabled={!drawnArea || !selectedType || !assetName || isSaving}
                className={`inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg font-medium shadow-sm transition duration-150 
                  ${(!drawnArea || !selectedType || !assetName || isSaving) 
                    ? 'bg-white/50 text-white cursor-not-allowed' 
                    : 'bg-white text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white'}`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Asset...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Asset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {error && (
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Asset Information & Type */}
          <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${assetName ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-2`}>
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-200">
                  <div className={`h-full ${assetName && selectedType ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: assetName ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${selectedType ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mx-2`}>
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-200">
                  <div className={`h-full ${selectedType && drawnArea ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: selectedType ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${drawnArea ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} ml-2`}>
                  <span className="text-sm font-semibold">3</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Name & Location</span>
                <span>Asset Type</span>
                <span>Draw Area</span>
              </div>
            </div>
            
            {/* Asset Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Asset Information
              </h2>
              <div className="mb-4">
                <label htmlFor="asset-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="asset-name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Enter a descriptive name for your asset"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter the address of the asset"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter the postcode (e.g., BS16 1QY)"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGeocodePostcode}
                    disabled={isLoadingPostcode || !postcode.trim()}
                    className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 
                      rounded-r-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      ${isLoadingPostcode || !postcode.trim() 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isLoadingPostcode ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {geocodeError && (
                  <p className="mt-1 text-sm text-red-600">{geocodeError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Enter a postcode and click the location icon to navigate to it on the map</p>
              </div>
              
              {areaSize > 0 && (
                <div className="mb-4 bg-blue-50 rounded-md p-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Area Size</p>
                    <p className="text-sm text-blue-600">{areaSize.toLocaleString()} m²</p>
                  </div>
                </div>
              )}
              
              <div className="mt-5">
                <button
                  onClick={handleToggleDrawing}
                  className={`inline-flex items-center justify-center w-full px-4 py-2 border text-sm font-medium rounded-md shadow-sm transition-all
                    ${isDrawing 
                      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'}`}
                >
                  {isDrawing ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Stop Drawing
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Draw on Map
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Asset Type Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Asset Type <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-gray-600 mb-4">Select the type of asset you're creating:</p>
              
              <div className="space-y-3">
                {assetTypes.map((type) => (
                  <div 
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className={`flex p-4 border rounded-lg cursor-pointer transition-all duration-200
                      ${selectedType === type.id 
                        ? 'border-blue-500 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center
                        ${selectedType === type.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{type.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </div>
                    {selectedType === type.id && (
                      <div className="ml-2 flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Map */}
          <div>
            {/* Map Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[600px]">
              <div ref={mapContainerRef} className="h-full w-full relative">
                {mapContainerRef.current && (
                  <Map
                    {...viewState}
                    onMove={(evt: any) => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken="pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q"
                    scrollZoom={true}
                    onLoad={onMapLoad}
                    attributionControl={false}
                  >
                    {/* <NavigationControl position="top-right" /> */}
                    
                    {/* Show a marker when postcode is geocoded */}
                    {/* {!isDrawing && postcode.trim() !== '' && !geocodeError && (
                      <Marker 
                        longitude={viewState.longitude} 
                        latitude={viewState.latitude}
                        color="#3182CE"
                      />
                    )} */}
                    
                    {/* Display the drawn area as a GeoJSON source/layer if available */}
                    {mapLoaded && drawnArea && drawnArea.features && drawnArea.features.length > 0 && (
                      <Source
                        id="drawn-polygon"
                        type="geojson"
                        data={drawnArea}
                      >
                        <Layer
                          id="drawn-polygon-fill"
                          type="fill"
                          paint={{
                            'fill-color': 
                              selectedType === 'buildings' ? '#3182ce' :
                              selectedType === 'construction' ? '#dd6b20' :
                              selectedType === 'area' ? '#38a169' :
                              selectedType === 'security' ? '#805ad5' :
                              selectedType === 'infrastructure' ? '#e53e3e' :
                              '#3182ce',
                            'fill-opacity': 0.4,
                          }}
                        />
                        <Layer
                          id="drawn-polygon-outline"
                          type="line"
                          paint={{
                            'line-color': 
                              selectedType === 'buildings' ? '#2c5282' :
                              selectedType === 'construction' ? '#9c4221' :
                              selectedType === 'area' ? '#276749' :
                              selectedType === 'security' ? '#553c9a' :
                              selectedType === 'infrastructure' ? '#c53030' :
                              '#2c5282',
                            'line-width': 2,
                          }}
                        />
                      </Source>
                    )}
                  </Map>
                )}
                
                {/* Drawing Instructions Overlay */}
                {isDrawing && (
                  <div className="absolute top-4 left-0 right-0 mx-auto w-max bg-white px-4 py-2 rounded-md shadow-md border border-gray-200 z-10">
                    <p className="text-sm font-medium text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Click on the map to start drawing your asset boundary
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 flex items-center mb-2">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Drawing Instructions
              </h3>
              <ul className="text-sm text-blue-700 space-y-1 ml-6 list-disc">
                <li>Click the "Draw on Map" button to start drawing</li>
                <li>Click on the map to place points around your asset</li>
                <li>Continue clicking to outline the entire asset boundary</li>
                <li>Double-click to complete the shape</li>
                <li>Use the trash icon to delete and start over if needed</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-8">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default NewAsset;
