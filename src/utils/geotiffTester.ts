/**
 * GeoTIFF Tester Utility
 * 
 * This utility provides simple functions to test if a GeoTIFF URL is accessible
 * and if the file can be successfully parsed.
 */

/**
 * Tests if a GeoTIFF URL is accessible by attempting to fetch the first few bytes
 */
export const testGeoTiffAccess = async (url: string): Promise<{
  accessible: boolean;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  error?: string;
  isTiff?: boolean;
}> => {
  try {
    
    // First try a HEAD request to check if file exists
    try {
      const headResponse = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store'
      });
      
      if (!headResponse.ok) {
        return {
          accessible: false,
          statusCode: headResponse.status,
          error: `HTTP ${headResponse.status}: ${headResponse.statusText}`
        };
      }
      
      const contentType = headResponse.headers.get('content-type');
      const contentLength = headResponse.headers.get('content-length');
      
      return {
        accessible: true,
        statusCode: headResponse.status,
        contentType: contentType || undefined,
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined
      };
      
    } catch (headError) {
      
      // Try GET for first few bytes
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-1023'  // Just get the first KB to check format
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        return {
          accessible: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Check if it's a TIFF file by looking at magic number
      const headerView = new Uint8Array(buffer, 0, 4);
      const isTiff = (headerView[0] === 0x49 && headerView[1] === 0x49 && headerView[2] === 0x2A && headerView[3] === 0x00) || // Little endian
                    (headerView[0] === 0x4D && headerView[1] === 0x4D && headerView[2] === 0x00 && headerView[3] === 0x2A);  // Big endian
      
      return {
        accessible: true,
        statusCode: response.status,
        contentType: contentType || undefined,
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        isTiff
      };
    }
    
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Attempts to parse a GeoTIFF file to verify it can be processed
 */
export const testGeoTiffParsing = async (url: string): Promise<{
  parseable: boolean;
  width?: number;
  height?: number;
  boundingBox?: number[];
  error?: string;
  parsingTime?: number;
}> => {
  try {
    const startTime = performance.now();
    
    // Fetch the GeoTIFF file
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        parseable: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    // Get the data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    try {
      // Try to parse with geotiff.js
      const { fromArrayBuffer } = await import('geotiff');
      const tiff = await fromArrayBuffer(arrayBuffer);
      
      // Get the first image
      const image = await tiff.getImage();
      
      // Get basic info
      const width = image.getWidth();
      const height = image.getHeight();
      const bbox = image.getBoundingBox();
      
      const endTime = performance.now();
      const parsingTime = endTime - startTime;
      
      return {
        parseable: true,
        width,
        height,
        boundingBox: bbox,
        parsingTime
      };
      
    } catch (parseError) {
      return {
        parseable: false,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      };
    }
    
  } catch (error) {
    return {
      parseable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Comprehensive test of a GeoTIFF URL, with access and parsing verification
 */
export const verifyGeoTiffUrl = async (url: string): Promise<{
  valid: boolean;
  accessTest: ReturnType<typeof testGeoTiffAccess> extends Promise<infer T> ? T : never;
  parseTest?: ReturnType<typeof testGeoTiffParsing> extends Promise<infer T> ? T : never;
  recommendations: string[];
}> => {
  const accessResult = await testGeoTiffAccess(url);
  const recommendations: string[] = [];
  
  if (!accessResult.accessible) {
    recommendations.push('The GeoTIFF URL cannot be accessed. Check permissions and URL validity.');
    
    // Suggest URL fix if there are encoded parentheses
    if (url.includes('%28') || url.includes('%29')) {
      const decodedUrl = url
        .split('?')[0]
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .replace(/%20/g, ' ');
      
      recommendations.push(`Try using this decoded URL: ${decodedUrl}`);
    }
    
    return {
      valid: false,
      accessTest: accessResult,
      recommendations
    };
  }
  
  // Check content type
  if (accessResult.contentType && !accessResult.contentType.includes('tiff') && !accessResult.contentType.includes('octet-stream')) {
    recommendations.push(`The server returned '${accessResult.contentType}' instead of 'image/tiff'. This may cause issues.`);
  }
  
  // Access is good, now test parsing
  const parseResult = await testGeoTiffParsing(url);
  
  if (!parseResult.parseable) {
    recommendations.push('The file cannot be parsed as a valid GeoTIFF. It may be corrupted or not a GeoTIFF file.');
    return {
      valid: false,
      accessTest: accessResult,
      parseTest: parseResult,
      recommendations
    };
  }
  
  // All tests passed
  return {
    valid: true,
    accessTest: accessResult,
    parseTest: parseResult,
    recommendations: recommendations.length ? recommendations : ['The GeoTIFF file is valid and accessible.']
  };
};

export default {
  testGeoTiffAccess,
  testGeoTiffParsing,
  verifyGeoTiffUrl
};
