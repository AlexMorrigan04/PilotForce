/**
 * OAuth Protection Utilities
 * 
 * This module provides functions to protect against OAuth-related issues:
 * 1. OAuth code reuse and infinite loops
 * 2. Browser history navigation issues with OAuth codes
 * 3. Session tracking for OAuth states
 */

// Store processed OAuth codes to prevent reprocessing
const processedCodes = new Set();

// Constants for OAuth protection
const MAX_OAUTH_ATTEMPTS = 8;  // Increased from 5 to be more tolerant
const OAUTH_ATTEMPT_WINDOW = 15000;  // Increased to 15 seconds
const OAUTH_RESET_WINDOW = 30000;  // 30 seconds
const ADMIN_SESSION_TIMEOUT = 3600000; // 1 hour

/**
 * Clear OAuth parameters from URL without navigating
 * This prevents OAuth codes from persisting in browser history
 */
export const clearOAuthParamsFromUrl = () => {
  const url = new URL(window.location.href);
  let modified = false;
  
  // OAuth parameters to remove
  const oauthParams = ['code', 'state', 'session_state', 'error', 'error_description'];
  
  oauthParams.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      modified = true;
    }
  });
  
  if (modified) {
    // Replace the current URL without adding to history
    window.history.replaceState({}, document.title, url.toString());
  }
};

/**
 * Check if an OAuth code has already been processed
 * @param {string} code - The OAuth code to check
 * @returns {boolean} - Whether this code has been processed before
 */
export const isCodeAlreadyProcessed = (code) => {
  if (!code) return false;
  
  // Check if already in our set
  const isProcessed = processedCodes.has(code);
  
  // If processed, verify we have valid auth data
  if (isProcessed) {
    const hasValidAuth = localStorage.getItem('idToken') && 
                        localStorage.getItem('accessToken');
    
    // If we don't have valid auth data, allow reprocessing
    if (!hasValidAuth) {
      processedCodes.delete(code);
      return false;
    }
  }
  
  return isProcessed;
};

/**
 * Mark an OAuth code as processed
 * @param {string} code - The OAuth code to mark
 */
export const markCodeAsProcessed = (code) => {
  if (!code) return;
  
  processedCodes.add(code);
  
  // Store in sessionStorage as backup (survives page refresh)
  try {
    // Get existing processed codes
    const storedCodes = JSON.parse(sessionStorage.getItem('processed_oauth_codes') || '[]');
    
    // Add new code if not already there
    if (!storedCodes.includes(code)) {
      storedCodes.push(code);
      // Keep only the last 20 codes to prevent storage bloat
      if (storedCodes.length > 20) {
        storedCodes.splice(0, storedCodes.length - 20);
      }
      sessionStorage.setItem('processed_oauth_codes', JSON.stringify(storedCodes));
    }
  } catch (e) {
  }
  
  // Prune the set if it gets too large
  if (processedCodes.size > 100) {
    // Convert to array, remove oldest entries, convert back to set
    const codesArray = Array.from(processedCodes);
    const newSet = new Set(codesArray.slice(codesArray.length - 50));
    processedCodes.clear();
    newSet.forEach(c => processedCodes.add(c));
  }
};

/**
 * Check if the admin session is still valid
 * @returns {boolean} - Whether the admin session is valid
 */
export const isAdminSessionValid = () => {
  const adminLoginTimestamp = localStorage.getItem('adminLoginTimestamp');
  const adminSessionId = localStorage.getItem('adminSessionId');
  
  if (!adminLoginTimestamp || !adminSessionId) {
    return false;
  }
  
  const loginTime = parseInt(adminLoginTimestamp, 10);
  const now = Date.now();
  
  // Check if the session has expired
  if (now - loginTime > ADMIN_SESSION_TIMEOUT) {
    return false;
  }
  
  return true;
};

/**
 * Detect if there's a potential OAuth redirect loop happening
 * @returns {boolean} - Whether we're likely in an OAuth loop
 */
