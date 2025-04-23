/**
 * Utility functions that provide a consistent interface for checking auth status
 * without having to worry about where the data is stored or in what format
 */

import { jwtDecode } from 'jwt-decode';

// Check if a token is valid and not expired
export const validateTokenLocally = (): boolean => {
  try {
    const token = localStorage.getItem('idToken') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    
    if (!token) return false;
    
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Check if user is admin based on local storage data
export const isAdminLocally = (): boolean => {
  // First check for the explicit flag
  if (localStorage.getItem('isAdmin') === 'true') {
    return true;
  }
  
  // Check for user data with admin role
  try {
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const role = userData.role || userData.userRole || userData.UserRole;
      if (role && (
          role.toLowerCase() === 'admin' || 
          role.toLowerCase() === 'administrator' ||
          role.toLowerCase() === 'companyadmin' ||
          role.toLowerCase() === 'systemadmin'
        )) {
        // Store for future reference
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
    }
  } catch (error) {
  }
  
  // Check token if present
  try {
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      
      // Check for admin in Cognito groups
      const groups = decoded['cognito:groups'] || [];
      if (groups.some((g: string) => g.toLowerCase().includes('admin'))) {
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
      
      // Check for admin role in token claims
      const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
      if (tokenRole && tokenRole.toLowerCase().includes('admin')) {
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
    }
  } catch (error) {
  }
  
  return false;
};

// Get user info from any available source
export const getUserInfo = (): any => {
  try {
    // Try to get from localStorage
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      return JSON.parse(userDataStr);
    }
    
    // Try to extract from token
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      return jwtDecode(token);
    }
    
    return null;
  } catch (error) {
    return null;
  }
};