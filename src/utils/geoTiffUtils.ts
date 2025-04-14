/**
 * GeoTiff Utilities
 * 
 * A collection of helper functions for working with GeoTiff files in the browser
 * Handles special cases and encoding issues specific to S3 presigned URLs
 */

/**
 * Normalizes a GeoTiff URL by decoding special characters in the path portion
 * while preserving the query parameters necessary for presigned URLs
 */
export const normalizeS3Url = (url: string): string => {
  if (!url) return url;
  
  try {
    // For S3 presigned URLs, we need to be careful with decoding
    if (url.includes('X-Amz-')) {
      // Extract base URL and query parts
      const urlParts = url.split('?');
      const baseUrl = urlParts[0];
      const queryString = urlParts.length > 1 ? urlParts[1] : '';
      
      // Handle common URL encoded characters in the path (before query parameters)
      let decodedBaseUrl = baseUrl
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .replace(/%20/g, ' ')
        .replace(/%2B/g, '+')
        .replace(/%2C/g, ',')
        .replace(/%5B/g, '[')
        .replace(/%5D/g, ']');
      
      // Rebuild URL with original query parameters (leave them encoded)
      return queryString ? `${decodedBaseUrl}?${queryString}` : decodedBaseUrl;
    }
    
    if (url.includes('%')) {
      return decodeURIComponent(url);
    }
    
    return url;
  } catch (e) {
    console.error('Error normalizing S3 URL:', e);
    return url;
  }
};

/**
 * Check if a filename appears to be a GeoTiff file
 */
export const isGeoTiffFile = (filename: string): boolean => {
  if (!filename) return false;
  
  const lowerName = filename.toLowerCase();
  return lowerName.endsWith('.tif') || 
         lowerName.endsWith('.tiff') || 
         lowerName.endsWith('.gtiff');
};

/**
 * Generate an array of alternative URLs to try if the original URL fails
 */
export const generateAlternativeUrls = (url: string): string[] => {
  if (!url) return [];

  const alternatives = [];
  
  try {
    // Split into base and query parts
    const urlParts = url.split('?');
    const baseUrl = urlParts[0];
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    
    // Alternative 1: Try with decoded parentheses in the path
    if (baseUrl.includes('%28') || baseUrl.includes('%29')) {
      const alt1 = baseUrl
        .replace(/%28/g, '(')
        .replace(/%29/g, ')');
      
      alternatives.push(queryString ? `${alt1}?${queryString}` : alt1);
    }
    
    // Alternative 2: Try with all common encoded characters decoded
    const alt2 = baseUrl
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%20/g, ' ')
      .replace(/%2B/g, '+')
      .replace(/%2C/g, ',')
      .replace(/%5B/g, '[')
      .replace(/%5D/g, ']');
    
    if (alt2 !== baseUrl && !alternatives.includes(alt2)) {
      alternatives.push(queryString ? `${alt2}?${queryString}` : alt2);
    }
    
    // Alternative 3: Try fully decoded base URL
    try {
      if (baseUrl.includes('%')) {
        const decodedBaseUrl = decodeURIComponent(baseUrl);
        if (decodedBaseUrl !== baseUrl && !alternatives.includes(decodedBaseUrl)) {
          alternatives.push(queryString ? `${decodedBaseUrl}?${queryString}` : decodedBaseUrl);
        }
      }
    } catch (e) {
      // Ignore decoding errors
    }
    
  } catch (e) {
    console.error('Error generating alternative URLs:', e);
  }
  
  return alternatives;
};

/**
 * Alias for generateAlternativeUrls to maintain backward compatibility
 */
export const getAlternativeUrls = generateAlternativeUrls;

/**
 * Create a proxy function to fetch GeoTiff files to avoid CORS issues
 * This function fetches the file through your own backend proxy
 */
export const proxyFetchGeoTiff = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    // First try direct fetch to see if CORS is configured correctly
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        credentials: 'omit' // Don't send credentials for cross-origin requests
      });
      
      // If HEAD request succeeds, we can proceed with direct fetch
      if (response.ok) {
        const dataResponse = await fetch(url);
        if (!dataResponse.ok) {
          throw new Error(`Failed to fetch GeoTiff: HTTP ${dataResponse.status}`);
        }
        return await dataResponse.arrayBuffer();
      }
    } catch (directError) {
      console.warn('Direct fetch failed, trying API proxy:', directError);
      // Continue to proxy approach
    }
    
    // Fall back to proxy approach
    const proxyUrl = '/api/proxy-geotiff';
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`Proxy fetch failed: HTTP ${response.status}`);
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error in proxyFetchGeoTiff:', error);
    return null;
  }
};

