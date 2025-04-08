/**
 * Utility file to test API endpoints directly
 */
import axios from 'axios';
import { getApiEndpoint } from './cognitoUtils';

// Function to test the /user endpoint directly
export const testUserEndpoint = async () => {
  // Get token from localStorage
  const token = localStorage.getItem('idToken');
  
  if (!token) {
    console.error('No token available for testing. Ensure you are logged in.');
    return { success: false, message: 'No token available' };
  }
  
  try {
    console.log('Testing /user endpoint directly with token:', token.substring(0, 10) + '...');
    
    // Create a direct request to the API Gateway
    const response = await axios.get(`${getApiEndpoint()}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Direct API response:', response.data);
    return { 
      success: true, 
      data: response.data
    };
  } catch (error: any) {
    console.error('API test error:', error);
    return {
      success: false,
      message: error.message,
      response: error.response?.data
    };
  }
};

// Function to inspect and log token from localStorage
export const inspectToken = () => {
  const token = localStorage.getItem('idToken');
  if (!token) {
    console.error('No token found in localStorage');
    return null;
  }
  
  // Log token info (DO NOT do this in production with real tokens)
  console.log('Token from localStorage:', {
    first10Chars: token.substring(0, 10) + '...',
    length: token.length,
    hasBearer: token.startsWith('Bearer ')
  });
  
  // Check if token has Bearer prefix (it shouldn't in localStorage)
  if (token.startsWith('Bearer ')) {
    console.warn('Token has Bearer prefix in localStorage - this is incorrect!');
  }
  
  return token;
};

// Export utility functions
export default {
  testUserEndpoint,
  inspectToken
};
