import axios from 'axios';
import { Booking, BookingImage } from '../types/bookingTypes';
import AWS from 'aws-sdk';
import { createBooking, getBookings, BookingRequest, BookingResponse } from '../utils/bookingUtils';

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
    throw error;
  }
};

export const fetchBookingImages = async (bookingId: string): Promise<BookingImage[]> => {
  try {
    
    // Check for all possible field name variations of BookingId in DynamoDB
    const scanParams = {
      TableName: 'ImageUploads',
      FilterExpression: 'BookingId = :bookingId OR bookingId = :bookingId',
      ExpressionAttributeValues: {
        ':bookingId': bookingId
      }
    };
    
    const result = await dynamoDb.scan(scanParams).promise();
    
    // Debug logging to see what we're getting from DynamoDB
    if (result.Items && result.Items.length > 0) {
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
      
      return processedImage;
    });
  } catch (error) {
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
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Fetch booking details by ID using the dedicated Lambda endpoint
 * @param bookingId The ID of the booking to fetch
 * @returns Promise with the booking details
 */
export const fetchBookingDetails = async (bookingId: string): Promise<any> => {
  try {
    
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }
    
    // Get token for authorization
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    
    // Get the API URL from environment or use a default
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    
    // Create an array of possible endpoints to try (in priority order)
    const endpoints = [
      `${apiUrl}/bookings/${bookingId}`,                       // RESTful path parameter (most likely)
      `${apiUrl}/bookings?BookingId=${bookingId}`,             // Query param uppercase
      `${apiUrl}/bookings?bookingId=${bookingId}`,             // Query param lowercase
      `${apiUrl}/get-booking-details/${bookingId}`,            // Lambda function name
      `${apiUrl}/get-bookings-details/${bookingId}`            // Plural version
    ];
    
    
    let response = null;
    let endpointUsed = '';
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        
        const result = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        
        if (result.ok) {
          response = result;
          endpointUsed = endpoint;
          break;
        } else {
          const errorText = await result.text();
          console.warn(`❌ Failed response from ${endpoint}: ${result.status}`, errorText.substring(0, 200));
        }
      } catch (endpointError) {
        console.warn(`❌ Error with endpoint ${endpoint}:`, endpointError);
      }
    }
    
    if (!response) {
      throw new Error(`Failed to fetch booking details from all endpoints`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      const parseError = error as Error;
      const rawText = await response.text();
      throw new Error(`Failed to parse booking details response: ${parseError.message}`);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get booking details by ID with enhanced error handling
 * @param bookingId The ID of the booking to fetch
 * @returns Promise with booking details
 */
export const getBookingDetails = async (bookingId: string): Promise<any> => {
  try {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }
    
    // Get token for authorization
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Get the API URL from environment or use a default
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    const bookingDetailsUrl = `${apiUrl}/bookings/${bookingId}`;
    
    
    // Make a fetch request with detailed error handling
    const response = await fetch(bookingDetailsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    
    // Get response details for debugging
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response as JSON
    try {
      const data = await response.json();
      return data;
    } catch (parseError) {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    throw error;
  }
};

/**
 * Service for managing bookings
 */
class BookingService {
  /**
   * Create a new booking
   * @param bookingData The booking data to submit
   * @returns Promise with booking response
   */
  async createBooking(bookingData: BookingRequest): Promise<BookingResponse> {
    return createBooking(bookingData);
  }
  
  /**
   * Get all bookings for the current user/company
   * @param companyId Optional company ID to filter by
   * @returns Array of bookings
   */
  async getBookings(companyId?: string) {
    return getBookings(companyId);
  }
  
  /**
   * Get a specific booking by ID
   * @param bookingId The booking ID to retrieve
   * @returns Booking details
   */
  async getBookingById(bookingId: string) {
    try {
      return await fetchBookingDetails(bookingId);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Format date for display
   * @param dateString The date string to format
   * @returns Formatted date string
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString || 'Unknown date';
    }
  }
  
  /**
   * Get booking status class
   * @param status The booking status
   * @returns CSS class for the status
   */
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

export default new BookingService();