/**
 * Download a GeoTiff file directly in the browser
 */
export const downloadGeoTiff = async (urlParam: string, filename: string, onProgress?: (progress: number) => void): Promise<boolean> => {
  try {
    // Normalize the URL
    const normalizedUrl = normalizeS3Url(urlParam);
    
    // Create a clean filename if one wasn't provided
    if (!filename) {
      // Extract filename from URL
      const urlParts = normalizedUrl.split('/');
      filename = urlParts[urlParts.length - 1].split('?')[0];
      
      // Default fallback
      if (!filename) {
        filename = 'geotiff.tif';
      }
    }
    
    console.log(`Starting download of ${filename} from ${normalizedUrl.substring(0, 100)}...`);
    onProgress?.(5);
    
    // Use fetch with streams for larger files
    const response = await fetch(normalizedUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    // Get content length if available
    const contentLength = response.headers.get('Content-Length');
    const totalBytes = contentLength ? parseInt(contentLength) : undefined;
    
    // Create a response reader to stream the data
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    // Create an array to hold the chunks
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    
    // Read the data chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      chunks.push(value);
      receivedBytes += value.length;
      
      // Report progress if we know the total size
      if (totalBytes && onProgress) {
        const progress = Math.min(95, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(progress);
      } else if (onProgress) {
        // If we don't know total size, just show indeterminate progress
        onProgress(50);
      }
    }
    
    // Concatenate the chunks into a single array
    let position = 0;
    const result = new Uint8Array(receivedBytes);
    
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    
    onProgress?.(95);
    
    // Create a blob from the data
    const blob = new Blob([result], { type: 'image/tiff' });
    
    // Create and trigger a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    onProgress?.(100);
    console.log(`Downloaded ${receivedBytes} bytes for ${filename}`);
    return true;
  } catch (error) {
    console.error('Error downloading GeoTiff:', error);
    return false;
  }
};

/**
 * Analyzes an S3 URL and logs diagnostic information
 * Useful for debugging presigned URL issues
 */
export const analyzeS3Url = (url: string): void => {
  console.log('S3 URL Analysis:');
  console.log('URL length:', url.length);
  
  try {
    // Basic URL properties
    const urlObj = new URL(url);
    console.log('Protocol:', urlObj.protocol);
    console.log('Hostname:', urlObj.hostname);
    console.log('Pathname:', urlObj.pathname);
    console.log('Search params count:', urlObj.searchParams.toString().split('&').length);
    
    // Check for S3 presigned URL components
    const hasAmzSignature = url.includes('X-Amz-Signature');
    console.log('Is presigned URL:', hasAmzSignature ? 'Yes' : 'No');
    
    if (hasAmzSignature) {
      try {
        // Extract expiration time
        const expirationMatch = url.match(/X-Amz-Expires=(\d+)/);
        if (expirationMatch && expirationMatch[1]) {
          const expiresSeconds = parseInt(expirationMatch[1]);
          console.log('Configured to expire in:', `${expiresSeconds} seconds (${(expiresSeconds / 3600).toFixed(2)} hours)`);
        }
        
        // Extract date
        const dateMatch = url.match(/X-Amz-Date=(\d{8}T\d{6}Z)/);
        if (dateMatch && dateMatch[1]) {
          const dateString = dateMatch[1];
          
          // Format: YYYYMMDDTHHMMSSZ
          const year = dateString.substring(0, 4);
          const month = dateString.substring(4, 6);
          const day = dateString.substring(6, 8);
          const hour = dateString.substring(9, 11);
          const minute = dateString.substring(11, 13);
          const second = dateString.substring(13, 15);
          
          const amzDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
          const now = new Date();
          const diffMs = now.getTime() - amzDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          
          console.log('URL timestamp:', amzDate.toISOString());
          console.log('Age:', `${diffHours.toFixed(2)} hours`);
          
          // Check if likely expired
          if (expirationMatch && expirationMatch[1]) {
            const expiresSeconds = parseInt(expirationMatch[1]);
            const expiresHours = expiresSeconds / 3600;
            
            if (diffHours > expiresHours) {
              console.log('⚠️ URL appears to be expired!');
            } else {
              console.log('✅ URL should still be valid');
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing presigned URL components:', e);
      }
    }
  } catch (error) {
    console.error('Error analyzing URL:', error);
  }
};

export default {
  normalizeS3Url,
  isGeoTiffFile,
  generateAlternativeUrls,
  getAlternativeUrls,
  proxyFetchGeoTiff,
  downloadGeoTiff,
  analyzeS3Url
};
