/**
 * Role Detection Utilities
 * 
 * Utilities for consistent role detection and routing decisions
 */

/**
 * Checks if the provided role should be directed to the admin portal
 * Only 'Administrator' and 'Admin' roles should go to the admin portal
 * 
 * @param role The user role to check
 * @returns boolean - true if the user should go to admin portal, false otherwise
 */
export const shouldUseAdminPortal = (role: string | null | undefined): boolean => {
  if (!role) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedRole = role.toLowerCase();
  
  // Only exact matches for administrator/admin roles
  return normalizedRole === 'administrator' || normalizedRole === 'admin';
};

/**
 * Checks if the provided role should be directed to the user portal
 * 'CompanyAdmin' and 'User' roles should go to the user portal
 * 
 * @param role The user role to check
 * @returns boolean - true if the user should go to user portal, false otherwise
 */
export const shouldUseUserPortal = (role: string | null | undefined): boolean => {
  if (!role) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedRole = role.toLowerCase();
  
  // Check for user portal roles
  return normalizedRole === 'companyadmin' || normalizedRole === 'user';
};

/**
 * Specific check for CompanyAdmin role
 * This is useful for CompanyAdmin-specific logic and token handling
 * 
 * @param role The user role to check
 * @returns boolean - true if the user is a CompanyAdmin, false otherwise
 */
export const isCompanyAdmin = (role: string | null | undefined): boolean => {
  if (!role) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedRole = role.toLowerCase();
  
  // Check specifically for CompanyAdmin role
  return normalizedRole === 'companyadmin';
};

/**
 * Extract the role from a user object with multiple possible role property names
 * 
 * @param user User object that might contain role information
 * @returns string | null - The role if found, null otherwise
 */
export const extractRoleFromUser = (user: any): string | null => {
  if (!user) return null;
  
  // Look in common places for role information
  return user.role || 
         user['custom:role'] || 
         user['custom:userRole'] ||
         user.userRole ||
         user.UserRole ||
         null;
};

/**
 * Get the appropriate destination for a user based on their role
 * 
 * @param role The user's role
 * @returns string - The path they should be directed to
 */
export const getDestinationForRole = (role: string | null | undefined): string => {
  if (!role) return '/dashboard';
  
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole === 'administrator' || normalizedRole === 'admin') {
    return '/admin-dashboard';
  }
  
  return '/dashboard';
};
