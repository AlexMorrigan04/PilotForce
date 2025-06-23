/**
 * Clear Auth State Utility
 * This script helps clear all authentication state and gives you a clean slate.
 * 
 * To use this, copy the entire script to your browser console when you encounter login loops.
 */
(function() {
  console.group('🧹 Auth State Cleanup');
  
  // 1. Clear localStorage
  console.log('Clearing localStorage authentication data...');
  const authKeys = [
    'idToken', 'accessToken', 'refreshToken', 'tokens', 'userRole', 'isAdmin', 
    'isCompanyAdmin', 'user', 'userCognitoDetails', 'auth_username', 'auth_email',
    'auth_redirect_path', 'lastDetectedRole', 'pilotforceSessionActive', 
    'pilotforceSessionTimestamp', 'approvalStatus', 'userAccess', 'companyadmin_username',
    'adminAuthCompleted', 'adminLoginTimestamp'
  ];
  
  authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`- Removing ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // 2. Clear sessionStorage
  console.log('Clearing sessionStorage navigation state...');
  const sessionKeys = [
    'navigationInProgress', 'navigationLoopDetected', 'lastNavigationTime',
    'navigationCount', 'oauthLoopDetected', 'oauthCount', 'lastOAuthTime',
    'recentlyOnOAuth', 'dashboardRedirectSkipped', 'redirectInProgress',
    'processed_oauth_codes'
  ];
  
  sessionKeys.forEach(key => {
    if (sessionStorage.getItem(key)) {
      console.log(`- Removing ${key}`);
      sessionStorage.removeItem(key);
    }
  });
  
  // 3. Remove OAuth parameters from URL
  console.log('Cleaning URL of OAuth parameters...');
  const url = new URL(window.location.href);
  let modified = false;
  
  ['code', 'state', 'error', 'error_description'].forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      modified = true;
    }
  });
  
  if (modified) {
    window.history.replaceState({}, document.title, url.toString());
    console.log('- OAuth parameters removed from URL');
  }
  
  console.log('✅ Auth state cleanup complete!');
  console.log('To resolve login issues:');
  console.log('1. Navigate to the login page');
  console.log('2. Sign in with your credentials');
  
  console.groupEnd();
  
  return 'Auth state cleaned successfully.';
})();
