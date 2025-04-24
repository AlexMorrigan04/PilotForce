import { API } from 'aws-amplify';
import { extractEmailDomain, getCompanyNameFromDomain } from '../utils/emailUtils';

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
    
    const response = await API.get('PilotForceAPI', `/companies/domain/${encodedDomain}`);
    
    if (response && response.company) {
      return response.company;
    }
    return null;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Company not found
    }
    throw error;
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
    
    const response = await API.post('PilotForceAPI', '/companies/register', {
      body: { email }
    });
    
    
    if (response && response.company) {
      return response.company;
    }
    
    console.warn('Company registration returned unexpected response:', response);
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
    
    console.warn('Create company returned unexpected response:', response);
    throw new Error('Create company did not return expected data');
  } catch (error) {
    throw error;
  }
};