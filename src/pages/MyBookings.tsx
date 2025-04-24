import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import AWS from 'aws-sdk';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { BookingsList } from '../components/bookings/BookingsList';
import { BookingFilters } from '../components/bookings/BookingFilters';
import { EmptyBookingState } from '../components/bookings/EmptyBookingState';
import { Booking, BookingStatus } from '../types/bookingTypes';
import { Link, useNavigate } from 'react-router-dom';
import * as exifr from 'exifr';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoTiffUploader } from '../components/bookings/GeoTiffUploader';
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';

// Add a Mapbox access token constant near the top of the file
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MyBookings: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<BookingStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [imageLocations, setImageLocations] = useState<{ url: string; latitude: number; longitude: number }[]>([]);
  const [geoTiffFiles, setGeoTiffFiles] = useState<{ [bookingId: string]: string }>({});
  const [filterByCurrentUser, setFilterByCurrentUser] = useState<boolean>(false);

  // Animation variants - matching Dashboard animations
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  const tableRowVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { delay: i * 0.05, duration: 0.3 }
    }),
    hover: { backgroundColor: "rgba(243, 244, 246, 1)" }
  };

  // Explicitly define AWS credentials and region
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  // Directly use the hardcoded credentials
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion,
  });

  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  });

  // Enhance user info extraction
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Try to get user info from context first
        if (user && Object.keys(user).length > 0) {
          setUserInfo(user);
          return;
        }

        // Try to get token and decode it
        const token = localStorage.getItem('token') || localStorage.getItem('idToken');
        if (token) {
          // Safely parse the token
          const parts = token.split('.');
          if (parts.length === 3) {
            // Verify token has 3 parts (header.payload.signature)
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            try {
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const tokenData = JSON.parse(jsonPayload);
              setUserInfo({
                name: tokenData.name || tokenData['cognito:username'] || tokenData.email || 'User',
                email: tokenData.email,
                sub: tokenData.sub,
                companyId: tokenData['custom:companyId']
              });
              return;
            } catch (error) {
            }
          }
        }

        // Last resort: try to get from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUserInfo({
              name: parsedUser.name || parsedUser.username || parsedUser.email || 'User',
              email: parsedUser.email,
              companyId: parsedUser.companyId,
              ...parsedUser
            });
          } catch (e) {
            setUserInfo({ name: 'Guest User' });
          }
        } else {
          // If we get here, we couldn't find user info anywhere
          console.warn('Could not find user info in any source');
          setUserInfo({ name: 'Guest User' });
        }
      } catch (error) {
        setUserInfo({ name: 'Guest User' });
      }
    };

    loadUserInfo();
  }, [user]);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try multiple token sources in order of preference
        let token = localStorage.getItem('idToken');
        
        // If idToken isn't available, try the regular token
        if (!token) {
          token = localStorage.getItem('token');
        }
        
        // Check for user session token as last resort
        if (!token) {
          const userDataStr = localStorage.getItem('user');
          if (userDataStr) {
            try {
              const userData = JSON.parse(userDataStr);
              token = userData.token || userData.idToken;
            } catch (e) {
            }
          }
        }
        
        if (!token) {
          throw new Error('Authentication token not found in any storage location');
        }


        // Get the API URL from environment or use a default
        let apiUrl = process.env.REACT_APP_API_URL;
        let bookingsUrl = `${apiUrl}/bookings`;
        
        // Make sure we have the companyId from userInfo or token
        let companyId = userInfo?.companyId;
        
        // If companyId not found in userInfo, try decoding it from the token
        if (!companyId && token) {
          try {
            // Basic JWT decode
            const parts = token.split('.');
            if (parts.length === 3) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(atob(base64));
              companyId = payload['custom:companyId'];
            }
          } catch (e) {
          }
        }
        
        // If we have a companyId, add it to the query
        if (companyId) {
          bookingsUrl += `?companyId=${encodeURIComponent(companyId)}`;
        } else {
          console.warn('No companyId available for filtering bookings');
        }

        // Debug the token before sending

        // IMPORTANT FIX: Use token directly (not Bearer prefix) as API Gateway adds this in the integration
        
        const response = await fetch(bookingsUrl, {
          method: 'GET',
          headers: {
            // KEY CHANGE: Don't add 'Bearer ' prefix as API Gateway expects the raw token
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          credentials: 'omit'  // Don't send cookies to avoid CORS issues
        });

        // Debug the response status

        // Get the full response body for debugging
        const responseText = await response.text();
        
        // Try to parse the response as JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }

        // Handle nested API Gateway response format
        if (responseData.statusCode && responseData.body) {
          
          // Check if the nested response indicates an error
          if (responseData.statusCode >= 400) {
            const errorBody = typeof responseData.body === 'string' 
              ? JSON.parse(responseData.body) 
              : responseData.body;
              
            throw new Error(errorBody.message || 'API request failed');
          }
          
          // Try to parse the nested body if it's a string
          if (typeof responseData.body === 'string') {
            try {
              responseData = JSON.parse(responseData.body);
            } catch (e) {
              responseData = { message: responseData.body };
            }
          } else {
            // If body is already an object, use it directly
            responseData = responseData.body;
          }
        }
        
        
        // Extract bookings array with better handling of various response formats
        let bookingsData: any[] = [];
        
        if (responseData.bookings) {
          // Standard format from our Lambda
          bookingsData = responseData.bookings;
        } else if (Array.isArray(responseData)) {
          // Direct array format
          bookingsData = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Look for any array property that could contain bookings
          const possibleArrays = Object.values(responseData).filter(value => Array.isArray(value));
          if (possibleArrays.length > 0) {
            // Use the first array found (most likely to be bookings)
            bookingsData = possibleArrays[0] as any[];
          } else if (responseData.BookingId || responseData.id) {
            // Single booking object
            bookingsData = [responseData];
          }
        }
        
        
        if (bookingsData.length === 0) {
          setBookings([]);
          setFilteredBookings([]);
          return;
        }

        // Map the received bookings to the expected format with better error handling
        const formattedBookings: Booking[] = bookingsData
          .map((item: any): Booking | null => {
            // Handle potential null/undefined items
            if (!item) return null;
            
            // Extract scheduling information if available
            let scheduleTime = '';
            if (item.scheduling && item.scheduling.timeSlot) {
              scheduleTime = item.scheduling.timeSlot.replace(/-/g, ' ');
            }
            
            return {
              id: item.BookingId || item.id || `booking-${Math.random()}`,
              UserId: item.UserId || item.userId || '',
              BookingId: item.BookingId || item.id || '',
              CompanyId: item.CompanyId || item.companyId || '',
              assetId: item.assetId || item.AssetId || '',
              assetName: item.assetName || item.AssetName || 'Unnamed Asset',
              createdAt: item.createdAt || item.CreatedAt || '',
              flightDate: item.flightDate || item.FlightDate || '',
              jobTypes: item.jobTypes || item.JobTypes || [],
              jobType: item.jobType || '',  // For backwards compatibility
              location: item.location || item.Location || '',
              postcode: item.postcode || item.Postcode || '',
              address: item.address || item.Address || '',
              status: item.status || item.Status || 'Pending',
              userName: item.userName || item.UserName || '',
              userEmail: item.userEmail || item.UserEmail || '',
              userPhone: item.userPhone || item.UserPhone || '',
              companyName: item.companyName || item.CompanyName || '',
              notes: item.notes || item.Notes || '',
              serviceOptions: item.serviceOptions || item.ServiceOptions || {},
              siteContact: item.siteContact || item.SiteContact || {},
              scheduling: item.scheduling || {},
              scheduleTime: scheduleTime
            };
          })
          .filter((booking): booking is Booking => booking !== null);
        
        setBookings(formattedBookings);
        setFilteredBookings(formattedBookings);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user data is available
    if (user || localStorage.getItem('user') || userInfo) {
      fetchBookings();
    } else {
      setError('You must be logged in to view bookings');
      setLoading(false);
    }
  }, [user, userInfo]);

  const fetchImages = async (bookingId: string) => {
    const params = {
      Bucket: 'drone-images-bucket',
      Prefix: `uploads/${bookingId}/`,
    };

    try {
      const data = await s3.listObjectsV2(params).promise();

      // Look for normal images
      const imageUrls =
        data.Contents?.map((item) => ({
          url: `https://${params.Bucket}.s3.amazonaws.com/${item.Key}`,
          key: item.Key,
        })) || [];
      setImages(imageUrls);

      // Check for GeoTIFF files
      const geoTiffObjects = data.Contents?.filter(
        (item) =>
          item.Key &&
          (item.Key.endsWith('.tif') || item.Key.endsWith('.tiff') || item.Key.endsWith('.geotiff'))
      );

      if (geoTiffObjects && geoTiffObjects.length > 0) {
        const geoTiffUrl = `https://${params.Bucket}.s3.amazonaws.com/${geoTiffObjects[0].Key}`;
        const filename =
          geoTiffObjects && geoTiffObjects[0] && geoTiffObjects[0].Key
            ? geoTiffObjects[0].Key.split('/').pop() || ''
            : '';
        setGeoTiffFiles((prev) => ({ ...prev, [bookingId]: geoTiffUrl }));
      }

      // Extract geolocation for all images
      const locationsPromises = imageUrls.map(async (image) => {
        const location = await extractGeolocation(image.url);
        if (location) {
          return {
            url: image.url,
            latitude: location.latitude,
            longitude: location.longitude,
          };
        }
        return null;
      });

      const locations = (await Promise.all(locationsPromises)).filter(Boolean) as {
        url: string;
        latitude: number;
        longitude: number;
      }[];
      setImageLocations(locations);
    } catch (error) {
    }
  };

  const extractGeolocation = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const exifData = await exifr.parse(blob);
      if (exifData && exifData.latitude && exifData.longitude) {
        return {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
        };
      }
    } catch (error) {
    }
    return null;
  };

  const handleFilterChange = (status: BookingStatus) => {
    // Normalize case for consistent comparison
    const normalizedStatus = status.toLowerCase() as BookingStatus;
    
    if (activeFilters.some(filter => filter.toLowerCase() === normalizedStatus)) {
      setActiveFilters(activeFilters.filter((s) => s.toLowerCase() !== normalizedStatus));
    } else {
      // Keep the original capitalization for display purposes
      setActiveFilters([...activeFilters, status]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    let filtered = [...bookings];

    // Apply status filters if any are active
    if (activeFilters.length > 0) {
      filtered = filtered.filter((booking) => {
        // Case-insensitive comparison to match status regardless of capitalization
        const bookingStatus = booking.status?.toLowerCase() || '';
        return activeFilters.some(filter => filter.toLowerCase() === bookingStatus);
      });
    }

    // Apply search term if not empty
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          (booking.assetName && booking.assetName.toLowerCase().includes(searchLower)) ||
          (booking.UserId && booking.UserId.toLowerCase().includes(searchLower)) ||
          (booking.location && booking.location.toLowerCase().includes(searchLower)) ||
          (booking.serviceType && booking.serviceType.toLowerCase().includes(searchLower)) ||
          (booking.jobType && booking.jobType.toLowerCase().includes(searchLower))
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, activeFilters, searchTerm]);

  const navigate = useNavigate();

  const handleViewBooking = (booking: Booking) => {
    navigate(`/flight-details/${booking.id || booking.BookingId}`);
  };

  // Handle navigation to booking details
  const handleViewBookingDetails = (bookingId: string) => {
    // Set loading state in localStorage before navigation
    localStorage.setItem('isFlightDetailsLoading', 'true');
    navigate(`/bookings/${bookingId}`);
  };

  const cancelBooking = async (bookingId: string) => {
    if (!bookingId) {
      setError('Invalid booking ID');
      return;
    }

    try {
      setLoading(true);

      // Try multiple token sources in order of preference
      let token = localStorage.getItem('idToken');
      
      // If idToken isn't available, try the regular token
      if (!token) {
        token = localStorage.getItem('token');
      }
      
      // Check for user session token as last resort
      if (!token) {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            token = userData.token || userData.idToken;
          } catch (e) {
          }
        }
      }
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get the API URL from environment or use a default
      const apiUrl = process.env.REACT_APP_API_URL;

      // Fix: Ensure proper format for the Authorization header
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      
      const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        }),
        credentials: 'omit'  // Don't send cookies to avoid CORS issues
      });

      if (!response.ok) {
        let errorMessage = `Failed to cancel booking: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
        }
        throw new Error(errorMessage);
      }

      // Update local state after successful cancellation
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.BookingId === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );

      // Also update filtered bookings
      setFilteredBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.BookingId === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Dashboard', href: '/dashboard', current: false },
    { name: 'Flights', href: '/my-bookings', current: true },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />

      {/* Hero section with gradient background - WIDER CONTAINER */}
      <motion.div
        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Flights</h1>
              <p className="text-blue-100">
                {userInfo?.name ? `Welcome, ${userInfo.name}! ` : ''}
                View and manage all your drone inspection bookings
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/assets"
                className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book New Flight
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">  {/* Changed from max-w-6xl to max-w-7xl */}
        {/* Add breadcrumbs component here */}
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Search and Filters - MORE PADDING and improved spacing */}
        <motion.div 
          className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-5"
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search flights by asset name, location, or job type..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {['Pending', 'Scheduled', 'Completed', 'Cancelled'].map((status) => {
                // Check if this filter is active using case-insensitive comparison
                const isActive = activeFilters.some(filter => 
                  filter.toLowerCase() === status.toLowerCase()
                );
                
                return (
                  <motion.button
                    key={status}
                    onClick={() => handleFilterChange(status as BookingStatus)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          : status === 'Scheduled'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : status === 'Completed'
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {status}
                  </motion.button>
                );
              })}
            </div>
            {activeFilters.length > 0 && (
              <motion.button
                onClick={() => setActiveFilters([])}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filters
              </motion.button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <motion.div 
            className="flex justify-center items-center h-64"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center">
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-t-blue-600 border-blue-200"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-gray-600 mt-4 font-medium">Loading your flight bookings...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div 
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6" 
            role="alert"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </motion.div>
        ) : bookings.length === 0 ? (
          <motion.div 
            className="bg-white shadow-lg rounded-xl p-8 text-center border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flights Found</h3>
            <p className="text-gray-500 mb-6">You haven't booked any drone flights yet.</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/assets"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Your First Flight
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <>
            {/* Flight statistics - WIDER GRID with larger cells */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              {/* Total Flights Card */}
              <motion.div
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md overflow-hidden"
                variants={cardVariants}
                whileHover="hover"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Flights</p>
                      <p className="text-white text-2xl font-bold mt-1">{bookings.length}</p>
                    </div>
                    <div className="bg-white/20 p-2.5 rounded-lg">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Pending Flights Card */}
              <motion.div
                className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-md overflow-hidden"
                variants={cardVariants}
                whileHover="hover"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Pending</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {bookings.filter((b) => b.status?.toLowerCase() === 'pending').length}
                      </p>
                    </div>
                    <div className="bg-white/20 p-2.5 rounded-lg">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Scheduled Flights Card */}
              <motion.div
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md overflow-hidden"
                variants={cardVariants}
                whileHover="hover"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Scheduled</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {bookings.filter((b) => b.status?.toLowerCase() === 'scheduled').length}
                      </p>
                    </div>
                    <div className="bg-white/20 p-2.5 rounded-lg">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Completed Flights Card */}
              <motion.div
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md overflow-hidden"
                variants={cardVariants}
                whileHover="hover"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Completed</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {bookings.filter((b) => b.status?.toLowerCase() === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-white/20 p-2.5 rounded-lg">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Flights Table - IMPROVED TABLE STYLING */}
            <motion.div
              className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 mb-6"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">All Flights</h2>
                <div className="text-sm text-gray-500">
                  Total: <span className="font-medium text-gray-900">{filteredBookings.length}</span> flights
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4"
                      >
                        Asset
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                      >
                        Service Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8"
                      >
                        Requested
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8"
                      >
                        Scheduled for
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8"
                      >
                        Location
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking, index) => (
                      <motion.tr
                        key={booking.BookingId || index}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewBookingDetails(booking.BookingId)}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                        variants={tableRowVariants}
                        whileHover="hover"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="h-5 w-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                            </div>
                            <div className="ml-4 overflow-hidden">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {booking.assetName || 'Unnamed Asset'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center truncate">
                                <svg className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">
                                  {booking.userName || 
                                   userInfo?.name || 
                                   (booking.userEmail && booking.userEmail.split('@')[0]) || 
                                   'User'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                            ${
                              booking.status?.toLowerCase() === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : booking.status?.toLowerCase() === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : booking.status?.toLowerCase() === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status?.toLowerCase() === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {booking.status
                              ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()
                              : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium truncate">
                            {booking.serviceType || booking.jobType || 'Standard'}
                          </div>
                          {booking.location && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <svg
                                className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="truncate">{booking.location}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.createdAt
                              ? new Date(booking.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.createdAt
                              ? new Date(booking.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.flightDate
                              ? new Date(booking.flightDate).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Not scheduled'}
                          </div>
                          {booking.flightDate && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {/* Display the time slot information if available, otherwise use default time */}
                              {booking.scheduleTime ? (
                                <span className="capitalize">{booking.scheduleTime}</span>
                              ) : (
                                new Date(booking.flightDate).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.postcode || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.address || 'No address provided'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-1">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click event
                                handleViewBookingDetails(booking.BookingId);
                              }}
                              className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Details
                            </motion.button>
                            {booking.status?.toLowerCase() !== 'cancelled' && booking.status?.toLowerCase() !== 'completed' && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  booking.BookingId && cancelBooking(booking.BookingId);
                                }}
                                className="inline-flex items-center px-2.5 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-xs"
                              >
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length === 0 && (
                <motion.div 
                  className="py-12 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <svg
                    className="mx-auto h-16 w-16 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No matching flights</h3>
                  <p className="mt-1 text-gray-500">No flights match your current filters</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveFilters([])}
                    className="mt-5 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Clear filters
                  </motion.button>
                </motion.div>
              )}
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <div className="text-sm text-gray-600">
                  {filteredBookings.length > 0 ? `Showing ${filteredBookings.length} of ${bookings.length} flights` : ''}
                </div>
                <Link to="/assets" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Book New Flight
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </main>

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

export default MyBookings;
