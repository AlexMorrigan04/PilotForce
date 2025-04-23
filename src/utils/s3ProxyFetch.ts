/**
 * Utility for proxied access to S3 resources to solve CORS issues
 */
import { normalizeS3Url, generateAlternativeUrls as getAlternativeUrls, analyzeS3Url } from './geoTiffUtils';

/**
 * Handles error response from fetch
 */
const handleErrorResponse = async (response: Response): Promise<never> => {
  let errorText = `Error ${response.status}: ${response.statusText}`;
  
  try {
    // Try to extract more detailed error information
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorJson = await response.json();
      errorText += ' - ' + (errorJson.message || JSON.stringify(errorJson));
    } else {
      const errorBody = await response.text();
      if (errorBody) {
        errorText += ' - ' + errorBody.substring(0, 100); // Limit error length
      }
    }
  } catch (e) {
    // If parsing fails, just use the status
  }
  
  throw new Error(errorText);
};

/**
 * Build user-agent string for requests
 */
const getUserAgent = (): string => {
  return 'PilotForce-App/1.0';
};

/**
 * Specialized fetch function that handles S3 presigned URLs with better error handling
 * and CORS workarounds
 */
export const s3ProxyFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  if (!url) {
    throw new Error('No URL provided for S3 proxy fetch');
  }
  
  // Analyze URL to help with debugging
  analyzeS3Url(url);
  
  // Collect all URLs to try
  const urlsToTry = getAlternativeUrls(url);
  
  // Default options optimized for S3
  const defaultOptions: RequestInit = {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit', // Don't send cookies to S3
    headers: {
      'Accept': '*/*',
      'User-Agent': getUserAgent(),
      'X-Requested-With': 'XMLHttpRequest'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer-when-downgrade',
    cache: 'no-store',
  };
  
  // Merge with user options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  
  // Try each URL in sequence
  let lastError: Error | null = null;
  
  for (let i = 0; i < urlsToTry.length; i++) {
    const currentUrl = urlsToTry[i];
    
    try {
      
      const response = await fetch(currentUrl, fetchOptions);
      
      if (!response.ok) {
        
        // If this is a 403 Forbidden and we have query parameters, try the URL without them
        if (response.status === 403 && currentUrl.includes('?')) {
        }
        
        // If we get 400 Bad Request and URL has parentheses or other special chars
        if (response.status === 400 && 
            (currentUrl.includes('(') || currentUrl.includes(')') || 
            currentUrl.includes('%28') || currentUrl.includes('%29'))) {
        }
        
        throw await handleErrorResponse(response);
      }
      
      
      // If this is a non-GET request or the content-type indicates it's not a binary file,
      // we can just return the response
      const method = fetchOptions.method || 'GET';
      const contentType = response.headers.get('content-type') || '';
      const isTextResponse = contentType.includes('text/') || contentType.includes('json');
      
      if (method !== 'GET' || isTextResponse) {
        return response;
      }
      
      // For binary files (especially large ones like GeoTIFFs), 
      // clone the response to ensure the body is readable
      return response.clone();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next URL
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('All S3 fetch attempts failed');
};

/**
 * Specialized function to download binaries from S3
 */
export const downloadS3Binary = async (
  url: string, 
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  if (!url) {
    throw new Error('No URL provided for download');
  }

  onProgress?.(0);
  
  // Try alternative URLs in sequence
  try {
    // Make the request with our specialized fetch
    const response = await s3ProxyFetch(url, {
      headers: {
        'Accept': 'application/octet-stream,*/*'
      }
    });
    
    // Get the total size for progress calculation
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    
    // Create a reader for streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response body reader');
    }
    
    // Collect chunks as we read them
    const chunks: Uint8Array[] = [];
    let receivedSize = 0;
    
    // Process chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      if (value) {
        chunks.push(value);
        receivedSize += value.length;
        
        // Report progress periodically
        if (totalSize > 0 && onProgress && chunks.length % 5 === 0) {
          const progressPercent = Math.round((receivedSize / totalSize) * 100);
          onProgress(Math.min(progressPercent, 99)); // Cap at 99% until complete
        }
      }
    }
    
    
    // Combine all chunks into a single array buffer
    const allChunks = new Uint8Array(receivedSize);
    let position = 0;
    
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    // Ensure the filename is safe
    const safeFilename = filename
      .replace(/[/\\?%*:|"<>]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_');          // Replace spaces with underscores
    
    // Create blob from array buffer with the appropriate MIME type
    const mimeType = contentType || 
                    (filename.endsWith('.tif') || filename.endsWith('.tiff') ? 'image/tiff' : 
                    'application/octet-stream');
                    
    const blob = new Blob([allChunks], { type: mimeType });
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    
    onProgress?.(100);
    
  } catch (error) {
    
    // Fallback to direct link as a last resort
    if (error instanceof Error && (error.message.includes('CORS') || error.message.includes('network'))) {
      try {
        // Create a direct link for the browser to handle
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';  // Open in new tab
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        onProgress?.(100);
        
        // Note: We can't really track progress or success/failure with this method
        return;
      } catch (directError) {
      }
    }
    
    // If we get here, both methods failed
    throw error;
  }
};

export default {
  s3ProxyFetch,
  downloadS3Binary
};
