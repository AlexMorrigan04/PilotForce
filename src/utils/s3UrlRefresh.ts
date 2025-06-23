/**
 * S3 URL Refresh Utility
 * Handles automatic refreshing of expired pre-signed URLs for secure S3 access
 */

import { getPresignedViewUrl } from '../services/resourceService';

// Cache for refreshed URLs to avoid unnecessary API calls
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a URL is a pre-signed S3 URL
 */
export const isPresignedS3Url = (url: string): boolean => {
  return !!url && 
         url.includes('X-Amz-Algorithm=') && 
         url.includes('X-Amz-Signature=') && 
         url.includes('X-Amz-Date=') &&
         url.includes('X-Amz-Expires=');
};

/**
 * Parse the expiration time from a pre-signed URL
 */
export const getUrlExpirationTime = (url: string): number | null => {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const dateParam = params.get('X-Amz-Date');
    const expiresParam = params.get('X-Amz-Expires');
    
    if (!dateParam || !expiresParam) {
      return null;
    }
    
    // Parse the date (format: YYYYMMDDTHHMMSSZ)
    const year = parseInt(dateParam.slice(0, 4), 10);
    const month = parseInt(dateParam.slice(4, 6), 10) - 1; // Month is 0-indexed
    const day = parseInt(dateParam.slice(6, 8), 10);
    const hour = parseInt(dateParam.slice(9, 11), 10);
    const minute = parseInt(dateParam.slice(11, 13), 10);
    const second = parseInt(dateParam.slice(13, 15), 10);
    
    const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
    const expiresSeconds = parseInt(expiresParam, 10);
    
    if (isNaN(expiresSeconds)) {
      return null;
    }
    
    return signedDate.getTime() + (expiresSeconds * 1000);
  } catch (error) {
    console.warn('Failed to parse URL expiration:', error);
    return null;
  }
};

/**
 * Check if a URL needs refreshing (expires within 10 minutes)
 */
export const needsUrlRefresh = (url: string): boolean => {
  if (!isPresignedS3Url(url)) {
    return false;
  }
  
  const expirationTime = getUrlExpirationTime(url);
  if (!expirationTime) {
    return true; // If we can't parse it, assume it needs refresh
  }
  
  const currentTime = Date.now();
  const tenMinutesInMillis = 10 * 60 * 1000;
  
  return (expirationTime - currentTime) < tenMinutesInMillis;
};

/**
 * Refresh a pre-signed URL using the API
 */
export const refreshPresignedUrl = async (url: string): Promise<string> => {
  // Check cache first
  const cached = urlCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.url;
  }
  
  try {
    console.log('Refreshing pre-signed URL:', url.substring(0, 50) + '...');
    
    const refreshedUrl = await getPresignedViewUrl(url);
    
    // Cache the result
    urlCache.set(url, {
      url: refreshedUrl,
      timestamp: Date.now()
    });
    
    console.log('Successfully refreshed URL');
    return refreshedUrl;
  } catch (error) {
    console.warn('Failed to refresh pre-signed URL:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: url.substring(0, 100) + '...'
    });
    // Return original URL as fallback
    return url;
  }
};

/**
 * Refresh multiple URLs in parallel
 */
export const refreshMultipleUrls = async (urls: string[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  
  // Filter URLs that need refreshing
  const urlsToRefresh = urls.filter(url => needsUrlRefresh(url));
  
  if (urlsToRefresh.length === 0) {
    // No URLs need refreshing, return original URLs
    urls.forEach(url => results.set(url, url));
    return results;
  }
  
  console.log(`Refreshing ${urlsToRefresh.length} URLs...`);
  
  // Refresh URLs in parallel (limit to 5 concurrent requests to avoid overwhelming the API)
  const batchSize = 5;
  for (let i = 0; i < urlsToRefresh.length; i += batchSize) {
    const batch = urlsToRefresh.slice(i, i + batchSize);
    const batchPromises = batch.map(async (url) => {
      const refreshedUrl = await refreshPresignedUrl(url);
      return { original: url, refreshed: refreshedUrl };
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ original, refreshed }) => {
      results.set(original, refreshed);
    });
  }
  
  // Add URLs that didn't need refreshing
  urls.forEach(url => {
    if (!results.has(url)) {
      results.set(url, url);
    }
  });
  
  return results;
};

/**
 * Clear the URL cache
 */
export const clearUrlCache = (): void => {
  urlCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): { size: number; entries: Array<{ url: string; age: number }> } => {
  const now = Date.now();
  const entries = Array.from(urlCache.entries()).map(([url, data]) => ({
    url: url.substring(0, 30) + '...',
    age: now - data.timestamp
  }));
  
  return {
    size: urlCache.size,
    entries
  };
}; 