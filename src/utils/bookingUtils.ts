import axios, { AxiosResponse } from 'axios';
import { apiClient } from './apiClient';
import { debugAuthState } from './tokenDebugger';

// API Gateway URL from environment variables or default
const API_URL = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

export interface BookingRequest {
  BookingId?: string;
  CompanyId: string;
  UserId: string;
  assetId: string;
  assetName: string;
  jobTypes: string[];
  flightDate?: string;
  scheduling?: {
    scheduleType: string;
    date?: string;
    flexibility?: string;
    startDate?: string;
    endDate?: string;
    repeatFrequency?: string;
  };
  serviceOptions?: any;
  siteContact?: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    isAvailableOnsite: boolean;
  };
  status?: string;
  location?: string;
  postcode?: string;
  notes?: string;
  userEmail?: string;
  userPhone?: string;
  emailDomain?: string;
  companyName?: string;
  [key: string]: any;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  bookingId?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Create a new booking using the provided data
 * @param bookingData The booking data to submit
 * @returns Promise with booking response
 */
export const createBooking = async (bookingData: BookingRequest): Promise<BookingResponse> => {
  try {
    // Get authentication token
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      throw new Error('Authentication token missing');
    }
    
    // Make API request to create booking
    const response = await axios.post<BookingResponse>(
      `${API_URL}/bookings`, 
      bookingData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    
    // Handle specific error scenarios
    if (error.response) {
      // The request was made and the server responded with a status code
      
      // Return server error message if available
      return {
        success: false,
        message: error.response.data?.message || 'Failed to create booking',
        error: error.response.data?.error
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        success: false,
        message: 'No response received from server',
        error: 'Network error'
      };
    }
    
    // Return generic error
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      error: 'Unknown error'
    };
  }
};

/**
 * Get all bookings for the current user or company
 * @param companyId Optional company ID to filter bookings
 * @returns Promise with bookings data
 */
export const getBookings = async (companyId?: string) => {
  try {
    const response = await apiClient.get('/bookings', {
      params: companyId ? { companyId } : {}
    });
    
    return response.data?.bookings || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the count of bookings for a company
 * @param companyId - The ID of the company to count bookings for
 * @returns Promise resolving to the number of bookings
 */
export const getBookingCount = async (companyId: string): Promise<number> => {
  try {
    // Get authentication token
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    
    if (!token) {
      console.warn('Authentication token not found when fetching booking count');
      return 0;
    }
    
    // Use the countOnly parameter to only get the count, not all bookings data
    const response = await fetch(`${API_URL}/bookings?companyId=${companyId}&countOnly=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    return 0; // Return 0 as fallback in case of error
  }
};

/**
 * Fetches booking details by ID from the API or DynamoDB
 */
export const getBookingById = async (bookingId: string) => {
  try {
    
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    const endpoint = `${apiUrl}/bookings/${bookingId}`;
    
    // Get authentication token
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    const bookingData = await response.json();
    
    // Process and validate the images array if it exists
    if (bookingData.images && Array.isArray(bookingData.images)) {
      
      // Check for expired S3 URLs and refresh if needed
      const currentTime = new Date().getTime();
      // Define interfaces for image objects
      interface ImageObject {
        url?: string;
        ResourceUrl?: string;
        resourceUrl?: string;
        s3Url?: string;
        [key: string]: any;
      }

      interface S3UrlComponents {
        expiresSeconds: number;
        signedDate: Date;
        expiryTime: number;
      }

      const needsRefresh: boolean = bookingData.images.some((img: ImageObject): boolean => {
        const url: string | undefined = img.url || img.ResourceUrl || img.resourceUrl || img.s3Url;
        if (!url) return false;
        
        // Check if URL is a signed S3 URL and might expire soon (within 10 minutes)
        if (url.includes('X-Amz-Expires') && url.includes('X-Amz-Date')) {
          const expiresMatch: RegExpMatchArray | null = url.match(/X-Amz-Expires=(\d+)/);
          const dateMatch: RegExpMatchArray | null = url.match(/X-Amz-Date=(\d{8})T(\d{6})Z/);
          
          if (expiresMatch && dateMatch) {
        const expiresSeconds: number = parseInt(expiresMatch[1], 10);
        const dateStr: string = `${dateMatch[1]}T${dateMatch[2]}Z`;
        const signedDate: Date = new Date(
          parseInt(dateStr.slice(0, 4), 10),
          parseInt(dateStr.slice(4, 6), 10) - 1,
          parseInt(dateStr.slice(6, 8), 10),
          parseInt(dateStr.slice(9, 11), 10),
          parseInt(dateStr.slice(11, 13), 10),
          parseInt(dateStr.slice(13, 15), 10)
        );
        
        const expiryTime: number = signedDate.getTime() + (expiresSeconds * 1000);
        const tenMinutesInMillis: number = 10 * 60 * 1000;
        
        // If URL expires within 10 minutes, we should refresh
        return (expiryTime - currentTime) < tenMinutesInMillis;
          }
        }
        
        return false;
      });
      
      // If any URLs are expiring soon, make a special request to refresh them
      if (needsRefresh) {
        
        try {
          // Call the endpoint with an additional parameter to request fresh URLs
          const refreshResponse = await fetch(`${endpoint}?refreshUrls=true`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            
            if (refreshedData.images && Array.isArray(refreshedData.images)) {
              bookingData.images = refreshedData.images;
            }
          }
        } catch (refreshError) {
          console.warn("Failed to refresh expiring URLs, will use existing ones:", refreshError);
        }
      }
      
      // Ensure all images have a URL property
      // Define interface for image objects
      interface BookingImage {
        url?: string;
        ResourceUrl?: string;
        resourceUrl?: string;
        s3Url?: string;
        [key: string]: any;
      }
      
      bookingData.images = bookingData.images.map((img: BookingImage): BookingImage => {
        // Normalize the URL property across different possible sources
        const url: string | undefined = img.url || img.ResourceUrl || img.resourceUrl || img.s3Url;
        
        // Create a new object with the normalized URL to avoid reference issues
        const normalizedImage = { ...img };
        
        if (url) {
          normalizedImage.url = url;
        } else {
          console.warn(`Missing URL for image: ${img.name || 'unknown'}`);
        }
        
        return normalizedImage;
      });
    }
    
    return bookingData;
    
  } catch (error) {
    throw error;
  }
};

export default {
  createBooking,
  getBookings,
  getBookingById,
  getBookingCount
};
