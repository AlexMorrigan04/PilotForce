/**
 * Utilities for splitting files into chunks for chunked upload
 */

// File chunk size for large file uploads (2MB per chunk)
const CHUNK_SIZE = 2 * 1024 * 1024;

// FileChunk interface
export interface FileChunk {
  data: ArrayBuffer;
  index: number;
  checksum: string; // Include checksum in the type definition
}

/**
 * Split a file into manageable chunks
 * @param file The file to split
 * @param chunkSize Size of each chunk in bytes
 * @returns Array of file chunks
 */
export const splitFileIntoChunks = async (
  file: File, 
  chunkSize: number = CHUNK_SIZE
): Promise<FileChunk[]> => {
  return new Promise((resolve, reject) => {
    try {
      const chunks: FileChunk[] = [];
      const fileSize = file.size;
      const numChunks = Math.ceil(fileSize / chunkSize);
      
      // Function to process a single chunk
      const processChunk = (chunkIndex: number) => {
        const startByte = chunkIndex * chunkSize;
        const endByte = Math.min(fileSize, startByte + chunkSize);
        
        // Slice the file to get the chunk
        const chunk = file.slice(startByte, endByte);
        
        // Convert the chunk to ArrayBuffer
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Generate simple checksum (hash) based on first few bytes
            const buffer = e.target.result as ArrayBuffer;
            const view = new Uint8Array(buffer);
            const checksum = generateSimpleChecksum(view);
            
            chunks.push({
              data: buffer,
              index: chunkIndex,
              checksum
            });
            
            // If this is the last chunk, resolve the promise with all chunks
            if (chunks.length === numChunks) {
              // Sort by index just to be safe
              chunks.sort((a, b) => a.index - b.index);
              resolve(chunks);
            } else {
              // Process the next chunk
              processChunk(chunkIndex + 1);
            }
          }
        };
        
        reader.onerror = (error) => {
          reject(new Error(`Error reading file chunk ${chunkIndex}: ${error}`));
        };
        
        reader.readAsArrayBuffer(chunk);
      };
      
      // Start processing chunks from index 0
      if (numChunks > 0) {
        processChunk(0);
      } else {
        resolve([]); // Empty file
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert a chunk to base64 string
 * @param chunk The chunk to convert
 * @returns Base64 string
 */
export const chunkToBase64 = async (chunk: FileChunk | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extract the base64 part, removing data:*/*;base64, prefix
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Reader result is not a string'));
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      // If it's a FileChunk, use data; if it's a Blob, use the blob directly
      if ('data' in chunk) {
        // Create a Blob from the ArrayBuffer
        const blob = new Blob([chunk.data]);
        reader.readAsDataURL(blob);
      } else {
        reader.readAsDataURL(chunk);
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a simple checksum from a Uint8Array
 * This is not cryptographically secure but works for basic integrity checking
 * @param data Uint8Array to generate checksum from
 * @returns Checksum string
 */
const generateSimpleChecksum = (data: Uint8Array): string => {
  // Take first 1000 bytes max for performance
  const sampleSize = Math.min(data.length, 1000);
  let hash = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0; // Convert to 32bit integer
  }
  
  // Convert to hex string
  return (hash >>> 0).toString(16);
};
