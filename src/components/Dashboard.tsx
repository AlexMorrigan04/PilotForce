"use client";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import { motion } from "framer-motion";
import { getBookings, getBookingCount } from "../utils/bookingUtils";
import { getUsersByCompany } from "../utils/companyData";
import { CompanyUser } from "../utils/userUtils";
import { getAssetCount } from "../utils/assetUtils";
import { Booking } from "../types/bookingTypes";
import CompanyUsers from "./CompanyUsers";

interface CompanyDetails {
  name: string;
  id: string;
  plan: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
    if (normalizedRole.includes('admin')) {
      return 'bg-purple-100 text-purple-800';
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
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
  };

  useEffect(() => {
    const checkAndRedirectAdmin = async () => {
      try {
        if (user?.role === 'Administrator') {
          console.log('True administrator detected via user role, redirecting to admin dashboard');
          navigate('/admin-dashboard');
          return;
        }
        
        if (isAdmin === true) {
          const token = localStorage.getItem('idToken');
          if (token) {
            try {
              const { isAdminFromToken } = await import('../utils/adminUtils');
              const adminGroups = await checkAdministratorsGroupMembership(token);
              if (adminGroups) {
                console.log('Admin confirmed via Cognito groups, redirecting to admin dashboard');
                navigate('/admin-dashboard');
                return;
              }
            } catch (error) {
              console.error('Error validating admin group membership:', error);
            }
          }
        }
        
        if (localStorage.getItem('isAdmin') === 'true') {
          const token = localStorage.getItem('idToken');
          if (token) {
            try {
              const adminGroups = await checkAdministratorsGroupMembership(token);
              if (!adminGroups) {
                console.log('Removing incorrect admin flag - user is not in Administrators group');
                localStorage.removeItem('isAdmin');
              }
            } catch (error) {
              console.error('Error validating admin token:', error);
            }
          } else {
            localStorage.removeItem('isAdmin');
          }
        }
      } catch (error) {
        console.error('Error during admin check in Dashboard:', error);
      }
    };
    
    const checkAdministratorsGroupMembership = async (token: string): Promise<boolean> => {
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decoded = jwtDecode<any>(token);
        const groups = decoded['cognito:groups'] || [];
        return groups.includes('Administrators');
      } catch (error) {
        console.error('Error decoding token:', error);
        return false;
      }
    };
    
    if (user && isAuthenticated) {
      checkAndRedirectAdmin();
    }
  }, [navigate, isAdmin, user, isAuthenticated]);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      if (!user || !user.companyId) return;

      try {
        setLoading(true);
        const bookings = await getBookings(user.companyId);

        const sorted = [...bookings]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        setRecentBookings(sorted);
        setError(null);

        setBookingCountLoading(true);
        try {
          const count = await getBookingCount(user.companyId);
          setBookingCount(count);
        } catch (countError) {
          console.error("Error fetching booking count:", countError);
          setBookingCount(bookings.length);
        } finally {
          setBookingCountLoading(false);
        }
      } catch (error) {
        console.error("Error fetching recent bookings:", error);
        setError("Failed to load recent bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBookings();
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

        let companyId = user.companyId || user["custom:companyId"];
        let companyName = user.companyName || "";

        if (!companyId) {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              companyId = parsedUser.companyId || parsedUser["custom:companyId"];
              companyName = parsedUser.companyName || "";
            } catch (e) {
              console.error("Error parsing saved user data", e);
            }
          }
        }

        if (!companyName && user.email) {
          const emailParts = user.email.split('@');
          if (emailParts.length > 1) {
            const domain = emailParts[1].split('.')[0];
            companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
          }
        }

        setCompanyDetails({
          name: companyName || "Your Organization",
          id: companyId || "Unknown",
          plan: "Professional",
          status: "Active",
        });

        // Handle asset count fetching
        if (companyId) {
          setAssetCountLoading(true);
          try {
            console.log("Fetching asset count for company:", companyId);
            
            // Make sure the token is available before calling getAssetCount
            const token = localStorage.getItem('idToken');
            if (!token) {
              console.warn("No idToken found in localStorage for asset count fetch");
            }
            
            // Allow some time for token to be properly initialized if needed
            setTimeout(async () => {
              try {
                const count = await getAssetCount(companyId);
                console.log("Asset count result:", count);
                setAssetCount(count);
              } catch (delayedError) {
                console.error("Error in delayed asset count fetch:", delayedError);
                setAssetCount(0);
              } finally {
                setAssetCountLoading(false);
              }
            }, 500); // Short delay to ensure auth is fully initialized
          } catch (error) {
            console.error("Error initiating asset count fetch:", error);
            setAssetCount(0);
            setAssetCountLoading(false);
          }
        } else {
          console.warn("No company ID available to fetch asset count");
          setAssetCount(0);
          setAssetCountLoading(false);
        }
      } catch (error) {
        console.error("Error loading user or company information:", error);
        setAssetCountLoading(false);
      }
    };

    loadUserAndCompanyInfo();
  }, [user]);

  useEffect(() => {
    const fetchCompanyUsers = async () => {
      if (!user) return;
      
      try {
        setUsersLoading(true);
        
        let companyId = user.companyId || user["custom:companyId"];
        
        if (!companyId) {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              companyId = parsedUser.companyId || parsedUser["custom:companyId"];
              console.log("Retrieved companyId from localStorage:", companyId);
            } catch (e) {
              console.error("Error parsing saved user data", e);
            }
          }
        }
        
        if (!companyId) {
          console.error("Could not determine company ID for user");
          throw new Error("Missing company ID");
        }
        
        console.log("Fetching users for company ID:", companyId);
        const users = await getUsersByCompany(companyId);
        
        console.log(`Successfully fetched ${users.length} company users`);
        
        const mappedUsers: CompanyUser[] = users.map(user => ({
          UserId: user.UserId || user.userId || '',
          email: user.Email || user.email || '',
          name: user.Name || user.name || '',
          Username: user.Username || user.username || '',
          UserRole: user.UserRole || user.role || 'User',
          companyId: user.CompanyId || user.companyId || companyId,
          status: user.Status || user.status || 'UNKNOWN',
          createdAt: user.CreatedAt || user.createdAt || new Date().toISOString()
        }));
        
        setCompanyUsers(mappedUsers);
        setUsersError(null);
      } catch (error) {
        console.error("Error fetching company users:", error);
        setUsersError("Failed to load team members");
      } finally {
        setUsersLoading(false);
      }
    };

    fetchCompanyUsers();
  }, [user]);

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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Recent Flights</h2>
                <Link to="/my-bookings" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All
                </Link>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <motion.div
                    className="w-8 h-8 rounded-full border-2 border-t-blue-600 border-gray-200"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : error ? (
                <div className="p-6 text-red-600">
                  {error}
                </div>
              ) : recentBookings.length > 0 ? (
                <div>
                  {recentBookings.map((booking, index) => (
                    <motion.div
                      key={booking.BookingId || booking.id || index}
                      variants={cardVariants}
                      className="p-5 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/flight-details/${booking.BookingId || booking.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{booking.assetName || "Unnamed Asset"}</h3>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(booking.flightDate || booking.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(booking.status)}`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-6 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2V6a2 2 0 002-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="mt-2 text-base font-medium text-gray-900">No recent flights</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first booking</p>
                  <div className="mt-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/assets")}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="mr-2 -ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="text-blue-600 text-sm font-medium">
                  {companyUsers.length} {companyUsers.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>

              <CompanyUsers 
                users={companyUsers} 
                isLoading={usersLoading} 
                error={usersError} 
              />
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
                        <h4 className="font-medium text-gray-900">{companyDetails.name}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {companyDetails.status}
                        </span>
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
                    onClick={() => navigate("/my-bookings")}
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

