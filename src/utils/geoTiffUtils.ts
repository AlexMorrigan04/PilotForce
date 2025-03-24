import MapboxLogger from './mapboxLogger';

/**
 * Utilities for handling GeoTIFF files with Mapbox GL
 */
export const GeoTiffUtils = {
  /**
   * Prepares a GeoTIFF URL for use with Mapbox GL
   * 
   * @param url The URL to the GeoTIFF file
   * @returns A processed URL that can be used with Mapbox GL
   */
  prepareUrl(url: string): string {
    if (!url) return '';
    
    // For S3 URLs, make sure they use HTTPS
    if (url.indexOf('amazonaws.com') > -1 && url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }
    
    // Log the URL for debugging
    MapboxLogger.log(`Prepared GeoTIFF URL: ${url.substring(0, 100)}...`);
    
    return url;
  },
  
  /**
   * Checks if a URL is likely to be a direct GeoTIFF file
   * 
   * @param url The URL to check
   * @returns True if the URL is likely a direct GeoTIFF file
   */
  isGeoTiffUrl(url: string): boolean {
    if (!url) return false;
    
    const lowerUrl = url.toLowerCase();
    
    // Check for explicit file extensions
    const hasGeoTiffExtension = 
      lowerUrl.endsWith('.tif') || 
      lowerUrl.endsWith('.tiff') || 
      lowerUrl.endsWith('.geotiff') ||
      lowerUrl.includes('.tif?') ||
      lowerUrl.includes('.tiff?') ||
      lowerUrl.includes('.geotiff?');
    
    // Check for S3 URLs with GeoTIFF filename pattern
    const isS3WithTiffPattern = 
      (lowerUrl.includes('amazonaws.com') && 
       (lowerUrl.includes('tif') || lowerUrl.includes('tiff') || lowerUrl.includes('geotiff')));
    
    // Look for signed URLs to S3 that likely point to GeoTIFFs
    const isSignedS3Url = 
      lowerUrl.includes('amazonaws.com') && 
      lowerUrl.includes('x-amz-signature=') &&
      (lowerUrl.includes('orthophoto') || 
       lowerUrl.includes('geotiff') || 
       lowerUrl.includes('/tif/') ||
       lowerUrl.includes('dsm') || 
       lowerUrl.includes('dtm'));
    
    return hasGeoTiffExtension || isS3WithTiffPattern || isSignedS3Url;
  },
  
  /**
   * Creates a visualization of where a GeoTIFF would be placed
   * 
   * @param map The Mapbox GL map instance
   * @param coordinates The coordinates of the GeoTIFF corners
   * @param options Options for the visualization
   */
  createPlaceholderVisualization(
    map: mapboxgl.Map,
    coordinates: [[number, number], [number, number], [number, number], [number, number]],
    options: { color?: string; opacity?: number; dashArray?: number[] } = {}
  ): void {
    const {
      color = '#FF0000',
      opacity = 0.1,
      dashArray = [2, 1]
    } = options;
    
    // Create a polygon to visualize the area
    const polygon: GeoJSON.Feature<GeoJSON.Polygon, GeoJSON.GeoJsonProperties> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    };
    
    // Add sources and layers to visualize where the GeoTIFF would be
    try {
      // Remove existing sources/layers first
      if (map.getLayer('geotiff-area-outline')) {
        map.removeLayer('geotiff-area-outline');
      }
      if (map.getLayer('geotiff-area-fill')) {
        map.removeLayer('geotiff-area-fill');
      }
      if (map.getSource('geotiff-area')) {
        map.removeSource('geotiff-area');
      }
      
      // Add new sources/layers
      map.addSource('geotiff-area', {
        type: 'geojson',
        data: polygon
      });
      
      map.addLayer({
        id: 'geotiff-area-fill',
        type: 'fill',
        source: 'geotiff-area',
        paint: {
          'fill-color': color,
          'fill-opacity': opacity
        }
      });
      
      map.addLayer({
        id: 'geotiff-area-outline',
        type: 'line',
        source: 'geotiff-area',
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': dashArray
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
      
      map.fitBounds([sw, ne], {
        padding: 50,
        maxZoom: 18
      });
      
      MapboxLogger.log("Created visualization for GeoTIFF area");
    } catch (error) {
      MapboxLogger.error("Error creating GeoTIFF area visualization:", error);
    }
  },
  
  /**
   * Converts a GeoTIFF URL to a potentially more web-friendly format
   * For example, if the GeoTIFF is hosted in a special tile server
   * 
   * @param url The original GeoTIFF URL
   * @returns A potentially modified URL that might work better in browsers
   */
  getWebFriendlyUrl(url: string): string {
    if (!url) return '';
    
    // For S3, add a query parameter that might trigger a format conversion in some setups
    if (url.includes('amazonaws.com')) {
      // Some S3 setups with special Lambda functions can convert on-the-fly
      // when specific parameters are added (hypothetical example)
      if (!url.includes('?')) {
        return `${url}?format=png`;
      } else {
        return `${url}&format=png`;
      }
    }
    
    return url;
  },
  
  /**
   * Generates a COG (Cloud Optimized GeoTIFF) compatible source object for Mapbox GL
   * 
   * @param url The URL to the GeoTIFF file
   * @returns A source object that can be used with Mapbox GL
   */
  createRasterSource(url: string): any {
    return {
      type: 'raster',
      tiles: [url],
      tileSize: 256
    };
  },
  
  /**
   * Checks if an error is related to GeoTIFF format issues
   * 
   * @param error The error to check
   * @returns True if the error is related to GeoTIFF format issues
   */
  isGeoTiffFormatError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString();
    return (
      errorString.includes('Unexpected token') ||
      errorString.includes('II*') ||
      errorString.includes('Failed to fetch') ||
      errorString.includes('NetworkError')
    );
  }
};

export default GeoTiffUtils;
