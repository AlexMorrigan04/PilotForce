/**
 * Utility for more robust image loading with fallbacks
 */

import { testImageUrl } from './s3ImageLoader';

// Detect CORS errors when loading S3 images
export const detectCorsIssue = (event: Event): boolean => {
  // For security reasons, browsers don't expose detailed error info
  // But we can infer CORS issues in some cases
  const img = event.target as HTMLImageElement;
  
  // If naturalWidth and naturalHeight are 0, it's likely a CORS issue
  if (img.naturalWidth === 0 && img.naturalHeight === 0) {
    return true;
  }
  
  return false;
};

// Preload an image to check if it will load properly
export const preloadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(true);
    };
    
    img.onerror = () => {
      resolve(false);
    };
    
    // Set crossOrigin to anonymous to handle CORS for S3 images
    img.crossOrigin = 'anonymous';
    img.src = url;
    
    // Set a timeout in case the image hangs
    setTimeout(() => {
      if (!img.complete) {
        resolve(false);
      }
    }, 5000); // 5-second timeout
  });
};

// Get public URL from S3 bucket and key
export const createS3PublicUrl = (bucket: string, key: string, region: string = 'eu-north-1'): string => {
  // Handle special characters in the key
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  
  // Virtual-hosted style URL
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
};

// Check if a URL is an S3 URL
export const isS3Url = (url: string): boolean => {
  return typeof url === 'string' && 
         (url.includes('amazonaws.com') || url.includes('s3.') || url.includes('s3-'));
};

// Get domain from URL
export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
};

/**
 * Tries to find a working image URL from a set of alternative URLs
 * @param urls Array of URLs to try (primary URL should be first)
 * @param attempts Max number of URLs to try
 * @returns Promise resolving to the working URL or null if none work
 */
export async function findWorkingImageUrl(
  urls: string | string[],
  attempts: number = 3
): Promise<string | null> {
  // Handle single URL case
  const urlsToTry = typeof urls === 'string' ? [urls] : urls;
  
  // Limit number of attempts
  const limitedUrls = urlsToTry.slice(0, attempts);
  
  // Try each URL in sequence
  for (const url of limitedUrls) {
    if (!url) continue;
    
    try {
      const works = await testImageUrl(url);
      
      if (works) {
        return url;
      }
    } catch (error) {
    }
  }
  
  console.warn('No working URLs found after trying', limitedUrls.length, 'alternatives');
  return null;
}

/**
 * Generate fallback URLs for a given S3 URL
 * @param url Original S3 URL
 * @returns Array of alternative URLs to try
 */
export function generateFallbackUrls(url: string): string[] {
  if (!url) return [];
  
  const fallbacks = [url];
  
  // Remove query parameters for presigned URLs
  if (url.includes('?')) {
    fallbacks.push(url.split('?')[0]);
  }
  
  // Try alternative S3 endpoints
  if (url.includes('s3.amazonaws.com')) {
    fallbacks.push(url.replace('s3.amazonaws.com', 's3.eu-north-1.amazonaws.com'));
  } else if (url.includes('s3.eu-north-1.amazonaws.com')) {
    fallbacks.push(url.replace('s3.eu-north-1.amazonaws.com', 's3.amazonaws.com'));
  }
  
  // Try adding a timestamp to bypass cache
  fallbacks.push(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
  
  return fallbacks;
}

export default {
  preloadImage,
  createS3PublicUrl,
  isS3Url,
  findWorkingImageUrl,
  generateFallbackUrls
};
