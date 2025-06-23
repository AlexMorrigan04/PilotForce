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
      
      // Check if role is specifically 'Administrator' or 'Admin' (not just any admin-containing role)
      const adminRoleRegex = /^(administrator|admin)$/i;
      if (role && adminRoleRegex.test(role.toLowerCase())) {
        // Store for future reference
        localStorage.setItem('isAdmin', 'true');
        return true;
      } else if (role) {
        // Clear admin flag for non-admin roles
        localStorage.removeItem('isAdmin');
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
      if (groups.some((g: string) => g.toLowerCase() === 'admin' || g.toLowerCase() === 'administrator')) {
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
      
      // Check for specific admin role in token claims
      const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
      if (tokenRole && (tokenRole.toLowerCase() === 'admin' || tokenRole.toLowerCase() === 'administrator')) {
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
    }
  } catch (error) {
  }
  
  // User is not an admin
  localStorage.removeItem('isAdmin');
  return false;
};

// Check if user has CompanyAdmin role
export const isCompanyAdminLocally = (): boolean => {
  try {
    // Check userData first
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const role = userData.role || userData.userRole || userData.UserRole;
      
      if (role && role.toLowerCase() === 'companyadmin') {
        return true;
      }
    }
    
    // Check token if present
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
      
      if (tokenRole && tokenRole.toLowerCase() === 'companyadmin') {
        return true;
      }
      
      // Check for CompanyAdmin in Cognito groups
      const groups = decoded['cognito:groups'] || [];
      if (groups.some((g: string) => g.toLowerCase() === 'companyadmin')) {
        return true;
      }
    }
  } catch (error) {
  }
  
  return false;
};

// Check if user has User role
export const isUserRoleLocally = (): boolean => {
  try {
    // Check userData first
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const role = userData.role || userData.userRole || userData.UserRole;
      
      if (role && role.toLowerCase() === 'user') {
        return true;
      }
    }
    
    // Check token if present
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
      
      if (tokenRole && tokenRole.toLowerCase() === 'user') {
        return true;
      }
      
      // Check for User in Cognito groups
      const groups = decoded['cognito:groups'] || [];
      if (groups.some((g: string) => g.toLowerCase() === 'user')) {
        return true;
      }
    }
  } catch (error) {
  }
  
  return false;
};

// Get the user's role from any available source
export const getUserRole = (): string | null => {
  try {
    // Try to get from localStorage
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const role = userData.role || userData.userRole || userData.UserRole;
      if (role) return role;
    }
    
    // Try to extract from token
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      return decoded['custom:role'] || decoded['custom:userRole'] || decoded.role || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
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

// Check if the user has basic user access rights (not necessarily admin)
export const hasUserAccess = (): boolean => {
  // First check if there's a valid token - any authenticated user should have a token
  try {
    const token = localStorage.getItem('idToken') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    
    if (!token) return false;
    
    // Decode and validate token
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp <= currentTime) {
      return false;
    }
    
    // If we have a valid token, the user should have access
    // We can check for specific roles or groups if needed
    return true;
  } catch (error) {
    return false;
  }
};

// Store user role information properly in localStorage
export const storeUserRole = (userData: any): void => {
  try {
    // Check if userData contains a role
    const role = userData?.role || userData?.userRole || userData?.custom?.role;
    
    if (role) {
      // Store the role explicitly for easier access
      localStorage.setItem('userRole', role);
      // Update isAdmin flag if needed
      if (role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrator') {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
      }
    }
  } catch (error) {
  }
};

// Check if user can access user dashboard (includes user, companyadmin, etc.)
export const canAccessUserDashboard = (): boolean => {
  // First check for valid token
  if (!validateTokenLocally()) {
    return false;
  }
  
  // Admin can also access user dashboard
  if (isAdminLocally()) {
    return true;
  }
  
  // Check for CompanyAdmin role
  if (isCompanyAdminLocally()) {
    return true;
  }
  
  // Check for User role
  if (isUserRoleLocally()) {
    return true;
  }
  
  // Check for any role in localStorage
  const storedRole = localStorage.getItem('userRole');
  if (storedRole && ['user', 'companyadmin'].includes(storedRole.toLowerCase())) {
    return true;
  }
  
  // Check token for any valid user role
  try {
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
      
      // Any authenticated user with a role should be able to access the user dashboard
      if (tokenRole) {
        return true;
      }
    }
  } catch (error) {
  }
  
  return false;
};

// Check if user is authenticated and has any valid role
export const isAuthenticatedWithRole = (): boolean => {
  if (!validateTokenLocally()) {
    return false;
  }
  
  const role = getUserRole();
  return role !== null;
}