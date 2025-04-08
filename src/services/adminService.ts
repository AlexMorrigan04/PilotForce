import { callAdminApi } from '../utils/adminUtils';

/**
 * Admin service for interacting with admin API endpoints
 */

/**
 * Get all users
 * @param filters Optional filter parameters
 * @returns Promise with users data
 */
export const getAllUsers = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, String(value));
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return await callAdminApi(`/admin/users${queryString}`);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get user details by ID
 * @param userId User ID to fetch
 * @returns Promise with user data
 */
export const getUserById = async (userId) => {
  try {
    return await callAdminApi(`/admin/users/${userId}`);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update user details
 * @param userId User ID to update
 * @param userData Updated user data
 * @returns Promise with updated user data
 */
export const updateUser = async (userId, userData) => {
  try {
    return await callAdminApi(`/admin/users/${userId}`, 'PUT', userData);
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user
 * @param userId User ID to delete
 * @returns Promise with deletion result
 */
export const deleteUser = async (userId) => {
  try {
    return await callAdminApi(`/admin/users/${userId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Change user access status
 * @param userId User ID to update
 * @param hasAccess Whether the user should have access
 * @returns Promise with updated access status
 */
export const updateUserAccess = async (userId, hasAccess) => {
  try {
    return await callAdminApi(`/admin/users/${userId}/access`, 'PUT', { hasAccess });
  } catch (error) {
    console.error(`Error updating access for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Toggle a user's access status
 * @param userId User ID to update
 * @param currentStatus Current access status to toggle
 * @returns Promise with updated access status
 */
export const toggleUserAccess = async (userId, currentStatus) => {
  try {
    // Toggle the access status (invert the current value)
    const newAccessStatus = !currentStatus;
    
    // Use the existing updateUserAccess function
    return await updateUserAccess(userId, newAccessStatus);
  } catch (error) {
    console.error(`Error toggling access for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get all bookings 
 * @param filters Optional filter parameters
 * @returns Promise with bookings data
 */
export const getAllBookings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, String(value));
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return await callAdminApi(`/admin/bookings${queryString}`);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

/**
 * Get booking details by ID
 * @param bookingId Booking ID to fetch
 * @returns Promise with booking data
 */
export const getBookingById = async (bookingId) => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}`);
  } catch (error) {
    console.error(`Error fetching booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Update booking status
 * @param bookingId Booking ID to update
 * @param status New status
 * @returns Promise with updated booking data
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}/status`, 'PUT', { status });
  } catch (error) {
    console.error(`Error updating booking status for ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Delete a booking
 * @param bookingId Booking ID to delete
 * @returns Promise with deletion result
 */
export const deleteBooking = async (bookingId) => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Get booking resources
 * @param bookingId Booking ID to fetch resources for
 * @returns Promise with resources data
 */
export const getBookingResources = async (bookingId) => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}/resources`);
  } catch (error) {
    console.error(`Error fetching resources for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Upload resources for a booking
 * @param bookingId Booking ID
 * @param resourceData Resource data to upload
 * @param resourceType Type of resource (optional)
 * @returns Promise with upload result
 */
export const uploadBookingResource = async (bookingId, resourceData, resourceType = 'default') => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}/upload`, 'POST', { 
      ...resourceData, 
      resourceType 
    });
  } catch (error) {
    console.error(`Error uploading resource for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Delete a booking resource
 * @param bookingId Booking ID
 * @param resourceId Resource ID to delete
 * @returns Promise with deletion result
 */
export const deleteBookingResource = async (bookingId, resourceId) => {
  try {
    return await callAdminApi(`/admin/bookings/${bookingId}/resources/${resourceId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting resource ${resourceId} for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Get all assets
 * @param filters Optional filter parameters
 * @returns Promise with assets data
 */
export const getAllAssets = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, String(value));
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return await callAdminApi(`/admin/assets${queryString}`);
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};

/**
 * Get all resources
 * @param filters Optional filter parameters
 * @returns Promise with resources data
 */
export const getAllResources = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, String(value));
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return await callAdminApi(`/admin/resources${queryString}`);
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
};

/**
 * Get all companies
 * @returns Promise with companies data
 */
export const getAllCompanies = async () => {
  try {
    return await callAdminApi('/admin/companies');
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

/**
 * Get company details by ID
 * @param companyId Company ID to fetch
 * @returns Promise with company data
 */
export const getCompanyById = async (companyId) => {
  try {
    return await callAdminApi(`/companies/${companyId}`);
  } catch (error) {
    console.error(`Error fetching company ${companyId}:`, error);
    throw error;
  }
};

/**
 * Update company details
 * @param companyId Company ID to update
 * @param companyData Updated company data
 * @returns Promise with updated company data
 */
export const updateCompany = async (companyId, companyData) => {
  try {
    return await callAdminApi(`/companies/${companyId}`, 'PUT', companyData);
  } catch (error) {
    console.error(`Error updating company ${companyId}:`, error);
    throw error;
  }
};