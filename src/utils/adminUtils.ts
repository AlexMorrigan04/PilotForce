import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  'cognito:groups'?: string[];
  'custom:role'?: string;
  'custom:userRole'?: string;
  role?: string;
  sub: string;
  email_verified: boolean;
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: string;
  event_id: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
}

/**
 * Check if a user is an admin based on their ID token
 * Uses the cognito:groups claim to determine admin status
 * 
 * @param idToken JWT token from Cognito
 * @returns boolean indicating if the user is an admin
 */
export const isAdminFromToken = (idToken: string): boolean => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(idToken);
    
    console.log('Token decoded, checking for admin status', { 
      hasGroups: !!decodedToken['cognito:groups'],
      role: decodedToken['custom:role'] || decodedToken['custom:userRole'] || decodedToken.role || 'none found',
      email: decodedToken.email
    });
    
    // Check if the user is in the admin group
    const groups = decodedToken['cognito:groups'] || [];
    
    // Check for admin in groups
    const isAdminGroup = groups.some((group: string) => 
      group === 'Administrators' || 
      group === 'Admins' || 
      group === 'Admin' ||
      group === 'Administrator' 
    );
    
    // Check for admin in role fields
    const userRole = decodedToken['custom:role'] || 
                    decodedToken['custom:userRole'] || 
                    decodedToken.role;
    
    // IMPORTANT FIX: Consider both Admin and CompanyAdmin as valid admin roles
    // This fixes the mismatch between DynamoDB (role: "Admin") and Cognito (custom:userRole: "CompanyAdmin") 
    const isAdminRole = userRole && 
      (userRole.toLowerCase() === 'admin' || 
       userRole.toLowerCase() === 'administrator' ||
       userRole.toLowerCase() === 'systemadmin' ||
       userRole.toLowerCase() === 'companyadmin');
    
    const result = Boolean(isAdminGroup || isAdminRole);
    console.log('Admin check result:', {
      isAdminGroup,
      isAdminRole,
      finalResult: result
    });
    
    // Store result in localStorage to persist across page reloads
    if (result) {
      localStorage.setItem('isAdmin', 'true');
      console.log('Admin status stored in localStorage');
    }
    
    // Return true if admin is found in either groups or role
    return result;
  } catch (error) {
    console.error('Error decoding or validating admin token:', error);
    return false;
  }
};

/**
 * Verify admin status by calling the backend API
 * More secure than client-side verification
 * 
 * @returns Promise<boolean> indicating if the current user is an admin
 */
export const checkAdminStatus = async (): Promise<boolean> => {
  try {
    // Look for token in multiple storage locations
    const token = localStorage.getItem('idToken') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    
    if (!token) {
      console.error('No token available for admin check');
      
      // Check if we have a user object with role information
      const userDataStr = localStorage.getItem('user') || localStorage.getItem('userData');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          const role = userData.role || userData.userRole || userData.UserRole;
          
          // IMPORTANT FIX: Consider both Admin and CompanyAdmin as valid admin roles
          // This fixes the mismatch between stored user data and token claims
          if (role && (
              role.toLowerCase() === 'admin' || 
              role.toLowerCase() === 'administrator' ||
              role.toLowerCase() === 'systemadmin' ||
              role.toLowerCase() === 'companyadmin')) {
            console.log('Admin role found in user data:', role);
            localStorage.setItem('isAdmin', 'true');
            return true;
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      return false;
    }
    
    console.log('Checking admin status with API using token');
    const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/admin', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Admin status check failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('Admin API check result:', data);
    
    // Store the admin status in localStorage
    if (data.isAdmin === true) {
      localStorage.setItem('isAdmin', 'true');
    }
    
    return data.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Gets the current user's role from local storage or token
 * 
 * @returns string representing user role ('Admin', 'User', etc.)
 */
export const getCurrentUserRole = (): string => {
  try {
    // Try to get from local storage first
    const userDataString = localStorage.getItem('user') || localStorage.getItem('userData');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData && (userData.role || userData.userRole || userData.UserRole)) {
        return userData.role || userData.userRole || userData.UserRole;
      }
    }
    
    // If not in local storage, try from token
    const idToken = localStorage.getItem('idToken') || 
                   localStorage.getItem('accessToken') || 
                   localStorage.getItem('token');
    
    if (idToken) {
      const decodedToken = jwtDecode<any>(idToken);
      // Note: we're returning the actual role here, not normalizing it to "Admin"
      return decodedToken['custom:userRole'] || 
             decodedToken['custom:role'] || 
             decodedToken.role || 
             'User';
    }
    
    return 'User'; // Default to User role
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'User';
  }
};

/**
 * Call an admin API endpoint with authorization
 * 
 * @param endpoint The API endpoint path (e.g., '/admin/users')
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param data Optional data to send with request
 * @returns Promise with the API response
 */
export const callAdminApi = async (endpoint: string, method: string = 'GET', data: any = null): Promise<any> => {
  try {
    const token = localStorage.getItem('idToken') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const url = `https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling admin API (${endpoint}):`, error);
    throw error;
  }
};

// Add a simple synchronous function to check if the user is an admin based on localStorage
export const isAdminLocally = (): boolean => {
  // Check for admin status in localStorage
  if (localStorage.getItem('isAdmin') === 'true') {
    return true;
  }
  
  // Check user data
  try {
    const userDataStr = localStorage.getItem('user') || localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const role = userData.role || userData.userRole || userData.UserRole;
      
      if (role && (
          role.toLowerCase() === 'admin' || 
          role.toLowerCase() === 'administrator' ||
          role.toLowerCase() === 'systemadmin' ||
          role.toLowerCase() === 'companyadmin')) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error parsing user data in isAdminLocally:', e);
  }
  
  return false;
};

export default {
  isAdminFromToken,
  checkAdminStatus,
  getCurrentUserRole,
  callAdminApi,
  isAdminLocally
};
