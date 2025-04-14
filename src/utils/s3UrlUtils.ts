/**
 * S3 URL utilities for PilotForce
 * 
 * This module contains utilities for handling S3 URLs, including
 * generating presigned URLs and direct S3 URLs.
 */

const DEFAULT_REGION = 'eu-north-1';
const DEFAULT_BUCKET = 'pilotforce-resources';

export class S3UrlManager {
  private static instance: S3UrlManager;
  private region: string;
  private expirationTimeInSeconds: number;

  private constructor() {
    this.region = process.env.REACT_APP_AWS_REGION || DEFAULT_REGION;
    this.expirationTimeInSeconds = 3600; // 1 hour by default
  }

  public static getInstance(): S3UrlManager {
    if (!S3UrlManager.instance) {
      S3UrlManager.instance = new S3UrlManager();
    }
    return S3UrlManager.instance;
  }

  /**
   * Parse an S3 URL into its components
   * @param url S3 URL to parse
   * @returns Object containing bucket and key if parsing is successful, otherwise null
   */
  public parseS3Url(url: string): { bucket: string, key: string } | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Try to handle both virtual hosted style and path style URLs
    try {
      // Virtual hosted style: https://bucket-name.s3.region.amazonaws.com/key
      if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
        const urlObj = new URL(url);
        const hostParts = urlObj.hostname.split('.');
        const bucket = hostParts[0];
        const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
        return { bucket, key };
      } 
      
      // Path style: https://s3.region.amazonaws.com/bucket-name/key
      else if (url.includes('s3.') && url.includes('.amazonaws.com/')) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // First part after the initial slash is the bucket name
        const bucket = pathParts[1];
        // The rest is the key
        const key = pathParts.slice(2).join('/');
        return { bucket, key };
      }
      
      // Direct s3:// protocol
      else if (url.startsWith('s3://')) {
        const parts = url.substring(5).split('/');
        const bucket = parts[0];
        const key = parts.slice(1).join('/');
        return { bucket, key };
      }
    } catch (e) {
      console.error('Error parsing S3 URL:', e);
    }
    
    return null;
  }

  /**
   * Generate a direct S3 URL (not pre-signed) as a fallback
   * @param bucket S3 bucket name
   * @param key S3 object key
   * @returns A direct S3 URL
   */
  private generateDirectS3Url(bucket: string, key: string): string {
    // Use the region-specific endpoint format
    const region = this.region || DEFAULT_REGION;
    
    // Handle special characters in the key
    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
    
    // Try multiple URL formats since some S3 buckets might be configured differently
    // First try virtual-hosted style URL (most common)
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
}

/**
 * Check if a URL needs refreshing (likely a pre-signed URL that will expire)
 * @param url URL to check
 * @returns True if the URL needs refreshing, false otherwise
 */
export function needsUrlRefreshing(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check if URL is a pre-signed URL
  return url.includes('X-Amz-Signature=') && url.includes('X-Amz-Date=');
}

/**
 * Try to convert a presigned S3 URL to a direct S3 URL if possible
 * @param url The presigned S3 URL to convert
 * @returns A direct S3 URL or the original URL if conversion fails
 */
