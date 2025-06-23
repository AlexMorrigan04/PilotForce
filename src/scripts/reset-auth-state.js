/**
 * Reset Authentication State Script
 * 
 * This script helps reset the authentication state for CompanyAdmin and User users
 * who are experiencing navigation or redirect issues after login.
 * 
 * To use this script, run it from the browser console when logged in.
 */

function resetAuthState() {
  // Get current role from localStorage
  const userRole = localStorage.getItem('userRole');
  if (userRole && userRole.toLowerCase() === 'companyadmin') {
    // Set the necessary flags for CompanyAdmin users
    localStorage.setItem('isCompanyAdmin', 'true');
    localStorage.setItem('approvalStatus', 'APPROVED');
    localStorage.setItem('userAccess', 'true');
    localStorage.setItem('pilotforceSessionActive', 'true');
    localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
    
    // Preserve company information if available
    const companyId = localStorage.getItem('companyId');
    const companyName = localStorage.getItem('companyName');
    if (companyId) {
      // Already stored in localStorage, no need to set again
    }
    if (companyName) {
      // Already stored in localStorage, no need to set again
    }
    
    // Clear any redirect flags that might be causing loops
    sessionStorage.removeItem('redirectInProgress');
    sessionStorage.removeItem('navigationInProgress');
    sessionStorage.removeItem('dashboardRedirectSkipped');
    sessionStorage.removeItem('dashboardRenderAttempt');
    localStorage.removeItem('userPortalRedirected');
    
    // Force navigation to dashboard
    if (window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
      return true;
    }
    return true;
  } else if (userRole && userRole.toLowerCase() === 'user') {
    // Set the necessary flags for User accounts
    localStorage.setItem('isCompanyAdmin', 'false');
    localStorage.setItem('approvalStatus', 'APPROVED');
    localStorage.setItem('userAccess', 'true');
    localStorage.setItem('pilotforceSessionActive', 'true');
    localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
    
    // Preserve company information if available
    const companyId = localStorage.getItem('companyId');
    const companyName = localStorage.getItem('companyName');
    if (companyId) {
      // Already stored in localStorage, no need to set again
    }
    if (companyName) {
      // Already stored in localStorage, no need to set again
    }
    
    // Clear any redirect flags that might be causing loops
    sessionStorage.removeItem('redirectInProgress');
    sessionStorage.removeItem('navigationInProgress');
    sessionStorage.removeItem('dashboardRedirectSkipped');
    sessionStorage.removeItem('dashboardRenderAttempt');
    localStorage.removeItem('userPortalRedirected');
    
    // Force navigation to dashboard
    if (window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
      return true;
    }
    return true;
  } else {
    return false;
  }
}

// Backward compatibility
function resetCompanyAdminAuthState() {
  return resetAuthState();
}

// Execute the function
resetCompanyAdminAuthState();
