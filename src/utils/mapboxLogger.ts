/**
 * Utility for logging MapBox related events and errors
 * Centralizes logging and makes it easier to enable/disable in production
 */

const DEBUG_ENABLED = true; // Set to false in production

export const MapboxLogger = {
  /**
   * Log regular information
   */
  log: (message: string, ...data: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(`[Mapbox] ${message}`, ...data);
    }
  },
  
  /**
   * Log warnings
   */
  warn: (message: string, ...data: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(`[Mapbox] ⚠️ ${message}`, ...data);
    }
  },
  
  /**
   * Log errors
   */
  error: (message: string, ...data: any[]) => {
    // Always log errors, even in production
    console.error(`[Mapbox] 🔴 ${message}`, ...data);
  },
  
  /**
   * Check MapBox initialization
   */
  checkMapStatus: (map: mapboxgl.Map | null) => {
    if (!map) {
      MapboxLogger.warn('Map instance does not exist');
      return false;
    }
    
    try {
      const isLoaded = map.loaded();
      MapboxLogger.log(`Map loaded state: ${isLoaded}`);
      
      // Check style loaded state
      const style = map.getStyle();
      const hasStyle = !!style;
      MapboxLogger.log(`Map has style: ${hasStyle}`);
      
      // Check center and zoom
      const center = map.getCenter();
      const zoom = map.getZoom();
      MapboxLogger.log(`Map center: [${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}], zoom: ${zoom.toFixed(2)}`);
      
      return isLoaded;
    } catch (error) {
      MapboxLogger.error('Error checking map status', error);
      return false;
    }
  },
  
  /**
   * Log information about GeoTIFF processing
   */
  logGeoTiff: (message: string, ...data: any[]) => {
    console.log(`🗺️ [GeoTIFF] ${message}`, ...data);
  },
  
  /**
   * Check GeoTiff source/layer status on a map
   */
  checkGeoTiffStatus: (map: mapboxgl.Map | null, layerId: string | null) => {
    if (!map) {
      MapboxLogger.warn('Map instance does not exist for GeoTIFF check');
      return false;
    }
    
    if (!layerId) {
      MapboxLogger.warn('No GeoTIFF layer ID provided for check');
      return false;
    }
    
    try {
      const hasLayer = !!map.getLayer(layerId);
      const hasSource = !!map.getSource(layerId);
      
      MapboxLogger.log(`GeoTIFF layer status: layer exists = ${hasLayer}, source exists = ${hasSource}`);
      
      if (hasSource) {
        const source = map.getSource(layerId) as mapboxgl.RasterTileSource;
        const url = source.url;
        const filename = url.split('/').pop();
        MapboxLogger.log(`GeoTIFF URL: ${url}`);
        MapboxLogger.log(`GeoTIFF Filename: ${filename}`);
        return url;
      }
      
      return hasLayer && hasSource;
    } catch (error) {
      MapboxLogger.error('Error checking GeoTIFF layer status', error);
      return false;
    }
  },
  
  /**
   * Log a debug boundary around MapBox operations 
   */
  logOperation: (operationName: string, callback: () => any) => {
    if (!DEBUG_ENABLED) return callback();
    
    MapboxLogger.log(`🔶 STARTING: ${operationName}`);
    const startTime = performance.now();
    try {
      const result = callback();
      const endTime = performance.now();
      MapboxLogger.log(`✅ COMPLETED: ${operationName} in ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      MapboxLogger.error(`❌ FAILED: ${operationName} after ${(endTime - startTime).toFixed(2)}ms`, error);
      throw error;
    }
  },

  /**
   * Log detailed information about map events
   */
  logMapEvent: (eventName: string, event: mapboxgl.MapboxEvent) => {
    if (DEBUG_ENABLED) {
      console.log(`[Mapbox Event] ${eventName}`, event);
    }
  },

  /**
   * Log detailed information about map layers
   */
  logLayerInfo: (map: mapboxgl.Map, layerId: string) => {
    if (DEBUG_ENABLED) {
      const layer = map.getLayer(layerId);
      if (layer) {
        console.log(`[Mapbox Layer] ${layerId}`, layer);
      } else {
        console.warn(`[Mapbox Layer] Layer ${layerId} does not exist`);
      }
    }
  },

  // Add a debug method
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Mapbox Debug] ${message}`, ...args);
    }
  },

  // Add a trace method for detailed debugging
  trace: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('MAPBOX_TRACE') === 'true') {
      console.trace(`[Mapbox Trace] ${message}`, ...args);
    }
  }
};

export default MapboxLogger;
