/**
 * GeoTIFF Diagnostic Utilities
 * 
 * This module provides tools to diagnose and fix issues with GeoTIFF files
 * and their URLs in the PilotForce application.
 */

import { normalizeGeoTiffUrl, generateAlternativeGeoTiffUrls } from './geoTiffNormalizer';

/**
 * Tests if a GeoTIFF URL is valid and accessible
 * by making a HEAD request to check if the resource exists
 * and is accessible
 * 
 * @param url The GeoTIFF URL to test
 * @returns Promise resolving to boolean indicating if the URL is valid
 */
export const testGeoTiffUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    // Use HEAD request to check if the resource is accessible
    // without downloading the entire file
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'image/tiff,*/*',
      },
      mode: 'cors',
    });
    
    if (!response.ok) {
      
      // If we get a 403 error, it's likely an authorization issue with the S3 bucket
      // The presigned URL might have expired
      if (response.status === 403) {
        
        // If this is an S3 URL, try again with a regular GET request
        // Sometimes HEAD requests are blocked but GET requests are allowed
        if (url.includes('amazonaws.com')) {
          try {
            // Only fetch first byte to check accessibility without downloading the whole file
            const rangeResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Range': 'bytes=0-0',
                'Accept': 'image/tiff,*/*',
              },
              mode: 'cors',
              credentials: 'omit',
            });
            
            if (rangeResponse.ok) {
              return true;
            }
          } catch (e) {
          }
        }
      }
      
      return false;
    }
    
    // Verify content type is appropriate for GeoTIFF
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      const validTypes = [
        'image/tiff',
        'application/octet-stream',
        'image/x.geotiff',
        'image/geotiff',
        'application/geo+json',
        'binary/octet-stream',
        'application/tiff',
      ];
      
      const isValidType = validTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()));
      if (!isValidType) {
        console.warn(`GeoTIFF has unexpected content type: ${contentType}`);
        // Still return true as some servers might use non-standard content types
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Diagnoses common issues with GeoTIFF URLs and S3 access
 * and returns detailed diagnostics information
 * 
 * @param url The GeoTIFF URL to diagnose
 * @returns Promise resolving to a diagnostics object
 */
export const diagnoseGeoTiffUrl = async (url: string): Promise<{
  isValid: boolean;
  statusCode?: number;
  contentType?: string;
  fileSize?: number;
  errorMessage?: string;
}> => {
  if (!url) {
    return { 
      isValid: false,
      errorMessage: 'No URL provided'
    };
  }
  
  try {
    // First check if URL is valid format
    try {
      new URL(url);
    } catch (e) {
      return {
        isValid: false,
        errorMessage: 'Invalid URL format'
      };
    }
    
    // Check if the URL seems to be for a GeoTIFF file
    const isLikelyGeoTiff = url.toLowerCase().includes('.tif') || 
                            url.toLowerCase().includes('geotiff') ||
                            url.toLowerCase().includes('tiff');
                            
    if (!isLikelyGeoTiff) {
      console.warn('URL does not appear to be a GeoTIFF file');
    }
    
    // Use HEAD request to check if the resource is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    
    const contentType = response.headers.get('Content-Type') || undefined;
    const contentLength = response.headers.get('Content-Length');
    
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      
      if (response.status === 403) {
        errorMessage += ' - Access Forbidden (S3 permissions issue or expired presigned URL)';
      } else if (response.status === 404) {
        errorMessage += ' - Resource Not Found (File may have been deleted or path is incorrect)';
      } else if (response.status === 400) {
        errorMessage += ' - Bad Request (Presigned URL may be malformed or expired)';
      }
      
      return {
        isValid: false,
        statusCode: response.status,
        contentType,
        errorMessage
      };
    }
    
    return {
      isValid: true,
      statusCode: response.status,
      contentType,
      fileSize: contentLength ? parseInt(contentLength, 10) : undefined
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error diagnosing URL: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Creates a comprehensive diagnostic report for a GeoTIFF URL
 * This helps identify issues with access, format, and content
 * 
 * @param url The URL to the GeoTIFF file
 * @param bookingId Optional booking ID for context
 * @returns Promise resolving to a diagnostic report
 */
export const createGeoTiffDiagnosticReport = async (
  url: string,
  bookingId?: string
): Promise<{
  url: string;
  isValid: boolean;
  diagnostics: any;
  alternativeUrls: string[];
  alternativeUrlsResults: any[];
  recommendations: string[];
  metadata?: any;
  bookingId?: string;
}> => {
  const report = {
    url,
    isValid: false,
    diagnostics: {} as any,
    alternativeUrls: [] as string[],
    alternativeUrlsResults: [] as any[],
    recommendations: [] as string[],
    metadata: undefined as any,
    bookingId
  };
  
  if (!url) {
    report.diagnostics = { error: 'No URL provided' };
    report.recommendations.push('Provide a valid GeoTIFF URL');
    return report;
  }
  
  try {
    // Initial URL diagnosis
    report.diagnostics = await diagnoseGeoTiffUrl(url);
    report.isValid = report.diagnostics.isValid;
    
    // Generate alternative URLs
    report.alternativeUrls = generateAlternativeGeoTiffUrls(url);
    
    // Test alternative URLs if original is not valid
    if (!report.isValid && report.alternativeUrls.length > 0) {
      for (const altUrl of report.alternativeUrls) {
        const altResults = await diagnoseGeoTiffUrl(altUrl);
        report.alternativeUrlsResults.push({
          url: altUrl,
          ...altResults
        });
        
        if (altResults.isValid) {
          report.recommendations.push(`Use alternative URL: ${altUrl.substring(0, 50)}...`);
        }
      }
    }
    
    // Add recommendations based on diagnostics
    if (!report.isValid) {
      if (report.diagnostics.statusCode === 403) {
        report.recommendations.push('The presigned URL has likely expired. Generate a new presigned URL.');
        report.recommendations.push('Check S3 bucket permissions to ensure public or authenticated access.');
      } else if (report.diagnostics.statusCode === 404) {
        report.recommendations.push('The GeoTIFF file may have been deleted or moved.');
        report.recommendations.push('Verify the file exists in the S3 bucket and the path is correct.');
      } else if (url.includes('X-Amz-Signature=')) {
        report.recommendations.push('This appears to be an expired presigned URL. Generate a fresh one.');
      }
    }
    
    // Try to get metadata if URL is valid
    if (report.isValid) {
      try {
        report.metadata = await getGeoTiffMetadata(url);
      } catch (e) {
      }
    }
    
    return report;
  } catch (error) {
    report.diagnostics = { 
      isValid: false, 
      errorMessage: `Error creating diagnostic report: ${error instanceof Error ? error.message : String(error)}` 
    };
    return report;
  }
};

/**
 * Attempts to find a valid URL for a GeoTIFF from multiple possible sources
 * 
 * @param originalUrl The original URL that might be failing
 * @param bookingId Optional booking ID to help generate alternative URLs
 * @returns Promise resolving to a valid URL or null
 */
export const findValidGeoTiffUrl = async (
  originalUrl: string,
  bookingId?: string
): Promise<string | null> => {
  // First try the original URL
  if (await testGeoTiffUrl(originalUrl)) {
    return originalUrl;
  }
  
  
  // Try alternative URLs
  const alternativeUrls = generateAlternativeGeoTiffUrls(originalUrl);
  
  for (const url of alternativeUrls) {
    if (await testGeoTiffUrl(url)) {
      return url;
    }
  }
  
  // No valid URLs found
  return null;
};

/**
 * Gets information about the GeoTIFF file from URL metadata
 * 
 * @param url The GeoTIFF URL 
 * @returns Promise resolving to metadata object
 */
export const getGeoTiffMetadata = async (url: string): Promise<any | null> => {
  if (!url) return null;
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors'
    });
    
    if (!response.ok) {
      return null;
    }
    
    // Extract headers of interest
    const contentType = response.headers.get('Content-Type');
    const contentLength = response.headers.get('Content-Length');
    const lastModified = response.headers.get('Last-Modified');
    
    return {
      contentType,
      contentLength,
      lastModified,
      url
    };
  } catch (e) {
    return null;
  }
};

