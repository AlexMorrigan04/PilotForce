import * as exifr from 'exifr';
import AWS from 'aws-sdk';

/**
 * Extract geolocation and camera orientation data from an image file
 * @param file The image file to extract metadata from
 * @returns Promise with extracted geolocation data including altitude and heading
 */
export const extractImageMetadata = async (file: File): Promise<any> => {
  try {
    // Use exifr to parse EXIF data from the image with more options enabled
    const exifData = await exifr.parse(file, { 
      gps: true,      // Get GPS data
      xmp: true,      // Get XMP metadata (often contains DJI-specific data)
      tiff: true,     // Get TIFF metadata
      ifd0: {},       // Get main image metadata
      exif: true,     // Get standard EXIF data
      interop: true,  // Get interoperability data
      translateValues: true, // Automatically translate values
      reviveValues: true,    // Convert strings to appropriate types
      sanitize: true,        // Clean up data structure
    });
    
    if (!exifData) {
      return null;
    }
    
    // Log the full EXIF data for debugging

    // Extract basic GPS coordinates
    const geoData: any = {};
    
    if (exifData.latitude !== undefined && exifData.longitude !== undefined) {
      geoData.latitude = exifData.latitude;
      geoData.longitude = exifData.longitude;
    }

    // Extract altitude if available
    if (exifData.GPSAltitude !== undefined) {
      geoData.altitude = exifData.GPSAltitude;
    } else if (exifData.altitude !== undefined) {
      geoData.altitude = exifData.altitude;
    }

    // ENHANCED HEADING EXTRACTION
    // Look for heading/direction in various possible fields with more comprehensive search
    const possibleHeadingFields = [
      'GPSImgDirection',       // Standard EXIF GPS image direction
      'heading',               // DJI-specific 
      'FlightYawDegree',       // DJI-specific
      'GimbalYawDegree',       // DJI-specific
      'CameraYaw',             // Another variant
      'Yaw',                   // Simple yaw value
      'Direction',             // Generic direction field
      'GPSDestBearing',        // Another GPS direction field
      'GPSTrack',              // Direction of movement
      'CameraOrientation',     // Camera orientation
      'DroneYawDegree',        // Drone orientation
      'FlightRollDegree',      // Flight roll (might contain direction)
      'GimbalRollDegree',      // Gimbal roll
      'AbsoluteAltitude',      // For altitude
      'RelativeAltitude'       // For altitude
    ];
    
    // First, try the direct fields in the main object
    let heading = undefined;
    for (const field of possibleHeadingFields) {
      if (exifData[field] !== undefined) {
        heading = parseFloat(exifData[field]);
        break;
      }
    }
    
    // Next, try to search in nested objects if not found in main object
    if (heading === undefined) {
      // Search in all nested objects of exifData
      const searchHeadingInObject = (obj: any, prefix: string = ''): number | undefined => {
        if (!obj || typeof obj !== 'object') return undefined;
        
        // Search direct properties that match our heading field names
        for (const field of possibleHeadingFields) {
          if (obj[field] !== undefined) {
            const value = parseFloat(obj[field]);
            if (!isNaN(value)) {
              return value;
            }
          }
        }
        
        // Search for any property that might contain "direction" or "heading" or "yaw" in its name
        for (const key in obj) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('direction') || 
            lowerKey.includes('heading') || 
            lowerKey.includes('yaw') || 
            lowerKey.includes('bearing') || 
            lowerKey.includes('orient')
          ) {
            const value = parseFloat(obj[key]);
            if (!isNaN(value)) {
              return value;
            }
          }
          
          // Recursively search in nested objects, but not in arrays or common metadata fields
          if (
            obj[key] && 
            typeof obj[key] === 'object' && 
            !Array.isArray(obj[key]) && 
            key !== 'thumbnail' && 
            key !== 'image' && 
            key !== 'base64'
          ) {
            const nestedResult = searchHeadingInObject(obj[key], `${prefix}.${key}`);
            if (nestedResult !== undefined) {
              return nestedResult;
            }
          }
        }
        
        return undefined;
      };
      
      // Search for heading in nested objects
      heading = searchHeadingInObject(exifData);
    }
    
    // Special case for DJI drones - try to extract from XMP data
    if (heading === undefined && exifData.xmp) {
      const xmpData = exifData.xmp;
      
      // Look for common DJI XMP fields
      if (xmpData.GimbalYawDegree !== undefined) {
        heading = parseFloat(xmpData.GimbalYawDegree);
      } else if (xmpData.FlightYawDegree !== undefined) {
        heading = parseFloat(xmpData.FlightYawDegree);
      } else if (xmpData['drone-dji:GimbalYawDegree'] !== undefined) {
        heading = parseFloat(xmpData['drone-dji:GimbalYawDegree']);
      } else if (xmpData['drone-dji:FlightYawDegree'] !== undefined) {
        heading = parseFloat(xmpData['drone-dji:FlightYawDegree']);
      }
      
      // If still not found, search all XMP properties for anything that might be direction-related
      if (heading === undefined) {
        for (const key in xmpData) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('yaw') || 
            lowerKey.includes('direction') || 
            lowerKey.includes('heading') || 
            lowerKey.includes('bearing') ||
            lowerKey.includes('orient')
          ) {
            const value = parseFloat(xmpData[key]);
            if (!isNaN(value)) {
              heading = value;
              break;
            }
          }
        }
      }
    }
    
    // If we found a heading value, add it to the geolocation data
    if (heading !== undefined) {
      geoData.heading = heading;
    } else {
      
      // If no direction is available but we have GPS coordinates, try to get raw EXIF data
      // to see what other metadata might be available
      try {
        // Try to get raw EXIF tags without parsing for more detailed analysis
        const rawTags = await exifr.parse(file, { tiff: true });
      } catch (err) {
      }
    }

    // Check for other useful metadata
    if (exifData.GPSImgDirectionRef) {
      geoData.headingReference = exifData.GPSImgDirectionRef;
    }
    
    if (exifData.GPSAltitudeRef) {
      geoData.altitudeReference = exifData.GPSAltitudeRef;
    }

    return geoData;
  } catch (error) {
    return null;
  }
};

