import React, { useState, useEffect, useContext } from 'react';
import AWS from 'aws-sdk';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import { Navbar } from '../components/Navbar';
import { BookingsList } from '../components/bookings/BookingsList';
import { BookingFilters } from '../components/bookings/BookingFilters';
import { EmptyBookingState } from '../components/bookings/EmptyBookingState';
import { Booking, BookingStatus } from '../types/bookingTypes';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import * as exifr from 'exifr'; // Import exifr
import 'mapbox-gl/dist/mapbox-gl.css'; // Import MapBox CSS
import { GeoTiffUploader } from '../components/bookings/GeoTiffUploader'; // Import GeoTiffUploader
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';

// Add a Mapbox access token constant near the top of the file
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MyBookings: React.FC = () => {
  const { user } = useContext(AuthContext); // Get the authenticated user
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
  const [imageLocations, setImageLocations] = useState<{url: string, latitude: number, longitude: number}[]>([]);
  const [geoTiffFiles, setGeoTiffFiles] = useState<{[bookingId: string]: string}>({});
  const [filterByCurrentUser, setFilterByCurrentUser] = useState<boolean>(false);

  // Explicitly define AWS credentials and region
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  // Directly use the hardcoded credentials
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });

  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  // Get user info from token - Fix token parsing
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Safely parse the token
        const parts = token.split('.');
        if (parts.length === 3) { // Verify token has 3 parts (header.payload.signature)
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          try {
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            setUserInfo(JSON.parse(jsonPayload));
          } catch (error) {
            console.error('Failed to decode token payload:', error);
          }
        } else {
          console.error('Token format is invalid');
        }
      }
    } catch (error) {
      console.error('Error handling token:', error);
    }
  }, []);

  // Fetch bookings from DynamoDB
  useEffect(() => {
    if (user && user.companyId) { // Make sure user and companyId exist
      setLoading(true);
      setError(null);
      
      // The issue is here - we can't use CompanyId as a key condition if it's not part of the primary key
      // Let's use scan with a filter expression instead of query
      const params = {
        TableName: 'Bookings',
        FilterExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': user.companyId
        }
      };
      
      console.log('Fetching bookings with params:', params);
      
      // Use scan instead of query since CompanyId might not be the primary key
      dynamoDb.scan(params, (err, data) => {
        if (err) {
          console.error('Error fetching bookings:', err);
          setError('Failed to fetch bookings: ' + err.message);
          setLoading(false);
        } else {
          console.log('Fetched bookings:', data.Items);
          
          // Filter bookings by username if needed
          const items = data.Items || []; // Handle undefined Items
          const filteredBookings = items.filter(booking => 
            !filterByCurrentUser || booking.userName === user.username
          );
          
          // Convert to proper Booking type
          const typedBookings = filteredBookings.map(item => ({
            id: item.BookingId,
            UserId: item.userName,
            CompanyId: item.CompanyId,
            BookingId: item.BookingId,
            assetId: item.assetId,
            assetName: item.assetName,
            createdAt: item.createdAt,
            flightDate: item.flightDate,
            jobType: item.jobType,
            location: item.location,
            status: item.status,
            userName: item.userName
          }));
          
          console.log('Processed bookings:', typedBookings);
          setBookings(typedBookings);
          setFilteredBookings(typedBookings);
          setLoading(false);
        }
      });
    } else {
      console.warn('User or companyId not available, cannot fetch bookings');
      setError('You must be logged in to view bookings');
      setLoading(false);
    }
  }, [user?.companyId, filterByCurrentUser]);

  // Function to get user ID from localStorage as a fallback
  const getUserIdFromLocalStorage = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id || parsedUser.userId || parsedUser.sub;
      }
      
      // Try to extract from token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.sub || payload.user_id;
          }
        } catch (e) {
          console.error('Error parsing token for user ID:', e);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID from localStorage:', error);
      return null;
    }
  };

  interface FetchBookingsParams {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: {
      ':userId': string;
    };
  }

  interface DynamoDBResponse {
    Items: Booking[];
  }

  const fetchBookings = async (userId: string): Promise<void> => {
    if (!userId) {
      console.error('User ID is required to fetch bookings');
      setError('User ID is missing. Please login again.');
      setLoading(false);
      return;
    }

    // Another issue might be here - using KeyConditionExpression with UserId
    // Since we're not sure about the table's key schema, let's use FilterExpression instead
    const params = {
      TableName: 'Bookings',
      FilterExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    try {
      const data = await dynamoDb.scan(params).promise();
      
      const items: Booking[] = data.Items?.map(item => ({
        UserId: item.UserId || item.userId || '',
        BookingId: item.BookingId || item.id || '',
        id: item.BookingId || item.id || '',
        userId: item.UserId || item.userId || '',
        jobName: item.JobName || item.jobName || '',
        companyId: item.CompanyId || item.companyId || '',
        companyName: item.CompanyName || item.companyName || '',
        assetName: item.AssetName || item.assetName || '',
        flightDate: item.FlightDate || item.flightDate || '',
        dateFlexibility: item.DateFlexibility || item.dateFlexibility || '',
        repeat: item.Repeat || item.repeat || '',
        repeatFrequency: item.RepeatFrequency || item.repeatFrequency || '',
        location: item.Location || item.location || '',
        siteContact: item.SiteContact || item.siteContact || '',
        siteContactNumber: item.SiteContactNumber || item.siteContactNumber || '',
        notes: item.Notes || item.notes || '',
        inspectionOptions: item.InspectionOptions || item.inspectionOptions || '',
        inspectionDetail: item.InspectionDetail || item.inspectionDetail || '',
        surveyType: item.SurveyType || item.surveyType || '',
        surveyDetail: item.SurveyDetail || item.surveyDetail || '',
        thermalType: item.ThermalType || item.thermalType || '',
        mediaOptions: item.MediaOptions || item.mediaOptions || '',
        status: item.Status as BookingStatus || 'pending',
        time: item.Time || item.time || '',
        dateTime: item.DateTime || item.dateTime || '',
        contactPerson: item.SiteContact || item.contactPerson || '',
        contactPhone: item.SiteContactNumber || item.contactPhone || '',
        contactEmail: item.ContactEmail || item.contactEmail || '',
        serviceType: item.ServiceType || item.serviceType || '',
        address: item.Address || item.address || '',
        propertyType: item.PropertyType || item.propertyType || '',
        images: item.Images || [],
        createdAt: item.createdAt || '' // Add createdAt property
      })) || [];
      
      setBookings(items);
      setFilteredBookings(items);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to fetch your bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to fetch images from S3 bucket and extract geolocation data
  const fetchImages = async (bookingId: string) => {
    const params = {
      Bucket: 'drone-images-bucket',
      Prefix: `uploads/${bookingId}/`
    };

    try {
      const data = await s3.listObjectsV2(params).promise();
      
      // Look for normal images
      const imageUrls = data.Contents?.map(item => ({
        url: `https://${params.Bucket}.s3.amazonaws.com/${item.Key}`,
        key: item.Key
      })) || [];
      setImages(imageUrls);
      
      // Check for GeoTIFF files
      const geoTiffObjects = data.Contents?.filter(item => 
        item.Key && (
          item.Key.endsWith('.tif') || 
          item.Key.endsWith('.tiff') || 
          item.Key.endsWith('.geotiff')
        )
      );
      
      if (geoTiffObjects && geoTiffObjects.length > 0) {
        const geoTiffUrl = `https://${params.Bucket}.s3.amazonaws.com/${geoTiffObjects[0].Key}`;
        const filename = geoTiffObjects && geoTiffObjects[0] && geoTiffObjects[0].Key ? geoTiffObjects[0].Key.split('/').pop() || '' : '';
        console.log(`GeoTIFF Filename: ${filename}`);
        setGeoTiffFiles(prev => ({...prev, [bookingId]: geoTiffUrl}));
      }
      
      // Extract geolocation for all images
      const locationsPromises = imageUrls.map(async (image) => {
        const location = await extractGeolocation(image.url);
        if (location) {
          return { 
            url: image.url, 
            latitude: location.latitude, 
            longitude: location.longitude 
          };
        }
        return null;
      });
      
      const locations = (await Promise.all(locationsPromises)).filter(Boolean) as {url: string, latitude: number, longitude: number}[];
      setImageLocations(locations);
    } catch (error) {
      console.error('Error fetching images from S3:', error);
    }
  };

  // Extract geolocation data from images using exifr
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

  // Log geolocation of images when bookings are loaded
  useEffect(() => {
    if (!loading && bookings.length > 0) {
      bookings.forEach(async (booking) => {
        if (booking.images && booking.images.length > 0) {
          for (const image of booking.images) {
            const geolocation = await extractGeolocation(image);
            if (geolocation) {
              console.log(`Image: ${image}, Geolocation: ${geolocation.latitude}, ${geolocation.longitude}`);
            }
          }
        }
      });
    }
  }, [loading, bookings]);

  const handleFilterChange = (status: BookingStatus) => {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter(s => s !== status));
    } else {
      setActiveFilters([...activeFilters, status]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Apply filters and search when either changes
  useEffect(() => {
    let filtered = [...bookings];
    
    // Apply status filters if any are active
    if (activeFilters.length > 0) {
      filtered = filtered.filter(booking => activeFilters.includes(booking.status as BookingStatus));
    }
    
    // Apply search term if not empty
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.assetName && booking.assetName.toLowerCase().includes(searchLower)) ||
        (booking.UserId && booking.UserId.toLowerCase().includes(searchLower)) ||
        (booking.location && booking.location.toLowerCase().includes(searchLower)) ||
        (booking.serviceType && booking.serviceType.toLowerCase().includes(searchLower)) ||
        (booking.jobType && booking.jobType.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredBookings(filtered);
  }, [bookings, activeFilters, searchTerm]);

  // Enhanced function to fetch GeoTIFF information for bookings
  const fetchGeoTiffInfo = async (bookingId: string) => {
    const params = {
      TableName: 'GeoTiffUploads',
      FilterExpression: 'BookingId = :bookingId',
      ExpressionAttributeValues: {
        ':bookingId': bookingId
      }
    };

    try {
      const data = await dynamoDb.scan(params).promise();
      if (data.Items && data.Items.length > 0) {
        const geoTiff = data.Items[0];
        
        // If the entry has a direct S3 URL, use it
        if (geoTiff.s3Url) {
          setGeoTiffFiles(prev => ({...prev, [bookingId]: geoTiff.s3Url}));
          return;
        }
        
        // If the entry has an S3 key, generate a signed URL
        if (geoTiff.s3Key) {
          const s3Params = {
            Bucket: 'drone-images-bucket',
            Key: geoTiff.s3Key,
            Expires: 3600 // URL expires in 1 hour
          };
          
          const signedUrl = s3.getSignedUrl('getObject', s3Params);
          setGeoTiffFiles(prev => ({...prev, [bookingId]: signedUrl}));
          return;
        }
        
        // If we have a filename but no direct URL/key
        if (geoTiff.filename) {
          // Try to construct a possible S3 key based on common patterns
          const potentialKey = `uploads/${bookingId}/${geoTiff.filename}`;
          
          try {
            // Check if the object exists at this key
            await s3.headObject({
              Bucket: 'drone-images-bucket',
              Key: potentialKey
            }).promise();
            
            // If we reach here, the object exists
            const s3Params = {
              Bucket: 'drone-images-bucket',
              Key: potentialKey,
              Expires: 3600
            };
            
            const signedUrl = s3.getSignedUrl('getObject', s3Params);
            setGeoTiffFiles(prev => ({...prev, [bookingId]: signedUrl}));
          } catch (headErr) {
            // Continue to S3 bucket scan
          }
        }
      }
    } catch (error) {
      console.error('Error fetching GeoTIFF info:', error);
    }
  };

  const navigate = useNavigate(); // Initialize useNavigate

  const handleViewBooking = (booking: Booking) => {
    navigate(`/flight-details/${booking.id}`); // Redirect to FlightDetails page
  };

  // Update the cancelBooking function to use proper error handling
  const cancelBooking = (bookingId: string) => {
    if (!user || !user.companyId) {
      setError('You must be logged in to cancel a booking');
      return;
    }
    
    if (!bookingId) {
      setError('Invalid booking ID');
      return;
    }
    
    const params = {
      TableName: 'Bookings',
      Key: {
        CompanyId: user.companyId,
        BookingId: bookingId
      },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'cancelled'
      },
      ReturnValues: 'ALL_NEW' // Return the updated item
    };
    
    setLoading(true);
    
    dynamoDb.update(params, (err, data) => {
      setLoading(false);
      
      if (err) {
        console.error('Error cancelling booking:', err);
        setError('Failed to cancel booking: ' + err.message);
      } else {
        // Update local state after successful cancellation
        setBookings(bookings.map(booking => 
          booking.BookingId === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        ));
        
        // Also update filtered bookings
        setFilteredBookings(filteredBookings.map(booking => 
          booking.BookingId === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        ));
      }
    });
  };

  // Define breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Dashboard', href: '/dashboard', current: false },
    { name: 'Flights', href: '/my-bookings', current: true }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Flights</h1>
              <p className="text-blue-100">View and manage all your drone inspection bookings</p>
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

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
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
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
            {/* Flight statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Flights</h3>
                    <p className="text-lg font-semibold text-gray-900">{bookings.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                    <p className="text-lg font-semibold text-gray-900">{bookings.filter(b => b.status === 'pending').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Scheduled</h3>
                    <p className="text-lg font-semibold text-gray-900">{bookings.filter(b => b.status === 'scheduled').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                    <p className="text-lg font-semibold text-gray-900">{bookings.filter(b => b.status === 'completed').length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search flights by asset name, location, or job type..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex space-x-2">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Flights Table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 mb-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled for</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.BookingId || `booking-${Math.random()}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.assetName || 'Unnamed Asset'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.UserId || userInfo?.name || 'User'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                            ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            booking.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                            booking.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                            {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.serviceType || booking.jobType || 'Standard'}</div>
                          {booking.location && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {booking.location}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.flightDate ? new Date(booking.flightDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Not scheduled'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewBooking(booking)}
                            className="inline-flex items-center bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-md transition-colors mr-2"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Details
                          </button>
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button 
                              onClick={() => booking.BookingId && cancelBooking(booking.BookingId)}
                              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded-md transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <div className="py-10 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No flights match your current filters</p>
                  <button 
                    onClick={() => setActiveFilters([])} 
                    className="mt-3 text-blue-600 hover:text-blue-800 inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
            
            <div className="text-right text-sm text-gray-500">
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
