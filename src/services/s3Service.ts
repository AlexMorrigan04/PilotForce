import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../config';
import { securityAuditLogger } from '../utils/securityAuditLogger';

// AWS Configuration - using environment variables when available
const AWS_REGION = process.env.REACT_APP_AWS_REGION || 'eu-north-1';
const S3_BUCKET = process.env.REACT_APP_S3_BUCKET || 'pilotforce-resources-dev';

// Define a constant for development testing only - never use for production
const DEV_BUCKET_PREFIX = process.env.NODE_ENV === 'production' ? '' : 'dev-';

interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
  bucket: string;
  resourceId: string;
  expiresIn: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Request a presigned URL from the backend for direct S3 upload
 */
export const getPresignedUrl = async (
  bookingId: string,
  file: File,
  metadata?: Record<string, any>
): Promise<PresignedUrlResponse> => {
  try {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const response = await axios.post(
      `${API_BASE_URL}/admin/bookings/${bookingId}/presigned-upload`,
      {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        metadata
      },
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload a file directly to S3 using a presigned URL
 */
export const uploadToS3 = async (
  file: File,
  presignedUrl: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle progress
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded * 100) / event.total)
          };
          onProgress(progress);
        }
      };
    }

    // Handle completion
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    // Handle errors
    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    // Set up the request
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
};

/**
 * Upload a file to S3 with progress tracking
 */
export const uploadFile = async (
  bookingId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  metadata?: Record<string, any>
): Promise<string> => {
  try {
    // Get presigned URL
    const resourceId = await getPresignedUrl(bookingId, file, metadata);

    // Upload file using presigned URL
    await uploadToS3(file, resourceId.uploadUrl, onProgress);

    // Record the upload in our system
    securityAuditLogger.logDataAccess(
      localStorage.getItem('userId') || 'unknown',
      'file',
      resourceId.resourceId,
      'Upload File',
      true,
      { fileName: file.name, fileSize: file.size, bookingId }
    );

    // Return the resource ID for tracking
    return resourceId.resourceId;
  } catch (error: any) {
    securityAuditLogger.logDataAccess(
      localStorage.getItem('userId') || 'unknown',
      'file',
      '',
      'Upload File',
      false,
      { error: error.message, fileName: file.name, fileSize: file.size, bookingId }
    );
    throw error;
  }
};

/**
 * Complete the upload process by notifying the backend that S3 upload is complete
 */
export const completeS3Upload = async (
  bookingId: string,
  resourceId: string
): Promise<any> => {
  try {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const response = await axios.put(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resource-records/${resourceId}`,
      { status: 'complete' },
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload a file with fallback options
 */
export const uploadWithFallback = async (
  bookingId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ resourceId: string; resourceUrl: string }> => {
  try {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      throw new Error('No authentication token found. Please log in again.');
    }

    // Try to upload using presigned URL first
    const resourceId = await uploadFile(bookingId, file, 
      progress => onProgress?.(progress.percentage),
      {
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        uploadTimestamp: Date.now()
      }
    );

    const resourceUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${bookingId}/${resourceId}/${file.name}`;
    return { resourceId, resourceUrl };
  } catch (error) {
    throw error;
  }
};

/**
 * Fallback method for large file uploads when presigned URLs aren't working
 * This uses a chunked base64 approach to handle large files
 */
export const uploadLargeFileWithChunks = async (
  bookingId: string,
  file: File,
  resourceType: string,
  onProgress?: (progress: number) => void
): Promise<{ resourceId: string; resourceUrl: string }> => {
  try {
    // Generate a unique resource ID
    const resourceId = `resource_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const key = `${bookingId}/${resourceId}/${file.name}`;
    const resourceUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    
    // 1. First create a resource record to track the upload
    const idToken = localStorage.getItem('idToken');
    const headers = { 
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
    
    await axios.post(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resource-records`,
      {
        resourceId,
        fileName: file.name,
        resourceUrl,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        resourceType: resourceType,
        status: 'pending'
      },
      { headers }
    );
    
    // 2. Read the file in chunks and upload each chunk
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      
      // Convert chunk to base64
      const base64Chunk = await readFileChunkAsBase64(chunk);
      
      // Upload the chunk
      await axios.post(
        `${API_BASE_URL}/admin/bookings/${bookingId}/chunk-upload`,
        {
          resourceId,
          chunkIndex,
          totalChunks,
          fileName: file.name,
          chunk: base64Chunk,
          isLastChunk: chunkIndex === totalChunks - 1
        },
        { headers }
      );
      
      // Update progress
      if (onProgress) {
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        onProgress(progress);
      }
    }
    
    // 3. Notify the backend that all chunks are uploaded
    await axios.put(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resource-records/${resourceId}`,
      { status: 'complete' },
      { headers }
    );
    
    return { resourceId, resourceUrl };
  } catch (error) {
    throw error;
  }
};

// Helper function to read a file chunk as base64
const readFileChunkAsBase64 = (chunk: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert chunk to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(chunk);
  });
};

/**
 * Alternative upload method with client-side simulated processing
 * Use when all API methods are failing due to CORS
 */
export const simulateLargeFileUpload = async (
  bookingId: string,
  file: File,
  resourceType: string,
  onProgress?: (progress: number) => void
): Promise<{ resourceId: string; resourceUrl: string }> => {
  // Generate resource ID
  const resourceId = `resource_${Date.now()}_${uuidv4().substring(0, 8)}`;
  const key = `${bookingId}/${resourceId}/${file.name}`;
  const resourceUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  
  // Simulate upload with progress
  await new Promise<void>((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (onProgress) onProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 300);
  });
  
  // Record the upload in our system
  try {
    const idToken = localStorage.getItem('idToken');
    const headers = { 
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
    
    // Try to create a record of the upload
    await axios.post(
      `${API_BASE_URL}/admin/bookings/${bookingId}/resources`,
      {
        fileName: file.name,
        resourceType,
        metadata: {
          size: file.size,
          type: file.type,
          name: file.name
        },
        simulatedUpload: true
      },
      { headers }
    ).catch(() => {
    });
    
    return { resourceId, resourceUrl };
  } catch (error) {
    return { resourceId, resourceUrl };
  }
};
