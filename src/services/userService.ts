import { getUser } from '../utils/localStorage';
import { createApiHeaders, callApiGateway } from '../utils/apiGatewayHelper';
import { getCsrfToken } from '../utils/securityHelper';
import { securityAuditLogger } from '../utils/securityAuditLogger';

const API_BASE_URL = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_API_URL;

/**
 * Get authentication credentials from localStorage with better fallback options
 * @returns {Object} Object containing username and password or auth tokens
 */
function getAuthCredentials() {
  const username = localStorage.getItem('auth_username');
  const password = localStorage.getItem('auth_password');
  
  // Try to get token-based auth first
  const idToken = localStorage.getItem('idToken');
  const tokensStr = localStorage.getItem('tokens');
  let tokens = null;
  
  try {
    if (tokensStr) {
      tokens = JSON.parse(tokensStr);
    }
  } catch (e) {
  }
  
  // If we have a token, prefer that for auth
  if (idToken || (tokens && tokens.idToken)) {
    const tokenToUse = idToken || tokens.idToken;
    return { 
      username: username || 'token_auth',
      authHeader: `Bearer ${tokenToUse}`
    };
  }
  
  // If no token but username/password available, use those
  if (username && password) {
    return { username, password };
  }
  
  // Get the current user from localStorage as last resort
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      // If we have a username but no password, just return what we can
      if (userData.username || userData.Username) {
        return { 
          username: userData.username || userData.Username,
          incomplete: true
        };
      }
    } catch (e) {
    }
  }
  
  throw new Error('Authentication credentials not found');
}

export async function getCurrentUser() {
  try {
    const { username, password, authHeader } = getAuthCredentials();
    
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify({
        username,
        password
      })
    });
    
    if (!response.ok) {
      // Log failed data access
      securityAuditLogger.logAccessDenied(
        username,
        'user',
        'current_user',
        'read',
        { statusCode: response.status }
      );
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      
      // Handle different response structures
      let userData;
      if (data.body && typeof data.body === 'string') {
        const parsedBody = JSON.parse(data.body);
        userData = parsedBody.user || parsedBody;
      } else if (data.user) {
        userData = data.user;
      } else {
        userData = data;
      }

      // Log successful data access
      securityAuditLogger.logDataAccess(
        username,
        'user',
        'current_user',
        'read',
        true,
        { fields: Object.keys(userData) }
      );
      
      return userData;
    } catch (error) {
      // Log system error
      securityAuditLogger.logSystemError(
        username,
        'parse_user_data',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw new Error('Failed to parse user data response');
    }
  } catch (error) {
    // Try to fall back to cached user data if available
    const cachedUser = getUser();
    if (cachedUser) {
      return cachedUser;
    }
    throw error;
  }
}

