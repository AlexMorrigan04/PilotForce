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
    return { success: false, message: 'No token available' };
  }
  
  try {
    
    // Create a direct request to the API Gateway
    const response = await axios.get(`${getApiEndpoint()}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return { 
      success: true, 
      data: response.data
    };
  } catch (error: any) {
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
    return null;
  }
  
  // Check if token has Bearer prefix (it shouldn't in localStorage)
  if (token.startsWith('Bearer ')) {
  }
  
  return token;
};

// Export utility functions
export default {
  testUserEndpoint,
  inspectToken
};
