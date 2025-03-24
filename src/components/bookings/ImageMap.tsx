import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, MapRef, Source, Layer, Popup } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxLogger from '../../utils/mapboxLogger';
import GeoTiffUtils from '../../utils/geoTiffUtils';
// Import geotiff library for direct GeoTIFF parsing
import { fromUrl } from 'geotiff';

interface ImageMapProps {
  imageLocations: { 
    url: string; 
    latitude: number; 
    longitude: number;
    // Add optional additional properties that might be available from ImageUploads
    name?: string;
    metadata?: any;
    altitude?: number;
    heading?: number;
  }[];
  bookingId: string;
  mapboxAccessToken: string;
  geoTiffFilename?: string | null;
  geoTiffUrl?: string | null;
  onMapLoad?: (event: any) => void;
  mapRef?: React.RefObject<MapRef>;
}

export const ImageMap: React.FC<ImageMapProps> = ({
  imageLocations,
  bookingId,
  mapboxAccessToken,
  geoTiffFilename,
  geoTiffUrl,
  onMapLoad,
  mapRef: externalMapRef
}) => {
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoTiffLoaded, setGeoTiffLoaded] = useState(false);
  const [geoTiffError, setGeoTiffError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  
  // Add state for enlarged map view
  const [isEnlarged, setIsEnlarged] = useState(false);
  
  const internalMapRef = useRef<MapRef>(null);
  
  // Store GeoTIFF bounding box information for proper positioning
  const [geoTiffBounds, setGeoTiffBounds] = useState<[number, number, number, number] | null>(null);
  
  // Add state for GeoTIFF metadata
  const [geoTiffMetadata, setGeoTiffMetadata] = useState<any>(null);
  
  // Add state for popup management
  const [popupInfo, setPopupInfo] = useState<{
    latitude: number;
    longitude: number;
    url: string;
    name?: string;
    heading?: number;
    altitude?: number;
  } | null>(null);
  
  // Center map on image locations if available
  useEffect(() => {
    if (imageLocations.length > 0) {
      const avgLat = imageLocations.reduce((sum, loc) => sum + loc.latitude, 0) / imageLocations.length;
      const avgLng = imageLocations.reduce((sum, loc) => sum + loc.longitude, 0) / imageLocations.length;
      
      setViewState({
        latitude: avgLat,
        longitude: avgLng,
        zoom: 15
      });
    }
  }, [imageLocations]);

  const handleMapLoad = (event: any) => {
    MapboxLogger.log("Map loaded successfully");
    setMapLoaded(true);
    
    // Store the raw mapbox-gl instance for direct access
    const map = event.target;
    setMapInstance(map);
    
    // Call external onMapLoad if provided
    if (onMapLoad) {
      onMapLoad(event);
    }
  };

  // Function to add GeoTiff to the map
  const addGeoTiffToMap = async (url = geoTiffUrl) => {
    if (!mapLoaded || !mapInstance || !url) {
      MapboxLogger.warn("Cannot add GeoTIFF: Map not loaded or URL not available");
      return;
    }
    
    setIsLoading(true);
    MapboxLogger.log(`Adding GeoTIFF to map: ${url}`);
    
    try {
      // Clean up any existing GeoTIFF layers/sources
      if (mapInstance.getLayer('geotiff-layer')) {
        mapInstance.removeLayer('geotiff-layer');
      }
      
      if (mapInstance.getSource('geotiff-source')) {
        mapInstance.removeSource('geotiff-source');
      }
      
      // Also clean up fallback visualization if it exists
      if (mapInstance.getLayer('geotiff-area-outline')) {
        mapInstance.removeLayer('geotiff-area-outline');
      }
      
      if (mapInstance.getLayer('geotiff-area-fill')) {
        mapInstance.removeLayer('geotiff-area-fill');
      }
      
      if (mapInstance.getLayer('geotiff-area-pattern')) {
        mapInstance.removeLayer('geotiff-area-pattern');
      }
      
      if (mapInstance.getSource('geotiff-area')) {
        mapInstance.removeSource('geotiff-area');
      }
      
      // Parse the GeoTIFF directly to get its metadata and bounding box
      try {
        MapboxLogger.log("Loading GeoTIFF metadata...");
        
        // Load the GeoTIFF and get its metadata
        const tiff = await fromUrl(url);
        const image = await tiff.getImage();
        
        // Get dimensions and bounding box
        const width = image.getWidth();
        const height = image.getHeight();
        const bbox = image.getBoundingBox();
        
        // Extract more metadata
        const metadata: any = {
          width,
          height,
          bbox,
          samplesPerPixel: image.getSamplesPerPixel(),
          resolution: image.getResolution(),
          origin: image.getOrigin(),
        };
        
        // Try to get additional GeoTIFF tags that might contain camera direction info
        try {
          const fileDirectory = image.getFileDirectory();
          metadata.fileDirectory = fileDirectory;
          
          // Extract GeoTIFF keys which might contain direction/orientation info
          const geoKeys = image.getGeoKeys();
          if (geoKeys) {
            metadata.geoKeys = geoKeys;
          }
          
          // Try to extract EXIF data which might have camera orientation
          if (fileDirectory.ExifIFD) {
            metadata.exif = fileDirectory.ExifIFD;
          }
          
          // Look for any GPS related tags
          const gpsInfo = Object.keys(fileDirectory)
            .filter(key => key.startsWith('GPS'))
            .reduce((obj, key) => {
              obj[key] = fileDirectory[key];
              return obj;
            }, {} as any);
            
          if (Object.keys(gpsInfo).length > 0) {
            metadata.gps = gpsInfo;
          }
          
          // We no longer need to extract coordinates from GeoTIFF
          // We'll use the coordinates from imageLocations instead
          
        } catch (metadataError) {
          MapboxLogger.warn("Could not extract extended metadata", metadataError);
        }
        
        // Set metadata and log to console
        setGeoTiffMetadata(metadata);
        console.log("GeoTIFF Metadata:", metadata);
        MapboxLogger.debug("GeoTIFF info:", metadata);
        
        // Extract corners for proper display
        const [xmin, ymin, xmax, ymax] = bbox;
        
        // Store the bounds for reference
        setGeoTiffBounds(bbox);
        
        // Read the raster data
        const rasterData = await image.readRasters();
        const samplesPerPixel = image.getSamplesPerPixel();
        
        // Create RGBA array for the image
        const rgba = new Uint8ClampedArray(width * height * 4);
        
        // Check if rasterData is an array before trying to access indices
        if (Array.isArray(rasterData)) {
          // Fill the RGBA array based on the number of bands in the GeoTIFF
          for (let i = 0; i < width * height; i++) {
            if (samplesPerPixel === 1) {
              // Grayscale image
              const val = rasterData[0][i];
              rgba[i * 4] = val;     // R
              rgba[i * 4 + 1] = val; // G
              rgba[i * 4 + 2] = val; // B
              rgba[i * 4 + 3] = 255; // Alpha
            } else if (samplesPerPixel >= 3) {
              // RGB or RGBA image
              rgba[i * 4] = rasterData[0][i];     // R
              rgba[i * 4 + 1] = rasterData[1][i]; // G
              rgba[i * 4 + 2] = rasterData[2][i]; // B
              rgba[i * 4 + 3] = rasterData[3] ? rasterData[3][i] : 255; // Alpha
            }
          }
        } else {
          // Handle the case where rasterData is ArrayBuffer (unlikely but possible)
          throw new Error('Unexpected raster data format: received ArrayBuffer instead of an array');
        }
        
        // Create an ImageData object
        const imageData = new ImageData(rgba, width, height);
        
        // Convert to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        // Put the image data on the canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Create a blob URL from the canvas
        const canvasDataURL = canvas.toDataURL('image/png');
        
        // Add the image to the map
        mapInstance.addSource('geotiff-source', {
          type: 'image',
          url: canvasDataURL,
          coordinates: [
            [xmin, ymax], // Top-left
            [xmax, ymax], // Top-right
            [xmax, ymin], // Bottom-right
            [xmin, ymin], // Bottom-left
          ]
        });
        
        // Add a raster layer to display the GeoTIFF
        mapInstance.addLayer({
          id: 'geotiff-layer',
          type: 'raster',
          source: 'geotiff-source',
          paint: {
            'raster-opacity': 0.9,
            'raster-resampling': 'linear',
          }
        });
        
        // Fit the map view to the GeoTIFF bounds
        mapInstance.fitBounds(
          [[xmin, ymin], [xmax, ymax]], 
          { padding: 50, animate: true }
        );
        
        // Also update our state to match
        const centerLng = (xmin + xmax) / 2;
        const centerLat = (ymin + ymax) / 2;
        
        setViewState({
          longitude: centerLng,
          latitude: centerLat,
          zoom: mapInstance.getZoom()
        });
        
        // Success!
        setGeoTiffLoaded(true);
        setGeoTiffError(null);
        MapboxLogger.log("GeoTIFF added successfully");
        
      } catch (geotiffError) {
        MapboxLogger.error("Error processing GeoTIFF:", geotiffError);
        
        // Calculate fallback coordinates for visualization
        let coordinates: [[number, number], [number, number], [number, number], [number, number]];
        
        if (imageLocations.length > 0) {
          // If we have image locations, use their bounds (with some padding)
          const lngs = imageLocations.map(loc => loc.longitude);
          const lats = imageLocations.map(loc => loc.latitude);
          
          const minLng = Math.min(...lngs) - 0.002;
          const maxLng = Math.max(...lngs) + 0.002;
          const minLat = Math.min(...lats) - 0.002;
          const maxLat = Math.max(...lats) + 0.002;
          
          coordinates = [
            [minLng, maxLat], // top-left (NW)
            [maxLng, maxLat], // top-right (NE)
            [maxLng, minLat], // bottom-right (SE)
            [minLng, minLat]  // bottom-left (SW)
          ];
        } else {
          // Fallback to viewport coordinates with a reasonable area
          coordinates = [
            [viewState.longitude - 0.02, viewState.latitude + 0.02], // top-left
            [viewState.longitude + 0.02, viewState.latitude + 0.02], // top-right
            [viewState.longitude + 0.02, viewState.latitude - 0.02], // bottom-right
            [viewState.longitude - 0.02, viewState.latitude - 0.02]  // bottom-left
          ];
        }
        
        // Fall back to a visual representation
        createFallbackVisualization(coordinates, url);
      }
    } catch (error) {
      handleDirectImageLoadError(error, url);
    } finally {
      setIsLoading(false);
    }
  };

  // Create fallback visualization with the area where the GeoTIFF should be
  const createFallbackVisualization = (
    coordinates: [[number, number], [number, number], [number, number], [number, number]],
    url?: string
  ) => {
    if (!mapInstance) return;
    
    try {
      MapboxLogger.log("Creating fallback visualization for GeoTIFF area");
      
      // Create a polygon to visualize the area
      const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            coordinates.map(coord => coord)
          ]
        }
      };
      
      // Add polygon to visualize the area
      mapInstance.addSource('geotiff-area', {
        type: 'geojson',
        data: polygon
      });
      
      // Add outline (red dashed line)
      mapInstance.addLayer({
        id: 'geotiff-area-outline',
        type: 'line',
        source: 'geotiff-area',
        layout: {},
        paint: {
          'line-color': '#FF0000',
          'line-width': 2,
          'line-dasharray': [2, 1]
        }
      });
      
      // Add fill (transparent red)
      mapInstance.addLayer({
        id: 'geotiff-area-fill',
        type: 'fill',
        source: 'geotiff-area',
        layout: {},
        paint: {
          'fill-color': '#FF0000',
          'fill-opacity': 0.1
        }
      });
      
      // Add a pattern to indicate this is where the GeoTIFF would be
      mapInstance.addLayer({
        id: 'geotiff-area-pattern',
        type: 'fill',
        source: 'geotiff-area',
        paint: {
          'fill-pattern': 'geotiff-placeholder',
          'fill-opacity': 0.8
        }
      });
      
      // Fit map to the area
      const sw: [number, number] = [
        Math.min(coordinates[0][0], coordinates[3][0]), 
        Math.min(coordinates[2][1], coordinates[3][1])
      ];
      const ne: [number, number] = [
        Math.max(coordinates[1][0], coordinates[2][0]), 
        Math.max(coordinates[0][1], coordinates[1][1])
      ];
      
      mapInstance.fitBounds([sw, ne], {
        padding: 50,
        maxZoom: 18
      });
      
      if (url) {
        // Set a non-critical error that explains what happened
        setGeoTiffError(
          "GeoTIFF file cannot be displayed directly in browser. Showing coverage area instead. " +
          "You can convert this to a web-friendly format or view in a GIS application."
        );
      } else {
        setGeoTiffError("GeoTIFF area shown, but no valid file URL was provided.");
      }
      
      setGeoTiffLoaded(false);
      setIsLoading(false);
      
    } catch (error) {
      MapboxLogger.error("Error creating fallback visualization:", error);
      setGeoTiffError("Failed to create visualization for GeoTIFF area.");
      setGeoTiffLoaded(false);
      setIsLoading(false);
    }
  };
  
  // Try adding custom pattern to the map when it's loaded
  useEffect(() => {
    if (mapLoaded && mapInstance) {
      // Try to add a pattern for the fallback visualization
      try {
        // Create a canvas for the pattern
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 64;
        patternCanvas.height = 64;
        const ctx = patternCanvas.getContext('2d');
        
        if (ctx) {
          // Draw a pattern that indicates "image missing"
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 1;
          
          // Draw diagonal lines
          ctx.beginPath();
          for (let i = -64; i < 64; i += 8) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 64, 64);
          }
          ctx.stroke();
          
          // Add "GeoTIFF" text
          ctx.font = '10px Arial';
          ctx.fillStyle = '#FF0000';
          ctx.fillText('GeoTIFF', 10, 32);
          
          // Add the image to the map as a pattern
          mapInstance.addImage('geotiff-placeholder', 
            { width: 64, height: 64, data: new Uint8Array(ctx.getImageData(0, 0, 64, 64).data) },
            { pixelRatio: 1 }
          );
        }
      } catch (error) {
        MapboxLogger.warn("Could not add pattern for GeoTIFF placeholder:", error);
      }
    }
  }, [mapLoaded, mapInstance]);

  // Handle errors from direct image loading
  const handleDirectImageLoadError = (error: any, url?: string, coordinates?: [[number, number], [number, number], [number, number], [number, number]]) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    MapboxLogger.error("Error adding GeoTIFF to map:", error);
    
    // Try alternative approach - use pre-tiled raster source
    if (url && coordinates && mapInstance) {
      try {
        MapboxLogger.log("Trying alternative approach with raster tiles");
        
        // Create a polygon around our area of interest
        const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              coordinates.map(coord => coord)
            ]
          }
        };
        
        // Add polygon to visualize the area
        mapInstance.addSource('geotiff-area', {
          type: 'geojson',
          data: polygon
        });
        
        mapInstance.addLayer({
          id: 'geotiff-area-outline',
          type: 'line',
          source: 'geotiff-area',
          layout: {},
          paint: {
            'line-color': '#FF0000',
            'line-width': 2,
            'line-dasharray': [2, 1]
          }
        });
        
        mapInstance.addLayer({
          id: 'geotiff-area-fill',
          type: 'fill',
          source: 'geotiff-area',
          layout: {},
          paint: {
            'fill-color': '#FF0000',
            'fill-opacity': 0.1
          }
        });
        
        // Fit map to the orthophoto bounds
        const sw: [number, number] = [
          Math.min(coordinates[0][0], coordinates[3][0]), 
          Math.min(coordinates[2][1], coordinates[3][1])
        ];
        const ne: [number, number] = [
          Math.max(coordinates[1][0], coordinates[2][0]), 
          Math.max(coordinates[0][1], coordinates[1][1])
        ];
        
        mapInstance.fitBounds([sw, ne], {
          padding: 50,
          maxZoom: 18
        });
        
        setGeoTiffError(`Could not load GeoTIFF directly: ${errorMessage}. Showing estimated coverage area instead.`);
        setGeoTiffLoaded(false);
      } catch (fallbackError) {
        MapboxLogger.error("Fallback approach also failed:", fallbackError);
        setGeoTiffError(`Failed to load GeoTIFF: ${errorMessage}. Fallback also failed.`);
        setGeoTiffLoaded(false);
      }
    } else {
      setGeoTiffError(`Failed to load GeoTIFF: ${errorMessage}`);
      setGeoTiffLoaded(false);
    }
    
    setIsLoading(false);
  };
  
  // Handle image load errors
  const handleImageLoadError = (url?: string, coordinates?: [[number, number], [number, number], [number, number], [number, number]]) => {
    MapboxLogger.error("Image failed to load:", url);
    
    if (coordinates && mapInstance) {
      // Create a visual representation of the area where GeoTIFF should be
      try {
        const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              coordinates.map(coord => coord)
            ]
          }
        };
        
        mapInstance.addSource('geotiff-area', {
          type: 'geojson',
          data: polygon
        });
        
        mapInstance.addLayer({
          id: 'geotiff-area-outline',
          type: 'line',
          source: 'geotiff-area',
          layout: {},
          paint: {
            'line-color': '#FF0000',
            'line-width': 2,
            'line-dasharray': [2, 1]
          }
        });
        
        mapInstance.addLayer({
          id: 'geotiff-area-fill',
          type: 'fill',
          source: 'geotiff-area',
          layout: {},
          paint: {
            'fill-color': '#FF0000',
            'fill-opacity': 0.1
          }
        });
        
        // Fit map to the area
        const sw: [number, number] = [
          Math.min(coordinates[0][0], coordinates[3][0]), 
          Math.min(coordinates[2][1], coordinates[3][1])
        ];
        const ne: [number, number] = [
          Math.max(coordinates[1][0], coordinates[2][0]), 
          Math.max(coordinates[0][1], coordinates[1][1])
        ];
        
        mapInstance.fitBounds([sw, ne], {
          padding: 50,
          maxZoom: 18
        });
      } catch (error) {
        MapboxLogger.error("Error creating fallback visualization:", error);
      }
    }
    
    setGeoTiffError("Failed to load GeoTIFF image. The format may not be directly supported by the browser or CORS settings may be preventing access.");
    setGeoTiffLoaded(false);
    setIsLoading(false);
  };

  // Try to add GeoTIFF to map when everything is ready
  useEffect(() => {
    if (mapLoaded && mapInstance && (geoTiffUrl) && !geoTiffLoaded) {
      // Wait a moment to ensure map is fully initialized
      const timer = setTimeout(() => {
        MapboxLogger.log("Attempting to add GeoTIFF to map");
        addGeoTiffToMap();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, mapInstance, geoTiffUrl, geoTiffLoaded]);

  // Toggle enlarged map view
  const toggleEnlargedView = () => {
    setIsEnlarged(!isEnlarged);
    
    // Need to notify map to resize after DOM changes
    setTimeout(() => {
      if (mapInstance) {
        mapInstance.resize();
      }
    }, 100);
  };

  // Close popup when clicking elsewhere on the map
  const handleMapClick = (event: mapboxgl.MapLayerMouseEvent) => {
    // Check if the click is on a marker
    const features = mapInstance?.queryRenderedFeatures(event.point, {
      layers: ['markers-layer'] // You would need to add this layer if you want this behavior
    });
    
    // If not clicking on a marker, close the popup
    if (!features || features.length === 0) {
      setPopupInfo(null);
    }
  };

  // Add this effect to handle key press events for escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEnlarged) {
        toggleEnlargedView();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnlarged]);

  return (
    <div 
      className={`${isEnlarged ? 'fixed inset-0 z-50 bg-black' : 'relative w-full h-[600px]'} rounded-lg border border-gray-200 overflow-hidden`}
      style={{ 
        width: isEnlarged ? '100vw' : '100%', 
        height: isEnlarged ? '100vh' : '600px',
        top: isEnlarged ? 0 : 'auto',
        left: isEnlarged ? 0 : 'auto'
      }}
    >
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        mapboxAccessToken={mapboxAccessToken}
        style={{ width: '100%', height: '100%' }}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        ref={externalMapRef || internalMapRef}
      >
        {/* Image location markers from ImageUploads with more detailed markers */}
        {imageLocations.map((location, index) => (
          <Marker 
            key={`img-${index}`}
            longitude={location.longitude}
            latitude={location.latitude}
            anchor="center"
            scale={0.7}
            onClick={(e: mapboxgl.MapLayerMouseEvent) => {
              // Prevent click event from propagating to the map
              (e.originalEvent as MouseEvent).stopPropagation();
              setPopupInfo(location);
            }}
          >
            <div className="relative">
              {/* Base marker circle */}
              <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-800 transition-colors" />
              
              {/* Direction arrow - properly attached to the marker */}
              {location.heading !== undefined && (
                <div 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{
                    transform: `rotate(${location.heading}deg)`,
                  }}
                >
                  <div className="absolute w-6 h-4 top-[-4px] left-0">
                    <svg 
                      viewBox="0 0 24 12" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full"
                    >
                      <path 
                        d="M12 0L24 12H0L12 0Z" 
                        fill="white" 
                        stroke="#2563EB"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </Marker>
        ))}
        
        {/* Popup for displaying image when marker is clicked */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="map-image-popup"
            maxWidth="300px"
          >
            <div className="p-1">
              <h3 className="text-sm font-medium mb-1 text-gray-900">
                {popupInfo.name || 'Image'}
              </h3>
              <div className="image-container mb-2 relative w-full" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                <img 
                  src={popupInfo.url} 
                  alt={popupInfo.name || 'Drone image'} 
                  className="w-full object-cover rounded shadow-sm"
                  style={{ maxHeight: '200px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                  }}
                />
              </div>
              <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                {popupInfo.heading !== undefined && (
                  <div>
                    <span className="font-medium">Heading:</span> {popupInfo.heading.toFixed(1)}°
                  </div>
                )}
                {popupInfo.altitude !== undefined && (
                  <div>
                    <span className="font-medium">Altitude:</span> {popupInfo.altitude.toFixed(1)}m
                  </div>
                )}
                <div className="col-span-2 mt-1">
                  <a 
                    href={popupInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Full Image
                  </a>
                </div>
              </div>
            </div>
          </Popup>
        )}
        
        {/* Add zoom controls */}
        {/* <NavigationControl position="top-right" /> */}
      </Map>
      
      {/* Fullscreen toggle button */}
      <button 
        onClick={toggleEnlargedView}
        className={`absolute ${isEnlarged ? 'top-6 right-6' : 'top-4 right-4'} bg-white rounded-md shadow-md p-2 z-30 hover:bg-gray-100`}
        title={isEnlarged ? "Exit fullscreen" : "View fullscreen"}
        style={{ fontSize: isEnlarged ? '16px' : '14px' }}
      >
        {isEnlarged ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        )}
      </button>
      
      {/* GeoTIFF status indicator */}
      {geoTiffUrl && (
        <div className="absolute top-4 left-4 bg-white rounded-md shadow-md p-2 max-w-xs z-10">
          <div className="flex items-center space-x-2">
            {geoTiffLoaded ? (
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            ) : (
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            )}
            <span className="text-sm font-medium text-gray-700 truncate">
              {geoTiffLoaded 
                ? "GeoTIFF Overlay Active" 
                : "Loading GeoTIFF..."}
            </span>
          </div>
          {geoTiffFilename && (
            <p className="text-xs text-gray-500 mt-1 truncate">File: {geoTiffFilename}</p>
          )}
          {geoTiffLoaded && geoTiffBounds && (
            <p className="text-xs text-green-600 mt-1">
              Using native GeoTIFF coordinates
            </p>
          )}
          {geoTiffMetadata && (
            <div className="text-xs text-gray-600 mt-1">
              <p>Resolution: {Math.round(geoTiffMetadata.width)} x {Math.round(geoTiffMetadata.height)}</p>
              {geoTiffMetadata.resolution && (
                <p>GSD: {geoTiffMetadata.resolution[0].toFixed(2)} m/px</p>
              )}
            </div>
          )}
          {imageLocations.length > 0 && (
            <div className="text-xs text-green-600 mt-1">
              <p>Showing {imageLocations.length} image locations</p>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Error message with more info and additional options */}
      {geoTiffError && (
        <div className={`absolute ${isEnlarged ? 'bottom-8' : 'bottom-4'} left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md z-10`}>
          <p className="text-sm"><strong>Error:</strong> {geoTiffError}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button 
              className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              onClick={() => addGeoTiffToMap()}
            >
              Retry
            </button>
            <button 
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded flex items-center"
              onClick={() => window.open(geoTiffUrl || '', '_blank')}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Download GeoTIFF
            </button>
            {/* Add button to view in a specialized web service for GeoTIFFs */}
            <button 
              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded flex items-center"
              onClick={() => {
                const url = geoTiffUrl;
                if (url) {
                  const encodedUrl = encodeURIComponent(url);
                  window.open(`https://geotiff.io/?url=${encodedUrl}`, '_blank');
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0015.75 2H4.25zM15 5.75a.75.75 0 00-1.5 0v8.5a.75.75 0 001.5 0v-8.5zm-4 4a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-4-2a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" clipRule="evenodd" />
              </svg>
              View in GeoTIFF.io
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Note: GeoTIFF files cannot be displayed directly in browsers. You can download the file and 
            view it in a GIS application like QGIS, or use specialized web services like GeoTIFF.io.
          </p>
        </div>
      )}
      
      {/* Empty state */}
      {imageLocations.length === 0 && !geoTiffUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
          <div className="text-center p-4">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Image Data</h3>
            <p className="mt-1 text-sm text-gray-500">No geotagged images or GeoTIFF files available for this booking.</p>
          </div>
        </div>
      )}
      
      {/* Global loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-20">
          <div className="bg-white rounded-lg p-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <p className="text-sm font-medium text-gray-600 mt-2">Processing GeoTIFF...</p>
          </div>
        </div>
      )}
    </div>
  );
};
