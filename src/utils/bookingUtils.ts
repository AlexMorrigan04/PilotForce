import axios, { AxiosResponse } from 'axios';
import apiClient from './apiClient';
import { getAuthTokens } from './secureStorage';
import secureLogger from './secureLogger';
import config from './environmentConfig';
import { post, get } from './secureFetch';

// API Gateway URL from environment variables
const API_URL = config.getGatewayUrl();

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
    // Use secure fetch utility which automatically handles tokens and CSRF
    const response = await post<BookingResponse>(`${API_URL}/bookings`, bookingData);
    return response;
  } catch (error: any) {
    // Handle specific error scenarios
    if (error.status) {
      // Return server error message if available
      return {
        success: false,
        message: error.data?.message || 'Failed to create booking',
        error: error.data?.error
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
    // Use secure fetch utility
    const response = await get('/bookings', {
      params: companyId ? { companyId } : {}
    });
    
    return response.bookings || [];
  } catch (error) {
    secureLogger.error('Error fetching bookings:', error);
    return [];
  }
};

/**
 * Gets the count of bookings for a company
 * @param companyId - The ID of the company to count bookings for
 * @returns Promise resolving to the number of bookings
 */
export const getBookingCount = async (companyId: string): Promise<number> => {
  try {
    // We'll try to get all bookings since there's no count endpoint
    const bookingsResponse = await get(`/bookings`, { params: { companyId } });
    
    // If the response has bookings array, return its length
    if (bookingsResponse && Array.isArray(bookingsResponse.bookings)) {
      // Cache the bookings for future use
      try {
        localStorage.setItem(`bookings_${companyId}`, JSON.stringify(bookingsResponse.bookings));
      } catch (e) {
        // Ignore storage errors
      }
      return bookingsResponse.bookings.length;
    }
    
    // If the response itself is an array, use that
    if (Array.isArray(bookingsResponse)) {
      // Cache the bookings for future use
      try {
        localStorage.setItem(`bookings_${companyId}`, JSON.stringify(bookingsResponse));
      } catch (e) {
        // Ignore storage errors
      }
      return bookingsResponse.length;
    }

    // Try to get cached bookings from localStorage if API call didn't return expected format
    try {
      const cachedBookings = localStorage.getItem(`bookings_${companyId}`);
      if (cachedBookings) {
        const parsedBookings = JSON.parse(cachedBookings);
        return Array.isArray(parsedBookings) ? parsedBookings.length : 0;
      }
    } catch (e) {
      // Ignore parse or storage errors
    }

    // Return 0 as default if we couldn't get the count any other way
    return 0;
  } catch (error) {
    // Try to get cached bookings from localStorage as fallback
    try {
      const cachedBookings = localStorage.getItem(`bookings_${companyId}`);
      if (cachedBookings) {
        const parsedBookings = JSON.parse(cachedBookings);
        return Array.isArray(parsedBookings) ? parsedBookings.length : 0;
      }
    } catch (e) {
      // Ignore parse or storage errors
    }
    
    // Return 0 as default if all methods fail
    return 0;
  }
};

/**
 * Fetches booking details by ID from the API or DynamoDB
 */
export const getBookingById = async (bookingId: string) => {
  try {
    // Get API URL from environment
    const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '';
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Try multiple endpoint patterns
    const endpoints = [
      `${apiUrl}/bookings/${bookingId}`,
      `${apiUrl}/get-booking-details/${bookingId}`,
      `${apiUrl}/get-bookings-details/${bookingId}`
    ];

    let bookingData = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.booking || data.BookingId || data.bookingId)) {
            bookingData = data.booking || data;
            break;
          }
        } else {
          lastError = `API request failed with status: ${response.status}`;
        }
      } catch (endpointError) {
        lastError = endpointError instanceof Error ? endpointError.message : 'Unknown error';
        continue;
      }
    }

    if (!bookingData) {
      throw new Error(lastError || 'Failed to fetch booking details from all endpoints');
    }

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
          // Try to refresh URLs using the same endpoints
          for (const endpoint of endpoints) {
            try {
              const response = await fetch(`${endpoint}?refreshUrls=true`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                const refreshedData = await response.json();
                if (refreshedData.images && Array.isArray(refreshedData.images)) {
                  bookingData.images = refreshedData.images;
                  break;
                }
              }
            } catch (refreshError) {
              continue;
            }
          }
        } catch (refreshError) {
        }
      }
      
      // Ensure all images have a URL property
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