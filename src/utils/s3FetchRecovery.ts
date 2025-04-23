/**
 * S3 Fetch Recovery Utility
 * 
 * This utility provides recovery mechanisms for S3 fetch operations,
 * especially when dealing with filename mismatches between database records and S3.
 */
import { generateAlternativeGeoTiffUrls as generateAlternativePresignedUrls } from './geoTiffNormalizer';

interface FetchRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
  onProgress?: (progress: number) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Recoverable fetch function that tries multiple URL variants when the original fails
 * Particularly useful for S3 presigned URLs with potential filename mismatches
 */
export const recoverableFetch = async (
  originalUrl: string, 
  options: FetchRecoveryOptions = {}
): Promise<Response> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    headers = {},
    onRetry
  } = options;
  
  // Generate all URLs to try (original plus alternatives)
  let urlsToTry: string[] = [originalUrl];
  
  try {
    const alternatives = generateAlternativePresignedUrls(originalUrl);
    urlsToTry = [...new Set([originalUrl, ...alternatives])];
  } catch (error) {
    console.warn('🔄 S3FetchRecovery: Failed to generate alternative URLs:', error);
  }
  
  // Add standard fetch options
  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': '*/*',
      ...headers
    },
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow',
    cache: 'no-store'
  };
  
  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;
  
  // Try each URL in sequence with retries
  let lastError: Error | null = null;
  
  for (let urlIndex = 0; urlIndex < urlsToTry.length; urlIndex++) {
    const currentUrl = urlsToTry[urlIndex];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        
        const response = await fetch(currentUrl, fetchOptions);
        
        if (response.ok) {
          clearTimeout(timeoutId);
          return response;
        }
        
        // If we get a 404, quickly move to the next URL variant
        if (response.status === 404) {
          break; // Exit retry loop for this URL and try next URL
        }
        
        // For other errors, we'll retry this URL
        const errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
        console.warn(`🔄 S3FetchRecovery: ${errorMsg}`);
        lastError = new Error(errorMsg);
        
        // Notify caller about retry
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        // Wait before retrying
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
      } catch (error: unknown) {
        // Handle network errors or aborts
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Request timed out');
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
        
        // Notify caller about retry
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        // Wait before retrying unless it was an abort
        if (!(error instanceof Error && error.name === 'AbortError') && attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }
  
  // If we get here, all attempts failed
  clearTimeout(timeoutId);
  throw lastError || new Error('All recovery attempts failed');
};

/**
 * Downloads a binary file from S3 with recovery logic for filename issues
 */
export const downloadRecoverableS3Binary = async (
  originalUrl: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    
    // Clean up filename for download
    const safeFilename = filename
      .replace(/[/\\?%*:|"<>]/g, '-')
      .trim();
    
    const response = await recoverableFetch(originalUrl, {
      onProgress,
      onRetry: (attempt, error) => {
      }
    });
    
    // Get content length for progress calculations
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Download with progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (onProgress && total) {
        onProgress(Math.round((receivedLength / total) * 100));
      }
    }
    
    // Concatenate chunks into a single Uint8Array
    let position = 0;
    const chunksAll = new Uint8Array(receivedLength);
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }
    
    // Create and trigger download
    const blob = new Blob([chunksAll]);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    
  } catch (error) {
    throw error;
  }
};

export default {
  recoverableFetch,
  downloadRecoverableS3Binary
};
