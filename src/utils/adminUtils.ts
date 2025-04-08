import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  'cognito:groups'?: string[];
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
    
    // Check if the user is in the admin group
    const groups = decodedToken['cognito:groups'] || [];
    return groups.some((group: string) => 
      group === 'Administrators' || 
      group === 'Admins' || 
      group === 'Admin'
    );
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
    const token = localStorage.getItem('accessToken') || localStorage.getItem('idToken');
    if (!token) {
      console.error('No token available for admin check');
      return false;
    }
    
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
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData && userData.role) {
        return userData.role;
      }
    }
    
    // If not in local storage, try from token
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      const decodedToken = jwtDecode<any>(idToken);
      return decodedToken['custom:userRole'] || 'User';
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
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
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

export default {
  isAdminFromToken,
  checkAdminStatus,
  getCurrentUserRole,
  callAdminApi
};
