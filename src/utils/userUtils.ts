/**
 * Utility functions for handling user data
 */

import { getApiUrl, getAuthToken } from './authUtils';
import { getCompanyId } from './companyUtils';

export interface CompanyUser {
  UserId: string;
  ApprovalStatus?: string;
  CompanyId?: string;
  CompanyName?: string;
  CreatedAt?: string;
  Email?: string;
  Name?: string;
  PhoneNumber?: string;
  Status?: string;
  UpdatedAt?: string;
  UserAccess?: boolean | string;
  Username?: string;
  UserRole?: string;
  
  // Legacy field mappings for backward compatibility
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  companyId?: string;
  createdAt?: string;
  status?: string;
  username?: string;
  phone?: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  lastLogin?: string;
  updatedAt?: string;

  // New property for invitation status
  isInvitation?: boolean;
}

/**
 * Extracts user attributes from Cognito/API response to a standardized format
 * @param userData - Raw user data object
 * @returns Formatted user data
 */
export const normalizeUserData = (userData: any) => {
  // Extract company name from email domain
  let emailDomain = '';
  let companyName = '';
  
  if (userData.Email || userData.email) {
    const email = userData.Email || userData.email;
    emailDomain = email.split('@')[1] || '';
    // Get just the company name part (before first period)
    companyName = emailDomain.split('.')[0] || '';
  }
  
  return {
    id: userData.UserId || userData.id || userData.sub || '',
    username: userData.Username || userData.username || '',
    email: userData.Email || userData.email || '',
    name: userData.Name || userData.name || '',
    // Add proper phone number handling
    phoneNumber: userData.PhoneNumber || userData.phoneNumber || userData.phone_number || '',
    companyId: userData.CompanyId || userData.companyId || userData['custom:companyId'] || '',
    companyName: companyName, // Add extracted company name
    emailDomain: emailDomain,
    role: userData.UserRole || userData.role || userData['custom:userRole'] || 'User',
    status: userData.Status || userData.status || 'CONFIRMED',
    createdAt: userData.CreatedAt || userData.createdAt || new Date().toISOString(),
    // ...other attributes...
  };
};

/**
 * Checks if a user is a company admin
 * @param userData - User data object
 * @returns Boolean indicating if user is a company admin
 */
export const isCompanyAdmin = (userData: any): boolean => {
  if (!userData) return false;
  
  const role = userData.role || 
    userData['custom:userRole'] || 
    (userData.attributes && userData.attributes['custom:userRole']) ||
    '';
  
  return ['CompanyAdmin', 'Admin', 'AccountAdmin'].includes(role);
};

/**
 * Fetches company users with reliable token handling
 * @param user - Optional user object
 * @returns Promise resolving to an array of company users
 */
