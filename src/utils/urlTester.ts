/**
 * URL Testing Utility
 * 
 * This utility provides functions to test if a URL is accessible.
 */

/**
 * Tests if a URL is accessible by performing a HEAD request
 * @param url The URL to test
 * @returns Promise resolving to true if the URL is accessible, false otherwise
 */
export const testUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Tests if a URL returns a valid file by checking both availability and content type
 * @param url The URL to test
 * @param expectedType Optional MIME type to check (partial match)
 * @returns Promise resolving to test results
 */
export const testUrlWithType = async (url: string, expectedType?: string): Promise<{
  accessible: boolean;
  contentType: string | null;
  contentLength: number | null;
  statusCode: number | null;
  error?: string;
}> => {
  if (!url) {
    return {
      accessible: false,
      contentType: null,
      contentLength: null,
      statusCode: null,
      error: 'No URL provided'
    };
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type');
    const contentLengthStr = response.headers.get('content-length');
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : null;
    
    // Check content type if expected type is provided
    const typeMatches = !expectedType || (contentType !== null && contentType.includes(expectedType));
    
    return {
      accessible: response.ok && typeMatches,
      contentType,
      contentLength,
      statusCode: response.status
    };
  } catch (error) {
    return {
      accessible: false,
      contentType: null,
      contentLength: null,
      statusCode: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export default {
  testUrl,
  testUrlWithType
};
