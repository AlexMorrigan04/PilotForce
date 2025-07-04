import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, MapRef, Source, Layer, Popup, ViewStateChangeEvent, MapLayerMouseEvent } from 'react-map-gl';
import * as mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxLogger from '../../utils/mapboxLogger';
import GeoTiffUtils from '../../utils/geoTiffUtils';
import { fromUrl } from 'geotiff';
import { 
  normalizeGeoTiffUrl, 
  generateAlternativeGeoTiffUrls, 
  analyzeS3Url 
} from '../../utils/geoTiffNormalizer';
import { 
  createGeoTiffDiagnosticReport, 
  testGeoTiffUrl 
} from '../../utils/geoTiffDiagnostic';

interface ImageMapProps {
  imageLocations: { 
    url: string; 
    latitude: number; 
    longitude: number;
    name?: string;
    metadata?: any;
    altitude?: number;
    heading?: number;
    timestamp?: string;
    cameraModel?: string;
    droneModel?: string;
  }[];
  bookingId: string;
  mapboxAccessToken: string;
  geoTiffFilename?: string | null;
  geoTiffUrl?: string | null;
  onMapLoad?: (event: any) => void;
  mapRef?: React.RefObject<MapRef>;
  geoTiffResources?: any[];
}

export const ImageMap: React.FC<ImageMapProps> = ({
  imageLocations,
  bookingId,
  mapboxAccessToken,
  geoTiffFilename,
  geoTiffUrl,
  onMapLoad,
  mapRef: externalMapRef,
  geoTiffResources = []
}) => {
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12,
    pitch: 0
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoTiffLoaded, setGeoTiffLoaded] = useState(false);
  const [geoTiffError, setGeoTiffError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const internalMapRef = useRef<MapRef>(null);
  const [geoTiffBounds, setGeoTiffBounds] = useState<[number, number, number, number] | null>(null);
  const [geoTiffMetadata, setGeoTiffMetadata] = useState<any>(null);
  const [popupInfo, setPopupInfo] = useState<{
    latitude: number;
    longitude: number;
    url: string;
    name?: string;
    heading?: number;
    altitude?: number;
    timestamp?: string;
    cameraModel?: string;
    droneModel?: string;
  } | null>(null);

  useEffect(() => {
    if (imageLocations.length > 0) {
      const avgLat = imageLocations.reduce((sum, loc) => sum + loc.latitude, 0) / imageLocations.length;
      const avgLng = imageLocations.reduce((sum, loc) => sum + loc.longitude, 0) / imageLocations.length;
      setViewState({
        latitude: avgLat,
        longitude: avgLng,
        zoom: 15,
        pitch: viewState.pitch
      });
    }
  }, [imageLocations]);

  useEffect(() => {
    if (geoTiffResources && geoTiffResources.length > 0) {
      MapboxLogger.log(`Received ${geoTiffResources.length} GeoTIFF resources from FlightDetails component`);
      geoTiffResources.forEach((resource, index) => {
      });
    }
  }, [geoTiffResources]);

  useEffect(() => {
    if (mapInstance && geoTiffUrl && geoTiffFilename) {
      MapboxLogger.log('GeoTIFF URL is available on map load');
      addGeoTiff(geoTiffUrl);
    }
  }, [mapInstance, geoTiffUrl, geoTiffFilename]);

  useEffect(() => {
    if (mapInstance && geoTiffResources?.length > 0) {
      MapboxLogger.log(`Received ${geoTiffResources.length} GeoTIFF resources from FlightDetails component`);
      
      geoTiffResources.forEach((resource, index) => {
        const url = resource.url || resource.presignedUrl;
        const name = resource.name || resource.FileName;
      });
      
      if (mapInstance.loaded() && !geoTiffLoaded) {
        const firstGeoTiff = geoTiffResources[0];
        const url = firstGeoTiff.url || firstGeoTiff.presignedUrl;
        if (url) {
          addGeoTiff(url);
        }
      }
    }
  }, [mapInstance, geoTiffResources]);

  const addGeoTiff = async (url: string) => {
    if (!url) return;

    try {
      const normalizedUrl = normalizeGeoTiffUrl(url);
      
      const isValid = await testGeoTiffUrl(normalizedUrl);
      
      if (!isValid) {
        const alternativeUrls = generateAlternativeGeoTiffUrls(normalizedUrl);
        
        let validUrl = null;
        for (const altUrl of alternativeUrls) {
          const altIsValid = await testGeoTiffUrl(altUrl);
          if (altIsValid) {
            validUrl = altUrl;
            break;
          }
        }
        
        if (validUrl) {
          addRasterLayer(validUrl);
          return;
        }
        
        
        try {
          const report = await createGeoTiffDiagnosticReport(normalizedUrl);
          
          const validUrlFromReport = report.alternativeUrlsResults.find(result => result.isValid);
          if (validUrlFromReport) {
            addRasterLayer(validUrlFromReport.url);
            return;
          }
          
          setGeoTiffError('Failed to load GeoTiff: URL not accessible. Presigned URL may have expired.');
        } catch (diagnosticError) {
          setGeoTiffError('Failed to load GeoTiff: URL not accessible');
        }
      } else {
        addRasterLayer(normalizedUrl);
      }
    } catch (error) {
      setGeoTiffError(`Failed to load GeoTiff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addRasterLayer = async (url: string) => {
    
    if (!mapInstance || !url) return;
    
    try {
      setIsLoading(true);
      setGeoTiffError(null);
      
      if (mapInstance.getLayer('geotiff-layer')) {
        mapInstance.removeLayer('geotiff-layer');
      }
      
      if (mapInstance.getSource('geotiff')) {
        mapInstance.removeSource('geotiff');
      }
      
      if (mapInstance.getLayer('geotiff-area-outline')) {
        mapInstance.removeLayer('geotiff-area-outline');
      }
      
      if (mapInstance.getLayer('geotiff-area-fill')) {
        mapInstance.removeLayer('geotiff-area-fill');
      }
      
      if (mapInstance.getSource('geotiff-area')) {
        mapInstance.removeSource('geotiff-area');
      }
      
      let geoTiffAdded = false;
      
      try {
        
        const tiff = await fromUrl(url);
        const image = await tiff.getImage();
        
        const width = image.getWidth();
        const height = image.getHeight();
        const bbox = image.getBoundingBox();
        
        
        const metadata = {
          width,
          height,
          bbox,
          resolution: image.getResolution(),
        };
        setGeoTiffMetadata(metadata);
        
        setGeoTiffBounds(bbox);
        
        const rasters = await image.readRasters();
        const samplesPerPixel = image.getSamplesPerPixel();
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        const imageData = ctx.createImageData(width, height);
        
        if (samplesPerPixel === 1) {
          for (let i = 0; i < width * height; i++) {
            const val = rasters[0][i];
            imageData.data[i * 4] = val;
            imageData.data[i * 4 + 1] = val;
            imageData.data[i * 4 + 2] = val;
            imageData.data[i * 4 + 3] = 255;
          }
        } else if (samplesPerPixel >= 3) {
          for (let i = 0; i < width * height; i++) {
            imageData.data[i * 4] = rasters[0][i];
            imageData.data[i * 4 + 1] = rasters[1][i];
            imageData.data[i * 4 + 2] = rasters[2][i];
            imageData.data[i * 4 + 3] = rasters[3] ? rasters[3][i] : 255;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const canvasDataUrl = canvas.toDataURL('image/png');
        
        const [xmin, ymin, xmax, ymax] = bbox;
        
        try {
          mapInstance.addSource('geotiff', {
            type: 'image',
            url: canvasDataUrl,
            coordinates: [
              [xmin, ymax],
              [xmax, ymax],
              [xmax, ymin],
              [xmin, ymin]
            ]
          });
          
          mapInstance.addLayer({
            id: 'geotiff-layer',
            type: 'raster',
            source: 'geotiff',
            paint: {
              'raster-opacity': 0.8,
              'raster-resampling': 'linear'
            }
          });
          
          mapInstance.fitBounds(
            [[xmin, ymin], [xmax, ymax]],
            { padding: 50 }
          );
          
          setGeoTiffLoaded(true);
          setGeoTiffError(null);
          geoTiffAdded = true;
        } catch (layerError) {
          if (layerError instanceof Error && layerError.message && layerError.message.includes('already a source with ID')) {
            setGeoTiffLoaded(true);
            setGeoTiffError(null);
            geoTiffAdded = true;
          } else {
            throw layerError;
          }
        }
      } catch (directLoadError) {
        if (!geoTiffAdded) {
          
          try {
            
            let bounds: [number, number, number, number];
            
            if (imageLocations.length > 0) {
              const minLat = Math.min(...imageLocations.map(l => l.latitude));
              const maxLat = Math.max(...imageLocations.map(l => l.latitude));
              const minLng = Math.min(...imageLocations.map(l => l.longitude));
              const maxLng = Math.max(...imageLocations.map(l => l.longitude));
              
              bounds = [minLng, minLat, maxLng, maxLat];
            } else {
              const center = [viewState.longitude, viewState.latitude];
              const offset = 0.01;
              bounds = [
                center[0] - offset,
                center[1] - offset,
                center[0] + offset,
                center[1] + offset
              ];
            }
            
            const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [bounds[0], bounds[3]],
                    [bounds[2], bounds[3]],
                    [bounds[2], bounds[1]],
                    [bounds[0], bounds[1]],
                    [bounds[0], bounds[3]]
                  ]
                ]
              }
            };
            
            mapInstance.addSource('geotiff-area', {
              type: 'geojson',
              data: polygon
            });
            
            mapInstance.addLayer({
              id: 'geotiff-area-fill',
              type: 'fill',
              source: 'geotiff-area',
              paint: {
                'fill-color': '#3bb2d0',
                'fill-opacity': 0.4
              }
            });
            
            mapInstance.addLayer({
              id: 'geotiff-area-outline',
              type: 'line',
              source: 'geotiff-area',
              paint: {
                'line-color': '#3bb2d0',
                'line-width': 2,
                'line-dasharray': [2, 1]
              }
            });
            
            mapInstance.fitBounds(
              [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
              { padding: 50 }
            );
            
            setGeoTiffLoaded(true);
            setGeoTiffError('The GeoTIFF format cannot be directly displayed in browsers. Showing coverage area visualization. Download the file to view in a GIS application.');
          } catch (fallbackError) {
            setGeoTiffError('Could not display GeoTIFF or create visualization. The file may be inaccessible or in an unsupported format.');
          }
        }
      }
    } catch (error) {
      setGeoTiffError(`Failed to add GeoTIFF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const debugGeoTiff = async () => {
    if (!geoTiffUrl) {
      alert('No GeoTiff URL available to debug');
      return;
    }
    
    
    analyzeS3Url(geoTiffUrl);
    
    try {
      setGeoTiffError('Running diagnostic...');
      const report = await createGeoTiffDiagnosticReport(geoTiffUrl);
      setGeoTiffError(`Diagnostic complete. See console for results.`);
      
      const reportString = JSON.stringify(report, null, 2);
      const blob = new Blob([reportString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'geotiff-diagnostic-report.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        setGeoTiffError(null);
      }, 5000);
    } catch (error) {
      setGeoTiffError(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleMapLoad = (event: any) => {
    MapboxLogger.log("Map loaded successfully");
    setMapLoaded(true);
    const map = event.target;
    setMapInstance(map);
    if (geoTiffUrl) {
      MapboxLogger.log("GeoTIFF URL is available on map load");
    } else if (geoTiffResources?.length > 0) {
      MapboxLogger.log(`${geoTiffResources.length} GeoTIFF resources available on map load`);
    }
    if (onMapLoad) {
      onMapLoad(event);
    }
  };

  const toggleEnlargedView = () => {
    setIsEnlarged(!isEnlarged);
    setTimeout(() => {
      if (mapInstance) {
        mapInstance.resize();
      }
    }, 100);
  };

  const toggle3DView = () => {
    setViewState({
      ...viewState, 
      pitch: viewState.pitch === 0 ? 45 : 0
    });
  };

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const map = internalMapRef.current || (externalMapRef?.current as MapRef | null);
    const mapboxMap = map ? (map as any).getMap() : null;
    const features = mapboxMap?.queryRenderedFeatures(event.point, {
      layers: ['markers-layer']
    });
    if (!features || features.length === 0) {
      setPopupInfo(null);
    }
  };

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
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={mapboxAccessToken}
        style={{ width: '100%', height: '100%' }}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        ref={externalMapRef || internalMapRef}
      >
        {imageLocations.map((location, index: number) => (
          <Marker 
            key={`img-${index}`}
            longitude={location.longitude}
            latitude={location.latitude}
            anchor="center"
            scale={0.7}
            onClick={(e: MapLayerMouseEvent) => {
              (e.originalEvent as MouseEvent).stopPropagation();
              setPopupInfo(location);
            }}
          >
            <div className="relative">
              <div 
                className={`w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-110 ${
                  location.cameraModel || location.droneModel ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{
                  transform: location.heading !== undefined ? `rotate(${location.heading}deg)` : 'none',
                }}
              >
                {location.heading !== undefined && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 
                                    border-l-[8px] border-l-transparent 
                                    border-r-[8px] border-r-transparent 
                                    border-b-[12px] border-white" />
                      
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                    w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              {(location.cameraModel || location.droneModel || location.altitude) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white 
                               shadow-md animate-pulse" 
                     title="Has metadata" />
              )}
            </div>
          </Marker>
        ))}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="map-image-popup"
            maxWidth="350px"
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
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                  }}
                />
              </div>
              <div className="text-xs text-gray-600 grid grid-cols-2 gap-1 bg-gray-50 p-2 rounded">
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
                {popupInfo.timestamp && (
                  <div className="col-span-2">
                    <span className="font-medium">Time:</span> {new Date(popupInfo.timestamp).toLocaleString()}
                  </div>
                )}
                {popupInfo.cameraModel && (
                  <div className="col-span-2">
                    <span className="font-medium">Camera:</span> {popupInfo.cameraModel}
                  </div>
                )}
                {popupInfo.droneModel && (
                  <div className="col-span-2">
                    <span className="font-medium">Drone:</span> {popupInfo.droneModel}
                  </div>
                )}
                <div className="col-span-2 mt-2">
                  <a 
                    href={popupInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Full Image
                  </a>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
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
            onClick={toggle3DView}
            aria-label="Toggle 3D view"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button 
            onClick={toggleEnlargedView}
            className="p-2 hover:bg-gray-100 transition-colors"
            title={isEnlarged ? "Exit fullscreen" : "View fullscreen"}
          >
            {isEnlarged ? (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            )}
          </button>
        </div>
      </div>
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
      {geoTiffError && (
        <div className={`absolute ${isEnlarged ? 'bottom-8' : 'bottom-4'} left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md z-10`}>
          <p className="text-sm"><strong>Error:</strong> {geoTiffError}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button 
              className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              onClick={() => addGeoTiff(geoTiffUrl || '')}
            >
              Retry
            </button>
            <button 
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded flex items-center"
              onClick={debugGeoTiff}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Debug GeoTIFF
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Note: GeoTIFF files cannot be displayed directly in browsers. You can download the file and 
            view it in a GIS application like QGIS, or use specialized web services like GeoTIFF.io.
          </p>
        </div>
      )}
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