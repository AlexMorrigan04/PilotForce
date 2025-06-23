/**
 * Debug Authentication State Script
 * 
 * This script provides diagnostic information about the current authentication state
 * and offers automatic fixes for common auth state issues in the Pilotforce application.
 * 
 * To use this script, run it from the browser console when experiencing login or navigation issues.
 */

function debugAuthState() {
  // Collect all relevant authentication state information
  const authState = {
    // User identity
    userRole: localStorage.getItem('userRole'),
    isCompanyAdmin: localStorage.getItem('isCompanyAdmin'),
    isAdmin: localStorage.getItem('isAdmin'),
    
    // Auth tokens
    hasIdToken: !!localStorage.getItem('idToken'),
    hasAccessToken: !!localStorage.getItem('accessToken'),
    hasRefreshToken: !!localStorage.getItem('refreshToken'),
    
    // Auth state flags
    approvalStatus: localStorage.getItem('approvalStatus'),
    userAccess: localStorage.getItem('userAccess'),
    pilotforceSessionActive: localStorage.getItem('pilotforceSessionActive'),
    pilotforceSessionTimestamp: localStorage.getItem('pilotforceSessionTimestamp'),
    
    // Navigation flags
    redirectInProgress: sessionStorage.getItem('redirectInProgress'),
    navigationInProgress: sessionStorage.getItem('navigationInProgress'),
    dashboardRedirectSkipped: sessionStorage.getItem('dashboardRedirectSkipped'),
    dashboardRenderAttempt: sessionStorage.getItem('dashboardRenderAttempt'),
    userPortalRedirected: localStorage.getItem('userPortalRedirected'),
    
    // Current location
    currentPath: window.location.pathname
  };
  // Analyze the auth state for potential issues
  const issues = [];
  
  // Check for token validity
  if (!authState.hasIdToken && !authState.hasAccessToken) {
    issues.push('🔴 No authentication tokens found. User is not logged in.');
  }
  
  // Check for role conflicts
  if (authState.userRole === 'CompanyAdmin' && authState.isCompanyAdmin !== 'true') {
    issues.push('🟠 CompanyAdmin role detected but isCompanyAdmin flag not set correctly.');
  }
  
  if (authState.userRole === 'Administrator' && authState.isAdmin !== 'true') {
    issues.push('🟠 Administrator role detected but isAdmin flag not set correctly.');
  }
  
  // Check for approval status issues
  if (authState.userRole === 'CompanyAdmin' && authState.approvalStatus !== 'APPROVED') {
    issues.push('🟠 CompanyAdmin user does not have approvalStatus set to APPROVED.');
  }
  
  if (authState.userRole === 'CompanyAdmin' && authState.userAccess !== 'true') {
    issues.push('🟠 CompanyAdmin user does not have userAccess flag set to true.');
  }
  
  // Navigation issues
  if (authState.navigationInProgress === 'true') {
    issues.push('🟠 Navigation is currently in progress. This might cause redirect loops.');
  }
  
  // Session issues
  if (authState.hasIdToken && !authState.pilotforceSessionActive) {
    issues.push('🟠 User has auth tokens but no active session flag set.');
  }
  
  // Display results
  if (issues.length === 0) {
  } else {
    issues.forEach((issue, index) => {
    });
  }
  
  return {
    authState,
    issues,
    fixIssues: function() {
      // Fix CompanyAdmin flags
      if (authState.userRole === 'CompanyAdmin') {
        localStorage.setItem('isCompanyAdmin', 'true');
        localStorage.setItem('approvalStatus', 'APPROVED');
        localStorage.setItem('userAccess', 'true');
      }
      
      // Fix User flags
      if (authState.userRole === 'User') {
        localStorage.setItem('isCompanyAdmin', 'false');
        localStorage.setItem('approvalStatus', 'APPROVED');
        localStorage.setItem('userAccess', 'true');
      }
      
      // Fix Admin flags
      if (authState.userRole === 'Administrator' || authState.userRole === 'Admin') {
        localStorage.setItem('isAdmin', 'true');
      }
      
      // Clear navigation flags
      sessionStorage.removeItem('redirectInProgress');
      sessionStorage.removeItem('navigationInProgress');
      sessionStorage.removeItem('dashboardRedirectSkipped');
      // Set session active
      if (authState.hasIdToken || authState.hasAccessToken) {
        localStorage.setItem('pilotforceSessionActive', 'true');
        localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
      }
    },
    
    redirectToDashboard: function() {
      if (authState.hasIdToken || authState.hasAccessToken) {
        window.location.href = '/dashboard';
        return true;
      } else {
        return false;
      }
    }
  };
}

// Run diagnostic on load
const diagnosticResult = debugAuthState();
