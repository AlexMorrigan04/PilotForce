import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
// Replace jsonwebtoken with jwt-decode for client-side use
import { secureStorage } from '../utils/secureStorage';
import { loginRateLimiter } from '../utils/rateLimiter';

// Define the shape of the authentication context
interface User {
  id: string;
  companyId: string;
  username: string;
  email: string;
  role?: string;  // Add role property to the User interface
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (username: string, password: string, email: string, companyId: string, phoneNumber: string) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  signIn: async () => {},
  signUp: async () => {},
  confirmSignUp: async () => {},
  loading: false,
  error: null,
});

// Export the hook for using the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Add password complexity validation function
  const validatePassword = (password: string): boolean => {
    // At least 8 chars, containing uppercase, lowercase, number and special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
  };

  useEffect(() => {
    // Load user from localStorage on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Replace JWT token generation with a simpler approach for browser environment
  const generateToken = (userData: User): string => {
    // Create a token with expiration time
    const token = {
      data: { ...userData },
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };
    
    // Base64 encode the token
    return btoa(JSON.stringify(token));
  };

  // Store tokens securely using our secure storage utility
  const storeToken = (token: string) => {
    secureStorage.setItem('authToken', {
      value: token,
      expiry: new Date().getTime() + (60 * 60 * 1000) // 1 hour
    });
  };

  const getStoredToken = (): string | null => {
    const tokenData = secureStorage.getItem('authToken');
    if (!tokenData) return null;
    
    if (new Date().getTime() > tokenData.expiry) {
      secureStorage.removeItem('authToken');
      return null;
    }
    
    return tokenData.value;
  };

  // Verify token
  const verifyToken = (token: string): User | null => {
    try {
      // Decode the base64 token
      const decoded = JSON.parse(atob(token));
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return decoded.data;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  };

  // Login function
  const handleSignIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Apply rate limiting
      if (!loginRateLimiter.checkLimit(username)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Instead of using Username-index, we'll scan the table and filter by username
      const params = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      };

      // Use scan instead of query since we don't have the specified index
      const data = await dynamoDb.scan(params).promise();
      
      if (data.Items && data.Items.length > 0) {
        const user = data.Items[0];
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        
        if (isPasswordValid) {
          // Check if user has access
          if (user.UserAccess === false) {
            throw new Error('Your account is pending approval. Please wait for admin approval.');
          }
          
          const userData = {
            id: user.UserId,
            companyId: user.CompanyId,
            username: user.Username,
            email: user.Email,
            role: user.UserRole || 'User'  // Include role in the user data
          };
          
          // Generate token and store it securely
          const token = generateToken(userData);
          storeToken(token);
          
          login(userData);
          return userData;
        } else {
          throw new Error('Invalid password');
        }
      } else {
        throw new Error('User not found');
      }
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    secureStorage.removeItem('user');
    secureStorage.removeItem('authToken');
  };

  // Signup function
  const handleSignUp = async (username: string, password: string, email: string, companyId: string, phoneNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check password complexity
      if (!validatePassword(password)) {
        throw new Error('Password does not meet complexity requirements.');
      }

      // First check if username already exists
      const checkParams = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      };

      const existingUsers = await dynamoDb.scan(checkParams).promise();
      if (existingUsers.Items && existingUsers.Items.length > 0) {
        throw new Error('Username already exists. Please choose another username.');
      }

      // Also check if email already exists
      const checkEmailParams = {
        TableName: 'Users',
        FilterExpression: 'Email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      };

      const existingEmails = await dynamoDb.scan(checkEmailParams).promise();
      if (existingEmails.Items && existingEmails.Items.length > 0) {
        throw new Error('Email already in use. Please use another email address.');
      }

      // Extract email domain for company matching
      const emailDomain = email.split('@')[1];
      
      // Generate user ID
      const userId = uuidv4();
      
      console.log(`Checking for all users with domain: ${emailDomain}`);
      
      // First check for ALL users with the same domain, so we can get the company ID
      const domainCheckParams = {
        TableName: 'Users',
        FilterExpression: 'contains(Email, :domain)',
        ExpressionAttributeValues: {
          ':domain': '@' + emailDomain
        }
      };
      
      const allDomainUsers = await dynamoDb.scan(domainCheckParams).promise();
      const existingDomainUsers = allDomainUsers.Items || [];
      
      console.log(`Found ${existingDomainUsers.length} users with domain ${emailDomain}`);
      
      // Then specifically look for admins with this domain
      const adminCheckParams = {
        TableName: 'Users',
        FilterExpression: 'contains(Email, :domain) AND (UserRole = :adminRole OR UserRole = :accountAdminRole) AND UserAccess = :access',
        ExpressionAttributeValues: {
          ':domain': '@' + emailDomain,
          ':adminRole': 'Admin',
          ':accountAdminRole': 'AccountAdmin',
          ':access': true // Must be approved admins
        }
      };
      
      const adminUsers = await dynamoDb.scan(adminCheckParams).promise();
      const existingAdmins = adminUsers.Items || [];
      
      console.log(`Found ${existingAdmins.length} admins with domain ${emailDomain}`);
      
      // Determine company ID, user role, and access status
      let userRole = 'User';
      let userAccess = false;
      let finalCompanyId = companyId; // Default to the provided companyId
      let isNewCompany = false;
      let adminEmailAddresses = [];
      
      if (existingDomainUsers.length > 0) {
        // Existing company - use the first user's company ID
        finalCompanyId = existingDomainUsers[0].CompanyId;
        console.log(`Using existing company ID: ${finalCompanyId}`);
        
        // Store admin emails for notification
        adminEmailAddresses = existingAdmins.map(admin => admin.Email || admin.email).filter(Boolean);
        console.log(`Admin emails to notify: ${adminEmailAddresses.join(', ')}`);
        
        // Check if there's an admin in this company
        if (existingAdmins.length > 0) {
          // Regular user in existing company with admin(s)
          userRole = 'User';
          // Users need admin approval
          userAccess = false;
          console.log(`User will join existing company as: ${userRole}`);
        } else {
          // No admin in this company yet - make this user an admin
          userRole = 'AccountAdmin';
          userAccess = false; // Still needs system admin approval
          console.log(`No admin found for existing company, setting user as: ${userRole}`);
        }
      } else {
        // New company - use the generated company ID
        userRole = 'AccountAdmin'; // First user becomes admin
        userAccess = false; // Need system admin approval
        isNewCompany = true;
        console.log(`Creating new company with ID: ${finalCompanyId}`);
      }

      // Use stronger bcrypt hashing
      const passwordHash = await bcrypt.hash(password, 12); // Increased from 10 to 12

      // Create the user with the appropriate company ID
      const params = {
        TableName: 'Users',
        Item: {
          UserId: userId,
          CompanyId: finalCompanyId,
          Username: username,
          Email: email,
          EmailDomain: emailDomain,
          PhoneNumber: phoneNumber,
          PasswordHash: passwordHash,
          UserRole: userRole,
          UserAccess: userAccess,
          CreatedAt: new Date().toISOString()
        }
      };

      await dynamoDb.put(params).promise();
      
      const userData = {
        id: userId,
        companyId: finalCompanyId,
        username,
        email,
        emailDomain,
        phoneNumber,
        role: userRole,
        adminEmails: adminEmailAddresses // Include admin emails for notification
      };
      
      login(userData);

      console.log(`User created successfully. IsNewCompany: ${isNewCompany}, AdminEmails: ${adminEmailAddresses.join(', ')}`);
      return { ...userData, isNewCompany };
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Confirm signup function
  const handleConfirmSignUp = async (username: string, code: string) => {
    try {
      setLoading(true);
      setError(null);

      // Find the user by username
      const findUserParams = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      };

      const userData = await dynamoDb.scan(findUserParams).promise();
      
      if (!userData.Items || userData.Items.length === 0) {
        throw new Error('User not found');
      }

      const user = userData.Items[0];

      // Update the user's status
      const params = {
        TableName: 'Users',
        Key: {
          UserId: user.UserId
        },
        UpdateExpression: 'set UserAccess = :access',
        ExpressionAttributeValues: {
          ':access': true
        }
      };

      await dynamoDb.update(params).promise();
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // The context value that will be provided
  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
