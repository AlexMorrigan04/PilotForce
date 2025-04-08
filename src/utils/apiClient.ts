import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { refreshToken } from '../services/authServices';

const API_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

/**
 * Creates an authenticated API client with token refresh handling
 */
export const createApiClient = () => {
  const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });

  // Request interceptor to add auth token
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('idToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If the error is due to an expired token (401) and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          console.log('Token appears invalid, attempting refresh...');
          const refreshResult = await refreshToken();
          
          if (refreshResult.success) {
            console.log('Token refreshed successfully, retrying request');
            // Update the auth header with the new token
            const newToken = localStorage.getItem('idToken');
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            }
          }
          
          // If refresh failed, reject with the original error
          return Promise.reject(error);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return Promise.reject(error);
        }
      }
      
      return Promise.reject(error);
    }
  );

  return apiClient;
};

// Export a singleton instance for convenience
export const apiClient = createApiClient();

/**
 * Makes an authenticated GET request with automatic token handling
 * @param endpoint API endpoint (without base URL)
 * @param params Optional query parameters
 * @param config Optional Axios config
 * @returns Promise with the response
 */
export const apiGet = async <T = any>(
  endpoint: string, 
  params?: Record<string, any>, 
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await apiClient.get<T>(endpoint, { 
      ...config,
      params
    });
    return response.data;
  } catch (error) {
    console.error(`API GET error for ${endpoint}:`, error);
    throw error;
  }
};

export default apiClient;
