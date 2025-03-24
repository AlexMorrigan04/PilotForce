import axios from 'axios';
import { Booking, BookingImage } from '../types/bookingTypes';
import AWS from 'aws-sdk';

const API_BASE_URL = 'http://localhost:5000/api';

// AWS Configuration
const awsRegion = process.env.REACT_APP_AWS_REGION;
const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

// Configure AWS SDK
AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  region: awsRegion
});

const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
  region: awsRegion,
  accessKeyId: accessKey,
  secretAccessKey: secretKey
});

export const fetchUserBookings = async (): Promise<Booking[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const response = await axios.get(`${API_BASE_URL}/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data.bookings;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};

export const fetchBookingImages = async (bookingId: string): Promise<BookingImage[]> => {
  try {
    console.log(`Fetching images for booking: ${bookingId}`);
    
    // Check for all possible field name variations of BookingId in DynamoDB
    const scanParams = {
      TableName: 'ImageUploads',
      FilterExpression: 'BookingId = :bookingId OR bookingId = :bookingId',
      ExpressionAttributeValues: {
        ':bookingId': bookingId
      }
    };
    
    const result = await dynamoDb.scan(scanParams).promise();
    console.log(`Found ${result.Items?.length || 0} images for booking`);
    
    // Debug logging to see what we're getting from DynamoDB
    if (result.Items && result.Items.length > 0) {
      console.log('First image sample:', JSON.stringify(result.Items[0]));
    }
    
    // Process and fix up the image URLs
    const images = result.Items as BookingImage[] || [];
    
    return images.map(image => {
      // Create a properly formatted image object
      const processedImage: BookingImage = {
        filename: image.filename || 'unnamed',
        s3Key: image.s3Key || '',
        s3Url: '',
        uploadDate: image.uploadDate || new Date().toISOString(),
        userId: image.userId || '',
        bookingId: image.bookingId || bookingId
      };
      
      // Format the S3 URL correctly - test different format variations
      if (image.s3Url && image.s3Url.startsWith('http')) {
        processedImage.s3Url = image.s3Url;
      } else if (image.s3Key) {
        // Try the standard S3 URL format (no region in URL)
        processedImage.s3Url = `https://drone-images-bucket.s3.amazonaws.com/${image.s3Key}`;
      }
      
      console.log(`Processed image URL: ${processedImage.s3Url}`);
      return processedImage;
    });
  } catch (error) {
    console.error('Error fetching booking images:', error);
    throw error;
  }
};

// Add a new function to directly check if an S3 object exists and is accessible
export const verifyS3Object = async (key: string, bucket: string = 'drone-images-bucket'): Promise<boolean> => {
  try {
    const s3 = new AWS.S3({
      region: awsRegion,
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    });
    
    const params = {
      Bucket: bucket,
      Key: key
    };
    
    // Just check if the object exists
    await s3.headObject(params).promise();
    console.log(`S3 object verified: ${key}`);
    return true;
  } catch (error) {
    console.error(`S3 object not accessible: ${key}`, error);
    return false;
  }
};
