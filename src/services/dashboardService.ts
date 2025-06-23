// This file provides a direct company name fetching function for the Dashboard component
import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';

// Create a dedicated axios instance for company requests
const dashboardApi = axios.create({
  baseURL: getApiEndpoint(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests when available
dashboardApi.interceptors.request.use(config => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Get company name from API Gateway (for Dashboard component)
 * This is a standalone implementation independent from companyService
 * @param companyId The company ID to look up
 * @returns The company name or null if not found
 */
export const fetchCompanyNameFromAPI = async (companyId: string): Promise<string | null> => {
  if (!companyId) {
    return null;
  }
  try {
    // Configure headers with auth token
    const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const token = idToken || accessToken || null;
    
    if (token) {
      dashboardApi.defaults.headers.common['Authorization'] = token.startsWith('Bearer ') 
        ? token 
        : `Bearer ${token}`;
    }
    
    // Call the API endpoint
    const response = await dashboardApi.get(`/companies/${companyId}`);
    // Extract company name from response
    let data = response.data;
    
    // Log the raw response structure for debugging
    // Handle Lambda proxy integration format
    if (response.data?.body && typeof response.data.body === 'string') {
      try {
        data = JSON.parse(response.data.body);
      } catch (e) {
      }
    } else if (response.data?.body && typeof response.data.body === 'object') {
      data = response.data.body;
    }
    
    // Helper function to safely extract nested values
    const extractValue = (obj: any, ...paths: string[]): string | null => {
      for (const path of paths) {
        const keys = path.split('.');
        let current = obj;
        
        let found = true;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            found = false;
            break;
          }
        }
        
        if (found && current && typeof current === 'string') {
          return current;
        }
      }
      return null;
    };
    
    // Try to get company name from various possible locations in the response
    // The Lambda function normalizes 'companyname' to 'Name' with capital N
    const companyName = extractValue(
      data,
      'company.Name',                // The most likely path based on Lambda implementation
      'company.CompanyName',
      'company.name',
      'company.companyName',
      'Name',
      'CompanyName',
      'name',
      'companyName'
    );
    
    if (companyName) {
      return companyName;
    }
    
    // If no company name found, check if we have a company object at all
    if (data?.company) {
      // If we have any property in the company object, try to use that as fallback
      const companyKeys = Object.keys(data.company);
      // Last resort: try any string property that might contain "name" or be somewhat appropriate
      for (const key of companyKeys) {
        const value = data.company[key];
        if (typeof value === 'string' && (key.toLowerCase().includes('name') || 
            ['title', 'label', 'organization', 'org'].includes(key.toLowerCase()))) {
          return value;
        }
      }
    } else {
    }
    
    return null;
  } catch (error: any) {
    return null;
  }
};
