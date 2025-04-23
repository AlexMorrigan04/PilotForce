/**
 * GeoTIFF specific chunking utilities
 * Handles optimal chunking of GeoTIFF files for better reassembly
 */

// Define default chunk size (4MB)
const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;

// Define the GeoTiffChunk interface
export interface GeoTiffChunk {
  data: Blob;
  fileName: string;
  index: number;
  size: number;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    originalFileName: string;
    timestamp: string;
    checksum: string;
  };
}

/**
 * Split a GeoTIFF file into chunks with optimal boundaries
 * @param file The GeoTIFF file to split
 * @param chunkSize Size of each chunk in bytes
 * @returns Array of GeoTiff chunks
 */
export const splitGeoTiffIntoChunks = async (
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<GeoTiffChunk[]> => {
  try {
    // For now, we'll use a simple chunking strategy
    // In the future, we could add GeoTIFF-specific optimizations
    const chunks: GeoTiffChunk[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    const sessionTimestamp = Date.now().toString();
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunkBlob = file.slice(start, end);
      
      // Generate a checksum for the chunk
      const checksum = await generateBlobChecksum(chunkBlob);
      
      // Create a chunk filename in the format expected by the backend
      const chunkFileName = `${file.name}.part${i}`;
      
      chunks.push({
        data: chunkBlob,
        fileName: chunkFileName,
        index: i,
        size: chunkBlob.size,
        metadata: {
          chunkIndex: i,
          totalChunks,
          originalFileName: file.name,
          timestamp: sessionTimestamp,
          checksum
        }
      });
    }
    
    return chunks;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a manifest file for a GeoTIFF chunked upload
 * @param file The original file
 * @param chunks The chunks created from the file
 * @returns A Blob containing the JSON manifest
 */
export const createChunkManifest = (file: File, chunks: GeoTiffChunk[]): Blob => {
  const sessionTimestamp = chunks.length > 0 
    ? chunks[0].metadata.timestamp 
    : Date.now().toString();
  
  const manifest = {
    originalFileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'image/tiff',
    totalChunks: chunks.length,
    sessionId: sessionTimestamp,
    timestamp: sessionTimestamp,
    chunks: chunks.map(chunk => ({
      index: chunk.index,
      fileName: chunk.fileName,
      size: chunk.size,
      checksum: chunk.metadata.checksum
    })),
    created: new Date().toISOString()
  };
  
  const manifestJson = JSON.stringify(manifest, null, 2);
  return new Blob([manifestJson], { type: 'application/json' });
};

/**
 * Generate a checksum for a blob
 * @param blob The blob to checksum
 * @returns A promise that resolves to the checksum string
 */
const generateBlobChecksum = async (blob: Blob): Promise<string> => {
  try {
    // For performance, we'll just hash a small portion of the blob
    const sampleSize = Math.min(blob.size, 4096); // 4KB sample
    const sampleBlob = blob.slice(0, sampleSize);
    const arrayBuffer = await sampleBlob.arrayBuffer();
    const view = new Uint8Array(arrayBuffer);
    
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash |= 0;
    }
    
    return (hash >>> 0).toString(16);
  } catch (error) {
    return Date.now().toString(16); // Fallback to timestamp if there's an error
  }
};
