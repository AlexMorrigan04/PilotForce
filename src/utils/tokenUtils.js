/**
 * Extracts and caches company information from ID token
 */
export const extractCompanyInfoFromToken = () => {
  try {
    // Get ID token from storage
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    
    if (!idToken) {
      return null;
    }
    
    // Parse token payload (middle part of JWT between dots)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Base64 decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Extract company information - try both uppercase and lowercase
    const companyInfo = {
      companyId: payload['custom:CompanyId'] || payload['custom:companyId'] || payload.companyId || null,
      companyName: payload['custom:CompanyName'] || payload['custom:companyName'] || payload.companyName || null,
      role: payload['custom:role'] || payload.role || 'User'
    };
    
    // Store in localStorage for future use
    if (companyInfo.companyId) {
      localStorage.setItem('companyId', companyInfo.companyId);
    }
    
    if (companyInfo.companyName) {
      localStorage.setItem('companyName', companyInfo.companyName);
    }
    
    if (companyInfo.role) {
      localStorage.setItem('userRole', companyInfo.role);
    }
    
    return companyInfo;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token contains company info
 */
export const hasCompanyInfoInToken = () => {
  try {
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    if (!idToken) return false;
    
    const parts = idToken.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    
    return !!(payload['custom:CompanyId'] || payload.companyId || 
              payload['custom:CompanyName'] || payload.companyName);
  } catch (error) {
    return false;
  }
};
