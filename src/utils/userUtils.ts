/**
 * Utility functions for handling user data
 */

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

export default {
  normalizeUserData,
  isCompanyAdmin,
};
