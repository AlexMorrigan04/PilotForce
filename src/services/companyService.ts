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
export const getCompanyById = async (companyId: string): Promise<CompanyResponse> => {
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
    console.error('Error getting company:', error);
    
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
export const getCompanyUsers = async (companyId: string): Promise<CompanyResponse> => {
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
    console.error('Error getting company users:', error);
    
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
export const updateCompany = async (companyId: string, updates: Partial<Company>): Promise<CompanyResponse> => {
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
    console.error('Error updating company:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update company',
      error
    };
  }
};

// Export the services
export default {
  getCompanyById,
  getCompanyUsers,
  updateCompany
};