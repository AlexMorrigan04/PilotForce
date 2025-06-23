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
      if (payload) {
        // Try both uppercase and lowercase versions
        companyId = payload['custom:CompanyId'] || payload['custom:companyId'];
        if (companyId) {
          return companyId;
        }
      }
    }
  } catch (tokenError) {
  }
  
  // If we have a user object, try to get companyId from it
  if (user) {
    // Direct property access
    if (user.companyId && typeof user.companyId === 'string' && user.companyId.trim() !== '') {
      companyId = user.companyId;
      return companyId;
    }
    
    // Nested property access
    if (user.user && user.user.companyId) {
      companyId = user.user.companyId;
      return companyId;
    }
    
    // Data wrapper property
    if (user.data && user.data.companyId) {
      companyId = user.data.companyId;
      return companyId;
    }
    
    // Custom attribute format - try both cases
    if (user['custom:CompanyId'] || user['custom:companyId']) {
      companyId = user['custom:CompanyId'] || user['custom:companyId'];
      return companyId;
    }
  }
  
  // Try localStorage/sessionStorage
  const localStorageCompanyId = localStorage.getItem('companyId');
  if (localStorageCompanyId) {
    return localStorageCompanyId;
  }
  
  const sessionStorageCompanyId = sessionStorage.getItem('companyId');
  if (sessionStorageCompanyId) {
    return sessionStorageCompanyId;
  }
  
  // Try to get from stored user data
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.companyId) {
        return parsedUser.companyId;
      }
    }
    
    const userString = localStorage.getItem('user');
    if (userString) {
      const parsedUser = JSON.parse(userString);
      if (parsedUser.companyId) {
        return parsedUser.companyId;
      }
    }
  } catch (e) {
  }
  return null;
};

/**
 * Extracts the company name from various sources in order of priority:
 * 1. localStorage (cached)
 * 2. User object (custom attributes)
 * 3. Email domain as fallback
 * @param user The user object
 * @returns The company name if found, otherwise empty string
 */
export const getCompanyName = (user?: any): string => {
  // Try localStorage first (might have been cached from previous API/DynamoDB lookup)
  const cachedName = localStorage.getItem('companyName');
  if (cachedName) return cachedName;
  
  // If we have a user object, try to get company name from it
  if (user) {
    // Direct property access
    if (user.companyName && typeof user.companyName === 'string') {
      return user.companyName;
    }
    
    // Custom attribute format
    if (user['custom:companyName'] && typeof user['custom:companyName'] === 'string') {
      return user['custom:companyName'];
    }
    
    // Nested formats
    if (user.attributes && user.attributes['custom:companyName']) {
      return user.attributes['custom:companyName'];
    }
    
    // Try to extract from email domain as fallback
    if (user.email) {
      const emailParts = user.email.split('@');
      if (emailParts.length > 1) {
        const domain = emailParts[1].split('.')[0];
        return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();
      }
    }
  }
  
  // No company name found
  return "";
};

export default {
  getCompanyId,
  getCompanyName
};
