/**
 * Utility functions for normalizing and generating alternative GeoTIFF URLs
 * to handle issues with expired presigned URLs in AWS S3
 */

/**
 * Normalizes a GeoTIFF URL by removing unnecessary query parameters
 * that might be causing issues
 * 
 * @param url The original GeoTIFF URL
 * @returns The normalized URL
 */
export const normalizeGeoTiffUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // Check if URL has query parameters
    if (url.includes('?')) {
      // Get the base URL without query parameters
      const baseUrl = url.split('?')[0];
      
      // Return the base URL if it ends with .tif extension
      if (baseUrl.toLowerCase().endsWith('.tif')) {
        return baseUrl;
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error normalizing GeoTiff URL:', error);
    return url;
  }
};

/**
 * Extracts booking ID and file name from a GeoTIFF URL
 * 
 * @param url The GeoTIFF URL to parse
 * @returns Object containing extracted parts or null if parsing failed
 */
export const extractGeoTiffUrlParts = (url: string): {
  bookingId: string;
  fileName: string;
  baseUrl: string;
  bucket: string;
  key: string;
} | null => {
  if (!url) return null;
  
  try {
    // Try to match S3 URL pattern
    // Expected format: https://pilotforce-resources.s3.amazonaws.com/booking_123/reassembled_geotiff_456_abc_filename.tif...
    const s3UrlPattern = /https?:\/\/([^\/]+)\/([^?]+)/;
    const match = url.match(s3UrlPattern);
    
    if (!match) return null;
    
    const baseUrl = match[1]; // e.g., pilotforce-resources.s3.amazonaws.com
    const key = match[2]; // e.g., booking_123/reassembled_geotiff_456_abc_filename.tif
    
    // Extract booking ID - expected to be in format booking_123
    const bookingIdMatch = key.match(/booking_([^\/]+)/);
    const bookingId = bookingIdMatch ? `booking_${bookingIdMatch[1]}` : '';
    
    // Extract file name - last part after last slash
    const parts = key.split('/');
    const fileName = parts.length > 0 ? parts[parts.length - 1] : '';
    
    // Extract bucket name from the base URL
    const bucketMatch = baseUrl.match(/^([^\.]+)\.s3/);
    const bucket = bucketMatch ? bucketMatch[1] : 'pilotforce-resources'; // Default if not found
    
    return {
      bookingId,
      fileName,
      baseUrl,
      bucket,
      key
    };
  } catch (e) {
    console.error('Error extracting GeoTIFF URL parts:', e);
    return null;
  }
};

/**
 * Generates alternative URLs for a GeoTIFF file
 * to try different approaches for accessing the file
 * 
 * @param originalUrl The original GeoTIFF URL
 * @returns An array of alternative URLs to try
 */
