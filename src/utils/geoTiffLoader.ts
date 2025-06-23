/**
 * GeoTIFF Loader Utility
 * 
 * This utility provides specialized functions for loading GeoTIFF files
 * with extensive error handling and diagnostics.
 */
import MapboxLogger from './mapboxLogger';
import { validateTiffBuffer, repairGeoTiffUrl } from './geoTiffDiagnostic';
import { normalizeS3Url } from './geoTiffUtils';

/**
 * Loads a GeoTIFF from a URL with comprehensive error handling
 */
export const loadGeoTiff = async (url: string): Promise<{
  tiff: any;
  image: any;
  metadata: any;
}> => {
  if (!url) {
    throw new Error('No URL provided for GeoTIFF loading');
  }
  
  
  // Try to repair the URL if needed
  const repairedUrl = await repairGeoTiffUrl(url);
  if (repairedUrl !== url) {
  }
  
  // Load the data
  const buffer = await fetchGeoTiffData(repairedUrl);
  
  // Validate the buffer
  if (!validateTiffBuffer(buffer)) {
    throw new Error('Invalid TIFF file format');
  }
  
  
  // Parse the GeoTIFF
  const { fromArrayBuffer } = await import('geotiff');
  const tiff = await fromArrayBuffer(buffer);
  
  // Get the first image
  const image = await tiff.getImage();
  
  // Extract basic metadata
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox();
  
  
  const metadata = {
    width,
    height,
    bbox,
    samplesPerPixel: image.getSamplesPerPixel(),
    resolution: image.getResolution(),
    origin: image.getOrigin(),
  };
  
  // Extract additional metadata if available
  try {
    const fileDirectory = image.getFileDirectory();
    Object.assign(metadata, { fileDirectory });
    
    const geoKeys = image.getGeoKeys();
    if (geoKeys) {
      Object.assign(metadata, { geoKeys });
    }
  } catch (metadataError) {
  }
  
  return { tiff, image, metadata };
};

/**
 * Fetches GeoTIFF data from a URL with retry logic
 */
export const fetchGeoTiffData = async (url: string, maxRetries = 3): Promise<ArrayBuffer> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store', // Prevent caching of potentially large files
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      
      // Check for obviously wrong content type
      if (contentType && 
          (contentType.includes('text/html') || 
           contentType.includes('application/xml') ||
           contentType.includes('application/json'))) {
      }
      
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength === 0) {
        throw new Error('Received empty response');
      }
      
      return buffer;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff between retries
        const delay = Math.pow(2, attempt - 1) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch GeoTIFF after ${maxRetries} attempts`);
};

/**
 * Renders a GeoTIFF to a canvas and returns the image data URL
 */
export const renderGeoTiffToCanvas = async (
  image: any, 
  options: { 
    transparent?: boolean;
    quality?: number;
  } = {}
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  bbox: [number, number, number, number];
}> => {
  const { transparent = false, quality = 0.9 } = options;
  
  
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox();
  
  // Read rasters
  const rasterData = await image.readRasters();
  const samplesPerPixel = image.getSamplesPerPixel();
  
  
  // Process raster data
  const rgba = new Uint8ClampedArray(width * height * 4);
  
  if (Array.isArray(rasterData)) {
    // Handle based on number of bands
    for (let i = 0; i < width * height; i++) {
      if (samplesPerPixel === 1) {
        // Grayscale
        const val = rasterData[0][i];
        rgba[i * 4] = val;
        rgba[i * 4 + 1] = val;
        rgba[i * 4 + 2] = val;
        rgba[i * 4 + 3] = 255;
      } else if (samplesPerPixel >= 3) {
        // RGB or RGBA
        rgba[i * 4] = rasterData[0][i];
        rgba[i * 4 + 1] = rasterData[1][i];
        rgba[i * 4 + 2] = rasterData[2][i];
        rgba[i * 4 + 3] = rasterData[3] ? rasterData[3][i] : 255;
      }
    }
  } else {
    throw new Error('Unexpected raster data format');
  }
  
  // Create canvas and draw image data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Create image data and draw to canvas
  const imageData = new ImageData(rgba, width, height);
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to data URL
  const format = transparent ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(format, quality);
  
  
  return {
    dataUrl,
    width,
    height,
    bbox
  };
};

/**
 * Adds a GeoTIFF as an image source to a Mapbox map
 */
export const addGeoTiffToMapbox = async (map: any, url: string, sourceId = 'geotiff-source', layerId = 'geotiff-layer'): Promise<{
  bbox: [number, number, number, number];
  metadata: any;
}> => {
  if (!map) {
    throw new Error('No map instance provided');
  }
  
  if (!url) {
    throw new Error('No GeoTIFF URL provided');
  }
  
  try {
    MapboxLogger.log(`Adding GeoTIFF to map: ${url.substring(0, 80)}...`);
    
    // Load the GeoTIFF and get image and metadata
    const { image, metadata } = await loadGeoTiff(url);
    
    // Render to canvas
    const { dataUrl, bbox } = await renderGeoTiffToCanvas(image);
    
    // Remove existing layer and source if they exist
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    
    // Add as image source
    map.addSource(sourceId, {
      type: 'image',
      url: dataUrl,
      coordinates: [
        [bbox[0], bbox[3]], // Top left: [lng, lat]
        [bbox[2], bbox[3]], // Top right: [lng, lat]
        [bbox[2], bbox[1]], // Bottom right: [lng, lat]
        [bbox[0], bbox[1]]  // Bottom left: [lng, lat]
      ]
    });
    
    // Add as raster layer
    map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': 0.9,
        'raster-resampling': 'linear'
      }
    });
    
    // Fit map to GeoTIFF bounds
    map.fitBounds(
      [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      { padding: 50, animate: true }
    );
    
    MapboxLogger.log(`GeoTIFF added successfully: ${metadata.width}x${metadata.height}`);
    
    return {
      bbox,
      metadata
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    MapboxLogger.error(`Failed to add GeoTIFF to map: ${errorMessage}`);
    throw error;
  }
};

export default {
  loadGeoTiff,
  fetchGeoTiffData,
  renderGeoTiffToCanvas,
  addGeoTiffToMapbox
};