/**
 * Validates a buffer to ensure it contains valid TIFF data
 * 
 * @param buffer The buffer containing potential TIFF data
 * @returns True if the buffer appears to be a valid TIFF file
 */
export const validateTiffBuffer = (buffer: ArrayBuffer): boolean => {
  try {
    if (!buffer || buffer.byteLength < 8) {
      return false;
    }
    
    // Check TIFF header magic numbers
    const dataView = new DataView(buffer);
    
    // TIFF files start with either 'II' (Intel) or 'MM' (Motorola) followed by 42
    const byte0 = dataView.getUint8(0);
    const byte1 = dataView.getUint8(1);
    const magicNumber = dataView.getUint16(2, byte0 === 0x49); // true for little-endian if 'II'
    
    const isIntelFormat = byte0 === 0x49 && byte1 === 0x49; // 'II'
    const isMotorolaFormat = byte0 === 0x4D && byte1 === 0x4D; // 'MM'
    
    if ((isIntelFormat || isMotorolaFormat) && magicNumber === 42) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Attempts to repair a broken GeoTIFF URL using various strategies
 * 
 * @param url The original URL that may be invalid or broken
 * @returns A repaired URL if possible, or the original URL if repair attempts fail
 */
export const repairGeoTiffUrl = async (url: string): Promise<string> => {
  if (!url) return url;
  
  // Try validating the original URL first
  try {
    if (await testGeoTiffUrl(url)) {
      return url; // Original URL works, no repair needed
    }
  } catch (e) {
  }
  
  // Try alternative approaches to fix the URL
  try {
    // 1. Try removing query parameters if present
    if (url.includes('?')) {
      const baseUrl = url.split('?')[0];
      if (await testGeoTiffUrl(baseUrl)) {
        return baseUrl;
      }
    }
    
    // 2. Try alternative URLs
    const alternatives = generateAlternativeGeoTiffUrls(url);
    for (const alt of alternatives) {
      if (await testGeoTiffUrl(alt)) {
        return alt;
      }
    }
    
    // 3. Check if URL has common prefix/suffix issues and fix them
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Find booking ID if present in the URL
    const bookingPart = urlParts.find(part => part.startsWith('booking_'));
    
    if (bookingPart && fileName) {
      // Try different variations of the file name
      const variations = [
        fileName,
        fileName.startsWith('reassembled_') ? fileName.replace('reassembled_', '') : `reassembled_${fileName}`,
        fileName.includes('.tif') ? fileName : `${fileName}.tif`
      ];
      
      for (const variant of variations) {
        const fixedUrl = `https://pilotforce-resources.s3.eu-north-1.amazonaws.com/${bookingPart}/${variant}`;
        if (await testGeoTiffUrl(fixedUrl)) {
          return fixedUrl;
        }
      }
    }
  } catch (e) {
  }
  
  // Return the original URL if all repair attempts fail
  return url;
};

/**
 * Checks if an error with a GeoTIFF appears to be an expired/invalid presigned URL
 * 
 * @param url The URL that's failing
 * @param errorResponse The error response if available
 * @returns Boolean indicating if this is likely a presigned URL issue
 */
export const isPresignedUrlError = (url: string, errorResponse?: Response): boolean => {
  if (!url) return false;
  
  // Check if this looks like a presigned URL
  const isPresigned = url.includes('X-Amz-Signature=') && 
                      url.includes('X-Amz-Date=') &&
                      url.includes('X-Amz-Credential=');
  
  if (!isPresigned) {
    return false;
  }
  
  // Check for common expired presigned URL error statuses
  if (errorResponse) {
    const status = errorResponse.status;
    return status === 403 || status === 400 || status === 401;
  }
  
  // If no error response, just check if it's a presigned URL which are prone to expiry
  return isPresigned;
};

/**
 * Extracts the direct S3 URL without presigned parameters
 * 
 * @param presignedUrl The full presigned URL
 * @returns The direct URL without query parameters
 */
export const getDirectUrlFromPresigned = (presignedUrl: string): string | null => {
  if (!presignedUrl) return null;
  
  try {
    // Extract the base URL without query parameters
    return presignedUrl.split('?')[0];
  } catch (e) {
    return null;
  }
};

export default {
  testGeoTiffUrl,
  diagnoseGeoTiffUrl,
  findValidGeoTiffUrl,
  getGeoTiffMetadata,
  isPresignedUrlError,
  getDirectUrlFromPresigned,
  createGeoTiffDiagnosticReport,
  validateTiffBuffer,
  repairGeoTiffUrl
};