/**
 * Upload an image to S3 and store its metadata in DynamoDB
 * @param file The image file to upload
 * @param bookingId The booking ID to associate with the image
 * @param awsConfig AWS configuration object
 * @returns Promise with the upload result
 */
export const uploadImageWithMetadata = async (
  file: File, 
  bookingId: string,
  awsConfig: {
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  }
): Promise<any> => {
  try {
    // Configure AWS with the provided credentials
    AWS.config.update(awsConfig);
    
    // Create S3 and DynamoDB instances
    const s3 = new AWS.S3();
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    
    // Generate a unique filename to avoid collisions
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${timestamp}-${randomString}`;
    const filename = `${uniqueId}-${file.name}`;
    
    // S3 upload path
    const s3Key = `uploads/${bookingId}/${filename}`;
    
    // Extract metadata before upload
    const metadata = await extractImageMetadata(file);
    
    // Upload the file to S3
    const uploadResult = await s3.upload({
      Bucket: 'drone-images-bucket',
      Key: s3Key,
      Body: file,
      ContentType: file.type
    }).promise();
    
    // Format geolocation data for DynamoDB storage in the correct format
    const formattedGeolocation: any = {};
    
    if (metadata) {
      // Log the raw extracted metadata for debugging
      
      // Format latitude and longitude in DynamoDB number format
      if (metadata.latitude !== undefined) {
        formattedGeolocation.latitude = { N: metadata.latitude.toString() };
      }
      
      if (metadata.longitude !== undefined) {
        formattedGeolocation.longitude = { N: metadata.longitude.toString() };
      }
      
      // Add heading in the same format if available
      if (metadata.heading !== undefined) {
        formattedGeolocation.heading = { N: metadata.heading.toString() };
      }
      
      // Add altitude in the same format if available
      if (metadata.altitude !== undefined) {
        formattedGeolocation.altitude = { N: metadata.altitude.toString() };
      }
    }
    
    // Log the formatted geolocation data to verify it's in the correct format
    
    // Prepare data for DynamoDB
    const imageData = {
      s3Key: s3Key,
      s3Url: uploadResult.Location,
      BookingId: bookingId,
      filename: file.name,
      originalFilename: file.name,
      fileType: file.type,
      size: file.size,
      uploadTimestamp: timestamp,
      uploadDate: new Date().toISOString(),
      // Include geolocation data if available
      geolocation: Object.keys(formattedGeolocation).length > 0 ? formattedGeolocation : undefined
    };
    
    // Store metadata in DynamoDB
    await dynamoDb.put({
      TableName: 'ImageUploads',
      Item: imageData
    }).promise();
    
    
    // Return the image data with the geolocation information
    return {
      success: true,
      data: imageData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const imageUploadUtils = {
  extractImageMetadata,
  uploadImageWithMetadata
};

export default imageUploadUtils;
