/**
 * This utility script helps debug API Gateway configuration issues
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/invitationService';

export const testAPIGatewayConfig = async () => {
  const token = getAuthToken();
  
  if (!token) {
    return {
      success: false,
      message: 'No auth token available'
    };
  }
  
  // Try a simple OPTIONS request to check CORS
  try {
    const corsResponse = await axios({
      method: 'OPTIONS',
      url: `${API_BASE_URL}/invitations`,
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST'
      }
    });
  } catch (error) {
  }
  
  // Test a simple API call that should succeed
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/health-check`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return {
      success: true,
      message: 'API Gateway configuration is working',
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `API Gateway configuration may have issues: ${error.message}`,
      error: error
    };
  }
};

export default {
  testAPIGatewayConfig
};
