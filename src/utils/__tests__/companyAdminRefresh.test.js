/**
 * CompanyAdmin Token Refresh Tests
 * 
 * This file contains tests to verify the correct behavior of token refresh 
 * and role detection for CompanyAdmin users.
 */

import { refreshToken } from '../../services/authServices';
import { isCompanyAdmin } from '../roleDetection';
import { getRefreshToken } from '../sessionPersistence';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key]),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAll: () => store
  };
})();

// Mock fetch for refreshToken function
global.fetch = jest.fn();

describe('CompanyAdmin Token Refresh', () => {
  beforeEach(() => {
    global.localStorage = localStorageMock;
    localStorage.clear();
    jest.clearAllMocks();
  });
  
  test('isCompanyAdmin correctly identifies CompanyAdmin role', () => {
    expect(isCompanyAdmin('CompanyAdmin')).toBe(true);
    expect(isCompanyAdmin('companyadmin')).toBe(true);
    expect(isCompanyAdmin('COMPANYADMIN')).toBe(true);
    expect(isCompanyAdmin('Administrator')).toBe(false);
    expect(isCompanyAdmin('User')).toBe(false);
    expect(isCompanyAdmin(null)).toBe(false);
    expect(isCompanyAdmin(undefined)).toBe(false);
  });

  test('getRefreshToken returns token from localStorage', () => {
    const testToken = 'test-refresh-token';
    localStorage.setItem('refreshToken', testToken);
    
    expect(getRefreshToken()).toBe(testToken);
  });
  
  test('refreshToken handles CompanyAdmin users correctly', async () => {
    // Setup
    const mockRefreshToken = 'mock-refresh-token';
    const mockUsername = 'company-admin-user';
    const mockIdToken = 'new-id-token';
    const mockAccessToken = 'new-access-token';
    
    localStorage.setItem('refreshToken', mockRefreshToken);
    localStorage.setItem('auth_username', mockUsername);
    localStorage.setItem('userRole', 'CompanyAdmin');
    localStorage.setItem('isCompanyAdmin', 'true');
    
    // Mock successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        success: true,
        idToken: mockIdToken,
        accessToken: mockAccessToken
      })
    });
    
    // Call the function
    const result = await refreshToken();
    
    // Verify
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('idToken')).toBe(mockIdToken);
    expect(localStorage.getItem('accessToken')).toBe(mockAccessToken);
  });
  
  test('refreshToken handles CompanyAdmin user deleted error', async () => {
    // Setup
    const mockRefreshToken = 'mock-refresh-token';
    const mockUsername = 'deleted-company-admin';
    const mockEmail = 'admin@company.com';
    
    localStorage.setItem('refreshToken', mockRefreshToken);
    localStorage.setItem('auth_username', mockUsername);
    localStorage.setItem('userRole', 'CompanyAdmin');
    localStorage.setItem('isCompanyAdmin', 'true');
    localStorage.setItem('auth_email', mockEmail);
    
    // Mock error response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'The user has been deleted for the associated refresh token'
    });
    
    // Call the function
    const result = await refreshToken();
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('USER_DELETED_ERROR');
  });
});
