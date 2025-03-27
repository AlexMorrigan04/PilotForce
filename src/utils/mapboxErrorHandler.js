/**
 * Utility to handle Mapbox errors in production environment
 */
export const handleMapboxInitialization = (mapboxgl, token) => {
  if (!token) {
    console.error('Mapbox token is missing. Please check your environment variables.');
    return false;
  }
  
  try {
    mapboxgl.accessToken = token;
    return true;
  } catch (error) {
    console.error('Failed to initialize Mapbox:', error);
    return false;
  }
};

export const setupMapErrorHandling = (map) => {
  if (!map) return;
  
  map.on('error', (e) => {
    console.error('Mapbox error:', e);
  });
  
  return map;
};
