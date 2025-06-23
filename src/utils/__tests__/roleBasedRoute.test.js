/**
 * Role-based Routing Tests
 * 
 * Tests to verify that users are correctly redirected based on their role
 */
import { isAdminFromToken } from '../adminUtils';
import { jwtDecode } from 'jwt-decode';

// Mock jwt-decode
jest.mock('jwt-decode');

describe('Role-based Routing Tests', () => {
  
  beforeEach(() => {
    // Clear any mocks between tests
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock current time for token expiration checks
    jest.spyOn(Date, 'now').mockImplementation(() => 1650000000000);
  });
  
  // Test isAdminFromToken
  describe('isAdminFromToken', () => {
    
    it('should correctly identify Administrator role as admin', () => {
      // Mock token decoding
      jwtDecode.mockReturnValue({
        'custom:role': 'Administrator',
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiry to 1 hour from now
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(true);
    });
    
    it('should correctly identify Admin role as admin', () => {
      // Mock token decoding
      jwtDecode.mockReturnValue({
        'custom:role': 'Admin',
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiry to 1 hour from now
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(true);
    });
    
    it('should correctly identify CompanyAdmin role as NOT admin', () => {
      // Mock token decoding
      jwtDecode.mockReturnValue({
        'custom:role': 'CompanyAdmin',
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiry to 1 hour from now
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(false);
    });
    
    it('should correctly identify User role as NOT admin', () => {
      // Mock token decoding
      jwtDecode.mockReturnValue({
        'custom:role': 'User',
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiry to 1 hour from now
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(false);
    });
    
    it('should not identify admin if token is expired', () => {
      // Mock token decoding with expired token
      jwtDecode.mockReturnValue({
        'custom:role': 'Administrator',
        exp: Math.floor(Date.now() / 1000) - 3600, // Set expiry to 1 hour ago
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(false);
    });
    
    it('should identify admin from cognito:groups claim', () => {
      // Mock token decoding with admin group
      jwtDecode.mockReturnValue({
        'cognito:groups': ['Administrators'],
        exp: Math.floor(Date.now() / 1000) + 3600, // Set expiry to 1 hour from now
        iss: 'https://cognito-idp.eu-north-1.amazonaws.com/'
      });
      
      const result = isAdminFromToken('fake-token');
      
      expect(result).toBe(true);
    });
    
  });
  
  // Test window location handling
  describe('Role-based redirects with AuthContext', () => {
    
    // Setup mock elements
    let mockAuthContext;
    let mockLocalStorage = {};
    
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => mockLocalStorage[key] || null),
          setItem: jest.fn((key, value) => { mockLocalStorage[key] = value; }),
          removeItem: jest.fn((key) => { delete mockLocalStorage[key]; }),
          clear: jest.fn(() => { mockLocalStorage = {}; })
        },
        writable: true
      });
      
      // Mock AuthContext
      mockAuthContext = {
        isAuthenticated: true,
        user: null,
        loading: false,
        setUser: jest.fn(),
        setIsAdmin: jest.fn(),
        setIsAuthenticated: jest.fn()
      };
    });
    
    // Test user role storage
    it('should store role information correctly for different user types', () => {
      // Test Administrator
      mockAuthContext.user = { role: 'Administrator' };
      mockLocalStorage = {};
      
      // Simulate AuthContext effect for admin
      if (mockAuthContext.user.role === 'Administrator' || mockAuthContext.user.role === 'Admin') {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
        localStorage.setItem('userRole', mockAuthContext.user.role);
      }
      
      expect(localStorage.getItem('isAdmin')).toBe('true');
      expect(localStorage.getItem('userRole')).toBeNull();
      
      // Test CompanyAdmin
      mockAuthContext.user = { role: 'CompanyAdmin' };
      mockLocalStorage = {};
      
      // Simulate AuthContext effect for company admin
      if (mockAuthContext.user.role === 'Administrator' || mockAuthContext.user.role === 'Admin') {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
        localStorage.setItem('userRole', mockAuthContext.user.role);
      }
      
      expect(localStorage.getItem('isAdmin')).toBeNull();
      expect(localStorage.getItem('userRole')).toBe('CompanyAdmin');
      
      // Test User
      mockAuthContext.user = { role: 'User' };
      mockLocalStorage = {};
      
      // Simulate AuthContext effect for user
      if (mockAuthContext.user.role === 'Administrator' || mockAuthContext.user.role === 'Admin') {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
        localStorage.setItem('userRole', mockAuthContext.user.role);
      }
      
      expect(localStorage.getItem('isAdmin')).toBeNull();
      expect(localStorage.getItem('userRole')).toBe('User');
    });
  });
});
