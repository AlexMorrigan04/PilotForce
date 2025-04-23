/**
 * Specialized handlers for S3 presigned URLs with common issues
 */
import { normalizeS3Url, generateAlternativeUrls as getAlternativeUrls, analyzeS3Url } from './geoTiffUtils';

/**
 * Fetches a file from S3 using various methods to handle common issues with presigned URLs
 * This is especially useful for GeoTIFFs with parentheses in the filename
 */
export const fetchFromS3WithFallbacks = async (url: string): Promise<Response> => {
  if (!url) throw new Error('No URL provided');
  
  // Analyze URL for debugging purposes
  analyzeS3Url(url);
  
  // Get all possible URL variations to try
  const urlsToTry = getAlternativeUrls(url);
  let lastError: Error | null = null;
  
  // Standard fetch options optimized for S3
  const fetchOptions: RequestInit = {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Accept': '*/*',
    },
    redirect: 'follow',
  };
  
  
  // Try each URL in sequence
  for (let i = 0; i < urlsToTry.length; i++) {
    const currentUrl = urlsToTry[i];
    
    try {
      
      const response = await fetch(currentUrl, fetchOptions);
      
      if (!response.ok) {
        const errorMessage = `Failed with status ${response.status}: ${response.statusText}`;
        
        if (response.status === 403 || response.status === 401) {
        } else if (response.status === 404) {
        }
        
        throw new Error(errorMessage);
      }
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Continue to next URL variation
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('All S3 fetch attempts failed');
};

/**
 * Fetch a GeoTIFF file from S3 and return as ArrayBuffer
 */
export const fetchGeoTiffFromS3 = async (url: string): Promise<ArrayBuffer> => {
  
  try {
    const response = await fetchFromS3WithFallbacks(url);
    
    
    return await response.arrayBuffer();
  } catch (error) {
    throw error;
  }
};

/**
 * Check if an S3 URL with parentheses is accessible in the raw form
 * This is useful to determine if we need special handling
 */
export const checkParenthesesHandling = async (url: string): Promise<boolean> => {
  if (!url.includes('(') && !url.includes(')') && !url.includes('%28') && !url.includes('%29')) {
    // No parentheses, no need for special handling
    return false;
  }
  
  
  try {
    // Try a HEAD request first to avoid downloading the whole file
    const headResponse = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (headResponse.ok) {
      return false; // No special handling needed
    }
    
    // If HEAD failed, check if normalizing helps
    const normalizedUrl = normalizeS3Url(url);
    if (normalizedUrl === url) return true; // URL didn't change, so handling needed
    
    const normalizedHeadResponse = await fetch(normalizedUrl, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (normalizedHeadResponse.ok) {
      return true; // Special handling helpful
    }
    
    // If both failed, we'll need special handling
    return true;
    
  } catch (error) {
    // If we can't check, assume we need special handling
    return true;
  }
};

export default {
  fetchFromS3WithFallbacks,
  fetchGeoTiffFromS3,
  checkParenthesesHandling
};
