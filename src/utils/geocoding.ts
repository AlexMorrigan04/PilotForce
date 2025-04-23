/**
 * Utility functions for geocoding using Mapbox API
 */

/**
 * Geocode a UK postcode to coordinates using Mapbox
 * @param postcode The UK postcode to geocode
 * @returns Promise resolving to [latitude, longitude] or null if not found
 */
export const geocodePostcode = async (postcode: string): Promise<[number, number] | null> => {
  try {
    const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken) {
      return null;
    }
    
    // Use Mapbox geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?country=gb&types=postcode&access_token=${mapboxToken}`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Mapbox returns coordinates as [longitude, latitude]
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return [latitude, longitude];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Reverse geocode coordinates to address using Mapbox
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise resolving to the address object or null if not found
 */
export const reverseGeocode = async (
  latitude: number, 
  longitude: number
): Promise<{ postcode?: string, address?: string } | null> => {
  try {
    const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken) {
      return null;
    }
    
    // Use Mapbox reverse geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Parse the response to extract postcode and address
      let postcode = '';
      let address = '';
      
      // Find postcode in the context
      for (const feature of data.features) {
        // For UK postcodes
        if (feature.id.includes('postcode')) {
          postcode = feature.text;
        }
        
        // Use the most detailed address if available
        if (feature.place_type.includes('address')) {
          address = feature.place_name;
        }
      }
      
      // If we couldn't find a proper address, use the place name of the first feature
      if (!address && data.features[0]) {
        address = data.features[0].place_name;
      }
      
      return { postcode, address };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
