import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  signUp, 
  confirmSignUp, 
  resendSignUpCode, 
  getCurrentUser,
  fetchAuthSession
} from '@aws-amplify/auth';
import { extractEmailDomain, getCompanyNameFromDomain } from '../utils/emailUtils';

const API_BASE_URL = 'https://api.example.com';

/**
 * Processes a user's registration with company
 * 
 * @param {Object} userData User data including email
 * @returns {Promise<Object>} Company data
 */
export const registerUserWithCompany = async (userData) => {
  try {
    const response = await apiPost('/companies/register', { email: userData.email });
    
    if (response && response.company) {
      return response.company;
    }
    
    throw new Error('Company registration failed');
  } catch (error) {
    console.error('Error registering with company:', error);
    throw error;
  }
};

/**
 * Complete signup process
 * @param {string} email 
 * @param {string} password 
 * @param {object} userAttributes 
 */
export const registerUser = async (email, password, userAttributes = {}) => {
  try {
    console.log('Signing up with email:', email);
    
    const signUpResult = await signUp({
      username: email,
      password,
      attributes: {
        email,
        ...userAttributes
      }
    });
    
    return signUpResult;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Helper function for API POST requests
 * @param {string} endpoint 
 * @param {Object} data 
 * @param {string|null} token 
 * @returns {Promise<Object>}
 */
const apiPost = async (endpoint, data, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
};

/**
 * Get current session
 * @returns {Promise<Object|null>}
 */
const getCurrentSession = async () => {
  try {
    return await fetchAuthSession();
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};