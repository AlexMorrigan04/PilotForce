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
    console.log('GeoTiffLoader: Starting load process for', url.substring(0, 100) + '...');
    
    // First try: direct load with GeoTIFF.fromUrl
    try {
      console.log('GeoTiffLoader: Attempting direct GeoTIFF load...');
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
      console.warn('GeoTiffLoader: Direct GeoTIFF load failed:', directError);
      
      // Second try: Try proxy API if we have a booking ID
      if (bookingId) {
        try {
          console.log('GeoTiffLoader: Attempting to proxy GeoTIFF through backend API...');
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
          console.warn('GeoTiffLoader: Proxy approach failed:', proxyError);
        }
      }
      
      // Third try: using fetch + blob with a modified access approach
      try {
        console.log('GeoTiffLoader: Attempting fetch + blob with modified access...');
        
        // Extract the key from the URL (everything after the bucket name)
        let key = '';
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/');
          // Remove the first empty segment
          pathSegments.shift();
          key = pathSegments.join('/');
          console.log('Extracted key from URL:', key);
        } catch (parseError) {
          console.warn('Failed to extract key from URL:', parseError);
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
              console.log('GeoTiffLoader: Got fresh URL:', freshUrl.substring(0, 100) + '...');
              
              // Try with the fresh URL
              const response = await fetch(freshUrl);
              const arrayBuffer = await response.arrayBuffer();
              return await GeoTIFF.fromArrayBuffer(arrayBuffer);
            }
          } catch (freshenError) {
            console.warn('GeoTiffLoader: Failed to get fresh URL:', freshenError);
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
        console.warn('GeoTiffLoader: Fetch + blob approach failed:', fetchError);
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
      console.log('GeoTiffLoader: Creating download URL from', url.substring(0, 100) + '...');
      
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
          console.warn('GeoTiffLoader: Proxy download failed:', proxyError);
        }
      }
      
      // Fall back to the original URL
      return url;
    } catch (error) {
      console.error('GeoTiffLoader: Failed to create download URL:', error);
      return url; // Return original URL as a fallback
    }
  }
};

export default GeoTiffLoader;