export const getCompanyUsers = async (user?: any): Promise<CompanyUser[]> => {

  // Extract company ID from token first (most reliable method)
  let companyId = null;
  try {
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      // Simple JWT parsing without external library
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (payload && payload['custom:companyId']) {
        companyId = payload['custom:companyId'];
      }
    }
  } catch (tokenError) {
  }

  // If token method failed, fall back to user object
  if (!companyId && user) {
    // Direct property access
    if (user.companyId && typeof user.companyId === 'string' && user.companyId.trim() !== '') {
      companyId = user.companyId;
    }
    // Nested property access if user comes from different contexts
    else if (user.user && user.user.companyId) {
      companyId = user.user.companyId;
    }
    // If user is wrapped differently
    else if (user.data && user.data.companyId) {
      companyId = user.data.companyId;
    }
    // Check for custom attribute format
    else if (user['custom:companyId']) {
      companyId = user['custom:companyId'];
    }
  }

  // If no company ID found yet, try to get from localStorage
  if (!companyId) {
    // Try to get the user from localStorage
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.companyId) {
          companyId = parsedUser.companyId;
        }
      } 
      
      if (!companyId) {
        const userString = localStorage.getItem('user');
        if (userString) {
          const parsedUser = JSON.parse(userString);
          if (parsedUser.companyId) {
            companyId = parsedUser.companyId;
          }
        }
      }
    } catch (e) {
    }
  }

  if (!companyId) {
    throw new Error("Could not determine company ID for the current user");
  }


  try {
    // Get the authorization token with proper formatting
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!idToken && !accessToken) {
      throw new Error("No authentication tokens found");
    }
    
    const token = accessToken || idToken || '';
    
    // Fix TypeScript error: check token is not null and handle Bearer prefix properly
    const authToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
    
    if (!authToken) {
      throw new Error("Invalid authentication token");
    }
    
    // Use the correct API endpoint from API Gateway configuration
    const apiUrl = `${getApiUrl()}/companies/${companyId}/users`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      
      // Try alternate endpoint
      if (response.status === 401 || response.status === 403) {
        return await fallbackGetCompanyUsers(companyId);
      }
      
      throw new Error(`Failed to fetch company users: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let users = [];
    if (Array.isArray(data)) {
      users = data;
    } else if (data.users && Array.isArray(data.users)) {
      users = data.users;
    } else if (data.body) {
      // Handle API Gateway format with JSON string body
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        users = Array.isArray(parsedBody) ? parsedBody : (parsedBody.users || []);
      } catch (e) {
        users = [];
      }
    }
    
    return users.map(normalizeCompanyUser);
  } catch (error: any) {
    
    // Try alternate endpoint as fallback
    return await fallbackGetCompanyUsers(companyId);
  }
};

/**
 * Fallback method to get company users when the primary method fails
 */
async function fallbackGetCompanyUsers(companyId: string): Promise<CompanyUser[]> {
  try {
    
    // Try to get a fresh token
    const refreshedToken = await refreshTokenIfNeeded();
    const token = refreshedToken || localStorage.getItem('idToken') || localStorage.getItem('accessToken') || '';
    
    if (!token) {
      throw new Error("No valid authentication token available");
    }
    
    // Fix TypeScript error: check token is not null before using startsWith
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    // Try the alternative endpoint from API Gateway configuration
    const apiUrl = `${getApiUrl()}/users/company/${companyId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Fallback API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    let users = [];
    if (Array.isArray(data)) {
      users = data;
    } else if (data.users && Array.isArray(data.users)) {
      users = data.users;
    } else if (data.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        users = Array.isArray(parsedBody) ? parsedBody : (parsedBody.users || []);
      } catch (e) {
        users = [];
      }
    }
    
    return users.map(normalizeCompanyUser);
  } catch (error) {
    // If everything fails, return an empty array rather than throw
    return [];
  }
}

/**
 * Try to refresh the authentication token if needed
 */
async function refreshTokenIfNeeded(): Promise<string | null> {
  try {
    // Import refreshToken dynamically to avoid circular dependencies
    const { refreshToken } = await import('../services/authServices');
    const result = await refreshToken();
    
    if (result.success) {
      return result.idToken || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize user data to consistent format
 */
function normalizeCompanyUser(user: any): CompanyUser {
  // Convert UserAccess to boolean if it's a string
  let userAccess = user.UserAccess;
  if (typeof userAccess === 'string') {
    userAccess = userAccess.toLowerCase() === 'true';
  }

  return {
    // Use exact field names as they appear in DynamoDB
    UserId: user.UserId || user.userId || user.id || '',
    Email: user.Email || user.email || '',
    Name: user.Name || user.name || '',
    PhoneNumber: user.PhoneNumber || user.phoneNumber || user.phone || '',
    CompanyId: user.CompanyId || user.companyId || '',
    CompanyName: user.CompanyName || user.companyName || '',
    CreatedAt: user.CreatedAt || user.createdAt || '',
    UpdatedAt: user.UpdatedAt || user.updatedAt || '',
    Status: user.Status || user.status || 'CONFIRMED',
    Username: user.Username || user.username || '',
    UserRole: user.UserRole || user.role || user.userRole || 'User',
    ApprovalStatus: user.ApprovalStatus || 'PENDING',
    UserAccess: userAccess,
    
    // Also set lowercase keys for components that might still use them
    email: user.Email || user.email || '',
    name: user.Name || user.name || '',
    companyId: user.CompanyId || user.companyId || '',
    username: user.Username || user.username || '',
    role: user.UserRole || user.role || 'User'
  };
}

export default {
  normalizeUserData,
  isCompanyAdmin,
  getCompanyUsers,
};
