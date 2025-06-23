import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

/**
 * Get all resources for a specific booking
 * @param bookingId ID of the booking
 * @returns Array of resource objects
 */
export const fetchBookingResources = async (bookingId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_URL}/bookings/${bookingId}/resources`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data.resources || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get presigned URL for viewing a resource
 * @param resourceUrl The URL of the resource
 * @returns A presigned URL for temporary access
 */
export const getPresignedViewUrl = async (resourceUrl: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_URL}/resources/presign`,
      { url: resourceUrl },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.presignedUrl || resourceUrl;
  } catch (error) {
    return resourceUrl; // Fall back to original URL
  }
};

export default {
  fetchBookingResources,
  getPresignedViewUrl
};
