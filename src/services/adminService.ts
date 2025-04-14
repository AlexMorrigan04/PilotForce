import { API } from '../utils/apiUtils';
import { ADMIN_ENDPOINTS, API_BASE_URL } from '../utils/endpoints';
import api from './api';

// Define proper types for progress event
interface ProgressEvent {
  loaded: number;
  total?: number;
}

// Define types for resources
interface Resource {
  id: string;
  resourceUrl: string;
  resourceType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

/**
 * Fetch all users with optional filtering
 */
export const getAllUsers = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Construct full URL with query parameters
    const apiUrl = ADMIN_ENDPOINTS.users + (queryParams.toString() ? `?${queryParams.toString()}` : '');
    console.log('Fetching users from:', apiUrl);

    // Make API request 
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch all companies for filtering
 */
export const getAllCompanies = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Use companies endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies` + 
      (queryParams.toString() ? `?${queryParams.toString()}` : '');
    
    console.log('Fetching companies from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch companies: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    // Return empty array as fallback
    return { companies: [] };
  }
};

/**
 * Get a specific user by ID
 */
export const getUser = async (userId: string) => {
  try {
    const apiUrl = ADMIN_ENDPOINTS.user(userId);
    console.log('Fetching user details from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (userId: string) => {
  try {
    const apiUrl = ADMIN_ENDPOINTS.user(userId);
    console.log('Deleting user from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Toggle user access (enable/disable)
 */
export const toggleUserAccess = async (userId: string, isEnabled: boolean) => {
  try {
    const apiUrl = ADMIN_ENDPOINTS.userAccess(userId);
    console.log(`Toggling user access to ${isEnabled ? 'enabled' : 'disabled'} at:`, apiUrl);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isEnabled })
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle user access: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error toggling access for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update a user
 */
export const updateUser = async (userId: string, userData: any) => {
  try {
    const apiUrl = ADMIN_ENDPOINTS.user(userId);
    console.log('Updating user at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetch all assets
 */
export const getAllAssets = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Use assets endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/assets` + 
      (queryParams.toString() ? `?${queryParams.toString()}` : '');
    
