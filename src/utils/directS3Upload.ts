import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as exifr from 'exifr'; // Import exifr for EXIF extraction
import { splitFileIntoChunks, FileChunk } from './fileSplitter';
import { splitGeoTiffIntoChunks, createChunkManifest, GeoTiffChunk } from './geoTiffChunker';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks - balances speed with reliability

interface S3UploadResult {
  resourceId: string;
  resourceUrl: string;
  key: string;
  success: boolean;
}

/**
 * Extract metadata from an image file, including GPS coordinates, heading, and altitude
 * @param file The image file to extract metadata from
 * @returns Promise with extracted metadata object or null if no metadata is found
 */
export const extractImageMetadata = async (file: File): Promise<any> => {
  try {
    if (!file.type.startsWith('image/')) {
      return null;
    }
    
    
    // Use exifr to parse metadata with extended options for maximum compatibility
    const exifData = await exifr.parse(file, {
      gps: true,      // Get GPS data
      xmp: true,      // Get XMP metadata (often contains DJI-specific data)
      tiff: true,     // Get TIFF metadata
      exif: true,     // Get standard EXIF data
      translateValues: true,
      reviveValues: true
    });
    
    if (!exifData) {
      return null;
    }
    
    
    // Extract GPS coordinates
    const metadata: any = {};
    
    if (exifData.latitude !== undefined && exifData.longitude !== undefined) {
      metadata.latitude = exifData.latitude;
      metadata.longitude = exifData.longitude;
    }
    
    // Extract altitude if available
    if (exifData.altitude !== undefined) {
      metadata.altitude = exifData.altitude;
    }
    
    // Extract heading/direction - look in common fields
    if (exifData.GPSImgDirection !== undefined) {
      metadata.direction = exifData.GPSImgDirection;
    }
    
    // Look for heading in DJI-specific XMP data
    if (exifData.xmp) {
      const xmp = exifData.xmp;
      
      // Check for common DJI drone heading fields
      if (xmp.GimbalYawDegree !== undefined) {
        metadata.direction = parseFloat(xmp.GimbalYawDegree);
      } else if (xmp.FlightYawDegree !== undefined) {
        metadata.direction = parseFloat(xmp.FlightYawDegree);
      } else if (xmp['drone-dji:GimbalYawDegree'] !== undefined) {
        metadata.direction = parseFloat(xmp['drone-dji:GimbalYawDegree']);
      } else if (xmp['drone-dji:FlightYawDegree'] !== undefined) {
        metadata.direction = parseFloat(xmp['drone-dji:FlightYawDegree']);
      }
      
      if (metadata.direction !== undefined) {
      }
    }
    
    return metadata;
  } catch (error) {
    return null;
  }
};

/**
 * Upload a file directly to S3 with progress tracking
 * For large GeoTIFF files, uses optimized chunking with metadata
 */
