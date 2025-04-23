import axios from 'axios';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

interface DownloadOptions {
  token?: string;
  onProgress?: (progress: number) => void;
}

interface ResourceMetadata {
  resourceId: string;
  fileName: string;
  contentType: string;
  url?: string;
  isChunked?: boolean;
  totalChunks?: number;
  originalFileName?: string;
  size?: number;
}

/**
 * Downloads a resource file and handles automatic reassembly if it was uploaded in chunks
 * 
 * @param bookingId The booking ID
 * @param resourceId The resource ID to download
 * @param options Additional download options
 * @returns A Blob of the downloaded resource and its metadata
 */
export const downloadResource = async (
  bookingId: string,
  resourceId: string,
  options: DownloadOptions = {}
): Promise<{ blob: Blob; metadata: ResourceMetadata }> => {
  // First get metadata to determine if it's a chunked resource
  const metadata = await getResourceMetadata(bookingId, resourceId, options.token);
  options.onProgress?.(10);

  if (metadata.isChunked && metadata.totalChunks && metadata.totalChunks > 1) {
    // Handle chunked resources
    return await downloadAndReassembleChunks(bookingId, resourceId, metadata, options);
  } else {
    // Handle regular resources
    return await downloadRegularResource(metadata, options);
  }
};

/**
 * Gets metadata for a resource to determine download method
 */
const getResourceMetadata = async (bookingId: string, resourceId: string, token?: string): Promise<ResourceMetadata> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resources/${resourceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('idToken')}`
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to fetch resource metadata');
    }

    // Extract metadata from response
    const resource = response.data;
    
    // Check if this is a chunked resource
    const isChunked = resource.isChunked || 
      (resource.FileName && resource.FileName.includes('_part')) ||
      (resource.chunkInfo && resource.chunkInfo.totalParts);

    return {
      resourceId,
      fileName: resource.FileName || `resource-${resourceId}`,
      contentType: resource.ContentType || 'application/octet-stream',
      url: resource.ResourceUrl || resource.url,
      isChunked,
      totalChunks: resource.totalChunks || resource.chunkInfo?.totalParts,
      originalFileName: resource.originalFileName || resource.FileName,
      size: resource.Size
    };
  } catch (error) {
    throw new Error('Failed to fetch resource metadata. Please try again.');
  }
};

/**
 * Downloads a regular (non-chunked) resource
 */
const downloadRegularResource = async (
  metadata: ResourceMetadata,
  options: DownloadOptions = {}
): Promise<{ blob: Blob; metadata: ResourceMetadata }> => {
  try {
    options.onProgress?.(20);
    
    // If we have a direct URL, use it
    if (metadata.url) {
      const response = await axios.get(metadata.url, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 70) + 20;
            options.onProgress?.(progress);
          }
        }
      });
      
      options.onProgress?.(100);
      return { 
        blob: new Blob([response.data], { type: metadata.contentType }), 
        metadata 
      };
    }
    
    throw new Error('Resource URL not found');
  } catch (error) {
    throw new Error('Failed to download resource. Please try again.');
  }
};

/**
 * Downloads and reassembles a chunked resource
 */
const downloadAndReassembleChunks = async (
  bookingId: string,
  resourceId: string,
  metadata: ResourceMetadata,
  options: DownloadOptions = {}
): Promise<{ blob: Blob; metadata: ResourceMetadata }> => {
  try {
    options.onProgress?.(15);
    
    // Get list of all chunks
    const chunks = await getChunksList(bookingId, resourceId, options.token);
    
    if (!chunks.length) {
      throw new Error('No chunks found for this resource');
    }
    
    // Download all chunks
    const chunkBlobs: Blob[] = [];
    const totalChunks = chunks.length;
    const progressIncrement = 70 / totalChunks;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      
      let chunkData: Blob;
      
      if (chunk.ResourceUrl || chunk.url) {
        // Download from the chunk's URL
        const response = await axios.get(chunk.ResourceUrl || chunk.url, {
          responseType: 'blob'
        });
        chunkData = new Blob([response.data], { type: metadata.contentType });
      } else {
        throw new Error(`No URL found for chunk ${i + 1}`);
      }
      
      chunkBlobs.push(chunkData);
      options.onProgress?.(20 + Math.round((i + 1) * progressIncrement));
    }
    
    // Reassemble the chunks into a single blob
    const reassembledBlob = new Blob(chunkBlobs, { type: metadata.contentType });
    options.onProgress?.(95);
    
    // Update metadata with the original file information
    const finalMetadata = {
      ...metadata,
      fileName: metadata.originalFileName || metadata.fileName.replace(/_part\d+_/, '_'),
      isChunked: true,
      size: reassembledBlob.size
    };
    
    options.onProgress?.(100);
    
    return {
      blob: reassembledBlob,
      metadata: finalMetadata
    };
  } catch (error) {
    throw new Error('Failed to download and reassemble file chunks. Please try again.');
  }
};

/**
 * Gets the list of all chunks for a resource
 */
const getChunksList = async (bookingId: string, resourceId: string, token?: string): Promise<any[]> => {
  try {
    // First try to get chunks info directly
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/bookings/${bookingId}/resources/${resourceId}/chunks`,
        {
          headers: {
            'Authorization': `Bearer ${token || localStorage.getItem('idToken')}`
          }
        }
      );
      
      if (response.data && Array.isArray(response.data.chunks)) {
        return response.data.chunks.sort((a: any, b: any) => {
          // Sort by part number if available
          if (a.partNumber !== undefined && b.partNumber !== undefined) {
            return a.partNumber - b.partNumber;
          }
          // Otherwise try to extract part number from filename
          const partA = a.FileName?.match(/_part(\d+)_/) || [0, 0];
          const partB = b.FileName?.match(/_part(\d+)_/) || [0, 0];
          return parseInt(partA[1]) - parseInt(partB[1]);
        });
      }
    } catch (e) {
    }
    
    // If that fails, try to search all resources for chunks with matching resource ID
    const allResourcesResponse = await axios.get(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('idToken')}`
        }
      }
    );
    
    let resources = [];
    if (allResourcesResponse.data && Array.isArray(allResourcesResponse.data.resources)) {
      resources = allResourcesResponse.data.resources;
    } else if (Array.isArray(allResourcesResponse.data)) {
      resources = allResourcesResponse.data;
    }
    
    const chunks = resources.filter((resource: any) => {
      // Filter chunks by the parent resource ID in chunk info or filename pattern
      return (resource.chunkInfo && resource.chunkInfo.resourceId === resourceId) ||
             (resource.FileName && resource.FileName.includes(`${resourceId}_part`));
    });
    
    return chunks.sort((a: any, b: any) => {
      // Sort by part number if available in chunkInfo
      if (a.chunkInfo?.partNumber !== undefined && b.chunkInfo?.partNumber !== undefined) {
        return a.chunkInfo.partNumber - b.chunkInfo.partNumber;
      }
      // Otherwise try to extract part number from filename
      const partA = a.FileName?.match(/_part(\d+)_/) || [0, 0];
      const partB = b.FileName?.match(/_part(\d+)_/) || [0, 0];
      return parseInt(partA[1]) - parseInt(partB[1]);
    });
  } catch (error) {
    return [];
  }
};

/**
 * Saves a blob as a file with the specified filename
 */
export const saveBlob = (blob: Blob, fileName: string): void => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  
  // Append to body, click and remove
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
