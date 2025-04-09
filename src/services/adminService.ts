import { API } from '../utils/apiUtils';
import { ADMIN_ENDPOINTS, API_BASE_URL } from '../utils/endpoints';

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
 * Fetch all bookings with optional filtering
 */
export const getAllBookings = async (filters = {}) => {
  try {
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    // Use bookings endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings` + 
      (queryParams.toString() ? `?${queryParams.toString()}` : '');
    
    console.log('Fetching bookings from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw booking data received:', data);
    
    // Handle API Gateway response format
    if (data.body && typeof data.body === 'string') {
      try {
        console.log('Parsing response body');
        const parsedData = JSON.parse(data.body);
        console.log('Parsed body:', parsedData);
        return parsedData;
      } catch (e) {
        console.error('Error parsing response body:', e);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    // Return a minimal valid response structure in case of error
    return { bookings: [] };
  }
};

/**
 * Get a specific booking by ID
 */
export const getBookingById = async (bookingId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}`;
    console.log('Fetching booking details from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch booking: ${response.status}`);
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
    console.error(`Error fetching booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Delete a booking by ID
 */
export const deleteBooking = async (bookingId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}`;
    console.log('Deleting booking from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete booking: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/status`;
    console.log(`Updating booking status to ${status} at:`, apiUrl);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(`Failed to update booking status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating status for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Resource-related functions
 */

/**
 * Get resources for a booking
 */
export const getBookingResources = async (bookingId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/resources`;
    console.log('Fetching booking resources from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch booking resources: ${response.status}`);
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
    console.error(`Error fetching resources for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Get all resources
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

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resources: ${response.status}`);
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
    console.error('Error fetching resources:', error);
    throw error;
  }
};

/**
 * Upload a resource for a booking
 */
export const uploadBookingResource = async (bookingId: string, file: File, resourceType: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/resources`;
    console.log('Uploading booking resource to:', apiUrl);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('resourceType', resourceType);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        // Note: Don't set Content-Type here as it will be automatically set with the FormData boundary
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload resource: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error uploading resource for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Delete a booking resource
 */
export const deleteBookingResource = async (bookingId: string, resourceId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/resources/${resourceId}`;
    console.log('Deleting resource from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete resource: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting resource ${resourceId} from booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Create a resource folder for a booking
 */
export const createResourceFolder = async (bookingId: string, folderName: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/folders`;
    console.log('Creating resource folder at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folderName })
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error creating resource folder for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Delete a resource folder
 */
export const deleteResourceFolder = async (bookingId: string, folderId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/folders/${folderId}`;
    console.log('Deleting folder from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete folder: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting folder ${folderId} from booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Get files within a resource folder
 */
export const getFolderFiles = async (bookingId: string, folderId: string) => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/folders/${folderId}/files`;
    console.log('Fetching folder files from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch folder files: ${response.status}`);
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
    console.error(`Error fetching files for folder ${folderId}:`, error);
    throw error;
  }
};

/**
 * Get download URL for a resource
 */
export const getResourceDownloadUrl = async (bookingId: string, resourceId: string): Promise<string> => {
  try {
    const apiUrl = `${process.env.REACT_APP_API_URL || API_BASE_URL}/admin/bookings/${bookingId}/resources/${resourceId}/download`;
    console.log('Getting resource download URL from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get download URL: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle API Gateway response format
    if (data.url) {
      return data.url;
    } else if (data.body && typeof data.body === 'string') {
      try {
        const parsedBody = JSON.parse(data.body);
        return parsedBody.url || '';
      } catch (e) {
        console.error('Error parsing response body:', e);
        return '';
      }
    }
    
    return '';
  } catch (error) {
    console.error(`Error getting download URL for resource ${resourceId}:`, error);
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

export default {
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
  getBookingResources,
  getAllResources,
  uploadBookingResource,
  deleteBookingResource,
  createResourceFolder,
  deleteResourceFolder,
  getFolderFiles,
  getResourceDownloadUrl,
  // Companies
  getCompany,
  deleteCompany,
  updateCompany,
  createCompany
};