export const uploadDirectlyToS3 = async (
  file: File,
  bookingId: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  // Check if this is a GeoTIFF file that needs special handling
  const isGeoTiff = file.name.toLowerCase().endsWith('.tif') || 
                   file.name.toLowerCase().endsWith('.tiff') ||
                   file.type === 'image/tiff';

  try {
    if (isGeoTiff) {
      return await uploadGeoTiffWithChunks(file, bookingId, onProgress);
    } else {
      return await uploadRegularFileWithChunks(file, bookingId, onProgress);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Upload a GeoTIFF file using optimized chunking with metadata
 */
const uploadGeoTiffWithChunks = async (
  file: File,
  bookingId: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  try {
    // Generate a resource ID for the final reassembled file
    const finalResourceId = `file_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    
    // Split the GeoTIFF into chunks with metadata
    const chunks = await splitGeoTiffIntoChunks(file);
    
    // Create a manifest file for easy reassembly
    const manifest = createChunkManifest(file, chunks);
    
    // Upload the manifest first to signal the start of uploads
    const manifestFileName = `${file.name.split('.')[0]}_manifest.json`;
    const manifestUploadResult = await uploadSingleChunk(
      manifest,
      manifestFileName,
      bookingId,
      apiUrl,
      true // isManifest flag
    );
    
    
    // Upload each chunk sequentially with progress tracking
    let totalUploaded = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Upload the chunk
      const chunkResult = await uploadSingleChunk(
        chunk.data, 
        chunk.fileName,
        bookingId,
        apiUrl,
        false, // Not a manifest
        chunk.metadata, // Include metadata for reassembly
        finalResourceId // Link to final reassembled file
      );
      
      // Calculate and report progress
      totalUploaded += chunk.data.size;
      const progress = Math.round((totalUploaded / file.size) * 100);
      if (onProgress) onProgress(progress);
      
    }

    // Return success information
    return {
      success: true,
      resourceId: finalResourceId,
      message: `Successfully uploaded ${chunks.length} chunks for ${file.name}`,
      originalFileName: file.name,
      chunks: chunks.map(c => c.fileName)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Upload a regular file using the standard chunking method
 */
const uploadRegularFileWithChunks = async (
  file: File,
  bookingId: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  try {
    onProgress?.(10);
    
    // Step 1: Create chunks from the file
    const chunks = await createChunksFromFile(file, CHUNK_SIZE);
    
    // Step 2: Create a unique resource ID for tracking this upload
    const resourceId = `resource_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const resourceType = file.type.startsWith('image/') ? 'image' : 'file';
    const sessionId = Date.now().toString(); // Use timestamp as session ID

    // Step 3: Use existing standard endpoint for each chunk
    let completedChunks = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        // Generate a simple checksum for each chunk
        const checksum = await generateSimpleChecksum(chunks[i].data);
        
        // Convert the chunk to base64
        const base64Chunk = await chunkToBase64(chunks[i].data);
        
        // Upload the chunk
        const response = await axios.post(
          `${API_BASE_URL}/admin/bookings/${bookingId}/resources/chunked`,
          {
            file: base64Chunk,
            fileName: `${file.name}.part${i}`,
            contentType: file.type || 'application/octet-stream',
            isChunk: true,
            finalResourceId: resourceId,
            resourceType: resourceType,
            metadata: {
              originalFileName: file.name,
              totalChunks: chunks.length,
              chunkIndex: i,
              timestamp: sessionId,
              checksum: checksum // Use generated checksum
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('idToken')}`
            }
          }
        );
        
        // Update progress
        completedChunks++;
        const progress = Math.round((completedChunks / chunks.length) * 100);
        onProgress?.(progress);
        
      } catch (error) {
        throw new Error(`Failed to upload chunk ${i + 1}`);
      }
    }
    
    // Step 4: Return success result
    onProgress?.(100);
    
    return {
      resourceId,
      resourceUrl: '', // Backend will need to generate this
      key: `${bookingId}/${resourceId}/${file.name}`,
      success: true
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Upload a single chunk or manifest to the API
 */
const uploadSingleChunk = async (
  data: Blob,
  fileName: string,
  bookingId: string,
  apiUrl: string,
  isManifest: boolean = false,
  metadata?: any,
  finalResourceId?: string
): Promise<any> => {
  try {
    // Convert the chunk to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert chunk to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(data);
    });
    
    const base64Data = await base64Promise;
    
    // Prepare the API request
    const endpoint = `${apiUrl}/admin/bookings/${bookingId}/chunkedUpload`;
    
    // Create the payload
    const payload: any = {
      file: base64Data,
      fileName: fileName,
      contentType: isManifest ? 'application/json' : 'image/tiff',
      resourceType: 'geotiff',
      isChunk: !isManifest,
      isManifest,
      chunkSize: data.size
    };
    
    // Add metadata if provided
    if (metadata) {
      payload.metadata = metadata;
    }
    
    // Add finalResourceId if provided
    if (finalResourceId) {
      payload.finalResourceId = finalResourceId;
    }
    
    // Get the auth token
    const token = localStorage.getItem('idToken') || '';
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Create chunks from a file
 */
const createChunksFromFile = async (file: File, chunkSize: number) => {
  const chunks = [];
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkBlob = file.slice(start, end);
    chunks.push({
      index: i,
      data: chunkBlob,
      size: end - start
    });
  }
  
  return chunks;
};

/**
 * Generate a simple checksum from a Blob
 */
const generateSimpleChecksum = async (blob: Blob): Promise<string> => {
  try {
    // Take the first few bytes of data for a simple hash
    const sampleSize = Math.min(blob.size, 1024);
    const sampleBlob = blob.slice(0, sampleSize);
    const arrayBuffer = await sampleBlob.arrayBuffer();
    const view = new Uint8Array(arrayBuffer);
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash |= 0; // Convert to 32bit integer
    }
    
    // Return as hex string
    return (hash >>> 0).toString(16);
  } catch (error) {
    return Date.now().toString(16); // Fallback
  }
};

/**
 * Convert file to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1]; // Remove data URL prefix
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
  });
};

/**
 * Convert a Blob/chunk to base64
 */
const chunkToBase64 = (chunk: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(chunk);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert chunk to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
  });
};
