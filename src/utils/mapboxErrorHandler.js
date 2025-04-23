/**
 * Utility to handle Mapbox errors in production environment
 */
export const handleMapboxInitialization = (mapboxgl, token) => {
  if (!token) {
    return false;
  }
  
  try {
    mapboxgl.accessToken = token;
    return true;
  } catch (error) {
    return false;
  }
};

export const setupMapErrorHandling = (map) => {
  if (!map) return;
  
  map.on('error', (e) => {
  });
  
  return map;
};
