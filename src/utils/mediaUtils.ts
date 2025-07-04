import { getApiUrl, getAuthToken } from './authUtils';

// Constant for local storage cache keys
const MEDIA_COUNT_CACHE_KEY_PREFIX = 'mediaCount_';
const MEDIA_COUNT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Gets the count of media resources for a company with local caching and retry logic
 * @param companyId - The ID of the company to count media for
 * @returns Promise resolving to the number of media resources
 */
export const getMediaCount = async (companyId: string): Promise<number> => {
  if (!companyId) {
    return 0;
  }
  
  // Cache key based on company ID
  const cacheKey = `${MEDIA_COUNT_CACHE_KEY_PREFIX}${companyId}`;
  
  try {
    // Check for cached value first
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { count, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        // If cache is still valid (less than 24 hours old)
        if (now - timestamp < MEDIA_COUNT_CACHE_DURATION) {
          return count;
        } else {
        }
      } catch (parseError) {
        // Continue to fetch fresh data if cache parsing fails
      }
    }
    
    // If we get here, we need to fetch fresh data
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      return getEstimatedCountFallback(companyId);
    }
    
    // Implement retry logic
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      
      try {
        // Set a timeout for the fetch operation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${apiUrl}/images?companyId=${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const count = data.count || 0;
          
          // Cache the successful result
          try {
            const cacheData = JSON.stringify({
              count,
              timestamp: Date.now()
            });
            localStorage.setItem(cacheKey, cacheData);
          } catch (cacheError) {
          }
          
          return count;
        }
        
        // If we got a 502 error and this isn't the last attempt, continue to next retry
        if (response.status === 502 && attempt < MAX_RETRY_ATTEMPTS) {
          continue;
        }
        
        // For other errors or last attempt 502, log the error
        
        if (response.status === 502) {
        }
        
        // If we've exhausted retries or got a non-502 error, use fallback
        return getEstimatedCountFallback(companyId);
      } catch (fetchError) {
        // Handle timeout or network errors
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        } else {
        }
        
        // If this is the last attempt, use fallback
        if (attempt === MAX_RETRY_ATTEMPTS) {
          return getEstimatedCountFallback(companyId);
        }
        // Otherwise continue to next retry
      }
    }
    
    // Should never reach here due to return statements in the loop
    return getEstimatedCountFallback(companyId);
  } catch (error) {
    return getEstimatedCountFallback(companyId);
  }
};

/**
 * Fallback function to estimate media count based on other data or return a default
 * This helps maintain a good user experience even when the API is down
 */
const getEstimatedCountFallback = (companyId: string): number => {
  try {
    // Try to use previously cached value regardless of age as emergency fallback
    const cacheKey = `${MEDIA_COUNT_CACHE_KEY_PREFIX}${companyId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { count } = JSON.parse(cachedData);
        return count;
      } catch (e) {
        // Ignore parse errors in fallback
      }
    }
    
    // If we have no cache at all, estimate based on a reasonable default
    // TODO: Could potentially estimate based on booking count or asset count in the future
    return 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Function to clear the media count cache
 * @param companyId - Optional company ID to clear specific cache
 */
export const clearMediaCountCache = (companyId?: string) => {
  if (companyId) {
    const cacheKey = `${MEDIA_COUNT_CACHE_KEY_PREFIX}${companyId}`;
    localStorage.removeItem(cacheKey);
  } else {
    // Clear all media count cache entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(MEDIA_COUNT_CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};

export default {
  getMediaCount,
  clearMediaCountCache
};