/**
 * Improved utility for handling S3 images with proper error handling and fallbacks
 */

import { PLACEHOLDER_IMAGE } from '../config/apiConfig';
import logger from './logger';

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
    return getPlaceholderImage('Image Error');
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
          logger.warn(`S3 URL expired for ${s3Key}, falling back to proxy`);
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
 * Generate a placeholder image URL
 * @param text Optional text to display on placeholder
 * @param width Width of placeholder
 * @param height Height of placeholder
 * @returns Placeholder image URL
 */
export function getPlaceholderImage(text = 'Image Not Found', width = 300, height = 200): string {
  // Use the placeholder from config, or fall back to a data URI
  if (PLACEHOLDER_IMAGE) {
    return PLACEHOLDER_IMAGE;
  }
  
  // Create a data URI as fallback (safe, generated locally)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Draw background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);
  
  // Draw text
  ctx.fillStyle = '#999999';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
}

/**
 * Handle image loading errors
 * @param event Error event
 * @param fallbackText Optional fallback text
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackText = 'Image Error'
): void {
  const img = event.currentTarget;
  img.src = getPlaceholderImage(fallbackText, img.width || 300, img.height || 200);
  logger.warn(`Failed to load image: ${img.alt || 'unknown'}`);
}

/**
 * Preload an image
 * @param src Image source URL
 * @returns Promise that resolves when image is loaded
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      logger.warn(`Failed to preload image: ${src}`);
      reject(e);
    };
    img.src = src;
  });
}

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
  handleImageError,
  preloadImage,
  markImageAsFailed,
  resetImageFailedStatus,
  formatFileSize
};
