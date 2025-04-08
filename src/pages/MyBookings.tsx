import React, { useState, useEffect, useContext } from 'react';
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
          console.log('Got user from context:', user);
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
              console.log('Extracted user info from token:', tokenData);
              setUserInfo({
                name: tokenData.name || tokenData['cognito:username'] || tokenData.email || 'User',
                email: tokenData.email,
                sub: tokenData.sub,
                companyId: tokenData['custom:companyId']
              });
              return;
            } catch (error) {
              console.error('Failed to decode token payload:', error);
            }
          }
        }

        // Last resort: try to get from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('Using user data from localStorage:', parsedUser);
            setUserInfo({
              name: parsedUser.name || parsedUser.username || parsedUser.email || 'User',
              email: parsedUser.email,
              companyId: parsedUser.companyId,
              ...parsedUser
            });
          } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
            setUserInfo({ name: 'Guest User' });
          }
        } else {
          // If we get here, we couldn't find user info anywhere
          console.warn('Could not find user info in any source');
          setUserInfo({ name: 'Guest User' });
        }
      } catch (error) {
        console.error('Error loading user info:', error);
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
          console.log('Using regular token instead of idToken');
        }
        
        // Check for user session token as last resort
        if (!token) {
          const userDataStr = localStorage.getItem('user');
          if (userDataStr) {
            try {
              const userData = JSON.parse(userDataStr);
              token = userData.token || userData.idToken;
              console.log('Extracted token from user data:', !!token);
            } catch (e) {
              console.error('Error parsing user data:', e);
            }
          }
        }
        
        if (!token) {
          throw new Error('Authentication token not found in any storage location');
        }

        console.log('Fetching bookings with user info:', userInfo);

        // Get the API URL from environment or use a default
        let apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
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
              console.log('Extracted companyId from token:', companyId);
            }
          } catch (e) {
            console.error('Error extracting companyId from token:', e);
          }
        }
        
        // If we have a companyId, add it to the query
        if (companyId) {
          bookingsUrl += `?companyId=${encodeURIComponent(companyId)}`;
          console.log('Using companyId in request URL:', companyId);
        } else {
          console.warn('No companyId available for filtering bookings');
        }

        // Debug the token before sending
        console.log('Token type:', typeof token);
        console.log('Token first 20 chars:', token.substring(0, 20) + '...');
        console.log('Token length:', token.length);
        console.log('Token starts with Bearer?', token.startsWith('Bearer '));

        // IMPORTANT FIX: Use token directly (not Bearer prefix) as API Gateway adds this in the integration
        console.log('Making request to:', bookingsUrl);
        
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
        console.log(`API response status: ${response.status} ${response.statusText}`);
        console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));

        // Get the full response body for debugging
        const responseText = await response.text();
        console.log('Raw response body:', responseText.substring(0, 500));
        
        // Try to parse the response as JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Error parsing response as JSON:', e);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }

        // Handle nested API Gateway response format
        if (responseData.statusCode && responseData.body) {
          console.log('Received API Gateway proxy response, unwrapping...');
          
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
              console.error('Error parsing nested response body:', e);
              responseData = { message: responseData.body };
            }
          } else {
            // If body is already an object, use it directly
            responseData = responseData.body;
          }
        }
        
        console.log('Parsed API response:', responseData);
        
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
        
        console.log('Extracted bookings data:', bookingsData.length, 'items');
        
        if (bookingsData.length === 0) {
          console.log('No bookings found in response');
          setBookings([]);
          setFilteredBookings([]);
          return;
        }

        // Map the received bookings to the expected format with better error handling
        const formattedBookings: Booking[] = bookingsData
          .map((item: any): Booking | null => {
            // Handle potential null/undefined items
            if (!item) return null;
            
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
              status: item.status || item.Status || 'pending',
              userName: item.userName || item.UserName || '',
              userEmail: item.userEmail || item.UserEmail || '',
              userPhone: item.userPhone || item.UserPhone || '',
              companyName: item.companyName || item.CompanyName || '',
              notes: item.notes || item.Notes || '',
              serviceOptions: item.serviceOptions || item.ServiceOptions || {},
              siteContact: item.siteContact || item.SiteContact || {}
            };
          })
          .filter((booking): booking is Booking => booking !== null);
        
        console.log('Formatted bookings:', formattedBookings);
        setBookings(formattedBookings);
        setFilteredBookings(formattedBookings);
      } catch (err) {
        console.error('Error fetching bookings:', err);
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
        console.log(`GeoTIFF Filename: ${filename}`);
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
      console.error('Error fetching images from S3:', error);
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
      console.error('Error extracting geolocation data:', error);
    }
    return null;
  };

  const handleFilterChange = (status: BookingStatus) => {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter((s) => s !== status));
    } else {
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
      filtered = filtered.filter((booking) => activeFilters.includes(booking.status as BookingStatus));
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

  const handleViewBookingDetails = (bookingId: string) => {
    console.log(`Navigating to flight details for bookingId: ${bookingId}`);
    
    // Store the selected booking ID in localStorage for easy retrieval
    if (bookingId) {
      localStorage.setItem('selectedBookingId', bookingId);
    }
    
    // Navigate using the /flight-details/{id} format which corresponds to the API's /bookings/{id}
    navigate(`/flight-details/${bookingId}`);
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
        console.log('Using regular token instead of idToken for cancellation');
      }
      
      // Check for user session token as last resort
      if (!token) {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            token = userData.token || userData.idToken;
            console.log('Extracted token from user data for cancellation:', !!token);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get the API URL from environment or use a default
      const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

      // Fix: Ensure proper format for the Authorization header
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      console.log('Using auth header for cancel:', authHeader.substring(0, 30) + '...');
      
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
          console.error('API error response for cancellation:', errorData);
        } catch (e) {
          console.error('Could not parse cancellation error response:', e);
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
      console.error('Error cancelling booking:', err);
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-7xl">  {/* Changed from max-w-6xl to max-w-7xl */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Flights</h1>
              <p className="text-blue-100">
                {userInfo?.name ? `Welcome, ${userInfo.name}! ` : ''}
                View and manage all your drone inspection bookings
              </p>
            </div>
            <Link
              to="/assets"
              className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book New Flight
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">  {/* Changed from max-w-6xl to max-w-7xl */}
        {/* Add breadcrumbs component here */}
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading your flight bookings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6" role="alert">
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
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white shadow-lg rounded-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flights Found</h3>
            <p className="text-gray-500 mb-6">You haven't booked any drone flights yet.</p>
            <Link
              to="/assets"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book Your First Flight
            </Link>
          </div>
        ) : (
          <>
            {/* Flight statistics - WIDER GRID with larger cells */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">  {/* Changed gap-4 to gap-6 for more spacing */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200"> {/* Increased padding from p-4 to p-5 */}
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Increased icon size */}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div className="ml-5"> {/* Increased margin from ml-4 to ml-5 */}
                    <h3 className="text-sm font-medium text-gray-500">Total Flights</h3>
                    <p className="text-xl font-semibold text-gray-900">{bookings.length}</p> {/* Increased text size */}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                    <p className="text-xl font-semibold text-gray-900">{bookings.filter((b) => b.status === 'pending').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <svg className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-sm font-medium text-gray-500">Scheduled</h3>
                    <p className="text-xl font-semibold text-gray-900">{bookings.filter((b) => b.status === 'scheduled').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                    <p className="text-xl font-semibold text-gray-900">{bookings.filter((b) => b.status === 'completed').length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters - MORE PADDING and improved spacing */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-5"> {/* Increased padding from p-4 to p-5 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5"> {/* Increased gap from gap-4 to gap-5 */}
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
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-3"> {/* Flex-wrap added to handle smaller screens better */}
                  <button
                    onClick={() => handleFilterChange('pending')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeFilters.includes('pending')
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleFilterChange('scheduled')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeFilters.includes('scheduled')
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    Scheduled
                  </button>
                  <button
                    onClick={() => handleFilterChange('completed')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeFilters.includes('completed')
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => handleFilterChange('cancelled')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeFilters.includes('cancelled')
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
                {activeFilters.length > 0 && (
                  <button
                    onClick={() => setActiveFilters([])}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
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
                  </button>
                )}
              </div>
            </div>

            {/* Flights Table - IMPROVED TABLE STYLING */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-7 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                        /* Increased padding from px-6 py-3 to px-7 py-4 */
                      >
                        Asset
                      </th>
                      <th
                        scope="col"
                        className="px-7 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-7 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Service Type
                      </th>
                      <th
                        scope="col"
                        className="px-7 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Requested
                      </th>
                      <th
                        scope="col"
                        className="px-7 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Scheduled for
                      </th>
                      <th
                        scope="col"
                        className="px-7 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking, index) => (
                      <tr 
                        key={booking.BookingId || index} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewBookingDetails(booking.BookingId)}
                      >
                        <td className="px-7 py-5 whitespace-nowrap"> {/* Increased padding/spacing */}
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-11 w-11 bg-gray-100 rounded-md flex items-center justify-center">
                              {/* Increased icon size */}
                              <svg
                                className="h-7 w-7 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                            </div>
                            <div className="ml-5"> {/* Increased margin */}
                              <div className="text-sm font-medium text-gray-900">
                                {booking.assetName || 'Unnamed Asset'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.UserId || userInfo?.name || 'User'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-5 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                            ${
                              booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : booking.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : booking.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {booking.status
                              ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
                              : 'Pending'}
                          </span>
                        </td>
                        <td className="px-7 py-5 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.serviceType || booking.jobType || 'Standard'}
                          </div>
                          {booking.location && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <svg
                                className="w-3 h-3 mr-1"
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
                              {booking.location}
                            </div>
                          )}
                        </td>
                        <td className="px-7 py-5 whitespace-nowrap text-sm text-gray-500">
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-7 py-5 whitespace-nowrap text-sm text-gray-500">
                          {booking.flightDate
                            ? new Date(booking.flightDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Not scheduled'}
                        </td>
                        <td className="px-7 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              handleViewBookingDetails(booking.BookingId);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </button>
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button
                              onClick={() => booking.BookingId && cancelBooking(booking.BookingId)}
                              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-1.5 rounded-md transition-colors"
                              /* Increased button padding */
                            >
                              <svg
                                className="w-4 h-4 mr-1.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length === 0 && (
                <div className="py-12 text-center"> {/* Increased padding */}
                  <svg
                    className="mx-auto h-14 w-14 text-gray-300"
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
                  <p className="mt-4 text-gray-500 text-lg">No flights match your current filters</p> {/* Increased text size */}
                  <button
                    onClick={() => setActiveFilters([])}
                    className="mt-4 text-blue-600 hover:text-blue-800 inline-flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
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
                  </button>
                </div>
              )}
            </div>

            <div className="text-right text-sm text-gray-500 mb-6"> {/* Added bottom margin */}
              Showing {filteredBookings.length} of {bookings.length} flights
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default MyBookings;
