import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

/**
 * Booking related functions
 */

// Function to get all bookings (admin only)
export const getAllBookings = async () => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
  }
};

// Function to get a specific booking (admin only)
export const getBooking = async (bookingId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`Error fetching booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch booking');
  }
};

// Function to update booking status
export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/admin/bookings/${bookingId}/status`,
      { status },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error updating booking ${bookingId} status:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update booking status');
  }
};

// Function to delete a booking
export const deleteBooking = async (bookingId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${API_URL}/admin/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`Error deleting booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete booking');
  }
};

/**
 * Resource related functions
 */

// Function to get resources for a booking
export const getBookingResources = async (bookingId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_URL}/admin/bookings/${bookingId}/resources`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error fetching resources for booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch booking resources');
  }
};

// Function to get all resources (admin only)
export const getAllResources = async () => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/resources`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch resources');
  }
};

// Function to upload a resource for a booking
export const uploadBookingResource = async (bookingId: string, file: File, onProgress?: (progress: number) => void) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_URL}/admin/bookings/${bookingId}/resources`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error uploading resource for booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to upload resource');
  }
};

// Function to delete a booking resource
export const deleteBookingResource = async (bookingId: string, resourceId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(
      `${API_URL}/admin/bookings/${bookingId}/resources/${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error deleting resource ${resourceId} from booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete resource');
  }
};

// Function to create a resource folder
export const createResourceFolder = async (bookingId: string, folderName: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_URL}/admin/bookings/${bookingId}/folders`,
      { folderName },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error creating folder for booking ${bookingId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to create folder');
  }
};

// Function to get a download URL for a resource
export const getResourceDownloadUrl = async (resourceId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_URL}/admin/resources/${resourceId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data.downloadUrl;
  } catch (error: any) {
    console.error(`Error getting download URL for resource ${resourceId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to get download URL');
  }
};

/**
 * User related functions
 */

// Function to get all users (admin only)
export const getAllUsers = async (filters?: any) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/users`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

// Function to delete a user (admin only)
export const deleteUser = async (userId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${API_URL}/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

// Function to toggle user access (enable/disable)
export const toggleUserAccess = async (userId: string, isEnabled: boolean) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/admin/users/${userId}/access`,
      { isEnabled },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`Error toggling access for user ${userId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update user access');
  }
};

/**
 * Company related functions
 */

// Function to get all companies (admin only)
export const getAllCompanies = async () => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/companies`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch companies');
  }
};

// Function to delete a company (admin only)
export const deleteCompany = async (companyId: string) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${API_URL}/admin/companies/${companyId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`Error deleting company ${companyId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete company');
  }
};

/**
 * Asset related functions
 */

// Function to get all assets (admin only)
export const getAllAssets = async (filters?: any) => {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/admin/assets`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch assets');
  }
};