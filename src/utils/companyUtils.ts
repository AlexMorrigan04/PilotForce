/**
 * Utility functions for handling company-related operations
 */

/**
 * Gets the company ID from various sources with consistent priority:
 * 1. JWT token custom attributes (most reliable)
 * 2. User object passed as parameter
 * 3. localStorage/sessionStorage
 *
 * @param user Optional user object that might contain companyId
 * @returns The company ID or null if not found
 */
export const getCompanyId = (user?: any): string | null => {
  let companyId = null;
  
  // Try to extract from JWT token first (most reliable)
  try {
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      // Simple JWT parsing without external library
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (payload && payload['custom:companyId']) {
        companyId = payload['custom:companyId'];
        console.log("Extracted companyId from token:", companyId);
        return companyId;
      }
    }
  } catch (tokenError) {
    console.error("Error extracting company ID from token:", tokenError);
  }
  
  // If we have a user object, try to get companyId from it
  if (user) {
    // Direct property access
    if (user.companyId && typeof user.companyId === 'string' && user.companyId.trim() !== '') {
      companyId = user.companyId;
      console.log("Found companyId via user property:", companyId);
      return companyId;
    }
    
    // Nested property access
    if (user.user && user.user.companyId) {
      companyId = user.user.companyId;
      console.log("Found companyId via nested user property:", companyId);
      return companyId;
    }
    
    // Data wrapper property
    if (user.data && user.data.companyId) {
      companyId = user.data.companyId;
      console.log("Found companyId via data property:", companyId);
      return companyId;
    }
    
    // Custom attribute format
    if (user['custom:companyId']) {
      companyId = user['custom:companyId'];
      console.log("Found companyId via custom attribute:", companyId);
      return companyId;
    }
  }
  
  // Try localStorage/sessionStorage
  const localStorageCompanyId = localStorage.getItem('companyId');
  if (localStorageCompanyId) {
    console.log("Found companyId in localStorage:", localStorageCompanyId);
    return localStorageCompanyId;
  }
  
  const sessionStorageCompanyId = sessionStorage.getItem('companyId');
  if (sessionStorageCompanyId) {
    console.log("Found companyId in sessionStorage:", sessionStorageCompanyId);
    return sessionStorageCompanyId;
  }
  
  // Try to get from stored user data
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.companyId) {
        console.log("Found companyId in stored userData:", parsedUser.companyId);
        return parsedUser.companyId;
      }
    }
    
    const userString = localStorage.getItem('user');
    if (userString) {
      const parsedUser = JSON.parse(userString);
      if (parsedUser.companyId) {
        console.log("Found companyId in stored user:", parsedUser.companyId);
        return parsedUser.companyId;
      }
    }
  } catch (e) {
    console.error("Error parsing stored user data:", e);
  }
  
  console.warn("Could not find companyId in any source");
  return null;
};

export default {
  getCompanyId
};
