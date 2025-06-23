/**
 * API Debugging Utility
 * 
 * This file contains functions to help debug API responses and connections
 */

import axios from 'axios';
import { getApiEndpoint } from './cognitoUtils';

/**
 * Debug the Lambda company API response to see exactly what data structure is being returned
 * @param companyId Company ID to test with
 */
export const debugCompanyApi = async (companyId: string): Promise<void> => {
  if (!companyId) {
    return;
  }
  try {
    // Get auth token
    const idToken = localStorage.getItem('idToken') || 
                  sessionStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken') || 
                      sessionStorage.getItem('accessToken');
    const token = idToken || accessToken;
    
    if (!token) {
    } else {
    }
    
    // Create API client
    const api = axios.create({
      baseURL: getApiEndpoint(),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    // Make the API call
    const response = await api.get(`/companies/${companyId}`);
    // Parse the response if it's in Lambda proxy format
    if (response.data?.body && typeof response.data.body === 'string') {
      try {
        const parsedBody = JSON.parse(response.data.body);
        // Check for company data
        if (parsedBody.company) {
          // Look for name property
          const nameProperty = 
            parsedBody.company.Name || 
            parsedBody.company.CompanyName || 
            parsedBody.company.name || 
            parsedBody.company.companyName;
          
          if (nameProperty) {
          } else {
          }
        } else {
        }
      } catch (e) {
      }
    } else if (response.data?.body && typeof response.data.body === 'object') {
      // Check for company data
      if (response.data.body.company) {
        // Look for name property
        const nameProperty = 
          response.data.body.company.Name || 
          response.data.body.company.CompanyName || 
          response.data.body.company.name || 
          response.data.body.company.companyName;
        
        if (nameProperty) {
        } else {
        }
      } else {
      }
    } else {
      // Check for direct company property
      if (response.data?.company) {
        // Look for name property
        const nameProperty = 
          response.data.company.Name || 
          response.data.company.CompanyName || 
          response.data.company.name || 
          response.data.company.companyName;
        
        if (nameProperty) {
        } else {
        }
      } else {
      }
    }
  } catch (error: any) {
    if (error.response) {
    }
  }
};

/**
 * Add this function to a button in the Dashboard to test the API
 */
export const addApiDebugButton = (parentElement: HTMLElement, companyId: string): void => {
  const button = document.createElement('button');
  button.innerText = 'Debug Company API';
  button.className = 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded';
  button.onclick = () => debugCompanyApi(companyId);
  
  parentElement.appendChild(button);
};

export default {
  debugCompanyApi,
  addApiDebugButton
};
