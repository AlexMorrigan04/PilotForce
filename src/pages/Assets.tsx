import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import mapboxgl from 'mapbox-gl'; // Still needed for types
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import AWS from 'aws-sdk';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useNavigate } from 'react-router-dom';

const Assets: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [viewingAsset, setViewingAsset] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [roundedArea, setRoundedArea] = useState<number | undefined>(undefined);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Add view state for react-map-gl
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12
  });

  // Add state for popup display
  const [showPopup, setShowPopup] = useState<{[key: string]: boolean}>({});

  // Configure AWS SDK
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
  
  AWS.config.update({
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Get user info from token - simplified
  useEffect(() => {
    setUserInfo({ name: 'Demo User' });
  }, []);

  useEffect(() => {
      // Check if the page has already been reloaded
      if (!sessionStorage.getItem('reloaded')) {
        sessionStorage.setItem('reloaded', 'true');
        window.location.reload();
      }
    }, []);

  // Add function to calculate centerPoint if one doesn't exist
const calculateCenterPoint = (coordinates: [number, number][][]): [number, number] | null => {
  if (!coordinates || coordinates.length === 0 || !coordinates[0] || coordinates[0].length === 0) {
    return null;
  }
  
  try {
    const polygon = turf.polygon(coordinates);
    const center = turf.centroid(polygon);
    const centerPoint = center.geometry.coordinates as [number, number];
    console.log('Center Point:', centerPoint); // Log the centerPoint to the console
    return centerPoint;
  } catch (error) {
    console.error('Error calculating center point:', error);
    return null;
  }
};

  // Fetch assets from DynamoDB
  useEffect(() => {
    if (user) {
      setLoading(true);
      const params = {
        TableName: 'Assets',
        KeyConditionExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': user.companyId
        },
      };

      dynamoDb.query(params, (err, data) => {
        if (err) {
          setError('Failed to fetch assets');
          setLoading(false);
        } else {
          const assetsWithCoordinates = (data.Items || []).filter(asset => 
            asset.coordinates && 
            Array.isArray(asset.coordinates) && 
            asset.coordinates.length > 0
          ).map(asset => {
            // If asset doesn't have a centerPoint, calculate it
            if (!asset.centerPoint && asset.coordinates) {
              const centerPoint = calculateCenterPoint(asset.coordinates);
              if (centerPoint) {
                console.log(`Asset ${asset.name} center point:`, centerPoint); // Log the center point for each asset
                asset.centerPoint = centerPoint;
              }
            }
            return asset;
          });
          
          setAssets(assetsWithCoordinates);
          setFilteredAssets(assetsWithCoordinates);
          setLoading(false);
        }
      });
    }
  }, [user]);

  // Filter assets based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = assets.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(assets);
    }
  }, [searchTerm, assets]);

  // Initialize main map
  useEffect(() => {
    // Don't initialize map until container is ready and component is fully rendered
    if (!mapContainerRef.current) {
      return;
    }

    // Set the Mapbox access token
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

    // Clean up existing map instance if it exists
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.warn('Error removing existing map:', e);
      }
      mapRef.current = null;
    }

    try {
      // Create the map instance
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-2.587910, 51.454514], // Bristol area
        zoom: 12
      });

      // Store map reference
      mapRef.current = map as mapboxgl.Map;

      // Add navigation control after map loads
      map.on('load', () => {
        map.addControl(new mapboxgl.NavigationControl());
        
        // Load assets on map if we have any
        if (assets.length > 0 && !loading) {
          loadAssetsOnMap(map as mapboxgl.Map);
        }
      });

      // Cleanup function
      return () => {
        if (mapRef.current) {
          // Remove all markers before removing the map
          Object.values(markersRef.current).forEach(marker => {
            try {
              marker.remove();
            } catch (e) {
              console.warn('Error removing marker:', e);
            }
          });
          markersRef.current = {};
          
          try {
            // Safeguard the map removal
            if (mapRef.current._removed !== true) {
              mapRef.current.remove();
            }
          } catch (e) {
            console.warn('Error during map cleanup:', e);
          }
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      return () => {};
    }
  }, [mapContainerRef.current, assets, loading]);

  // Separate effect to make sure we update the map when assets change
  useEffect(() => {
    if (!mapRef.current || loading) {
      return; // Exit early if map isn't initialized yet or we're still loading
    }
    
    // Check if map is loaded before adding assets
    if (mapRef.current.loaded()) {
      loadAssetsOnMap(mapRef.current as mapboxgl.Map);
    } else {
      // Wait for the map to load first
      mapRef.current.once('load', () => {
        loadAssetsOnMap(mapRef.current as mapboxgl.Map);
      });
    }
  }, [assets, loading]);

  // Add function to get color based on asset type
  const getAssetColor = (assetType: string) => {
    switch(assetType) {
      case 'buildings':
        return { fill: '#3182ce', stroke: '#2c5282' };
      case 'construction':
        return { fill: '#dd6b20', stroke: '#9c4221' };
      case 'area':
        return { fill: '#38a169', stroke: '#276749' };
      case 'security':
        return { fill: '#805ad5', stroke: '#553c9a' };
      case 'infrastructure':
        return { fill: '#e53e3e', stroke: '#c53030' };
      default:
        return { fill: '#3182ce', stroke: '#2c5282' };
    }
  };

  // Define asset type details with icons
  const assetTypeDetails = {
    buildings: {
      icon: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
      color: '#3182ce',
      strokeColor: '#2c5282'
    },
    construction: {
      icon: 'M13.7 19C13.9 19.3 14 19.6 14 20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20C10 19.6 10.1 19.3 10.3 19H2V21H14V23H2C1.5 23 1 22.5 1 22V3C1 2.5 1.5 2 2 2H22C22.5 2 23 2.5 23 3V15C23 15.5 22.5 16 22 16H13.7ZM16 10.4L21 5.4V3H3V17H11.2C11.6 16.4 12.3 16 13 16C13.7 16 14.4 16.4 14.8 17H21V16C21 11.8 16.5 10.9 16 10.4ZM4 5H20V7H4V5ZM4 9H20V11H4V9ZM4 13H14V15H4V13Z',
      color: '#dd6b20',
      strokeColor: '#9c4221'
    },
    area: {
      icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z',
      color: '#38a169',
      strokeColor: '#276749'
    },
    security: {
      icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
      color: '#805ad5',
      strokeColor: '#553c9a'
    },
    infrastructure: {
      icon: 'M17.66 5.84C17.43 5.31 16.95 5 16.4 5H7.6c-.55 0-1.03.31-1.26.84l-3.23 8.94C2.97 15.33 3.34 16 4 16h16c.67 0 1.03-.67.9-1.22l-3.24-8.94zM12 13.5 7 9h10l-5 4.5zM3 18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1H3v1z',
      color: '#e53e3e',
      strokeColor: '#c53030'
    }
  };

  // Get asset type icon and color
  const getAssetTypeInfo = (type: string) => {
    return assetTypeDetails[type as keyof typeof assetTypeDetails] || {
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5',
      color: '#718096',
      strokeColor: '#4a5568'
    };
  };

  // Update the loadAssetsOnMap function to be more resilient
  const loadAssetsOnMap = (map: mapboxgl.Map) => {
    if (!map || !map.loaded()) {
      return; // Exit if map isn't ready
    }

    try {
      // Clear existing markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Remove existing layers safely
      ['asset-fills', 'asset-outlines', 'selected-asset', 'selected-asset-fill'].forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });
      
      // Remove existing sources safely
      ['assets', 'selected'].forEach(sourceId => {
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });

      if (assets.length === 0) {
        return;
      }

      // Filter assets with valid coordinates
      const assetsWithCoordinates = assets.filter(asset => 
        asset.coordinates && 
        Array.isArray(asset.coordinates) && 
        asset.coordinates.length > 0
      );
      
      if (assetsWithCoordinates.length === 0) {
        return;
      }

      // Prepare GeoJSON data for all assets
      const assetFeatures = assetsWithCoordinates.map(asset => ({
        type: "Feature" as const,
        properties: {
          id: asset.AssetId, // Updated to use AssetId
          name: asset.name,
          type: asset.type
        },
        geometry: {
          type: 'Polygon' as 'Polygon',
          coordinates: asset.coordinates,
        },
      }));

      // Add assets source
      map.addSource('assets', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: assetFeatures,
        },
      });

      // Add fill layer for assets
      map.addLayer({
        id: 'asset-fills',
        type: 'fill',
        source: 'assets',
        paint: {
          'fill-color': [
            'match',
            ['get', 'type'],
            'buildings', '#3182ce',
            'construction', '#dd6b20',
            'area', '#38a169',
            'security', '#805ad5',
            'infrastructure', '#e53e3e',
            '#3182ce' // Default color
          ],
          'fill-opacity': 0.4,
        },
      });

      // Add outline layer for assets
      map.addLayer({
        id: 'asset-outlines',
        type: 'line',
        source: 'assets',
        paint: {
          'line-color': [
            'match',
            ['get', 'type'],
            'buildings', '#2c5282',
            'construction', '#9c4221',
            'area', '#276749',
            'security', '#553c9a',
            'infrastructure', '#c53030',
            '#2c5282' // Default color
          ],
          'line-width': 2,
        },
      });

      // Add centered markers for each asset with type-specific colors
      assetFeatures.forEach(feature => {
        // Get the centroid of the asset polygon for marker placement
        const centroid = turf.centroid(feature).geometry.coordinates;
        const assetType = assets.find(a => a.AssetId === feature.properties.id)?.type || 'buildings';
        const colors = getAssetColor(assetType);
        
        // Create a custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'asset-marker';
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = colors.fill;
        markerEl.style.border = `2px solid ${colors.stroke}`;
        markerEl.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.5)';
        markerEl.style.cursor = 'pointer';
        
        // Add pulse effect
        const pulseEl = document.createElement('div');
        pulseEl.className = 'asset-marker-pulse';
        pulseEl.style.position = 'absolute';
        pulseEl.style.width = '100%';
        pulseEl.style.height = '100%';
        pulseEl.style.borderRadius = '50%';
        pulseEl.style.backgroundColor = 'rgba(49, 130, 206, 0.4)';
        pulseEl.style.animation = 'pulse 1.5s infinite';
        markerEl.appendChild(pulseEl);
        
        // Add keyframes for the pulse animation to the document if it doesn't exist
        if (!document.getElementById('marker-pulse-style')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'marker-pulse-style';
          styleEl.textContent = `
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              70% { transform: scale(2); opacity: 0; }
              100% { transform: scale(1); opacity: 0; }
            }
          `;
          document.head.appendChild(styleEl);
        }
        
        // Create the marker
        const marker = new (mapboxgl as any).Marker({
          element: markerEl,
          anchor: 'center'
        })
        .setLngLat(centroid as [number, number])
        .addTo(map);
        
        // Store marker reference for later cleanup
        markersRef.current[feature.properties.id] = marker;
        
        // Add click event to marker to select the asset
        markerEl.addEventListener('click', () => {
          const clickedAsset = assets.find(asset => asset.AssetId === feature.properties.id);
          if (clickedAsset) {
            setSelectedAsset(clickedAsset);
          }
        });
      });

      // Calculate bounds for all assets
      const bounds = calculateBounds(assetFeatures.map(feature => feature.geometry.coordinates));
      
      // Calculate the centroid of all assets
      const allAssetsFeatureCollection: turf.AllGeoJSON = {
        type: 'FeatureCollection',
        features: assetFeatures,
      };
      const centroid: [number, number] = turf.centroid(allAssetsFeatureCollection).geometry.coordinates as [number, number];

      // Fit map to those bounds if valid
      if (bounds && bounds[0][0] !== undefined) {
        map.fitBounds(bounds as [[number, number], [number, number]], {
          padding: 40,
          maxZoom: 18, // Reduced from 22 to provide a more reasonable default zoom
        });
        
        // Set the map center to the centroid of all assets
        map.setCenter(centroid);
        
        // Remove the extra automatic zoom that might interfere with user zooming
        // Original code with setTimeout has been removed
      }

      // Add click listener for asset selection
      map.on('click', 'asset-fills', (e) => {
        if (!e.features || e.features.length === 0) {
          return;
        }
        
        const feature = e.features[0];
        const assetId = feature.properties?.id;
        
        const clickedAsset = assets.find(asset => asset.AssetId === assetId);
        if (clickedAsset) {
          setSelectedAsset(clickedAsset);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'asset-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', 'asset-fills', () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (error) {
      console.error('Error loading assets on map:', error);
    }
  };

  // Update the selected asset effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      console.warn('Map not initialized, cannot update selected asset');
      return;
    }

    const updateSelectedAsset = () => {
      try {
        // Clean up existing layers
        ['selected-asset-fill', 'selected-asset'].forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        });

        if (map.getSource('selected')) {
          map.removeSource('selected');
        }

        // Add selected asset if one is selected and has valid coordinates
        if (selectedAsset && selectedAsset.coordinates && selectedAsset.coordinates.length > 0) {
          map.addSource('selected', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: selectedAsset.coordinates,
              },
            },
          });

          map.addLayer({
            id: 'selected-asset-fill',
            type: 'fill',
            source: 'selected',
            paint: {
              'fill-color': '#e53e3e',
              'fill-opacity': 0.2,
            },
          });

          map.addLayer({
            id: 'selected-asset',
            type: 'line',
            source: 'selected',
            paint: {
              'line-color': '#e53e3e',
              'line-width': 3,
              'line-dasharray': [2, 1]
            },
          });

          // Calculate bounds and fly to the selected asset with more conservative zoom
          const bounds = calculateBounds([selectedAsset.coordinates]);
          if (bounds && bounds[0][0] !== undefined) {
            map.fitBounds(bounds as [[number, number], [number, number]], {
              padding: 40,
              maxZoom: 18, // Reduced from 20 for a more reasonable default zoom
              duration: 1000
            });
          }
        }
      } catch (error) {
        console.error('Error updating selected asset on map:', error);
      }
    };

    if (map.loaded()) {
      updateSelectedAsset();
    } else {
      map.once('load', updateSelectedAsset);
    }
  }, [selectedAsset]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const navigate = useNavigate();

  const handleAddNewAsset = () => {
    // Updated to navigate to the new asset page
    navigate('/new-asset');
  };

  const handleCloseModal = () => {
    // Remove modal related code
  };

  const handleSubmit = () => {
    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    if (data.features.length > 0) {
      const coordinates = data.features[0].geometry.coordinates;
      const newAsset = {
        CompanyId: user?.companyId,
        AssetId: `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userName: user?.username || 'Unknown User',
        name: assetName,
        coordinates,
      };

      const params = {
        TableName: 'Assets',
        Item: newAsset,
      };

      dynamoDb.put(params, (err) => {
        if (err) {
          alert('Failed to save asset');
        } else {
          setAssets([...assets, newAsset]);
          setFilteredAssets([...assets, newAsset]);
        }
      });
    } else {
      alert('Please draw a polygon on the map.');
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    const params = {
      TableName: 'Assets',
      Key: {
        CompanyId: user?.companyId,
        AssetId: assetId,
      },
    };

    dynamoDb.delete(params, (err) => {
      if (err) {
        alert('Failed to delete asset');
      } else {
        setAssets(assets.filter(asset => asset.AssetId !== assetId));
        setFilteredAssets(filteredAssets.filter(asset => asset.AssetId !== assetId));
        if (selectedAsset?.AssetId === assetId) setSelectedAsset(null);
      }
    });
  };

  const handleViewAsset = (asset: any) => {
    // Check if the asset has a centerPoint attribute
    if (asset.centerPoint && 
        Array.isArray(asset.centerPoint) && 
        asset.centerPoint.length === 2 &&
        typeof asset.centerPoint[0] === 'number' &&
        typeof asset.centerPoint[1] === 'number') {
      
      // If we have a valid centerPoint, zoom the map to this location first
      try {
        if (mapRef.current) {
          // Fly to the centerPoint with animation
          mapRef.current.flyTo({
            center: [asset.centerPoint[0], asset.centerPoint[1]],
            zoom: 18,
            duration: 1000
          });

          // Short delay before navigating to give the zoom animation time to complete
          setTimeout(() => {
            navigate(`/asset/${asset.AssetId}`, { state: { asset } });
          }, 1200);
          return;
        }
      } catch (error) {
        console.error('Error zooming to asset centerPoint:', error);
      }
    }
    
    // Fallback: If no centerPoint or error occurred, just navigate directly
    navigate(`/asset/${asset.AssetId}`, { state: { asset } });
  };

  useEffect(() => {
    // Remove modal related code
  }, [viewingAsset]);

  function updateArea(e: any) {
    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    if (data.features.length > 0) {
      const area = turf.area({ type: 'FeatureCollection', features: data.features });
      setRoundedArea(Math.round(area * 100) / 100);
    } else {
      setRoundedArea(undefined);
      if (e.type !== 'draw.delete') alert('Click the map to draw a polygon.');
    }
  }

  // Calculate total area of all assets
  const calculateTotalArea = () => {
    if (assets.length === 0) return 0;
    
    let totalArea = 0;
    assets.forEach(asset => {
      if (asset.coordinates && asset.coordinates.length > 0) {
        const polygon = turf.polygon(asset.coordinates);
        const area = turf.area(polygon);
        totalArea += area;
      }
    });
    return Math.round(totalArea * 100) / 100;
  };

  // Handle asset selection from the list
  const handleAssetSelect = (asset: any) => {
    try {
      // Toggle selection if already selected
      if (asset === selectedAsset) {
        setSelectedAsset(null);
      } else {
        setSelectedAsset(asset);
        
        // Focus on the selected asset in the map with more reasonable zoom
        if (mapRef.current && asset.coordinates && asset.coordinates.length > 0) {
          // Calculate bounds for the asset
          const bounds = calculateBounds([asset.coordinates]);
          // Fly to the asset with animation
          mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
            padding: 40,
            maxZoom: 18, // Reduced from 20
            duration: 1000 // Animation duration in milliseconds
          });
        }
      }
    } catch (error) {
      console.error('Error selecting asset:', error);
    }
  };

  // Update map when selectedAsset changes
  useEffect(() => {
    console.log('Selected asset changed:', selectedAsset?.name);
    const map = mapRef.current;
    if (!map) {
      console.warn('Map not initialized, cannot update selected asset');
      return;
    }
    
    try {
      // Check if map is loaded
      if (map.loaded()) {
        console.log('Map is loaded, updating selected asset');
        // Check which layers and sources exist
        const hasSelectedFill = map.getLayer('selected-asset-fill');
        const hasSelectedOutline = map.getLayer('selected-asset');
        const hasSelectedSource = map.getSource('selected');
        
        console.log('Existing selected layers/sources:', {
          'selected-asset-fill': hasSelectedFill,
          'selected-asset': hasSelectedOutline,
          'selected': hasSelectedSource
        });
        
        // Remove existing selected layer if it exists
        if (hasSelectedFill) map.removeLayer('selected-asset-fill');
        if (hasSelectedOutline) map.removeLayer('selected-asset');
        if (hasSelectedSource) map.removeSource('selected');

        if (selectedAsset && selectedAsset.coordinates && selectedAsset.coordinates.length > 0) {
          console.log('Adding selected asset to map');
          // Add selected asset source and layer
          map.addSource('selected', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: selectedAsset.coordinates,
              },
            },
          });

          map.addLayer({
            id: 'selected-asset',
            type: 'line',
            source: 'selected',
            paint: {
              'line-color': '#e53e3e',
              'line-width': 3,
              'line-dasharray': [2, 1]
            },
          });

          // Add fill for selected asset
          map.addLayer({
            id: 'selected-asset-fill',
            type: 'fill',
            source: 'selected',
            paint: {
              'fill-color': '#e53e3e',
              'fill-opacity': 0.2,
            },
          });
          
          console.log('Selected asset layers added successfully');
        } else if (selectedAsset) {
          console.warn('Selected asset has invalid coordinates:', selectedAsset.coordinates);
        }
      } else {
        console.log('Map not fully loaded, cannot update selected asset');
      }
    } catch (error) {
      console.error('Error updating selected asset on map:', error);
    }
  }, [selectedAsset]);

  // Function to calculate bounds - alternative approach without using LngLatBounds
  const calculateBounds = (coordinates: [number, number][][]) => {
    // Check if coordinates are valid and have at least one set of coordinates
    if (!coordinates || coordinates.length === 0 || !coordinates[0] || coordinates[0].length === 0) {
      // Return default bounds for UK
      return [[-8.0, 49.0], [2.0, 59.0]];
    }
    
    let minX = coordinates[0][0][0];
    let minY = coordinates[0][0][1];
    let maxX = coordinates[0][0][0];
    let maxY = coordinates[0][0][1];
    
    // Make sure these values are actually numbers
    if (typeof minX !== 'number' || typeof minY !== 'number' || isNaN(minX) || isNaN(minY)) {
      // Return default bounds for UK
      return [[-8.0, 49.0], [2.0, 59.0]];
    }
    
    coordinates.forEach(coordSet => {
      coordSet.forEach(coord => {
        // Ensure coordinates are valid numbers
        if (typeof coord[0] === 'number' && !isNaN(coord[0]) && 
            typeof coord[1] === 'number' && !isNaN(coord[1])) {
          if (coord[0] < minX) minX = coord[0];
          if (coord[1] < minY) minY = coord[1];
          if (coord[0] > maxX) maxX = coord[0];
          if (coord[1] > maxY) maxY = coord[1];
        }
      });
    });
    
    // One final check to make sure we're not returning NaN values
    if (isNaN(minX) || isNaN(minY) || isNaN(maxX) || isNaN(maxY)) {
      return [[-8.0, 49.0], [2.0, 59.0]];
    }
    
    // Return as [[southwest_lng, southwest_lat], [northeast_lng, northeast_lat]]
    return [[minX, minY], [maxX, maxY]];
  };

  // Format date to readable string
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

  // Add loading state
  const [dataLoaded, setDataLoaded] = useState(false);

  // In your useEffect or data fetching function
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Your existing fetch logic
        // ...
        
        // Set data loaded flag after successful fetch
        setDataLoaded(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Handle error appropriately
      }
    };
    
    fetchData();
  }, [user]);

  // Add the following useEffect near other initialization code
  useEffect(() => {
    // Check if we're coming from AssetDetails and if reload is requested
    const needsRefresh = sessionStorage.getItem('reloadAssetsPage') === 'true';
    
    if (needsRefresh) {
      console.log('Detected navigation from AssetDetails, refreshing assets');
      // Clear the flag
      sessionStorage.removeItem('reloadAssetsPage');
      
      // Refresh assets list if needed
      if (setAssets) {
        setAssets([]);
      }
    }
    
    // Cleanup on unmount
    return () => {
      // Clear any remaining navigation flags
      sessionStorage.removeItem('navigating_to_assets');
    };
  }, [setAssets]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      {/* Hero section with gradient background */}
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

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading your assets...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
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
        ) : assets.length === 0 ? (
          <div className="bg-white shadow-lg rounded-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-500 mb-6">Create your first asset to start monitoring your properties.</p>
            <button
              onClick={handleAddNewAsset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create First Asset
            </button>
          </div>
        ) : (
          <div>
            {/* Search bar */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search assets by name..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                />
              </div>
            </div>

            {/* Asset stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Assets</h3>
                    <p className="text-lg font-semibold text-gray-900">{assets.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Area</h3>
                    <p className="text-lg font-semibold text-gray-900">{calculateTotalArea()} m²</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Selected Asset</h3>
                    <p className="text-lg font-semibold text-gray-900">{selectedAsset ? selectedAsset.name : 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map and asset list */}
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-380px)]">
              {/* Assets List with improved design */}
              <div className="lg:w-1/3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    All Assets
                  </h2>
                </div>
                
                {filteredAssets.length === 0 ? (
                  <div className="p-6 text-center flex-grow flex items-center justify-center">
                    <div>
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500">No assets match your search criteria.</p>
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-grow">
                    <ul className="divide-y divide-gray-200">
                      {filteredAssets.map(asset => (
                        <li 
                          key={asset.AssetId}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${selectedAsset?.AssetId === asset.AssetId ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                          onClick={() => handleAssetSelect(asset)}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-gray-900 truncate">{asset.name}</h3>
                                <div className="mt-1 flex items-center">
                                  {asset.type && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                      {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                                    </span>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    {asset.coordinates && asset.coordinates.length > 0 ? 
                                      `${Math.round(turf.area(turf.polygon(asset.coordinates)) * 100) / 100} m²` : 
                                      'No area data'}
                                  </span>
                                </div>
                                {asset.userName && (
                                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {asset.userName}
                                    {asset.createdAt && (
                                      <span className="ml-2 text-gray-400">
                                        {new Date(asset.createdAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <div className="ml-4 flex-shrink-0 flex">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewAsset(asset);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAsset(asset.AssetId);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Map container with improved styling */}
              <div className="lg:w-2/3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-full w-full relative">
                  {dataLoaded ? (
                    <Map
                      mapboxAccessToken="pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q"
                      scrollZoom={true}
                      initialViewState={viewState}
                      onLoad={(event: any) => {
                        try {
                          mapRef.current = event.target;
                          if (assets.length > 0 && !loading) {
                            if (mapRef.current) {
                              loadAssetsOnMap(mapRef.current);
                            }
                          }
                        } catch (err) {
                          console.warn('Error in map onLoad:', err);
                        }
                      }}
                      onRemove={() => {
                        mapRef.current = null;
                      }}
                      onMove={(evt: any) => setViewState(evt.viewState)}
                      style={{ width: '100%', height: '100%' }}
                      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    >
                      {/* <NavigationControl position="top-right" /> */}
                      
                      {/* Add asset polygons as Source and Layer */}
                      {assets.length > 0 && (
                        <Source
                          id="assets-source"
                          type="geojson"
                          data={{
                            type: 'FeatureCollection',
                            features: assets.map(asset => ({
                              type: 'Feature',
                              properties: {
                                id: asset.AssetId,
                                name: asset.name,
                              },
                              geometry: {
                                type: 'Polygon',
                                coordinates: asset.coordinates,
                              },
                            })),
                          }}
                        >
                          <Layer
                            id="asset-fills"
                            type="fill"
                            paint={{
                              'fill-color': '#3182ce',
                              'fill-opacity': 0.4,
                            }}
                          />
                          <Layer
                            id="asset-outlines"
                            type="line"
                            paint={{
                              'line-color': '#2c5282',
                              'line-width': 2,
                            }}
                          />
                        </Source>
                      )}
                      
                      {/* Add selected asset if one is selected */}
                      {selectedAsset && selectedAsset.coordinates && (
                        <Source
                          id="selected-asset-source"
                          type="geojson"
                          data={{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                              type: 'Polygon',
                              coordinates: selectedAsset.coordinates,
                            },
                          }}
                        >
                          <Layer
                            id="selected-asset-fill"
                            type="fill"
                            paint={{
                              'fill-color': '#e53e3e',
                              'fill-opacity': 0.2,
                            }}
                          />
                          <Layer
                            id="selected-asset-line"
                            type="line"
                            paint={{
                              'line-color': '#e53e3e',
                              'line-width': 3,
                              'line-dasharray': [2, 1],
                            }}
                          />
                        </Source>
                      )}
                      
                      {/* Add markers for each asset */}
                      {assets.map(asset => {
                        if (!asset.coordinates || asset.coordinates.length === 0) return null;
                        
                        // Calculate centroid for marker placement
                        const feature = {
                          type: 'Feature' as const,
                          properties: {},
                          geometry: {
                            type: 'Polygon' as const,
                            coordinates: asset.coordinates,
                          },
                        };
                        const centroid = turf.centroid(feature as turf.AllGeoJSON).geometry.coordinates;
                        
                        return (
                          <React.Fragment key={asset.AssetId}>
                            <Marker
                              longitude={centroid[0]}
                              latitude={centroid[1]}
                            >
                              <div
                                className="group"
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setShowPopup({...showPopup, [asset.AssetId]: true});
                                }}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full transition-all duration-200 shadow-md cursor-pointer 
                                    ${selectedAsset?.AssetId === asset.AssetId 
                                      ? 'bg-red-500 border-2 border-white scale-125' 
                                      : 'bg-blue-500 border border-white hover:scale-110'}`}
                                />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  <div className="bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap">
                                    {asset.name}
                                  </div>
                                </div>
                              </div>
                            </Marker>
                            
                            {showPopup[asset.AssetId] && (
                              <Popup
                                longitude={centroid[0]}
                                latitude={centroid[1]}
                                closeButton={true}
                                closeOnClick={false}
                                onClose={() => setShowPopup({...showPopup, [asset.AssetId]: false})}
                                anchor="bottom"
                                className="z-10"
                              >
                                <div className="p-2">
                                  <h3 className="font-bold text-gray-900">{asset.name}</h3>
                                  <p className="text-sm text-gray-700">Area: {Math.round(turf.area(turf.polygon(asset.coordinates)) * 100) / 100} m²</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewAsset(asset);
                                    }}
                                    className="mt-2 w-full text-center text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </Popup>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </Map>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading map data...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Map overlay with asset info when selected */}
                  {selectedAsset && (
                    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-gray-900 truncate">{selectedAsset.name}</h3>
                          <button 
                            onClick={() => setSelectedAsset(null)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {selectedAsset.type && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                            {selectedAsset.type.charAt(0).toUpperCase() + selectedAsset.type.slice(1)}
                          </span>
                        )}
                        <p className="text-sm text-gray-600 mb-3">
                          Area: {selectedAsset.coordinates && selectedAsset.coordinates.length > 0 ? 
                            `${Math.round(turf.area(turf.polygon(selectedAsset.coordinates)) * 100) / 100} m²` : 
                            'No area data'}
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewAsset(selectedAsset)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 px-3 rounded transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(selectedAsset.AssetId)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 px-3 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
