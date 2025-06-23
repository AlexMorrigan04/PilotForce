// Role detection test cases
const adminUtils = require('../adminUtils');
const authUtils = require('../authUtils');

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Admin role detection tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  
  // Test user roles using the isAdminFromToken function
  test('Role "Administrator" should be detected as admin', () => {
    // Mock token with Administrator role
    const mockToken = {
      'custom:role': 'Administrator',
      sub: 'user123',
      email_verified: true,
      iss: 'https://cognito-idp.eu-north-1.amazonaws.com/',
      'cognito:username': 'testuser'
    };
    
    // Set up the decoded token
    jest.spyOn(require('jwt-decode'), 'jwtDecode').mockReturnValue(mockToken);
    
    // Call the admin detection function
    const result = adminUtils.isAdminFromToken('fake-token');
    
    // Should be true for Administrator
    expect(result).toBe(true);
  });
  
  test('Role "CompanyAdmin" should NOT be detected as admin', () => {
    // Mock token with CompanyAdmin role
    const mockToken = {
      'custom:role': 'CompanyAdmin',
      sub: 'user123',
      email_verified: true,
      iss: 'https://cognito-idp.eu-north-1.amazonaws.com/',
      'cognito:username': 'testuser'
    };
    
    // Set up the decoded token
    jest.spyOn(require('jwt-decode'), 'jwtDecode').mockReturnValue(mockToken);
    
    // Call the admin detection function
    const result = adminUtils.isAdminFromToken('fake-token');
    
    // Should be false for CompanyAdmin
    expect(result).toBe(false);
  });
  
  test('Role "User" should NOT be detected as admin', () => {
    // Mock token with User role
    const mockToken = {
      'custom:role': 'User',
      sub: 'user123',
      email_verified: true,
      iss: 'https://cognito-idp.eu-north-1.amazonaws.com/',
      'cognito:username': 'testuser'
    };
    
    // Set up the decoded token
    jest.spyOn(require('jwt-decode'), 'jwtDecode').mockReturnValue(mockToken);
    
    // Call the admin detection function
    const result = adminUtils.isAdminFromToken('fake-token');
    
    // Should be false for User
    expect(result).toBe(false);
  });
});
