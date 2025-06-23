/**
 * Service for managing user invitations
 */
import axios from 'axios';
import { API_BASE_URL, API_HEADERS, getAuthHeaderValue } from '../config';

// Helper function to get authentication token
export const getAuthToken = () => {
  // First try to get the parsed token object
  const tokensString = localStorage.getItem('tokens');
  if (tokensString) {
    try {
      const tokens = JSON.parse(tokensString);
      if (tokens.idToken) {
        return tokens.idToken;
      }
    } catch (e) {
    }
  }
  
  // If that fails, try the individual token fields
  const idToken = localStorage.getItem('idToken');
  if (idToken) return idToken;
  
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) return accessToken;
  
  return null;
};

// Send invitation to a user
export const sendInvitation = async (email: string, companyId: string, role: string = 'User', invitedBy?: string) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication token missing');
  }
  
  try {
    // Important: Examining the Lambda function code:
    // 1. It expects the token as a query parameter named 'auth'
    // 2. It gets path/query parameters from the event object
    const auth = getAuthHeaderValue(token);
    
    // Match exactly what the Lambda expects in create_invitation function
    const payload = {
      email: email,
      companyId: companyId,
      role: role || 'User',
      invitedBy: invitedBy || ''
    };
    // Directly using the query string for auth as that's how the Lambda reads it
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/invitations?auth=${encodeURIComponent(auth)}`,
      data: payload,
      headers: API_HEADERS
    });
    return response.data;
  } catch (error: any) {
    // Add more detailed error logging
    if (error.response) {
    } else if (error.request) {
    } else {
    }
    
    throw error;
  }
};

// List invitations for a company - also update to use query param auth
export const listInvitations = async (companyId: string, status?: string) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication token missing');
  }
  
  try {
    const auth = getAuthHeaderValue(token);
    let url = `${API_BASE_URL}/invitations/${companyId}?auth=${encodeURIComponent(auth)}`;
    
    if (status) {
      url += `&status=${status}`;
    }
    
    const response = await axios.get(url, {
      headers: API_HEADERS
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Resend an invitation - update to use query param auth
export const resendInvitation = async (invitationId: string) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication token missing');
  }
  
  try {
    const auth = getAuthHeaderValue(token);
    const response = await axios.post(
      `${API_BASE_URL}/invitations/${invitationId}/resend?auth=${encodeURIComponent(auth)}`,
      {},
      {
        headers: API_HEADERS
      }
    );
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete an invitation - update to use query param auth
export const deleteInvitation = async (invitationId: string) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication token missing');
  }
  
  try {
    const auth = getAuthHeaderValue(token);
    const response = await axios.delete(
      `${API_BASE_URL}/invitations/${invitationId}?auth=${encodeURIComponent(auth)}`,
      {
        headers: API_HEADERS
      }
    );
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  sendInvitation,
  listInvitations,
  resendInvitation,
  deleteInvitation
};