    console.log('Fetching assets from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};

/**
 * Booking-related functions
 */

/**
 * Fetch all bookings
 */
export const getAllBookings = async () => {
  const response = await api.get('/admin/bookings');
  return response.data;
};

/**
 * Get a specific booking by ID
 */
export const getBookingById = async (bookingId: string) => {
  const response = await api.get(`/admin/bookings/${bookingId}`);
  return response.data;
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId: string, status: string) => {
  const response = await api.put(`/admin/bookings/${bookingId}/status`, { status });
  return response.data;
};

/**
 * Delete a booking by ID
 */
export const deleteBooking = async (bookingId: string) => {
  const response = await api.delete(`/admin/bookings/${bookingId}`);
  return response.data;
};

/**
 * Resource-related functions
 */

/**
 * Get all resources with optional filtering
 * @param filters Optional filters to apply
 */
export const getAllResources = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Use resources endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/resources` + 
      (queryParams.toString() ? `?${queryParams.toString()}` : '');
    
    console.log('Fetching resources from:', apiUrl);

    const response = await api.get(apiUrl);
    return response.data;
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
};

/**
 * Get resources for a specific booking
 * @param bookingId The ID of the booking
 * @returns List of resources for the booking
 */
export const getBookingResources = async (bookingId: string) => {
  try {
    const response = await api.get(`/admin/bookings/${bookingId}/resources`);
    return response.data;
  } catch (error) {
    console.error('Error getting booking resources:', error);
    throw error;
  }
};

/**
 * Create a folder for resources within a booking
 * @param bookingId The booking ID
 * @param folderName The name of the folder to create
 */
export const createResourceFolder = async (bookingId: string, folderName: string) => {
  try {
    const response = await api.post(`/admin/bookings/${bookingId}/folders`, {
      folderName
    });
    return response.data;
  } catch (error) {
    console.error(`Error creating folder for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Upload a resource file for a booking
 * @param bookingId The booking ID
 * @param file The file to upload
 * @param onProgress Optional progress callback
 */
export const uploadBookingResource = async (
  bookingId: string,
  file: File,
  onProgress?: (progress: number) => void
) => {
  try {
    console.log(`Starting upload for booking ${bookingId}, file: ${file.name}`);
    
    // Create form data to send the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('contentType', file.type || 'application/octet-stream');
    
    // Determine the resource type based on file extension or MIME type
    let resourceType = 'file';
    if (file.type.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.name.match(/\.(tif|tiff)$/i)) {
      resourceType = 'geotiff';
    }
    formData.append('resourceType', resourceType);
    
    // Log the request details for debugging
    console.log(`Uploading to /admin/bookings/${bookingId}/resources`);
    console.log(`File type: ${file.type}, Resource type: ${resourceType}`);
    
    // Use a simplified approach to avoid issues with multipart/form-data
    const response = await api.post(`/admin/bookings/${bookingId}/resources`, formData, {
      headers: {
        // Don't set Content-Type header - let the browser set it with the boundary
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          // Calculate the upload percentage
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
          onProgress(percentCompleted);
        }
      }
    });
    
    console.log('Upload response:', response);
    
    return response.data;
  } catch (error) {
    console.error('Upload error details:', error);
    throw error;
  }
};

/**
 * Delete a specific resource from a booking
 * @param bookingId The booking ID
 * @param resourceId The resource ID
 */
export const deleteBookingResource = async (bookingId: string, resourceId: string) => {
  try {
    const response = await api.delete(`/admin/bookings/${bookingId}/resources/${resourceId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting resource ${resourceId} from booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Get a download URL for a resource
 * @param bookingId The booking ID
 * @param resourceId The resource ID
 */
export const getResourceDownloadUrl = async (bookingId: string, resourceId: string) => {
  try {
    const response = await api.get(`/admin/bookings/${bookingId}/resources/${resourceId}/download`);
    return response.data.downloadUrl;
  } catch (error) {
    console.error(`Error getting download URL for resource ${resourceId}:`, error);
    throw error;
  }
};

/**
 * Get a pre-signed URL for direct S3 upload
 * @param fileName The S3 key/path for the file
 * @param contentType The MIME type of the file
 */
export const getS3UploadUrl = async (fileName: string, contentType: string) => {
  try {
    const response = await api.get(
      `/admin/s3-upload-url?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting S3 upload URL:', error);
    throw error;
  }
};

/**
 * Update a resource record status
 */
export const updateResourceRecord = async (
  bookingId: string,
  resourceId: string,
  updateData: { status: string }
) => {
  try {
    const response = await api.put(
      `/admin/bookings/${bookingId}/resources/${resourceId}`, 
      updateData
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating resource record:`, error);
    throw error;
  }
};

/**
 * Create a resource record (for tracking S3 uploads)
 */
export const createResourceRecord = async (
  bookingId: string, 
  recordData: {
    resourceId: string;
    fileName: string;
    resourceUrl: string;
    contentType: string;
    fileSize: number;
    resourceType: string;
    status: string;
  }
) => {
  try {
    const response = await api.post(
      `/admin/bookings/${bookingId}/resources`, 
      recordData
    );
    return response.data;
  } catch (error) {
    console.error('Error creating resource record:', error);
    throw error;
  }
};

/**
 * Company-related functions
 */

/**
 * Fetch all companies with optional filtering
 */
export const getFilteredCompanies = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Use companies endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies` + 
      (queryParams.toString() ? `?${queryParams.toString()}` : '');
    
    console.log('Fetching companies from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch companies: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    // Return empty array as fallback
    return { companies: [] };
  }
};

/**
 * Get a specific company by ID
 */
export const getCompany = async (companyId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies/${companyId}`;
    console.log('Fetching company details from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch company: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        return JSON.parse(data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching company ${companyId}:`, error);
    throw error;
  }
};

/**
 * Delete a company by ID
 */
export const deleteCompany = async (companyId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies/${companyId}`;
    console.log('Deleting company from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete company: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting company ${companyId}:`, error);
    throw error;
  }
};

/**
 * Update a company
 */
export const updateCompany = async (companyId: string, companyData: any) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies/${companyId}`;
    console.log('Updating company at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(companyData)
    });

    if (!response.ok) {
      throw new Error(`Failed to update company: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating company ${companyId}:`, error);
    throw error;
  }
};

/**
 * Create a new company
 */
export const createCompany = async (companyData: any) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/companies`;
    console.log('Creating new company at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(companyData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create company: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

// Create admin service object first, then export it
const adminService = {
  getAllUsers,
  getAllCompanies,
  getFilteredCompanies,
  getUser,
  deleteUser,
  toggleUserAccess,
  updateUser,
  // Assets
  getAllAssets,
  // Bookings
  getAllBookings,
  getBookingById,
  deleteBooking,
  updateBookingStatus,
  // Resources
  getAllResources,
  getBookingResources,
  uploadBookingResource,
  deleteBookingResource,
  createResourceFolder,
  getResourceDownloadUrl,
  getS3UploadUrl,
  createResourceRecord,
  updateResourceRecord,
  // Companies
  getCompany,
  deleteCompany,
  updateCompany,
  createCompany
};

export default adminService;