export async function updateUserAttributes(userId: string, attributes: Record<string, any>) {
  try {
    const { username, password, authHeader } = getAuthCredentials();
    
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify({
        username,
        password,
        userId,
        attributes
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user attributes: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getUsersByCompany(companyId: string) {
  if (!companyId) {
    throw new Error('Company ID is required');
  }
  
  try {
    
    // Using the format that matches your API Gateway configuration
    // Based on "/companies/{companyId}/users" in your API Gateway config
    try {
      // The path format must match your API Gateway resource path
      const data = await callApiGateway(`/companies/${companyId}/users`, 'GET');
      return processUserResponse(data);
    } catch (firstError) {
      // Fall back to user endpoint with companyId query param
      // Note that API Gateway must be configured to accept these query parameters
      const fallbackData = await callApiGateway(`/user`, 'GET', null, {
        'companyId': companyId
      });
      
      return processUserResponse(fallbackData);
    }
  } catch (error) {
    throw error;
  }
}

// Helper function to process user response with consistent format
function processUserResponse(data: any): any[] {
  // Process response data with better error handling
  if (data.users) {
    return data.users;
  } else if (data.body) {
    try {
      const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      if (parsedBody.users) {
        return parsedBody.users;
      } else if (Array.isArray(parsedBody)) {
        return parsedBody;
      }
    } catch (e) {
    }
  } else if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * Fetches the current user's company details including all users in that company
 * @returns {Promise<Object>} Company details with users array
 */
export async function getCurrentUserCompanyWithUsers() {
  try {
    // Step 1: Get current user details to obtain company ID
    const currentUser = await getCurrentUser().catch(err => {
      // Fall back to localStorage
      const savedUser = getUser();
      if (!savedUser) {
        throw new Error('Could not determine user information');
      }
      return savedUser;
    });
    
    // If we still don't have a company ID, check additional sources
    let companyId = currentUser?.companyId || currentUser?.CompanyId;
    
    if (!companyId) {
      // Try to get from localStorage directly
      companyId = localStorage.getItem('companyId');
      
      if (!companyId) {
        throw new Error('Could not determine company ID from current user');
      }
    }
    
    // Step 2: Use the company ID to get all users belonging to this company
    const companyUsers = await getUsersByCompany(companyId).catch(err => {
      // Return empty array on error
      return [];
    });
    
    // Return both the company ID and the users
    return {
      companyId,
      currentUser,
      users: companyUsers
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Fetches the company by ID with all its users
 * @param {string} companyId - The company ID to fetch
 * @returns {Promise<Object>} Company details with users array
 */
export async function getCompanyWithUsers(companyId: string) {
  try {
    // Get the auth credentials
    const { username, password, authHeader } = getAuthCredentials();
    
    // First, get company details
    const companyResponse = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || `Basic ${btoa(`${username}:${password}`)}`
      }
    });
    
    if (!companyResponse.ok) {
      throw new Error(`Failed to fetch company details: ${companyResponse.status}`);
    }
    
    const companyData = await companyResponse.json();
    
    // Then, get all users belonging to this company
    const users = await getUsersByCompany(companyId);
    
    // Process company data similar to how we process user data
    let company = companyData;
    if (companyData.body && typeof companyData.body === 'string') {
      try {
        const parsedBody = JSON.parse(companyData.body);
        company = parsedBody.company || parsedBody;
      } catch (e) {
      }
    }
    
    return {
      company,
      users
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Fetches all users in a company directly without requiring authentication
 * Pure DynamoDB lookup with no Cognito dependency - fixed CORS issues
 * Added optional API token for semi-protected endpoints
 * 
 * @param companyId The ID of the company to fetch users for
 * @returns Array of users in the company
 */
export async function getCompanyUsersDirect(companyId: string): Promise<any[]> {
  if (!companyId) {
    return [];
  }
  
  try {
    
    // This endpoint has been modified to use only DynamoDB - no Cognito
    const url = `${API_BASE_URL}/companies/${companyId}/users`;
    
    // Add optional API token for semi-protected endpoint
    // This adds a light security layer without full authentication
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Add API token if configured (environment variable or config)
    const apiToken = process.env.REACT_APP_API_TOKEN;
    if (apiToken) {
      headers['X-Api-Token'] = apiToken;
    }
    
    // Using simple fetch configuration that works with proper CORS setup
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch company users: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.users) {
      return data.users;
    }
    
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    
    // Fall back to the authenticated endpoint as a backup
    try {
      const fallbackUsers = await getUsersByCompany(companyId);
      return fallbackUsers;
    } catch (fallbackError) {
      return [];
    }
  }
}

// Replace getCompanyUsersPublic with the new implementation
export const getCompanyUsersPublic = getCompanyUsersDirect;

// Update the simplified method to use the direct DB lookup
export async function getCompanyUsersSimplified() {
  try {
    // First try to get current user's company ID
    const companyId = await getCurrentUserCompanyId();
    
    if (companyId) {
      // If we have a company ID, use the direct DB lookup with no auth
      return getCompanyUsersDirect(companyId);
    }
    
    // If no company ID, use the authenticated endpoint
    
    // Get authentication credentials
    const { username, password, authHeader } = getAuthCredentials();
    
    // Make request to the enhanced user endpoint with the getCompanyUsers parameter
    const url = `${API_BASE_URL}/user?getCompanyUsers=true`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Authentication method depends on what's available
    const options: RequestInit = {
      method: 'GET',
      headers,
      // Include username/password in body only if no token available and we're using POST
      ...((!authHeader && username && password) ? {
        method: 'POST',
        body: JSON.stringify({ username, password })
      } : {})
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch company users: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Handle different response formats
    if (responseData.users) {
      return responseData.users;
    } else if (responseData.body && typeof responseData.body === 'string') {
      const parsedBody = JSON.parse(responseData.body);
      return parsedBody.users || [];
    }
    
    return [];
  } catch (error) {
    // Fall back to the original method if this fails
    return getUsersByCompany(await getCurrentUserCompanyId());
  }
}

/**
 * Get the company ID for the current user
 */
async function getCurrentUserCompanyId(): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    return currentUser?.companyId || currentUser?.CompanyId || '';
  } catch (error) {
    
    // Try to get from localStorage as fallback
    const user = getUser();
    return user?.companyId || user?.CompanyId || localStorage.getItem('companyId') || '';
  }
}
