/**
 * Improved utility for handling S3 images with proper error handling and fallbacks
 */

// Track failed image URLs to avoid repeated fetch attempts
const failedImageUrls = new Set<string>();
const imageRetryCount = new Map<string, number>();
const MAX_RETRIES = 2;

/**
 * Get a properly formatted image URL with fallbacks and error handling
 */
export const getImageUrl = (s3Key: string, s3Url?: string): string => {
  // Check if we've already failed to load this image multiple times
  if (failedImageUrls.has(s3Key)) {
    return getPlaceholderImage('error');
  }
  
  // If we already have a pre-signed URL, use it if it's valid
  if (s3Url && s3Url.includes('https://')) {
    // Handle AWS URLs that have expired signatures
    if (s3Url.includes('Signature=') && s3Url.includes('Expires=')) {
      const expireParam = s3Url.match(/Expires=(\d+)/);
      if (expireParam && expireParam[1]) {
        const expireTime = parseInt(expireParam[1], 10) * 1000; // Convert to milliseconds
        const currentTime = new Date().getTime();
        
        // If URL is expired, try the Netlify function approach
        if (currentTime > expireTime) {
          console.warn(`S3 URL expired for ${s3Key}, falling back to proxy`);
          return getProxiedImageUrl(s3Key);
        }
      }
    }
    
    return s3Url;
  }
  
  // No valid URL provided, try to construct one based on environment
  return getProxiedImageUrl(s3Key);
};

/**
 * Get a proxied image URL via Netlify function
 */
const getProxiedImageUrl = (s3Key: string): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const bucketName = 'drone-images-bucket';
  
  if (isProduction) {
    // In production, use the Netlify serverless function to proxy requests
    return `/api/s3proxy?bucket=${bucketName}&key=${encodeURIComponent(s3Key)}`;
  } else {
    // In development, use direct S3 URL
    const region = process.env.REACT_APP_AWS_REGION || 'eu-west-2';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
  }
};

/**
 * Get a placeholder image when the real image fails to load
 */
export const getPlaceholderImage = (type: 'loading' | 'error' | 'notfound' = 'notfound'): string => {
  let svgContent = '';
  
  switch (type) {
    case 'error':
      svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" fill="#FEE2E2"/><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#EF4444" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      break;
    case 'loading':
      svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" fill="#F3F4F6"/><circle cx="12" cy="12" r="10" stroke="#D1D5DB" fill="none" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
      break;
    default: // notfound
      svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" fill="#F3F4F6"/><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="#9CA3AF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

/**
 * Mark an image URL as failed to avoid repeated fetch attempts
 */
export const markImageAsFailed = (s3Key: string): void => {
  const retryCount = imageRetryCount.get(s3Key) || 0;
  
  if (retryCount >= MAX_RETRIES) {
    failedImageUrls.add(s3Key);
    imageRetryCount.delete(s3Key);
  } else {
    imageRetryCount.set(s3Key, retryCount + 1);
  }
};

/**
 * Reset the failed status for an image URL to try loading it again
 */
export const resetImageFailedStatus = (s3Key: string): void => {
  failedImageUrls.delete(s3Key);
  imageRetryCount.delete(s3Key);
};

/**
 * Formats image size for display
 */
export const formatFileSize = (sizeInBytes: number): string => {
  if (!sizeInBytes) return 'Unknown size';
  
  const kb = sizeInBytes / 1024;
  if (kb < 1000) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export default {
  getImageUrl,
  getPlaceholderImage,
  markImageAsFailed,
  resetImageFailedStatus,
  formatFileSize
};