export const generateAlternativeGeoTiffUrls = (originalUrl: string): string[] => {
  if (!originalUrl) return [];
  
  try {
    const alternativeUrls: string[] = [];
    
    // First, add the normalized URL (without query params)
    const normalizedUrl = normalizeGeoTiffUrl(originalUrl);
    if (normalizedUrl !== originalUrl) {
      alternativeUrls.push(normalizedUrl);
    }
    
    // Extract path components from the URL
    const urlParts = extractGeoTiffUrlParts(normalizedUrl);
    if (!urlParts) return alternativeUrls;
    
    const { bookingId, fileName, bucket } = urlParts;
    
    if (bookingId && fileName) {
      // Try all AWS regions commonly used
      const regions = ['eu-north-1', 'eu-west-1', 'us-east-1', ''];
      
      regions.forEach(region => {
        const regionPart = region ? `s3.${region}` : 's3';
        
        // Generate direct S3 URL with appropriate region
        const directUrl = `https://${bucket}.${regionPart}.amazonaws.com/${bookingId}/${fileName}`;
        if (!alternativeUrls.includes(directUrl)) {
          alternativeUrls.push(directUrl);
        }
        
        // Try accessing via s3-website endpoint (which might have different CORS settings)
        const websiteUrl = `https://${bucket}.s3-website.${region || 'eu-north-1'}.amazonaws.com/${bookingId}/${fileName}`;
        if (!alternativeUrls.includes(websiteUrl)) {
          alternativeUrls.push(websiteUrl);
        }
      });
      
      // If it's a reassembled file (has the reassembled_ prefix)
      if (fileName.startsWith('reassembled_')) {
        // Try the URL without the reassembled prefix and timestamp/uuid parts
        const baseFileName = fileName.replace(/^reassembled_geotiff_\d+_[a-f0-9]+_/, '');
        
        regions.forEach(region => {
          const regionPart = region ? `s3.${region}` : 's3';
          const directFilePath = `${bookingId}/${baseFileName}`;
          
          const directUrl = `https://${bucket}.${regionPart}.amazonaws.com/${directFilePath}`;
          if (!alternativeUrls.includes(directUrl)) {
            alternativeUrls.push(directUrl);
          }
        });
      } else {
        // Try to access as a reassembled file
        // Use a timestamp format for the current time as a placeholder
        const timestamp = Date.now();
        const uuid = Math.random().toString(16).substring(2, 10);
        const reassembledName = `reassembled_geotiff_${timestamp}_${uuid}_${fileName}`;
        
        regions.forEach(region => {
          const regionPart = region ? `s3.${region}` : 's3';
          const reassembledPath = `${bookingId}/${reassembledName}`;
          
          const reassembledUrl = `https://${bucket}.${regionPart}.amazonaws.com/${reassembledPath}`;
          if (!alternativeUrls.includes(reassembledUrl)) {
            alternativeUrls.push(reassembledUrl);
          }
        });
      }
      
      // Try the part files if this might be a chunked file
      if (!fileName.includes('.part')) {
        // Base name without extension
        const extensionIndex = fileName.lastIndexOf('.');
        const baseName = extensionIndex > 0 ? fileName.substring(0, extensionIndex) : fileName;
        const extension = extensionIndex > 0 ? fileName.substring(extensionIndex) : '';
        
        // Add part0, part1, etc. URLs
        for (let i = 0; i < 5; i++) {  // Try first 5 parts
          const partName = `${baseName}${extension}.part${i}`;
          const partUrl = `https://${bucket}.s3.eu-north-1.amazonaws.com/${bookingId}/${partName}`;
          if (!alternativeUrls.includes(partUrl)) {
            alternativeUrls.push(partUrl);
          }
        }
      }
    }
    
    console.log(`Generated ${alternativeUrls.length} alternative URLs for GeoTiff`);
    return alternativeUrls;
  } catch (error) {
    console.error('Error generating alternative GeoTiff URLs:', error);
    return [];
  }
};

/**
 * Analyzes a URL to check if it's a valid S3/GeoTIFF URL and provides diagnostic info
 * 
 * @param url The URL to analyze
 * @returns Object with analysis results
 */
export const analyzeS3Url = async (url: string): Promise<{
  isValid: boolean;
  originalUrl: string;
  directUrl?: string;
  alternativeUrls: string[];
  contentType?: string;
  contentLength?: number;
  error?: string;
}> => {
  if (!url) {
    return {
      isValid: false,
      originalUrl: '',
      alternativeUrls: [],
      error: 'No URL provided'
    };
  }
  
  const result: any = {
    isValid: false,
    originalUrl: url,
    alternativeUrls: []
  };
  
  try {
    // Generate alternative URLs 
    result.alternativeUrls = generateAlternativeGeoTiffUrls(url).filter(altUrl => altUrl !== url);
    
    // Extract direct URL without query parameters
    if (url.includes('?')) {
      result.directUrl = url.split('?')[0];
    }
    
    // Test if URL is accessible
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (response.ok) {
        result.isValid = true;
        result.contentType = response.headers.get('Content-Type') || undefined;
        const contentLength = response.headers.get('Content-Length');
        result.contentLength = contentLength ? parseInt(contentLength) : undefined;
      } else {
        result.error = `HTTP Error: ${response.status} ${response.statusText}`;
        
        if (response.status === 403) {
          result.error += ' - Access Forbidden (S3 permissions issue or expired presigned URL)';
        }
      }
    } catch (e) {
      result.error = `Error accessing URL: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return result;
  } catch (e) {
    return {
      isValid: false,
      originalUrl: url,
      alternativeUrls: [],
      error: `Analysis error: ${e instanceof Error ? e.message : String(e)}`
    };
  }
};

/**
 * Determines if a URL points to a GeoTIFF file
 * 
 * @param url The URL to check
 * @returns Boolean indicating if this is likely a GeoTIFF URL
 */
export const isGeoTiffUrl = (url: string): boolean => {
  if (!url) return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Check file extension or content indicators
  return (
    lowerUrl.endsWith('.tif') ||
    lowerUrl.endsWith('.tiff') ||
    lowerUrl.includes('geotiff') ||
    lowerUrl.includes('reassembled_geotiff') ||
    lowerUrl.includes('.tif.part')
  );
};

export default {
  normalizeGeoTiffUrl,
  extractGeoTiffUrlParts,
  generateAlternativeGeoTiffUrls,
  analyzeS3Url,
  isGeoTiffUrl
};
