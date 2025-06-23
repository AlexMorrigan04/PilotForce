import { v4 as uuidv4 } from 'uuid';
import * as exifr from 'exifr';
import * as s3Service from '../services/s3Service';

/**
 * Convert floating point numbers to strings to ensure DynamoDB compatibility
 */
const formatNumbersForDynamoDB = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'number') {
    // Convert number to string with fixed precision
    return obj.toFixed(6);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(formatNumbersForDynamoDB);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = formatNumbersForDynamoDB(obj[key]);
    }
    return result;
  }
  
  return obj;
};

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
      metadata.coordinates = {
        latitude: formatNumbersForDynamoDB(exifData.latitude),
        longitude: formatNumbersForDynamoDB(exifData.longitude)
      };
    }
    
    // Extract altitude if available
    if (exifData.altitude !== undefined) {
      metadata.altitude = formatNumbersForDynamoDB(exifData.altitude);
    } else if (exifData.GPSAltitude !== undefined) {
      metadata.altitude = formatNumbersForDynamoDB(exifData.GPSAltitude);
    } else if (exifData.RelativeAltitude !== undefined) {
      metadata.altitude = formatNumbersForDynamoDB(exifData.RelativeAltitude);
    } else if (exifData.AbsoluteAltitude !== undefined) {
      metadata.altitude = formatNumbersForDynamoDB(exifData.AbsoluteAltitude);
    }
    
    // Enhanced heading/direction extraction - check multiple possible fields
    const directionFields = [
      'GPSImgDirection',      // Standard EXIF GPS image direction
      'direction',            // Generic direction field
      'heading',              // Generic heading field
      'FlightYawDegree',      // DJI-specific
      'GimbalYawDegree',      // DJI-specific
      'CameraYaw',            // Another variant
      'Yaw',                  // Simple yaw value
      'GPSDestBearing',       // Another GPS direction field
      'GPSTrack',            // Direction of movement
      'CameraOrientation',    // Camera orientation
      'DroneYawDegree',      // Drone orientation
      'FlightRollDegree',     // Flight roll (might contain direction)
      'GimbalRollDegree'      // Gimbal roll
    ];
    
    // First check in the main EXIF data
    for (const field of directionFields) {
      if (exifData[field] !== undefined) {
        metadata.direction = formatNumbersForDynamoDB(parseFloat(exifData[field]));
        break;
      }
    }
    
    // If no direction found, check in XMP data which often contains DJI-specific info
    if (metadata.direction === undefined && exifData.xmp) {
      const xmp = exifData.xmp;
      
      // Check DJI-specific XMP fields
      for (const field of directionFields) {
        // Check both normal and DJI-prefixed versions
        if (xmp[field] !== undefined) {
          metadata.direction = formatNumbersForDynamoDB(parseFloat(xmp[field]));
          break;
        }
        const djiField = `drone-dji:${field}`;
        if (xmp[djiField] !== undefined) {
          metadata.direction = formatNumbersForDynamoDB(parseFloat(xmp[djiField]));
          break;
        }
      }
      
      // If still not found, look for any field containing direction-related keywords
      if (metadata.direction === undefined) {
        for (const key in xmp) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('yaw') || 
            lowerKey.includes('direction') || 
            lowerKey.includes('heading') || 
            lowerKey.includes('bearing') ||
            lowerKey.includes('orient')
          ) {
            const value = parseFloat(xmp[key]);
            if (!isNaN(value)) {
              metadata.direction = formatNumbersForDynamoDB(value);
              break;
            }
          }
        }
      }
    }
    
    // Add camera and drone model information if available
    if (exifData.Model || exifData.CameraModel) {
      metadata.cameraModel = exifData.Model || exifData.CameraModel;
    }
    if (exifData.DroneModel || exifData.drone || exifData.xmp?.['drone-dji:Model']) {
      metadata.droneModel = exifData.DroneModel || exifData.drone || exifData.xmp?.['drone-dji:Model'];
    }
    
    // Add timestamp if available
    if (exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate) {
      metadata.timestamp = exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate;
    }
    
    return metadata;
  } catch (error) {
    return null;
  }
};

/**
 * Upload a file directly to S3 with progress tracking using presigned URLs
 */
export const uploadDirectlyToS3 = async (
  file: File,
  bookingId: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  try {
    // Extract metadata for image files
    let metadata = null;
    if (file.type.startsWith('image/')) {
      metadata = await extractImageMetadata(file);
    }

    // Upload using presigned URL
    const resourceId = await s3Service.uploadFile(
      bookingId,
      file,
      (progress) => {
        onProgress?.(progress.percentage);
      },
      metadata ? {
        ...metadata,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        uploadTimestamp: Date.now()
      } : undefined
    );

    return {
      success: true,
      resourceId,
      file,
      metadata
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload file',
      file
    };
  }
};
