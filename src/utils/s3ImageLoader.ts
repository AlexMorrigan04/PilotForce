/**
 * S3 Image Loader Utility
 * Handles loading and validating S3 images with caching to improve performance
 */

// Cache for successful and failed image URLs
const imageCache: { [url: string]: boolean } = {};
const CACHE_TIMEOUT = 30000; // 30 seconds cache timeout

/**
 * Test if an image URL is loadable
 * @param url The image URL to test
 * @returns Promise that resolves to true if image loads, false otherwise
 */
export const testImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Return from cache if available
    if (imageCache[url] !== undefined) {
      resolve(imageCache[url]);
      return;
    }
    
    const img = new Image();
    let hasResolved = false;
    
    // Set timeout to avoid waiting too long
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        imageCache[url] = false;
        setTimeout(() => { delete imageCache[url]; }, CACHE_TIMEOUT);
        hasResolved = true;
        resolve(false);
      }
    }, 5000);
    
    img.onload = () => {
      if (!hasResolved) {
        clearTimeout(timeoutId);
        imageCache[url] = true;
        setTimeout(() => { delete imageCache[url]; }, CACHE_TIMEOUT);
        hasResolved = true;
        resolve(true);
      }
    };
    
    img.onerror = () => {
      if (!hasResolved) {
        clearTimeout(timeoutId);
        imageCache[url] = false;
        setTimeout(() => { delete imageCache[url]; }, CACHE_TIMEOUT);
        hasResolved = true;
        resolve(false);
      }
    };
    
    
    // For S3 presigned URLs, don't use crossorigin attribute
    // as it can cause CORS issues when the presigned URL is already valid
    if (url.includes('X-Amz-Signature=')) {
      img.crossOrigin = ""; // Don't add crossorigin for presigned URLs
    } else {
      img.crossOrigin = 'anonymous';
    }
    
    img.src = url;
  });
};

/**
 * Find a working URL from a list of potential URLs
 * @param urls List of URLs to try in order
 * @returns Promise that resolves to the first working URL or null if none work
 */
export const findWorkingUrl = async (urls: string[]): Promise<string | null> => {
  for (const url of urls) {
    if (await testImageUrl(url)) {
      return url;
    }
  }
  return null;
};

/**
 * Create a placeholder data URL for failed images
 * @param text Text to display in the placeholder
 * @returns Data URL for a placeholder SVG image
 */
export const createPlaceholderImage = (text = 'Image Not Available'): string => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
};

/**
 * Add a timestamp to a URL to bypass cache
 * @param url URL to modify
 * @returns URL with timestamp parameter added
 */
export const addTimestampToUrl = (url: string): string => {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

/**
 * Extract filename from S3 URL or path
 * @param urlOrPath URL or path to extract filename from
 * @returns Extracted filename
 */
export const extractFilename = (urlOrPath: string): string => {
  if (!urlOrPath) return 'Unknown';
  
  try {
    // Try to extract filename from URL path
    const url = new URL(urlOrPath);
    const pathname = url.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1];
  } catch (e) {
    // If URL parsing fails, try simple path extraction
    const parts = urlOrPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Remove query parameters if present
    return lastPart.split('?')[0];
  }
};

/**
 * Check if a URL is a presigned S3 URL
 * @param url URL to check
 * @returns True if URL is a presigned S3 URL
 */
export const isPresignedS3Url = (url: string): boolean => {
  return !!url && url.includes('X-Amz-Algorithm=') && url.includes('X-Amz-Signature=');
};

export default {
  testImageUrl,
  findWorkingUrl,
  createPlaceholderImage,
  addTimestampToUrl,
  extractFilename,
  isPresignedS3Url
};