export function convertToDirectS3Url(url: string): string {
  // Don't try to convert presigned URLs - they're needed for authentication
  if (!url || typeof url !== 'string' || !url.includes('amazonaws.com')) {
    return url;
  }
  
  // For presigned URLs, return the original to maintain access
  if (url.includes('X-Amz-Signature=') && url.includes('X-Amz-Expires=')) {
    return url;
  }
  
  // Only try conversion for non-presigned URLs
  try {
    // First try the path-style URL format
    if (url.includes('s3.amazonaws.com/pilotforce-resources/')) {
      const key = url.split('s3.amazonaws.com/pilotforce-resources/')[1]?.split('?')[0];
      if (key) {
        const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
        const region = DEFAULT_REGION;
        return `https://pilotforce-resources.s3.${region}.amazonaws.com/${encodedKey}`;
      }
    }
    
    // Try different regional endpoint if the URL contains eu-north-1
    if (url.includes('s3.eu-north-1.amazonaws.com')) {
      // Try global endpoint instead
      return url.replace('s3.eu-north-1.amazonaws.com', 's3.amazonaws.com');
    }
    
    // If the URL doesn't have a region specifier, try adding it
    if (url.includes('s3.amazonaws.com') && !url.includes('s3.eu-north-1.amazonaws.com')) {
      // Try regional endpoint instead
      return url.replace('s3.amazonaws.com', 's3.eu-north-1.amazonaws.com');
    }
    
    // Use S3UrlManager to parse and reconstruct a clean URL
    const s3UrlManager = S3UrlManager.getInstance();
    const parsedUrl = s3UrlManager.parseS3Url(url);
    
    if (parsedUrl) {
      // Use the region from the URL or fallback to the env var
      let region = process.env.REACT_APP_AWS_REGION || DEFAULT_REGION;
      
      // Try to extract region from the URL
      const regionMatch = url.match(/\.s3[.-]([a-z0-9-]+)\.amazonaws\.com/);
      if (regionMatch) {
        region = regionMatch[1];
      }
      
      // Handle special characters in the key
      const encodedKey = encodeURIComponent(parsedUrl.key).replace(/%2F/g, '/');
      
      // Try both region-specific and generic endpoints
      return `https://${parsedUrl.bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
    }
    
    // If we couldn't parse the URL but it's an S3 URL with query parameters (presigned),
    // just strip off the query string to get the direct URL
    if (url.includes('amazonaws.com') && url.includes('?')) {
      return url.split('?')[0];
    }
  } catch (error) {
    console.error('Error converting to direct S3 URL:', error);
  }
  
  return url;
}

/**
 * Generate multiple alternative URLs to try for an S3 object
 * @param url Original S3 URL
 * @returns Array of alternative URLs to try
 */
export function tryAlternativeS3Urls(url: string): string[] {
  const alternativeUrls: string[] = [];
  
  if (!url || typeof url !== 'string' || !url.includes('amazonaws.com')) {
    return [url]; // Return original URL as only option
  }
  
  // Always include the original URL first (most likely to work)
  alternativeUrls.push(url);
  
  // For presigned URLs, don't try alternative versions
  if (url.includes('X-Amz-Signature=') && url.includes('X-Amz-Expires=')) {
    return [url];
  }
  
  try {
    // Strip query parameters to create a direct URL
    if (url.includes('?')) {
      const directUrl = url.split('?')[0];
      alternativeUrls.push(directUrl);
    }
    
    // Try region-specific and generic endpoints
    if (url.includes('s3.eu-north-1.amazonaws.com')) {
      const globalUrl = url.replace('s3.eu-north-1.amazonaws.com', 's3.amazonaws.com');
      alternativeUrls.push(globalUrl);
      
      // Also try without query parameters
      if (globalUrl.includes('?')) {
        alternativeUrls.push(globalUrl.split('?')[0]);
      }
    } else if (url.includes('s3.amazonaws.com')) {
      const regionalUrl = url.replace('s3.amazonaws.com', 's3.eu-north-1.amazonaws.com');
      alternativeUrls.push(regionalUrl);
      
      // Also try without query parameters
      if (regionalUrl.includes('?')) {
        alternativeUrls.push(regionalUrl.split('?')[0]);
      }
    }
    
    // Try path-style to virtual-hosted style conversion
    if (url.includes('s3.amazonaws.com/pilotforce-resources/')) {
      const key = url.split('s3.amazonaws.com/pilotforce-resources/')[1]?.split('?')[0];
      if (key) {
        const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
        alternativeUrls.push(`https://pilotforce-resources.s3.eu-north-1.amazonaws.com/${encodedKey}`);
        alternativeUrls.push(`https://pilotforce-resources.s3.amazonaws.com/${encodedKey}`);
      }
    }
    
    // If the URL has region specifier in a different format, try standard format
    if (url.includes('s3-eu-north-1.amazonaws.com')) {
      alternativeUrls.push(url.replace('s3-eu-north-1.amazonaws.com', 's3.eu-north-1.amazonaws.com'));
    }
  } catch (error) {
    console.error('Error generating alternative S3 URLs:', error);
  }
  
  return [...new Set(alternativeUrls)]; // Remove duplicates
}

export default S3UrlManager;
