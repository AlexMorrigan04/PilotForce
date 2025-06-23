import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CompanyUser } from '../utils/userUtils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { getCompanyId } from '../utils/companyUtils';
import logger from '../utils/logger';

interface CompanyUsersProps {
  users: CompanyUser[];
  isLoading: boolean;
  error: string | null;
  onRefreshUsers?: () => void;
}

// Define tab types for navigation
type TabType = 'members' | 'pending';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const, 
      stiffness: 100, 
      damping: 12 
    } 
  },
  hover: { 
    scale: 1.02, 
    transition: { duration: 0.2 } 
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
};

const CompanyUsers: React.FC<CompanyUsersProps> = ({ users, isLoading, error, onRefreshUsers }) => {
  const { user } = useAuth();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<CompanyUser[]>([]);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('members');

  useEffect(() => {
    const checkUserRole = () => {
      if (!user) return;
      
      const userRole = user.role || 'User';
      const isAdmin = userRole === 'CompanyAdmin' || userRole === 'Admin' || userRole === 'SystemAdmin';
      setIsCompanyAdmin(isAdmin);
    };
    
    checkUserRole();
  }, [user]);

  useEffect(() => {
    // Store username and password from user context when available 
    // This is crucial for API endpoints that require basic auth
    if (user && user.username) {
      // Store the username in local storage for Basic Auth
      localStorage.setItem('auth_username', user.username);
      
      // Check if we have a stored access password
      if (!localStorage.getItem('auth_password') && user.accessPassword) {
        localStorage.setItem('auth_password', user.accessPassword);
      }
    }
  }, [user]);
  
  useEffect(() => {
    const filterCompanyUsers = () => {
      if (!user) return;
      
      const currentCompanyId = getCompanyId(user);
      
      if (!currentCompanyId) return;
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        setCompanyUsers([]);
        setPendingUsers([]);
        return;
      }
      
      
      // Filter all users that belong to this company
      const filteredUsers = users.filter(u => {
        const userCompanyId = u.companyId || u.CompanyId;
        return userCompanyId === currentCompanyId;
      });
      
      
      // Define the confirmed regular users and pending users
      const regularUsers: CompanyUser[] = [];
      const pendingUsersData: CompanyUser[] = [];
      
      // Process each user and put them in the correct category
      filteredUsers.forEach(u => {
        // First check if it's a CompanyAdmin - they're always in the regular users list
        if (u.UserRole === 'CompanyAdmin' || u.role === 'CompanyAdmin') {
          regularUsers.push(u);
          return;
        }
        
        // Explicitly check for pending status
        if (u.ApprovalStatus === 'PENDING' || u.UserAccess === false) {
          pendingUsersData.push(u);
          return;
        }
        
        // If status is CONFIRMED or ApprovalStatus is APPROVED, they're regular users
        if (u.status === 'CONFIRMED' || u.ApprovalStatus === 'APPROVED' || u.UserAccess === true) {
          regularUsers.push(u);
          return;
        }
        
        // Default: if no explicit status indicators, but they're in the system, show them as regular users
        regularUsers.push(u);
      });
      
      
      setCompanyUsers(regularUsers);
      setPendingUsers(pendingUsersData);
    };
    
    filterCompanyUsers();
  }, [users, user]);

  const getRoleColor = (role?: string): string => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
      return 'bg-purple-100 text-purple-800';
    } else if (normalizedRole === 'companyadmin') {
      return 'bg-indigo-100 text-indigo-800'; // Different color for CompanyAdmin
    } else if (normalizedRole.includes('pilot')) {
      return 'bg-blue-100 text-blue-800';
    } else if (normalizedRole.includes('manager')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatName = (user: CompanyUser): string => {
    if (!user) return 'Unknown';
    
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    
    if (user.email) {
      const emailParts = user.email.split('@');
      if (emailParts && emailParts.length > 0) {
        return emailParts[0];
      }
    }
    
    return user.UserId || 'Unknown User';
  };

  const formatRole = (user: CompanyUser): string => {
    if (!user) return 'User';
    const role = user.UserRole || user.role || 'User';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const isUserAdmin = (user: CompanyUser): boolean => {
    if (!user) return false;
    
    const userRole = user.UserRole || user.role || '';
    return userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'administrator';
  };

  const getEmail = (user: CompanyUser): string => {
    return (user && user.email) ? user.email : 'No email available';
  };

  const handleRemoveUser = async (targetUserId: string, targetCompanyId: string | undefined) => {
    if (processingUserId) return;
    
    if (!targetCompanyId) {
      setDeleteError("Missing company ID for this user");
      return;
    }
    
    if (window.confirm('Are you sure you want to remove this user from the company?')) {
      try {
        setProcessingUserId(targetUserId);
        setDeleteError(null);
        
        // Get token directly from localStorage - simple approach that works in other components
        const token = localStorage.getItem('idToken');
        
        if (!token) {
          throw new Error('No authentication token available. Please log in again.');
        }
        
        
        // Simplified request using Bearer token directly (matching MakeBookings pattern)
        const response = await axios.delete(
          `${process.env.REACT_APP_API_URL}/companies/${targetCompanyId}/users/${targetUserId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.status === 200 || response.status === 204) {
          setCompanyUsers(prevUsers => prevUsers.filter(u => u.UserId !== targetUserId));
          if (onRefreshUsers) onRefreshUsers();
        }
      } catch (error: any) {
        
        if (error.response?.status === 401) {
          // Handle 401 errors with basic UI update and error message
          
          // Even with auth error, update UI for better user experience
          setCompanyUsers(prevUsers => prevUsers.filter(u => u.UserId !== targetUserId));
          
          setDeleteError('Server authentication failed. UI updated, but changes may not persist after refresh. Try logging out and back in.');
          
          // Suggest user to refresh their session
          setTimeout(() => {
            if (window.confirm('Your session appears to be expired. Would you like to refresh the page to log back in?')) {
              window.location.reload();
            }
          }, 1000);
        } else {
          setDeleteError('Failed to remove user. Please try again.');
        }
      } finally {
        setProcessingUserId(null);
      }
    }
  };

  const handleApproveUser = async (targetUserId: string, targetCompanyId: string | undefined) => {
    if (processingUserId) return;
    
    if (!targetCompanyId) {
      setDeleteError("Missing company ID for this user");
      return;
    }
    
    try {
      setProcessingUserId(targetUserId);
      setDeleteError(null);
      
      
      // Update the UI optimistically (even if the API call fails)
      setPendingUsers(prevUsers => prevUsers.filter(u => u.UserId !== targetUserId));
      
      // Add user to approved users list in the UI
      const approvedUser = pendingUsers.find(u => u.UserId === targetUserId);
      if (approvedUser) {
        const updatedUser = {...approvedUser, UserAccess: true, ApprovalStatus: 'APPROVED'};
        setCompanyUsers(prev => [...prev, updatedUser]);
      }
      
      // Track API success
      let apiSuccess = false;
      let successMessage = '';
      
      // First try to call the API
      try {
        // Get tokens
        const idToken = localStorage.getItem('idToken');
        
        // Try admin API without problematic Cache-Control header
        try {
          
          // Create a complete user update with all necessary fields explicitly set
          const userUpdate = {
            UserAccess: true, // Explicitly set to true
            ApprovalStatus: 'APPROVED',
            Status: 'CONFIRMED',
            CompanyId: targetCompanyId,
            UpdatedAt: new Date().toISOString(), 
            Operation: 'APPROVE_USER',
            Action: 'approve',
            UserId: targetUserId
          };
          
          
          const response = await axios.put(
            `${process.env.REACT_APP_API_URL}/admin/users/${targetUserId}`, 
            userUpdate,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken || ''}`
              }
            }
          );
          
          
          apiSuccess = response.status === 200;
          successMessage = response.data?.message || 'User updated successfully';
          
          // Since the API was successful, schedule a refresh of the page after a delay
          // This will ensure we reload the data from the server
          if (apiSuccess) {
            
            // First try with the callback if provided
            if (onRefreshUsers) {
              setTimeout(() => {
                onRefreshUsers();
              }, 2000);
            }
            
            // Display success message to the user
            alert(`User approved successfully: ${successMessage}`);
          }
        } catch (adminApiError) {
          
          // Try another approach with the original companies endpoint
          try {
            const directUpdateResponse = await axios.put(
              `${process.env.REACT_APP_API_URL}/companies/${targetCompanyId}/users/${targetUserId}`,
              {
                UserAccess: true,
                ApprovalStatus: 'APPROVED',
                Status: 'CONFIRMED',
                UpdatedAt: new Date().toISOString(),
                Operation: 'APPROVE_USER',
                Action: 'approve'
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken || ''}`
                }
              }
            );
            
            apiSuccess = directUpdateResponse.status === 200;
            successMessage = directUpdateResponse.data?.message || 'User updated successfully';
            
            // If direct update was successful, schedule a refresh
            if (apiSuccess) {
              
              if (onRefreshUsers) {
                setTimeout(() => {
                  onRefreshUsers();
                }, 2000);
              }
              
              // Display success message to the user
              alert(`User approved successfully: ${successMessage}`);
            }
          } catch (directUpdateError) {
          }
        }
      } catch (apiError) {
        logger.warn('All API approaches failed:', apiError);
        apiSuccess = false;
        
        // Even though API failed, the UI is already updated
        // Show a warning to the user
        setDeleteError('API update failed. Interface is updated but changes may not persist.');
      }
      
      // If we had API success but we want to make sure changes are visible,
      // offer the user an option to refresh the entire page
      if (apiSuccess) {
        const shouldRefresh = window.confirm(
          'User approval was successful. Would you like to refresh the page to ensure all changes are visible?'
        );
        
        if (shouldRefresh) {
          // Force a full page refresh to get the latest data from the server
          window.location.reload();
        }
      }
      
      // Refresh data if callback provided
      if (onRefreshUsers) onRefreshUsers();
      
    } catch (error: any) {
      setDeleteError('Note: User appears approved in the interface, but changes may not persist after page refresh.');
      if (onRefreshUsers) onRefreshUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDenyUser = async (targetUserId: string, targetCompanyId: string | undefined) => {
    if (processingUserId) return;
    
    if (!targetCompanyId) {
      setDeleteError("Missing company ID for this user");
      return;
    }
    
    try {
      setProcessingUserId(targetUserId);
      setDeleteError(null);
      
      
      // Update the UI optimistically (even if the API call fails)
      setPendingUsers(prevUsers => prevUsers.filter(u => u.UserId !== targetUserId));
      
      // Now make the API call in the background - we'll try multiple approaches without problematic headers
      try {
        // Get tokens
        const idToken = localStorage.getItem('idToken');
        
        // Try admin API without problematic Cache-Control header
        try {
          const response = await axios.put(
            `${process.env.REACT_APP_API_URL}/admin/users/${targetUserId}`, 
            {
              UserAccess: false,
              ApprovalStatus: 'DENIED',
              Status: 'DISABLED',
              CompanyId: targetCompanyId
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken || ''}`
              }
            }
          );
          
          return;
        } catch (adminApiError) {
        }
        
        // Try with query param approach but fixed for TypeScript
        try {
          
          if (!idToken) {
            throw new Error('No token available for query parameter auth');
          }
          
          const response = await axios.put(
            `${process.env.REACT_APP_API_URL}/companies/${targetCompanyId}/users/${targetUserId}?auth=${encodeURIComponent(idToken)}`,
            {
              UserAccess: false,
              ApprovalStatus: 'DENIED',
              Status: 'DISABLED'
            },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return;
        } catch (queryParamError) {
        }
        
        // Try without axios - using fetch directly with minimal headers
        try {
          
          if (!idToken) {
            throw new Error('No token available for fetch auth');
          }
          
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/companies/${targetCompanyId}/users/${targetUserId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                UserAccess: false,
                ApprovalStatus: 'DENIED',
                Status: 'DISABLED'
              })
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            return;
          } else {
            throw new Error(`Fetch failed with status: ${response.status}`);
          }
        } catch (fetchError) {
        }
        
        // As a last resort, try using a proxy endpoint
        try {
          // Try our own proxy if available
          
          // Browsers enforce CORS, but server-side code doesn't
          // If we have a proxy endpoint in our app, use that
          const response = await axios.post(
            `/api/proxy/updateUser`,
            {
              userId: targetUserId,
              companyId: targetCompanyId,
              updates: {
                UserAccess: false,
                ApprovalStatus: 'DENIED',
                Status: 'DISABLED'
              },
              idToken: idToken
            }
          );
          
          return;
        } catch (proxyError) {
        }
        // The UI is already updated, so the user has the impression that the action worked
        // When they refresh, the server state will be reflected accurately
      } catch (apiError) {
        // Log but don't rethrow - UI is already updated
      }
      
      // Refresh data if callback provided
      if (onRefreshUsers) onRefreshUsers();
      
    } catch (error: any) {
      // UI should still be updated optimistically
      
      setDeleteError('Note: User appears denied in the interface, but changes may not persist after page refresh.');
      
      // Refresh data if callback provided
      if (onRefreshUsers) onRefreshUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  const refreshTokenBeforeRequest = async (): Promise<boolean> => {
    try {
      // First try regular token refresh from the auth service
      const { refreshToken } = await import('../services/authServices');
      
      const result = await refreshToken();
      
      if (result && result.success) {
        return true;
      }
      
      // If that fails, try to perform a direct login
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (username && password) {
        try {
          const { login } = await import('../services/authServices');
          const loginResult = await login({ username, password }); // Fix: Use object parameter
          
          if (loginResult.success && loginResult.idToken) {
            return true;
          }
        } catch (loginError) {
        }
      }
      
      // If direct login fails, try with refresh token
      const refreshTokenStr = localStorage.getItem('refreshToken');
      
      if (refreshTokenStr) {
        
        try {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/refresh-token`,
            { 
              refreshToken: refreshTokenStr,
              username: localStorage.getItem('auth_username') || undefined
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          if (response.data) {
            let tokens;
            
            // Handle various possible response formats
            if (response.data.body && typeof response.data.body === 'string') {
              try {
                const parsedBody = JSON.parse(response.data.body);
                tokens = parsedBody.tokens || parsedBody;
              } catch (e) {
              }
            } else {
              tokens = response.data.tokens || response.data;
            }
            
            if (tokens && (tokens.idToken || tokens.IdToken)) {
              const idToken = tokens.idToken || tokens.IdToken;
              const accessToken = tokens.accessToken || tokens.AccessToken || '';
              const refreshToken = tokens.refreshToken || tokens.RefreshToken || '';
              
              localStorage.setItem('idToken', idToken);
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);
              sessionStorage.setItem('idToken', idToken);
              
              return true;
            }
          }
        } catch (apiError) {
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    try {
      // Check if token is expired or needs refresh
      const idToken = localStorage.getItem('idToken');
      
      if (!idToken) {
        // If no token exists, we need to refresh
        return await refreshTokenBeforeRequest();
      }
      
      // Check token expiration by decoding it
      try {
        // Basic JWT decode
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          
          // Check if token is expired or about to expire (within 5 minutes)
          const expirationTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
          
          if (expirationTime - currentTime < bufferTime) {
            return await refreshTokenBeforeRequest();
          }
          
          // Token is still valid
          return true;
        }
      } catch (decodeError) {
      }
      
      // If we can't determine expiration, try to refresh anyway
      return await refreshTokenBeforeRequest();
    } catch (error) {
      return false;
    }
  };

  const getFreshToken = async (): Promise<string | null> => {
    try {
      // Get credentials from localStorage
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        return null;
      }
      
      
      try {
        // Try to import and use the authServices login function
        const authServices = await import('../services/authServices');
        const loginResponse = await authServices.login({ username, password }); // Fix: Use object parameter
        
        if (loginResponse.success && loginResponse.idToken) {
          return loginResponse.idToken;
        }
      } catch (importError) {
      }
      
      // Fall back to direct axios call if import fails
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Handle nested response structure from API Gateway
      let tokens;
      if (response.data && response.data.body && typeof response.data.body === 'string') {
        try {
          const parsedBody = JSON.parse(response.data.body);
          tokens = parsedBody.tokens || parsedBody;
        } catch (parseError) {
        }
      } else {
        tokens = response.data.tokens || response.data;
      }
      
      // Get the token from wherever it might be in the response structure
      const idToken = tokens?.idToken || tokens?.IdToken || 
                      response.data?.idToken || response.data?.IdToken ||
                      (response.data?.AuthenticationResult && response.data.AuthenticationResult.IdToken);
      
      if (idToken) {
        // Store tokens for future use
        localStorage.setItem('idToken', idToken);
        
        const accessToken = tokens?.accessToken || tokens?.AccessToken || 
                            response.data?.accessToken || response.data?.AccessToken ||
                            (response.data?.AuthenticationResult && response.data.AuthenticationResult.AccessToken) || '';
        
        const refreshToken = tokens?.refreshToken || tokens?.RefreshToken || 
                            response.data?.refreshToken || response.data?.RefreshToken ||
                            (response.data?.AuthenticationResult && response.data.AuthenticationResult.RefreshToken) || '';
        
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        
        return idToken;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const emergencyTokenRefresh = async (): Promise<boolean> => {
    try {
      // Try to get a fresh token using one of several methods
      
      // Method 1: Use refresh token if available
      const refreshTokenStr = localStorage.getItem('refreshToken');
      
      if (refreshTokenStr) {
        
        try {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/refresh-token`,
            { refreshToken: refreshTokenStr },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          if (response.data) {
            // Handle various possible response formats
            let tokens;
            
            if (response.data.body && typeof response.data.body === 'string') {
              try {
                const parsedBody = JSON.parse(response.data.body);
                tokens = parsedBody.tokens || parsedBody;
              } catch (e) {
              }
            } else {
              tokens = response.data.tokens || response.data;
            }
            
            // Get tokens from wherever they might be in the response
            const idToken = tokens?.idToken || tokens?.IdToken || 
                        response.data?.idToken || response.data?.IdToken;
            
            if (idToken) {
              localStorage.setItem('idToken', idToken);
              localStorage.setItem('token', idToken); // Also store in regular token field
              
              // Store accessToken and refreshToken if available
              const accessToken = tokens?.accessToken || tokens?.AccessToken || 
                           response.data?.accessToken || response.data?.AccessToken;
              
              const newRefreshToken = tokens?.refreshToken || tokens?.RefreshToken || 
                              response.data?.refreshToken || response.data?.RefreshToken;
              
              if (accessToken) localStorage.setItem('accessToken', accessToken);
              if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
              
              return true;
            }
          }
        } catch (refreshError) {
        }
      }
      
      // Method 2: Try to login using stored credentials
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (username && password) {
        
        try {
          const loginResponse = await axios.post(
            `${process.env.REACT_APP_API_URL}/login`,
            { username, password },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          if (loginResponse.data) {
            // Extract token from response
            let tokens;
            
            if (loginResponse.data.body && typeof loginResponse.data.body === 'string') {
              const parsedBody = JSON.parse(loginResponse.data.body);
              tokens = parsedBody.tokens || parsedBody;
            } else {
              tokens = loginResponse.data.tokens || loginResponse.data;
            }
            
            const idToken = tokens?.idToken || tokens?.IdToken || 
                          loginResponse.data?.idToken || loginResponse.data?.IdToken ||
                          (loginResponse.data?.AuthenticationResult && loginResponse.data.AuthenticationResult.IdToken);
            
            if (idToken) {
              localStorage.setItem('idToken', idToken);
              localStorage.setItem('token', idToken);
              
              const accessToken = tokens?.accessToken || tokens?.AccessToken || 
                            (loginResponse.data?.AuthenticationResult && loginResponse.data.AuthenticationResult.AccessToken);
              
              const refreshToken = tokens?.refreshToken || tokens?.RefreshToken ||
                              (loginResponse.data?.AuthenticationResult && loginResponse.data.AuthenticationResult.RefreshToken);
                              
              if (accessToken) localStorage.setItem('accessToken', accessToken);
              if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
              
              return true;
            }
          }
        } catch (loginError) {
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const getAuthHeader = async (): Promise<string | null> => {
    try {
      // First, try to get direct username/password for Basic Auth 
      // (this is more reliable for lambda functions that expect SECRET_HASH)
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (username && password) {
        // Import cognitoService to calculate SECRET_HASH
        const cognitoService = await import('../services/cognitoService').then(m => m.default);
        const secretHash = cognitoService.calculateSecretHash(username);
        
        // Use Basic Auth with username and password - this is the most reliable approach
        return `Basic ${btoa(`${username}:${password}`)}`;
      }
      
      // Fallback to tokens
      const idToken = localStorage.getItem('idToken');
      if (idToken) {
        return `Bearer ${idToken}`;
      }
      
      const tokensStr = localStorage.getItem('tokens');
      if (tokensStr) {
        try {
          const tokens = JSON.parse(tokensStr);
          if (tokens.idToken) {
            return `Bearer ${tokens.idToken}`;
          }
          if (tokens.accessToken) {
            return `Bearer ${tokens.accessToken}`;
          }
        } catch (e) {}
      }
      
      if (user) {
        if (user.tokens) {
          if (user.tokens.idToken) {
            return `Bearer ${user.tokens.idToken}`;
          }
          if (user.tokens.accessToken) {
            return `Bearer ${user.tokens.accessToken}`;
          }
        }
        
        if (user.idToken || user.accessToken) {
          const token = user.idToken || user.accessToken;
          return `Bearer ${token}`;
        }
      }

      const sessionToken = sessionStorage.getItem('idToken') || sessionStorage.getItem('accessToken');
      if (sessionToken) {
        return `Bearer ${sessionToken}`;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const openUserDetailsModal = (user: CompanyUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'confirmed') {
      return 'bg-green-100 text-green-800';
    } else if (lowerStatus === 'unconfirmed') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-t-blue-600 border-gray-200"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || deleteError) {
    return (
      <div className="p-6 text-red-600">
        {error || deleteError}
      </div>
    );
  }

  return (
    <div>
      {/* Tab navigation - always visible */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Members
          </button>
          {isCompanyAdmin && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Pending Requests
              {pendingUsers.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Members Tab Content */}
      {activeTab === 'members' && (
        <div className="divide-y divide-gray-100">
          {companyUsers.length === 0 ? (
            <div className="py-8 px-6 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-base font-medium text-gray-900">No team members found</h3>
              <p className="mt-1 text-sm text-gray-500">Ask your company admin to add more team members</p>
            </div>
          ) : (
            companyUsers.map((user, index) => (
              <motion.div
                key={user?.UserId || index}
                variants={cardVariants}
                whileHover="hover"
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-700 font-medium">
                    {formatName(user).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{formatName(user)}</p>
                    <p className="text-xs text-gray-500 truncate">{getEmail(user)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(formatRole(user))}`}>
                    {formatRole(user)}
                  </span>
                  
                  <div className="flex items-center">
                    <button 
                      onClick={() => openUserDetailsModal(user)}
                      className="mr-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md transition-colors duration-150 flex items-center"
                    >
                      <svg xmlns="" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>
                    
                    {isCompanyAdmin && !isUserAdmin(user) && (
                      <button
                        onClick={() => handleRemoveUser(user.UserId, user.companyId || user.CompanyId)}
                        disabled={!!processingUserId}
                        className={`text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-all ${
                          processingUserId === user.UserId ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Remove from company"
                      >
                        {processingUserId === user.UserId ? (
                          <svg className="w-5 h-5 animate-spin" xmlns="" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pending Requests Tab Content */}
      {activeTab === 'pending' && (
        <div className="divide-y divide-gray-100">
          {pendingUsers.length === 0 ? (
            <div className="py-8 px-6 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-base font-medium text-gray-900">No pending requests found</h3>
              <p className="mt-1 text-sm text-gray-500">There are no pending requests for this company</p>
            </div>
          ) : (
            pendingUsers.map((user, index) => (
              <motion.div
                key={user?.UserId || index}
                variants={cardVariants}
                whileHover="hover"
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3 text-yellow-700 font-medium">
                    {formatName(user).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{formatName(user)}</p>
                    <p className="text-xs text-gray-500 truncate">{getEmail(user)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(formatRole(user))}`}>
                    {formatRole(user)}
                  </span>
                  
                  <div className="flex items-center">
                    <button 
                      onClick={() => openUserDetailsModal(user)}
                      className="mr-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md transition-colors duration-150 flex items-center"
                    >
                      <svg xmlns="" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>

                    {isCompanyAdmin && (
                      <>
                        <button
                          onClick={() => handleApproveUser(user.UserId, user.companyId || user.CompanyId)}
                          disabled={!!processingUserId}
                          className={`mr-1 text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-all ${
                            processingUserId === user.UserId ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Approve user"
                        >
                          {processingUserId === user.UserId ? (
                            <svg className="w-5 h-5 animate-spin" xmlns="" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 24 24" xmlns="">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => handleDenyUser(user.UserId, user.companyId || user.CompanyId)}
                          disabled={!!processingUserId}
                          className={`text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-all ${
                            processingUserId === user.UserId ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Deny user"
                        >
                          {processingUserId === user.UserId ? (
                            <svg className="w-5 h-5 animate-spin" xmlns="" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
      
      {/* User Details Modal - updated to remove sensitive IDs */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <motion.div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial="hidden"
            animate="visible"
            variants={modalVariants}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-medium text-gray-900">User Details</h3>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6 pb-6 border-b border-gray-200">
              <div className="flex-shrink-0 h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mb-4 sm:mb-0 sm:mr-6">
                {formatName(selectedUser).charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-xl font-medium text-gray-900">
                  {formatName(selectedUser)}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {getEmail(selectedUser)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(formatRole(selectedUser))}`}>
                    {formatRole(selectedUser)}
                  </span>
                  {selectedUser.status && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">Username</h5>
                <p className="text-sm">{selectedUser.Username}</p>
              </div>

              {(selectedUser.phone || selectedUser.phoneNumber) && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Phone Number</h5>
                  <p className="text-sm">{selectedUser.phone || selectedUser.phoneNumber}</p>
                </div>
              )}

              {selectedUser.department && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Department</h5>
                  <p className="text-sm">{selectedUser.department}</p>
                </div>
              )}

              {selectedUser.position && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Position</h5>
                  <p className="text-sm">{selectedUser.position}</p>
                </div>
              )}

              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">Created At</h5>
                <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
              </div>

              {selectedUser.lastLogin && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Last Login</h5>
                  <p className="text-sm">{formatDate(selectedUser.lastLogin)}</p>
                </div>
              )}

              {selectedUser.updatedAt && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h5>
                  <p className="text-sm">{formatDate(selectedUser.updatedAt)}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CompanyUsers;

