"use client";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import { motion } from "framer-motion";
import { getBookings, getBookingCount } from "../utils/bookingUtils";
import { getUsersByCompany, getCompanyInfo } from "../utils/companyData";
import { CompanyUser } from "../utils/userUtils";
import { getAssetCount } from "../utils/assetUtils";
import { Booking } from "../types/bookingTypes";
import CompanyUsers from "./CompanyUsers";
import { getCompanyId, getCompanyName } from "../utils/companyUtils";
import { getCompanyById } from "../services/companyService";
import { fetchCompanyNameFromAPI } from "../services/dashboardService";
import { clearCompanyCache, diagnoseCompanyApi } from "../utils/apiHelpers";
import CompanyInvitationModal from "./CompanyInvitationModal";
import invitationService from "../services/invitationService";

interface CompanyDetails {
  name: string;
  id: string;
  plan: string;
  status: string;
  createdAt?: string;
  userCount?: number;
}

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add debug logging on mount and track render attempts
  useEffect(() => {
    // Mark that dashboard has been rendered
    sessionStorage.setItem('dashboardRenderAttempt', 'true');
    
    // Set session active flag
    localStorage.setItem('pilotforceSessionActive', 'true');
    localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
    
    // Set up auth state for company admin if needed
    const userRole = user?.role || localStorage.getItem('userRole');
    if (userRole?.toLowerCase() === 'companyadmin') {
      localStorage.setItem('isCompanyAdmin', 'true');
      localStorage.setItem('approvalStatus', 'APPROVED');
      localStorage.setItem('userAccess', 'true');
    } else if (userRole?.toLowerCase() === 'user') {
      localStorage.setItem('isCompanyAdmin', 'false');
      localStorage.setItem('approvalStatus', 'APPROVED');
      localStorage.setItem('userAccess', 'true');
    }
    // Log the localStorage content for debugging
    const relevantKeys = [
      'userRole', 
      'isCompanyAdmin', 
      'approvalStatus', 
      'userAccess', 
      'isAdmin', 
      'pilotforceSessionActive'
    ];
    const storageDebug = {} as any;
    relevantKeys.forEach(key => {
      storageDebug[key] = localStorage.getItem(key);
    });
    // Clear any redirection flags that might have been set
    sessionStorage.removeItem('redirectInProgress');
    sessionStorage.removeItem('navigationInProgress');
    sessionStorage.removeItem('dashboardRedirectSkipped');
  }, [isAuthenticated, isAdmin, user]);
  
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number>(0);
  const [assetCountLoading, setAssetCountLoading] = useState<boolean>(false);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [bookingCountLoading, setBookingCountLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState<boolean>(false);

  // Function to fetch company users - moved outside useEffect to reuse it
  const fetchCompanyUsers = async () => {
    if (!user) return;
    
    try {
      setUsersLoading(true);
      
      // Use our reliable utility function to get company ID
      const companyId = getCompanyId(user);
      
      if (!companyId) {
        throw new Error("Missing company ID");
      }

      // Prepare the request URL
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `${baseUrl}/companies/${companyId}/users${isDev ? '?devmode=true' : ''}`;
      
      // Get authentication token
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const jwtToken = idToken || accessToken;
      
      // Prepare authorization header
      let authHeader = '';
      if (jwtToken) {
        if (jwtToken.startsWith('Bearer ')) {
          authHeader = jwtToken;
        } else {
          authHeader = `Bearer ${jwtToken}`;
        }
      }
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        // Debug response status
        if (!response.ok) {
          let errorDetails = '';
          try {
            // Try to get error details from response
            const errorData = await response.json();
            errorDetails = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch (e) {
            // If we can't parse JSON, just use status text
            errorDetails = response.statusText;
          }
          throw new Error(`API returned status: ${response.status}: ${errorDetails}`);
        }
        
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
          const mappedUsers: CompanyUser[] = data.users.map((user: any) => ({
            UserId: user.UserId || user.userId || '',
            email: user.Email || user.email || '',
            name: user.Name || user.name || '',
            firstName: user.FirstName || user.firstName || '',
            lastName: user.LastName || user.lastName || '',
            Username: user.Username || user.username || '',
            UserRole: user.UserRole || user.userRole || user.role || 'User',
            companyId: user.CompanyId || user.companyId || companyId,
            status: user.Status || user.status || 'ACTIVE',
            createdAt: user.CreatedAt || user.createdAt,
            isInvitation: user.IsInvitation || user.isInvitation || false
          }));
          setCompanyUsers(mappedUsers);
          setUsersError(null);
          return; // Exit early as we have the data
        } else {
          // Still treat this as success, just with no users
          setCompanyUsers([]);
          setUsersError(null);
          return;
        }
      } catch (apiError) {
        // Instead of falling back to mock data, just set an empty array and display an error
        setCompanyUsers([]);
        setUsersError("Failed to load users. Please try again later.");
      }
    } catch (error) {
      setUsersError("Failed to load team members");
      setCompanyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSendInvitation = async (email: string, role: string) => {
    try {
      // Get current companyId and user ID
      const companyId = getCompanyId(user);
      const inviterUserId = user?.sub || user?.id || '';

      if (!companyId) {
        throw new Error('Company ID not found');
      }
      
      // Use the invitation service to send the invitation
      await invitationService.sendInvitation(email, companyId, role, inviterUserId);

      // Refresh company users list to show the new invitation
      await fetchCompanyUsers();
    } catch (error: any) {
      throw error;
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

  const formatName = (user: CompanyUser | null): string => {
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

  const formatRole = (user: CompanyUser | null): string => {
    if (!user) return 'User';
    const role = user.UserRole || user.role || 'User';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const getEmail = (user: CompanyUser | null): string => {
    return (user && user.email) ? user.email : 'No email available';
  };

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
    if (lowerStatus === 'completed') {
      return 'bg-green-100 text-green-800';
    } else if (lowerStatus === 'scheduled') {
      return 'bg-blue-100 text-blue-800';
    } else if (lowerStatus === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    } else if (lowerStatus === 'cancelled') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

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

  useEffect(() => {
    const checkAndRedirectAdmin = async () => {
      try {
        if (user?.role === 'Administrator') {
          navigate('/admin-dashboard');
          return;
        }
        if (isAdmin === true) {
          navigate('/admin-dashboard');
          return;
        }
        if (localStorage.getItem('isAdmin') === 'true') {
          navigate('/admin-dashboard');
          return;
        }
      } catch (error) {}
    };
    if (user && isAuthenticated) {
      checkAndRedirectAdmin();
    }
  }, [navigate, isAdmin, user, isAuthenticated]);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get API URL from environment
        const apiUrl = process.env.REACT_APP_API_URL || '';

        // Get token from multiple sources
        const idToken = localStorage.getItem('idToken');
        const accessToken = localStorage.getItem('accessToken');
        const token = idToken || accessToken;

        if (!token) {
          throw new Error('No authentication token found');
        }

        // Get company ID using the utility function
        const companyId = getCompanyId(user);
        if (!companyId) {
        }

        // Construct the URL with company ID if available
        let bookingsUrl = `${apiUrl}/bookings`;
        if (companyId) {
          bookingsUrl += `?companyId=${encodeURIComponent(companyId)}`;
        }

        // Make the request with proper headers
        const response = await fetch(bookingsUrl, {
          method: 'GET',
          headers: {
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        let bookingsData: any[] = [];
        if (data.bookings) {
          bookingsData = data.bookings;
        } else if (Array.isArray(data)) {
          bookingsData = data;
        } else if (data.body) {
          // Handle API Gateway response format
          const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          bookingsData = bodyData.bookings || [];
        }

        // Format bookings data consistently
        const formattedBookings = bookingsData.map(booking => ({
          id: booking.BookingId || booking.id,
          BookingId: booking.BookingId || booking.id,
          UserId: booking.UserId || booking.userId,
          CompanyId: booking.CompanyId || booking.companyId,
          assetId: booking.assetId || booking.AssetId,
          assetName: booking.assetName || booking.AssetName || 'Unnamed Asset',
          createdAt: booking.createdAt || booking.CreatedAt,
          flightDate: booking.flightDate || booking.FlightDate,
          jobTypes: booking.jobTypes || booking.JobTypes || [],
          location: booking.location || booking.Location || '',
          postcode: booking.postcode || booking.Postcode || '',
          address: booking.address || booking.Address || '',
          status: booking.status || booking.Status || 'Pending',
          userName: booking.userName || booking.UserName || '',
          userEmail: booking.userEmail || booking.UserEmail || '',
          userPhone: booking.userPhone || booking.UserPhone || '',
          companyName: booking.companyName || booking.CompanyName || '',
          notes: booking.notes || booking.Notes || '',
          serviceOptions: booking.serviceOptions || booking.ServiceOptions || {},
          siteContact: booking.siteContact || booking.SiteContact || {},
          scheduling: booking.scheduling || {},
          quote: booking.quote || null
        }));

        // Sort by creation date and take the 3 most recent
        const sortedBookings = formattedBookings
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        setRecentBookings(sortedBookings);
        setError(null);

        // Update booking count
        setBookingCountLoading(true);
        setBookingCount(formattedBookings.length);
        setBookingCountLoading(false);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRecentBookings();
    }
  }, [user]);

  useEffect(() => {
    const loadUserAndCompanyInfo = async () => {
      if (!user) return;

      try {
        setUserProfile({
          name: user.username || user.name || "User",
          email: user.email || "No email provided",
          role: user.role || user["custom:userRole"] || "User",
          joinDate: new Date().toLocaleDateString(),
        });

        // Get companyId using our reliable utility function
        const companyId = getCompanyId(user);
        
        // Store companyId in localStorage for future use
        if (companyId) {
          localStorage.setItem('companyId', companyId);
        }
        
        // Default company details in case we can't fetch them
        let companyName = getCompanyName(user); // Use our utility function to get company name
        let companyStatus = "Active";
        let companyCreatedAt = "";
        let userCount = 0;

        // Try to fetch company details using the most reliable methods first
        if (companyId) {
          try {
            // Ensure we have a company ID cached
            localStorage.setItem('companyId', companyId);
            
            // First, check if we have a cached company name that's still valid
            const cachedCompanyName = localStorage.getItem('companyName');
            const cacheTimestamp = localStorage.getItem('companyNameCacheTime');
            const cacheAge = cacheTimestamp ? (Date.now() - parseInt(cacheTimestamp)) : Infinity;
            const cacheValid = cacheAge < 3600000; // Cache valid for 1 hour
            
            if (cachedCompanyName && cacheValid) {
              companyName = cachedCompanyName;
            } else {
              // STEP 1: Try to get the company name directly from the Lambda via API Gateway
              try {
                // This is the most reliable method in production
                const apiCompanyName = await fetchCompanyNameFromAPI(companyId);
                
                if (apiCompanyName) {
                  // Successfully got name from Lambda function via API Gateway
                  companyName = apiCompanyName;
                  // Store for future use with timestamp
                  localStorage.setItem('companyName', companyName);
                  localStorage.setItem('companyNameCacheTime', Date.now().toString());
                } else {
                }
              } catch (apiError) {
              }
            }
                
            // Get full company details via API Gateway
            try {
              const response = await getCompanyById(companyId);
              if (response.success && response.company) {
                // Extract additional company data from successful response
                // Update company name if it exists in the response
                if (response.company.Name) {
                  companyName = response.company.Name;
                  // Store the name in local storage for future use
                  localStorage.setItem('companyName', companyName);
                  localStorage.setItem('companyNameCacheTime', Date.now().toString());
                }
                
                companyStatus = response.company.Status || "Active";
                companyCreatedAt = response.company.CreatedAt || response.company.createdAt || "";
                userCount = response.company.UserCount || response.company.userCount || 0;
              }
            } catch (additionalDataError) {
            }
            
            // STEP 2: Fallback to DynamoDB if Lambda API call fails
            if (!companyName) {
              try {
                const companyData = await getCompanyInfo(companyId);
                
                if (companyData) {
                  // Update with real company data from DynamoDB
                  const dynamoDBCompanyName = companyData.Name || companyData.CompanyName;
                  if (dynamoDBCompanyName) {
                    companyName = dynamoDBCompanyName;
                  }
                  
                  companyStatus = companyData.Status || "Active";
                  companyCreatedAt = companyData.CreatedAt || "";
                  userCount = companyData.UserCount || 0;
                  
                  // Store company name for future use with timestamp
                  if (companyName) {
                    localStorage.setItem('companyName', companyName);
                    localStorage.setItem('companyNameCacheTime', Date.now().toString());
                  }
                } else {
                  // STEP 3: Try to get the company name from token as last resort
                  const tokenCompanyName = 
                    ((user as any)?.['custom:CompanyName']) || 
                    localStorage.getItem('companyName') ||
                    'Your Organization';
                  
                  if (tokenCompanyName) {
                    companyName = tokenCompanyName;
                    localStorage.setItem('companyName', companyName);
                  }
                }
              } catch (dbError) {
                // If we have a cached company name (even if it's old), use it as a last resort
                const cachedCompanyName = localStorage.getItem('companyName');
                if (cachedCompanyName) {
                  companyName = cachedCompanyName;
                }
              }
            }
          } catch (companyError) {
          }
        }

        // Update company details in state with the name we found
        setCompanyDetails({
          name: companyName || "Your Organization",
          id: companyId || "Unknown",
          plan: "Professional",
          status: companyStatus,
          createdAt: companyCreatedAt,
          userCount: userCount
        });

        // Handle asset count fetching
        if (companyId) {
          setAssetCountLoading(true);
          try {
            // Allow some time for token to be properly initialized if needed
            setTimeout(async () => {
              try {
                // Fix type error by ensuring companyId is not undefined
                const count = await getAssetCount(companyId);
                setAssetCount(count);
              } catch (delayedError) {
                setAssetCount(0);
              } finally {
                setAssetCountLoading(false);
              }
            }, 500); // Short delay to ensure auth is fully initialized
          } catch (error) {
            setAssetCount(0);
            setAssetCountLoading(false);
          }
        } else {
          setAssetCount(0);
          setAssetCountLoading(false);
        }
      } catch (error) {
        setAssetCountLoading(false);
      }
    };

    loadUserAndCompanyInfo();
  }, [user]);

  useEffect(() => {
    fetchCompanyUsers();
  }, [user]);

  // Update the user list rendering to handle both active users and invitations
  const renderCompanyUsers = () => {
    if (usersLoading) {
      return (
        <div className="text-center py-4">
          <motion.div
            className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      );
    }
    
    if (usersError) {
      return (
        <div>
          <div className="text-center py-2 text-amber-500 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {usersError}
          </div>
          
          {/* Only render the user list if we have users, despite the error */}
          {companyUsers && companyUsers.length > 0 ? renderUsersList() : (
            <div className="text-center py-6 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>No users found</p>
              <p className="text-sm mt-1">Try refreshing the page</p>
            </div>
          )}
        </div>
      );
    }
    
    return renderUsersList();
  };

  const renderUsersList = () => {
    if (!companyUsers || companyUsers.length === 0) {
      return (
        <div className="text-center py-3 text-sm text-gray-500">
          No team members found.
        </div>
      );
    }
    
    // Separate users and invitations for display
    const activeUsers = companyUsers.filter(user => 
      !user.isInvitation || 
      (user.status?.toUpperCase() === 'ACCEPTED' || user.Status?.toUpperCase() === 'ACCEPTED')
    );
    
    const pendingInvitations = companyUsers.filter(user => 
      user.isInvitation && 
      (user.status?.toUpperCase() === 'PENDING' || user.Status?.toUpperCase() === 'PENDING')
    );
    
    return (
      <div>
        {activeUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">Active Users</h3>
            <ul className="space-y-2">
              {activeUsers.map((user) => (
                <li 
                  key={user.UserId} 
                  className="py-2 px-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                  onClick={() => openUserDetailsModal(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-2 text-sm">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatName(user)}</p>
                        <p className="text-xs text-gray-500">{getEmail(user)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.UserRole)}`}>
                        {formatRole(user)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {pendingInvitations.length > 0 && (
          <div className={activeUsers.length > 0 ? "mt-4" : ""}>
            <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
              <span>Pending Invitations</span>
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {pendingInvitations.length}
              </span>
            </h3>
            <ul className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <li 
                  key={invitation.UserId} 
                  className="py-2 px-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                  onClick={() => openUserDetailsModal(invitation)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-yellow-100 text-yellow-800 rounded-full w-8 h-8 flex items-center justify-center mr-2 text-sm">
                        {invitation.email?.charAt(0) || 'I'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{getEmail(invitation)}</p>
                        <p className="text-xs text-gray-500">Invitation Pending</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(invitation.UserRole)}`}>
                        {formatRole(invitation)}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Invited
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Debug function to check API and auth state
  const debugAPIConnection = async () => {
    try {
      const companyId = localStorage.getItem('companyId');
      // Get tokens
      const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      // Test company info endpoint
      const isDev = process.env.NODE_ENV === 'development';
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const companyUrl = `${apiUrl}/companies/${companyId}`;
      const authHeader = `Bearer ${idToken || accessToken}`;
      
      // Make test request
      const companyResponse = await fetch(companyUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
      } else {
      }
      
      // Test users endpoint
      const usersUrl = `${apiUrl}/companies/${companyId}/users${isDev ? '?devmode=true' : ''}`;
      const usersResponse = await fetch(usersUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      if (usersResponse.ok) {
        const userData = await usersResponse.json();
      } else {
      }
      
    } catch (error) {
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 px-4 sm:px-6 lg:px-8 text-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome to PilotForce
              </h1>
              <p className="mt-1 text-blue-100">
                Your drone operations platform for managing assets, bookings, and flights
              </p>
            </div>

            <div className="mt-4 md:mt-0 flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/assets")}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book a Flight
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/assets")}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white border border-white hover:bg-blue-600"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                View Assets
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>

      <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.section
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Flights</p>
                    {bookingCountLoading ? (
                      <div className="flex items-center mt-1">
                        <motion.div
                          className="w-5 h-5 rounded-full border-2 border-t-transparent border-white/50"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="ml-2 text-2xl font-bold">...</span>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold mt-1">{bookingCount}</p>
                    )}
                  </div>
                  <div className="bg-white/30 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a1 1 0 012 2" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-5 text-white shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Assets</p>
                    {assetCountLoading ? (
                      <div className="flex items-center mt-1">
                        <motion.div
                          className="w-5 h-5 rounded-full border-2 border-t-transparent border-white/50"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="ml-2 text-2xl font-bold">...</span>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold mt-1">{assetCount}</p>
                    )}
                  </div>
                  <div className="bg-white/30 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </motion.section>

            <motion.section
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-base font-semibold text-gray-900">Recent Flights</h2>
                <Link to="/my-bookings" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All
                </Link>
              </div>

              {loading ? (
                <div className="flex justify-center py-6">
                  <motion.div
                    className="w-6 h-6 rounded-full border-2 border-t-blue-600 border-gray-200"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : error ? (
                <div className="p-4 text-red-600">
                  {error}
                </div>
              ) : recentBookings.length > 0 ? (
                <div>
                  {recentBookings.map((booking, index) => (
                    <motion.div
                      key={booking.BookingId || booking.id || index}
                      variants={cardVariants}
                      className="px-4 py-3 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/flight-details/${booking.BookingId || booking.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{booking.assetName || "Unnamed Asset"}</h3>
                          <div className="mt-1 flex items-center space-x-3">
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(booking.flightDate || booking.createdAt).toLocaleDateString()}
                            </div>
                            {booking.quote && (
                              <div className="flex items-center text-xs text-green-600 font-medium">
                                <svg className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Intl.NumberFormat('en-GB', {
                                  style: 'currency',
                                  currency: booking.quote.currency || 'GBP'
                                }).format(booking.quote.amount)}
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(booking.status)}`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2V6a2 2 0 002-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent flights</h3>
                  <p className="mt-1 text-xs text-gray-500">Get started by creating your first booking</p>
                  <div className="mt-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/assets")}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="mr-1.5 -ml-0.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Book a Flight
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.section>

            <motion.section
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <div className="flex items-center space-x-2">
                  {(user?.role?.toLowerCase() === 'companyadmin' || localStorage.getItem('isCompanyAdmin') === 'true') && (
                    <button 
                      onClick={() => setShowInvitationModal(true)}
                      className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Invite
                    </button>
                  )}
                  <span className="text-blue-600 text-sm font-medium">
                    {companyUsers.length} {companyUsers.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
              </div>

              <div className="px-4 py-2">
                {renderCompanyUsers()}
              </div>
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <h3 className="text-base font-semibold">Your Profile</h3>
              </div>
              <div className="p-5">
                {userProfile ? (
                  <div>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4 text-xl font-bold text-purple-600">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{userProfile.name}</h4>
                        <p className="text-sm text-gray-500">{userProfile.email}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          {userProfile.role}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium py-2 px-4 rounded-md text-sm"
                        onClick={() => {
                          const userAsCompanyUser: CompanyUser = {
                            UserId: userProfile.id || '',
                            email: userProfile.email,
                            name: userProfile.name,
                            Username: userProfile.name,
                            UserRole: userProfile.role,
                            companyId: companyDetails?.id || '',
                            status: 'CONFIRMED',
                            createdAt: userProfile.joinDate,
                          };
                          
                          openUserDetailsModal(userAsCompanyUser);
                        }}
                      >
                        View Profile
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 flex justify-center">
                    <motion.div
                      className="w-6 h-6 border-2 border-gray-200 border-t-purple-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h3 className="text-base font-semibold">Company Information</h3>
              </div>
              <div className="p-5">
                {companyDetails ? (
                  <div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{companyDetails.name || "Your Organization"}</h4>
                        {companyDetails.createdAt && (
                          <p className="text-xs text-gray-500">
                            Created: {new Date(companyDetails.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 flex justify-center">
                    <motion.div
                      className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate("/assets")}
                    className="flex items-center p-3 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700"
                  >
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Book a Flight</p>
                      <p className="text-xs text-blue-600">Schedule a new drone operation</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // Clear navigation management flags
                      sessionStorage.removeItem('navigationInProgress');
                      sessionStorage.removeItem('navigationLoopDetected');
                      sessionStorage.removeItem('redirectInProgress');
                      
                      // Tell NavigationHandler where we're trying to go
                      sessionStorage.setItem('attemptingNavigationTo', '/my-bookings');
                      
                      // First try React Router navigation with replace option
                      navigate('/my-bookings', { replace: true });
                      
                      // Fallback to forced navigation after a small delay if React Router doesn't work
                      setTimeout(() => {
                        if (window.location.pathname !== '/my-bookings') {
                          window.location.replace("/my-bookings");
                        }
                      }, 100);
                    }}
                    className="flex items-center p-3 rounded-md bg-green-50 hover:bg-green-100 text-green-700"
                  >
                    <div className="p-2 bg-green-100 rounded-full mr-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a1 1 0 012 2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">View My Flights</p>
                      <p className="text-xs text-green-600">Check bookings status</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate("/assets")}
                    className="flex items-center p-3 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700"
                  >
                    <div className="p-2 bg-purple-100 rounded-full mr-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Manage Assets</p>
                      <p className="text-xs text-purple-600">View your properties</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

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

      {/* Invitation Modal */}
      <CompanyInvitationModal
        show={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        onSubmit={handleSendInvitation}
        companyId={companyDetails?.id || ''}
        companyName={companyDetails?.name || 'Your Company'}
      />

      <footer className="bg-white border-t border-gray-200 py-4 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-2 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-gray-900">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-gray-900">Terms</a>
            <a href="#" className="text-gray-500 hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

