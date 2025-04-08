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
    console.error('Error creating booking:', error);
    
    // Handle specific error scenarios
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server error response:', error.response.data);
      
      // Return server error message if available
      return {
        success: false,
        message: error.response.data?.message || 'Failed to create booking',
        error: error.response.data?.error
      };
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
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
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

/**
 * Get details for a specific booking
 * @param bookingId The booking ID to retrieve
 * @returns Promise with booking details
 */
export const getBookingById = async (bookingId: string) => {
  try {
    console.log('===== BOOKING DETAILS FETCH STARTED =====');
    debugAuthState(); // Log token debug info
    
    // Clean bookingId to ensure proper format
    const cleanBookingId = bookingId.trim();
    console.log(`Using cleaned bookingId: ${cleanBookingId}`);
    
    // Get authentication token
    const token = localStorage.getItem('idToken') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found in localStorage');
      throw new Error('Authentication token not found');
    }
    
    // Ensure token format (no Bearer prefix in header value)
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    console.log(`Attempting to fetch booking details for ID: ${cleanBookingId}`);
    console.log(`Using token starting with: ${formattedToken.substring(0, 20)}...`);
    
    // Get the API URL from environment or use a default
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    
    // The API Gateway is configured for /bookings/{id} so use that as primary endpoint
    const primaryEndpoint = `${apiUrl}/bookings/${cleanBookingId}`;
    console.log(`🔍 Primary request endpoint: ${primaryEndpoint}`);
    
    try {
      const response = await axios.get(primaryEndpoint, {
        headers: {
          'Authorization': formattedToken,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Success with primary endpoint: ${primaryEndpoint}`);
      console.log(`Response status: ${response.status}`);
      return response.data;
    } catch (primaryError) {
      console.warn(`❌ Primary endpoint failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`);
      console.log(`Trying fallback endpoints...`);
      
      // Set up fallback endpoints
      const fallbackEndpoints = [
        `${apiUrl}/get-booking-details/${cleanBookingId}`,     // Lambda direct
        `${apiUrl}/bookings?BookingId=${cleanBookingId}`,      // Query param uppercase
        `${apiUrl}/bookings?bookingId=${cleanBookingId}`,      // Query param lowercase
        `${apiUrl}/bookings?id=${cleanBookingId}`,             // Query param with 'id'
        `${apiUrl}/bookings/${cleanBookingId}`              // Query param with 'id'

      ];
      
      console.log('Will attempt the following fallback endpoints in order:', fallbackEndpoints);
      
      let finalError = null;
      
      // Try each endpoint until one succeeds
      for (const endpoint of fallbackEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          // Make API request to the endpoint
          const response = await axios.get(endpoint, {
            headers: {
              'Authorization': formattedToken,
              'Content-Type': 'application/json'
            }
          });
          
          // Log successful response
          console.log(`✅ Successful response from ${endpoint}`);
          console.log(`Response status: ${response.status}`);
          console.log(`Response data type: ${typeof response.data}`);
          
          if (typeof response.data === 'object') {
            console.log('Response data sample:', JSON.stringify(response.data).substring(0, 200) + '...');
          }
          
          console.log('===== BOOKING DETAILS FETCH COMPLETED =====');
          return response.data;
        } catch (endpointError) {
          console.warn(`❌ Failed to fetch from ${endpoint}:`, endpointError instanceof Error ? endpointError.message : String(endpointError));
          
          if (axios.isAxiosError(endpointError) && endpointError.response) {
            console.warn(`  Status: ${endpointError.response.status}`);
            console.warn(`  Status text: ${endpointError.response.statusText}`);
            console.warn(`  Data:`, endpointError.response.data);
          }
          
          finalError = endpointError;
          // Continue to the next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      console.error('All endpoints failed to fetch booking details');
      throw finalError || new Error('Failed to fetch booking details from all endpoints');
    }
    
  } catch (error) {
    console.error('===== BOOKING DETAILS FETCH FAILED =====');
    console.error('Final error in getBookingById:', error);
    throw error;
  }
};

export default {
  createBooking,
  getBookings,
  getBookingById
};
