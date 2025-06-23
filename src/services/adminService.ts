import axios from 'axios';
import * as authManager from '../utils/authManager';
import { Booking } from '../types/booking';
import { API_BASE_URL as API_ENDPOINT } from '../utils/endpoints';

// API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || API_ENDPOINT;

// Initialize axios instance with common config
const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Add auth interceptor
adminApiClient.interceptors.request.use(async (config) => {
  try {
    const token = await authManager.getIdToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

// Add response interceptor for better error handling
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// Type definitions
export interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  CompanyId: string;
  Name: string;
  Status: string;
  UserCount: number;
  CreatedAt: string;
  EmailDomain?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  address: string;
  postcode: string;
  area: number;
  centerPoint: [number, number];
  coordinates: Array<Array<[number, number]>>;
  description: string;
  companyId: string;
  companyName: string;
  userId: string;
  username: string;
  tags: string[];
  registrationNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface FilterOptions {
  [key: string]: string | number | boolean | undefined;
}

export interface BookingsResponse {
  bookings: Booking[];
  count?: number;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  success?: boolean;
}

export interface ResourcesResponse {
  success: boolean;
  resources: Resource[];
  [key: string]: any;
}

export interface CompaniesResponse {
  success: boolean;
  companies: Company[];
  [key: string]: any;
}

export interface UsersResponse {
  success: boolean;
  users: any[];
  [key: string]: any;
}

export interface CompanyUser {
  userId: string;
  email: string;
  name: string;
  status: string;
  role: string;
  createdAt: string;
  invitationStatus: string;
}

export interface CompanyUsersResponse {
  success: boolean;
  company: Company;
  users: CompanyUser[];
  message?: string;
}

// Booking Management
export const getAllBookings = async (): Promise<BookingsResponse> => {
  try {
    const response = await adminApiClient.get('/admin/bookings');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
  }
};

export const getBooking = async (bookingId: string): Promise<ApiResponse<Booking>> => {
  try {
    const response = await adminApiClient.get(`/admin/bookings/${bookingId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch booking');
  }
};

export const updateBookingStatus = async (bookingId: string, status: string): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.put(`/admin/bookings/${bookingId}/status`, { status });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update booking status');
  }
};

export const deleteBooking = async (bookingId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.delete(`/admin/bookings/${bookingId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete booking');
  }
};

export const updateBookingQuote = async (bookingId: string, quote: { amount: number; currency: string; notes: string }): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.put(`/admin/bookings/${bookingId}/quote`, quote);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update booking quote');
  }
};

// Resource Management
export const getBookingResources = async (bookingId: string): Promise<ResourcesResponse> => {
  try {
    const response = await adminApiClient.get(`/admin/bookings/${bookingId}/resources`);
    
    // Use the URLs directly from the API response
    if (response.data.resources) {
      response.data.resources = response.data.resources.map((resource: any) => ({
        ...resource,
        resourceUrl: resource.resourceUrl || resource.url,
        thumbnailUrl: resource.thumbnailUrl || resource.url
      }));
    }
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch resources');
  }
};

export const uploadBookingResource = async (
  bookingId: string, 
  file: File, 
  onProgress?: (progress: number) => void
): Promise<ApiResponse<any>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await adminApiClient.post(
      `/admin/bookings/${bookingId}/resources`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to upload resource');
  }
};

export const deleteBookingResource = async (bookingId: string, resourceId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.delete(`/admin/bookings/${bookingId}/resources/${resourceId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete resource');
  }
};

// Company Management
export const getAllCompanies = async (): Promise<CompaniesResponse> => {
  try {
    const response = await adminApiClient.get('/admin/companies');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch companies');
  }
};

// User Management
export const getAllUsers = async (): Promise<UsersResponse> => {
  try {
    const response = await adminApiClient.get('/admin/users');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

// Asset Management
export const getAllAssets = async (filters: FilterOptions = {}): Promise<{ assets: Asset[] }> => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    
    const response = await adminApiClient.get(`/admin/assets?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch assets');
  }
};

export const getAssetById = async (assetId: string): Promise<ApiResponse<Asset>> => {
  try {
    const response = await adminApiClient.get(`/admin/assets/${assetId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch asset');
  }
};

export const createAsset = async (assetData: Asset): Promise<ApiResponse<Asset>> => {
  try {
    const response = await adminApiClient.post('/admin/assets', assetData);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create asset');
  }
};

export const updateAsset = async (assetId: string, assetData: Partial<Asset>): Promise<ApiResponse<Asset>> => {
  try {
    const response = await adminApiClient.put(`/admin/assets/${assetId}`, assetData);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update asset');
  }
};

export const deleteAsset = async (assetId: string): Promise<ApiResponse<void>> => {
  try {
    const response = await adminApiClient.delete(`/admin/assets/${assetId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete asset');
  }
};

// Company Management
export const createCompany = async (companyData: Partial<Company>): Promise<ApiResponse<Company>> => {
  try {
    const response = await adminApiClient.post('/admin/companies', companyData);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create company');
  }
};

export const deleteCompany = async (companyId: string): Promise<ApiResponse<void>> => {
  try {
    const response = await adminApiClient.delete(`/admin/companies/${companyId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete company');
  }
};

// Resource Management
export const getAllResources = async (): Promise<ResourcesResponse> => {
  try {
    const response = await adminApiClient.get('/admin/resources');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch resources');
  }
};

export const createResourceFolder = async (bookingId: string, folderName: string): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.post(`/admin/bookings/${bookingId}/folders`, { name: folderName });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create resource folder');
  }
};

export const getResourceDownloadUrl = async (resourceId: string): Promise<string> => {
  try {
    const response = await adminApiClient.get(`/admin/resources/${resourceId}/download`);
    return response.data.url;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get resource download URL');
  }
};

export const getCompanyUsers = async (companyId: string): Promise<CompanyUsersResponse> => {
  try {
    const response = await adminApiClient.get(`/admin/companies/${companyId}/users`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get company users');
  }
};

export const sendInvitation = async (email: string, companyId: string, role: string, invitedBy: string): Promise<ApiResponse<any>> => {
  try {
    const response = await adminApiClient.post('/invitations', {
      email,
      companyId,
      role,
      invitedBy
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send invitation');
  }
};

/**
 * Fetch system security logs for the admin logs page
 */
export const getSystemLogs = async ({ page = 1, pageSize = 20, filter = '' }): Promise<{ logs: any[]; total: number }> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      filter
    });
    const response = await fetch(`${API_BASE_URL}/admin/security-logs?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch system logs');
    return await response.json();
  } catch (err: any) {
    return { logs: [], total: 0 };
  }
};

// Export all functions
export default {
  getAllBookings,
  getBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingResources,
  uploadBookingResource,
  deleteBookingResource,
  getAllCompanies,
  createCompany,
  deleteCompany,
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAllUsers,
  getAllResources,
  createResourceFolder,
  getResourceDownloadUrl,
  getCompanyUsers,
  updateBookingQuote,
  sendInvitation,
  getSystemLogs
};