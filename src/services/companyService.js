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
    console.log('getOrCreateCompany called with email:', userEmail);
    const emailDomain = extractEmailDomain(userEmail);
    
    if (!emailDomain) {
      throw new Error('Invalid email format');
    }
    
    console.log('Extracted domain:', emailDomain);
    
    // First try to get existing company
    try {
      const existingCompany = await getCompanyByDomain(emailDomain);
      
      if (existingCompany) {
        console.log('Found existing company:', existingCompany);
        return existingCompany;
      }
    } catch (lookupError) {
      console.log('Error looking up company, will try to create:', lookupError);
    }
    
    // If not found, create a new company
    console.log('No existing company found, creating new one');
    const companyName = getCompanyNameFromDomain(emailDomain);
    
    // Try the company register API endpoint first
    try {
      const registeredCompany = await registerUserWithCompany(userEmail);
      if (registeredCompany) {
        console.log('Successfully registered with company:', registeredCompany);
        return registeredCompany;
      }
    } catch (registerError) {
      console.log('Error with registration endpoint, will try direct creation:', registerError);
    }
    
    // Fall back to direct company creation
    return await createCompany(emailDomain, companyName);
  } catch (error) {
    console.error('Error in company processing:', error);
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
    console.log(`Looking up company with domain: ${emailDomain}`);
    const encodedDomain = encodeURIComponent(emailDomain);
    console.log(`Making API call to: /companies/domain/${encodedDomain}`);
    
    const response = await API.get('PilotForceAPI', `/companies/domain/${encodedDomain}`);
    console.log('API response from domain lookup:', response);
    
    if (response && response.company) {
      console.log(`Found company:`, response.company);
      return response.company;
    }
    console.log(`No company found for domain: ${emailDomain}`);
    return null;
  } catch (error) {
    console.error('Error looking up company by domain:', error);
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
    console.log(`Registering user with company for email: ${email}`);
    
    const response = await API.post('PilotForceAPI', '/companies/register', {
      body: { email }
    });
    
    console.log('Company registration response:', response);
    
    if (response && response.company) {
      return response.company;
    }
    
    console.warn('Company registration returned unexpected response:', response);
    throw new Error('Company registration did not return expected data');
  } catch (error) {
    console.error('Error registering user with company:', error);
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
    console.log(`Creating company with domain: ${emailDomain}, name: ${companyName || '(derived from domain)'}`);
    
    const response = await API.post('PilotForceAPI', '/companies', {
      body: {
        EmailDomain: emailDomain,
        CompanyName: companyName || getCompanyNameFromDomain(emailDomain)
      }
    });
    
    console.log('Create company response:', response);
    
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
    console.error('Error creating company:', error);
    throw error;
  }
};