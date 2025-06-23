// NOTE: This file is being replaced by companyService.ts
// Kept for reference only - do not import from this file
import { extractEmailDomain, getCompanyNameFromDomain } from '../utils/emailUtils';
import { Amplify } from 'aws-amplify';

// Correct way to access API from Amplify
const API = Amplify?.API;

/**
 * Gets or creates a company based on user email
 * 
 * @param {string} userEmail - The email of the user
 * @returns {Promise<Object>} The company details
 */
export const getOrCreateCompany = async (userEmail) => {
  try {
    const emailDomain = extractEmailDomain(userEmail);
    
    if (!emailDomain) {
      throw new Error('Invalid email format');
    }
    
    
    // First try to get existing company
    try {
      const existingCompany = await getCompanyByDomain(emailDomain);
      
      if (existingCompany) {
        return existingCompany;
      }
    } catch (lookupError) {
    }
    
    // If not found, create a new company
    const companyName = getCompanyNameFromDomain(emailDomain);
    
    // Try the company register API endpoint first
    try {
      const registeredCompany = await registerUserWithCompany(userEmail);
      if (registeredCompany) {
        return registeredCompany;
      }
    } catch (registerError) {
    }
    
    // Fall back to direct company creation
    return await createCompany(emailDomain, companyName);
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a company by email domain
 * 
 * @param {string} emailDomain - Domain to search for
 * @returns {Promise<Object|null>} The company or null if not found
 */
export const getCompanyByDomain = async (emailDomain) => {
  try {
    const encodedDomain = encodeURIComponent(emailDomain);
    
    // Use fetch instead of AWS Amplify's API
    const apiUrl = process.env.REACT_APP_API_ENDPOINT || '';
    const response = await fetch(`${apiUrl}/companies/domain/${encodedDomain}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('idToken')}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Company not found
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.company) {
      return data.company;
    }
    return null;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Company not found
    }
    return null;
  }
};

/**
 * Registers a user with a company
 * 
 * @param {string} email - User's email address
 * @returns {Promise<Object>} The company details
 */
export const registerUserWithCompany = async (email) => {
  try {
    // Use fetch instead of AWS Amplify's API
    const apiUrl = process.env.REACT_APP_API_ENDPOINT || '';
    const response = await fetch(`${apiUrl}/companies/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('idToken')}`
      },
      body: { email }
    });
    
    
    if (response && response.company) {
      return response.company;
    }
    throw new Error('Company registration did not return expected data');
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a new company
 * 
 * @param {string} emailDomain - The domain to associate with the company
 * @param {string} companyName - The name of the company
 * @returns {Promise<Object>} The created company details
 */
export const createCompany = async (emailDomain, companyName) => {
  try {
    
    const response = await API.post('PilotForceAPI', '/companies', {
      body: {
        EmailDomain: emailDomain,
        CompanyName: companyName || getCompanyNameFromDomain(emailDomain)
      }
    });
    
    
    // Handle different response formats
    if (response && response.company) {
      return response.company;
    } else if (response && response.message && response.message.includes('success')) {
      // If response doesn't contain company object but indicates success
      return await getCompanyByDomain(emailDomain);
    }
    throw new Error('Create company did not return expected data');
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch a company by its ID
 * @param {string} companyId - The ID of the company to retrieve
 * @returns {Promise<{success: boolean, company: Object|null, error: string|null}>}
 */
export const getCompanyById = async (companyId) => {
  if (!companyId) {
    return {
      success: false,
      company: null,
      error: "Missing company ID"
    };
  }

  try {
    // Get auth token
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    
    // Try multiple API endpoints to improve reliability - PLURAL 'companies' endpoint must be first
    const apiUrl = process.env.REACT_APP_API_ENDPOINT || '';
    const endpoints = [
      // First try the correct companies endpoint (matches what's in the API Gateway)
      {
        url: `${apiUrl}/companies/${companyId}`,
        headers: { 'Authorization': `Bearer ${idToken}` }
      },
      // Try direct Lambda invocation through API Gateway - POST method
      {
        url: `${apiUrl}/companies`,
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ companyId })
      }
    ];
    
    // Try each endpoint until one works
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method || 'GET',
          headers: endpoint.headers || {},
          body: endpoint.body,
          // IMPORTANT: Don't include credentials to avoid CORS issues
          credentials: 'omit'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Parse the response body if it's a string - Lambda sometimes returns JSON as a string in the body
          if (data.body && typeof data.body === 'string') {
            try {
              const parsedBody = JSON.parse(data.body);
              if (parsedBody.success && parsedBody.company) {
                return {
                  success: true,
                  company: parsedBody.company,
                  error: null
                };
              }
            } catch (parseError) {
            }
          }
          
          // Handle different response formats
          if (data.company) {
            return {
              success: true,
              company: data.company,
              error: null
            };
          } else if (data.companyId === companyId || data.CompanyId === companyId) {
            return {
              success: true,
              company: data,
              error: null
            };
          } else if (data.success && data.data) {
            return {
              success: true,
              company: data.data,
              error: null
            };
          }
        } else {
        }
      } catch (endpointError) {
        lastError = endpointError;
        // Continue to next endpoint
      }
    }
    
    // If all API calls fail, try using data from token/localStorage as fallback
    const companyNameFromToken = getCompanyNameFromToken();
    if (companyNameFromToken) {
      return {
        success: true,
        company: {
          CompanyId: companyId,
          Name: companyNameFromToken,
          Status: 'Active'
        },
        error: null
      };
    }
    
    // No data could be retrieved
    return {
      success: false,
      company: null,
      error: lastError?.message || "Failed to fetch company details"
    };
  } catch (error) {
    // Final fallback - use any company info from token
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const companyName = localStorage.getItem('companyName') || 
                        userInfo?.companyName ||
                        userInfo?.['custom:CompanyName'];
    
    if (companyName) {
      return {
        success: true,
        company: {
          CompanyId: companyId,
          Name: companyName,
          Status: 'Active'
        },
        error: null
      };
    }
    
    return {
      success: false,
      company: null,
      error: error.message || "Failed to fetch company"
    };
  }
};

/**
 * How to use this service:
 * 
 * 1. First extract the company ID from the user's token:
 *    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
 *    const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
 *    const companyId = tokenPayload['custom:CompanyId'];
 * 
 * 2. Then call getCompanyById to fetch the company details:
 *    const companyDetails = await getCompanyById(companyId);
 * 
 * 3. Display company information in your UI components:
 *    if (companyDetails.success) {
 *      setCompanyName(companyDetails.company.Name);
 *    }
 */

/**
 * Extracts company ID from user token
 * @returns {string|null} The company ID if found in token
 */
export const getCompanyIdFromToken = () => {
  try {
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    if (!idToken) return null;
    
    const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
    const companyId = tokenPayload['custom:CompanyId'];
    
    if (companyId) {
      // Store for future use
      localStorage.setItem('companyId', companyId);
    }
    
    return companyId;
  } catch (error) {
    return null;
  }
};

/**
 * Gets the company name from the user's token or localStorage
 * @returns {string|null} The company name if available
 */
export const getCompanyNameFromToken = () => {
  try {
    // First try localStorage
    const storedCompanyName = localStorage.getItem('companyName');
    if (storedCompanyName) return storedCompanyName;
    
    // Then try userInfo in localStorage
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const companyNameFromUserInfo = userInfo?.companyName || userInfo?.['custom:CompanyName'];
    if (companyNameFromUserInfo) return companyNameFromUserInfo;
    
    // Finally try to extract directly from token
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    if (idToken) {
      const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
      const companyName = tokenPayload['custom:CompanyName'];
      if (companyName) return companyName;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};