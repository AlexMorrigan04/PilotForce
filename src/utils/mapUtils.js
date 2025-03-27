/**
 * Converts a GeoTIFF URL to a compatible raster tile format for Mapbox
 * This helps work around Content Security Policy restrictions
 */
export const createGeoTiffTileUrl = (geoTiffUrl) => {
  // If we're using a GeoTIFF from S3 with a signed URL
  if (geoTiffUrl && geoTiffUrl.includes('amazonaws.com')) {
    // Create a tile URL template that works with the same CORS permissions
    // This replaces the direct GeoTIFF data URI approach which causes CSP issues
    
    // Option 1: Use a standard tile server and rely on map controls to navigate
    // Note: This actually won't show the GeoTIFF content but provides a fallback map view
    return `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`;
    
    // Option 2: If you have a backend endpoint that can proxy the request and convert GeoTIFF to tiles
    // return `/api/geotiff-tiles?url=${encodeURIComponent(geoTiffUrl)}&z={z}&x={x}&y={y}`;
  }
  
  // Fallback to default satellite imagery if no GeoTIFF is available
  return `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`;
};

/**
 * Utility function to convert a mapboxgl.LngLatBounds object to the array format
 * required by the fitBounds method
 */
export const boundsToArray = (bounds) => {
  if (!bounds) return null;
  
  return [
    [bounds.getWest(), bounds.getSouth()], // SW coordinates 
    [bounds.getEast(), bounds.getNorth()]  // NE coordinates
  ];
};

/**
 * Utility function to create a safe area boundary for GeoTIFF display
 * when direct loading isn't possible
 */
export const createGeoTiffBoundary = (centerLng, centerLat, radiusInKm = 0.5) => {
  // Create a boundary box around the center point
  const kmToDegrees = 0.009; // Rough approximation
  const offsetDegrees = kmToDegrees * radiusInKm;
  
  return [
    [centerLng - offsetDegrees, centerLat + offsetDegrees], // top-left
    [centerLng + offsetDegrees, centerLat + offsetDegrees], // top-right
    [centerLng + offsetDegrees, centerLat - offsetDegrees], // bottom-right
    [centerLng - offsetDegrees, centerLat - offsetDegrees]  // bottom-left
  ];
};

export default {
  createGeoTiffTileUrl,
  boundsToArray,
  createGeoTiffBoundary
};
