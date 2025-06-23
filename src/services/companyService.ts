import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';

// Get the API endpoint from environment variables or use the default
const API_URL = getApiEndpoint();

// Create a dedicated axios instance for company requests
const companyApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests when available
companyApi.interceptors.request.use(config => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interface for company data
export interface Company {
  CompanyId: string;
  CompanyName: string;
  EmailDomain: string;
  OwnerUserId: string;
  CreatedAt: string;
  UpdatedAt: string;
  Status: string;
  [key: string]: any;
}

// Interface for user data
export interface User {
  UserId: string;
  Username: string;
  Email: string;
  Name: string;
  CompanyId: string;
  UserRole: string;
  Status: string;
  [key: string]: any;
}

// Interface for standardized response
export interface CompanyResponse {
  success: boolean;
  message?: string;
  company?: Company;
  users?: User[];
  count?: number;
  error?: any;
}

/**
 * Get company details by ID
 */
const getCompanyById = async (companyId: string): Promise<CompanyResponse> => {
  try {
    const response = await companyApi.get(`/companies/${companyId}`);
    
    // Parse the response
    let data = response.data;
    if (response.data.body && typeof response.data.body === 'string') {
      data = JSON.parse(response.data.body);
    }
    
    return {
      success: true,
      company: data.company,
      message: data.message || 'Company retrieved successfully'
    };
  } catch (error: any) {
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to retrieve company',
      error
    };
  }
};

/**
 * Get users for a company
 */
const getCompanyUsers = async (companyId: string): Promise<CompanyResponse> => {
  try {
    const response = await companyApi.get(`/companies/${companyId}/users`);
    
    // Parse the response
    let data = response.data;
    if (response.data.body && typeof response.data.body === 'string') {
      data = JSON.parse(response.data.body);
    }
    
    return {
      success: true,
      users: data.users || [],
      count: data.count || 0,
      message: data.message || 'Company users retrieved successfully'
    };
  } catch (error: any) {
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to retrieve company users',
      error
    };
  }
};

/**
 * Update company details
 */
const updateCompany = async (companyId: string, updates: Partial<Company>): Promise<CompanyResponse> => {
  try {
    const response = await companyApi.put(`/companies/${companyId}`, updates);
    
    // Parse the response
    let data = response.data;
    if (response.data.body && typeof response.data.body === 'string') {
      data = JSON.parse(response.data.body);
    }
    
    return {
      success: true,
      message: data.message || 'Company updated successfully'
    };
  } catch (error: any) {
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update company',
      error
    };
  }
};

/**
 * Get company name from API Gateway (renamed to avoid conflict with utility function)
 * This is a simplified version that just returns the company name
 */
const fetchCompanyNameFromAPI = async (companyId: string): Promise<string | null> => {
  if (!companyId) {
    return null;
  }
  try {
    // Get all possible auth tokens - try all available storage locations
    const idToken = localStorage.getItem('idToken') || 
                  sessionStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken') || 
                      sessionStorage.getItem('accessToken');
    const bearerToken = localStorage.getItem('bearerToken') || 
                      sessionStorage.getItem('bearerToken');
    const token = idToken || accessToken || bearerToken;
    
    if (!token) {
    } else {
    }
    
    // Configure headers and auth for the API call
    if (token) {
      companyApi.defaults.headers.common['Authorization'] = token.startsWith('Bearer ') 
        ? token 
        : `Bearer ${token}`;
    }
    
    // First try the standard endpoint
    const response = await companyApi.get(`/companies/${companyId}`);
    // Log the raw response structure for debugging
    // Parse the response with better handling of all possible formats
    let data = response.data;
    let parsedFromString = false;
    
    // STEP 1: Handle Lambda proxy integration response format
    if (response.data && typeof response.data === 'object') {
      // Case 1: Lambda proxy returns object with stringified body
      if (response.data.body && typeof response.data.body === 'string') {
        try {
          data = JSON.parse(response.data.body);
          parsedFromString = true;
        } catch (e) {
        }
      }
      
      // Case 2: API Gateway might automatically parse the Lambda response body
      if (!parsedFromString && response.data.body && typeof response.data.body === 'object') {
        data = response.data.body;
      }
    }
    
    // STEP 2: Extract company name by checking all possible locations
    
    // Deep-extract function to safely navigate nested objects
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
    
    // Check all possible paths where the company name could be
    const companyName = extractValue(
      data,
      'company.Name',
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
    
    // If still no company name, check if we need to go one level deeper
    // (for doubly-nested API Gateway responses)
    if (data.data) {
      const nestedCompanyName = extractValue(
        data.data,
        'company.Name',
        'company.CompanyName',
        'company.name',
        'company.companyName',
        'Name',
        'CompanyName',
        'name',
        'companyName'
      );
      
      if (nestedCompanyName) {
        return nestedCompanyName;
      }
    }
    
    // STEP 3: Try alternative endpoint if the first one doesn't return the name
    try {
      const altResponse = await companyApi.get(`/companies?companyId=${companyId}`);
      let altData = altResponse.data;
      
      // Handle string body
      if (altResponse.data.body && typeof altResponse.data.body === 'string') {
        try {
          altData = JSON.parse(altResponse.data.body);
        } catch (e) {
        }
      } else if (altResponse.data.body && typeof altResponse.data.body === 'object') {
        altData = altResponse.data.body;
      }
      
      // Check all possible paths in the alternative endpoint response
      const altCompanyName = extractValue(
        altData,
        'company.Name',
        'company.CompanyName',
        'company.name',
        'company.companyName',
        'Name',
        'CompanyName',
        'name',
        'companyName'
      );
      
      if (altCompanyName) {
        return altCompanyName;
      }
    } catch (altError) {
      // Log alternative endpoint errors but continue
    }
    return null;
  } catch (error: any) {
    // Enhanced error handling with more details
    // Log detailed error information to help with debugging
    if (error.response) {
    } else if (error.request) {
    } else {
    }
    
    return null;
  }
};

// Named exports for each service function
export {
  getCompanyById,
  getCompanyUsers,
  updateCompany
};