export const detectOAuthLoop = () => {
  try {
    // Track OAuth navigation attempts
    const now = Date.now();
    const lastOAuthTime = parseInt(sessionStorage.getItem('lastOAuthTime') || '0', 10);
    const oauthCount = parseInt(sessionStorage.getItem('oauthCount') || '0', 10);
    const currentPath = window.location.pathname;
    
    // If this is the first OAuth attempt or it's been a while, reset the counter
    if (lastOAuthTime === 0 || (now - lastOAuthTime > OAUTH_RESET_WINDOW)) {
      sessionStorage.setItem('oauthCount', '1');
      sessionStorage.setItem('lastOAuthTime', now.toString());
      sessionStorage.removeItem('oauthLoopDetected');
      return false;
    }
    
    // Update counters
    const timeSinceLastOAuth = now - lastOAuthTime;
    sessionStorage.setItem('lastOAuthTime', now.toString());
    
    // Only increment count if within the attempt window
    if (timeSinceLastOAuth < OAUTH_ATTEMPT_WINDOW) {
      sessionStorage.setItem('oauthCount', (oauthCount + 1).toString());
    } else {
      // Reset count if outside the window
      sessionStorage.setItem('oauthCount', '1');
    }
    
    // Special handling for admin users
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userRole = localStorage.getItem('userRole');
    
    // If role claims to be admin but isAdmin flag is not set, this might be a transition state
    if (userRole?.toLowerCase() === 'administrator' && !isAdmin) {
      // Give it a chance to set the admin flag
      return false;
    }
    
    // If too many OAuth redirects in a short time, we're probably in a loop
    if (timeSinceLastOAuth < OAUTH_ATTEMPT_WINDOW && oauthCount > MAX_OAUTH_ATTEMPTS) {
      sessionStorage.setItem('oauthLoopDetected', 'true');
      return true;
    }
    
    // Check if a loop was previously detected
    const loopDetected = sessionStorage.getItem('oauthLoopDetected') === 'true';
    
    // If we're on the login page and have detected a loop, clear auth data
    if (loopDetected && currentPath === '/login') {
      clearAuthData();
      return true;
    }
    
    return loopDetected;
  } catch (e) {
    return false;
  }
};

/**
 * Reset OAuth loop detection state
 */
export const resetOAuthLoopDetection = () => {
  sessionStorage.removeItem('oauthLoopDetected');
  sessionStorage.setItem('oauthCount', '0');
  sessionStorage.setItem('lastOAuthTime', Date.now().toString());
  
  // Also clear any processed codes that don't have valid auth data
  const codesArray = Array.from(processedCodes);
  codesArray.forEach(code => {
    if (!localStorage.getItem('idToken') || !localStorage.getItem('accessToken')) {
      processedCodes.delete(code);
    }
  });
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  // Clear localStorage auth items
  const authKeys = [
    'idToken', 'accessToken', 'refreshToken', 'tokens', 'userRole', 'isAdmin',
    'isCompanyAdmin', 'user', 'userCognitoDetails', 'auth_username', 'auth_email',
    'auth_redirect_path', 'lastDetectedRole', 'pilotforceSessionActive',
    'pilotforceSessionTimestamp', 'approvalStatus', 'userAccess', 'adminAuthCompleted',
    'adminLoginTimestamp', 'adminSessionId'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage navigation state
  const sessionKeys = [
    'navigationInProgress', 'navigationLoopDetected', 'lastNavigationTime',
    'navigationCount', 'oauthLoopDetected', 'oauthCount', 'lastOAuthTime',
    'recentlyOnOAuth', 'dashboardRedirectSkipped', 'redirectInProgress',
    'processed_oauth_codes', 'oauthCompletionTime'
  ];
  
  sessionKeys.forEach(key => sessionStorage.removeItem(key));
  
  // Clear processed codes set
  processedCodes.clear();
};

/**
 * Initialize from sessionStorage on module load
 */
const init = () => {
  try {
    // Load processed codes from sessionStorage
    const storedCodes = JSON.parse(sessionStorage.getItem('processed_oauth_codes') || '[]');
    storedCodes.forEach(code => processedCodes.add(code));
  } catch (e) {
  }
};

// Run initialization
init();

export default {
  clearOAuthParamsFromUrl,
  isCodeAlreadyProcessed,
  markCodeAsProcessed,
  detectOAuthLoop,
  resetOAuthLoopDetection,
  isAdminSessionValid,
  clearAuthData
};
