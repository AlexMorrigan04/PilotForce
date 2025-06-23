import * as GeoTIFF from 'geotiff';
import axios from 'axios';

/**
 * Utility to load GeoTIFF files while handling CORS issues
 */
const GeoTiffLoader = {
  /**
   * Load a GeoTIFF from a URL with multiple fallback methods
   * 
   * @param url The URL to load the GeoTIFF from
   * @param bookingId Optional booking ID for proxy requests
   * @returns A Promise that resolves to a GeoTIFF object
   */
  loadGeoTiffWithFallbacks: async (url: string, bookingId?: string): Promise<any> => {
    
    // First try: direct load with GeoTIFF.fromUrl
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'image/tiff,*/*',
          'Cache-Control': 'no-cache',
        }
      });
      const arrayBuffer = await response.arrayBuffer();
      return await GeoTIFF.fromArrayBuffer(arrayBuffer);
    } catch (directError) {
      // Second try: Try proxy API if we have a booking ID
      if (bookingId) {
        try {
          const API_BASE_URL = process.env.REACT_APP_API_URL;
          const encodedUrl = encodeURIComponent(url);
          
          // Request the binary data via a proxy endpoint
          const response = await axios.get(`${API_BASE_URL}/proxy-geotiff`, {
            params: {
              url: encodedUrl,
              bookingId: bookingId,
              timestamp: Date.now() // Cache buster
            },
            responseType: 'arraybuffer',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('idToken') || localStorage.getItem('token')}`,
              'Accept': 'image/tiff,application/octet-stream,*/*'
            }
          });
          
          // Parse the array buffer directly
          if (response.data) {
            return await GeoTIFF.fromArrayBuffer(response.data);
          }
          throw new Error('No data returned from proxy');
        } catch (proxyError) {
        }
      }
      
      // Third try: using fetch + blob with a modified access approach
      try {
        
        // Extract the key from the URL (everything after the bucket name)
        let key = '';
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/');
          // Remove the first empty segment
          pathSegments.shift();
          key = pathSegments.join('/');
        } catch (parseError) {
          key = url.split('/').slice(3).join('/').split('?')[0];
        }
        
        // If we have a key and booking ID, try to generate a fresh URL
        if (key && bookingId) {
          try {
            // Try to get a fresh presigned URL through your API
            const API_BASE_URL = process.env.REACT_APP_API_URL;
            const freshenResponse = await axios.get(`${API_BASE_URL}/freshen-url`, {
              params: {
                key: key,
                bookingId: bookingId
              },
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('idToken') || localStorage.getItem('token')}`,
              }
            });
            
            if (freshenResponse.data && freshenResponse.data.url) {
              const freshUrl = freshenResponse.data.url;
              
              // Try with the fresh URL
              const response = await fetch(freshUrl);
              const arrayBuffer = await response.arrayBuffer();
              return await GeoTIFF.fromArrayBuffer(arrayBuffer);
            }
          } catch (freshenError) {
          }
        }
        
        // Try a more direct approach to fetch the blob
        const fetchOptions = {
          method: 'GET',
          credentials: 'include' as RequestCredentials,
          headers: {
            'Accept': 'image/tiff,*/*',
            'Cache-Control': 'no-cache',
            'Origin': window.location.origin
          },
          mode: 'cors' as RequestMode
        };
        
        try {
          const response = await fetch(url, fetchOptions);
          
          if (response.ok) {
            const blob = await response.blob();
            
            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();
            
            // Load from array buffer
            return await GeoTIFF.fromArrayBuffer(arrayBuffer);
          } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
        } catch (error) {
          throw error;
        }
      } catch (fetchError) {
      }
      
      // Last resort: throw an error that we tried everything
      throw new Error('All GeoTIFF loading methods failed');
    }
  },
  
  /**
   * Creates a downloadable blob URL for a GeoTIFF
   * This is useful for providing a download fallback when display fails
   */
  createDownloadUrl: async (url: string, bookingId?: string): Promise<string> => {
    try {
      
      // If we have a booking ID, try to use the proxy
      if (bookingId) {
        try {
          const API_BASE_URL = process.env.REACT_APP_API_URL;
          const encodedUrl = encodeURIComponent(url);
          
          // Request the binary data via proxy
          const response = await axios.get(`${API_BASE_URL}/proxy-geotiff`, {
            params: {
              url: encodedUrl,
              bookingId: bookingId,
              download: true, // Signal this is for download
              timestamp: Date.now()
            },
            responseType: 'arraybuffer',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('idToken') || localStorage.getItem('token')}`,
              'Accept': 'image/tiff,application/octet-stream,*/*'
            }
          });
          
          if (response.data) {
            // Create a blob from the array buffer
            const blob = new Blob([response.data], { type: 'image/tiff' });
            return URL.createObjectURL(blob);
          }
        } catch (proxyError) {
        }
      }
      
      // Fall back to the original URL
      return url;
    } catch (error) {
      return url; // Return original URL as a fallback
    }
  }
};

export default GeoTiffLoader;
