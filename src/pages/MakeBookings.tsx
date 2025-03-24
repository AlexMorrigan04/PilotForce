import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import AWS from 'aws-sdk';

// Define job types for each asset type
const jobTypesByAssetType = {
  buildings: [
    'Measured Survey/3D Model',
    'Visual Inspection',
    'Thermal/Infrared Survey',
    'Media Pack'
  ],
  area: [
    'Site Map',
    'Visual Inspection',
    '3D Model',
    'Thermal/Infrared Survey',
    'Media Pack'
  ],
  construction: [
    'Inspection/Flyover',
    'Live Site Visit',
    'Site Map',
    'Site 3D Model',
    'Documentation',
    'Security Patrol',
    'Media Pack'
  ]
};

// Define asset type
type AssetType = keyof typeof jobTypesByAssetType;

// Asset type details with icons and colors
const assetTypeDetails = {
  buildings: {
    title: 'Building',
    icon: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
    color: '#3182ce',
    strokeColor: '#2c5282',
    description: 'Rooftop inspection and surveying services'
  },
  construction: {
    title: 'Construction Site',
    icon: 'M13.7 19C13.9 19.3 14 19.6 14 20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20C10 19.6 10.1 19.3 10.3 19H2V21H14V23H2C1.5 23 1 22.5 1 22V3C1 2.5 1.5 2 2 2H22C22.5 2 23 2.5 23 3V15C23 15.5 22.5 16 22 16H13.7ZM16 10.4L21 5.4V3H3V17H11.2C11.6 16.4 12.3 16 13 16C13.7 16 14.4 16.4 14.8 17H21V16C21 11.8 16.5 10.9 16 10.4ZM4 5H20V7H4V5ZM4 9H20V11H4V9ZM4 13H14V15H4V13Z',
    color: '#dd6b20',
    strokeColor: '#9c4221',
    description: 'Aerial mapping, orthophotos and progress monitoring services'
  },
  area: {
    title: 'Area/Estate',
    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z',
    color: '#38a169',
    strokeColor: '#276749',
    description: 'High-resolution orthomasaics and detailed 3D models of defined areas'
  },
  security: {
    title: 'Security & Surveillance',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    color: '#805ad5',
    strokeColor: '#553c9a',
    description: 'Security and surveillance services'
  },
  infrastructure: {
    title: 'Infrastructure',
    icon: 'M17.66 5.84C17.43 5.31 16.95 5 16.4 5H7.6c-.55 0-1.03.31-1.26.84l-3.23 8.94C2.97 15.33 3.34 16 4 16h16c.67 0 1.03-.67.9-1.22l-3.24-8.94zM12 13.5 7 9h10l-5 4.5zM3 18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1H3v1z',
    color: '#e53e3e',
    strokeColor: '#c53030',
    description: 'Inspection and condition surveys for infrastructure'
  }
};

// Get asset type info
const getAssetTypeInfo = (type: string) => {
  return assetTypeDetails[type as keyof typeof assetTypeDetails] || {
    title: 'Unknown Type',
    icon: '',
    color: '#718096',
    strokeColor: '#4a5568',
    description: 'No description available'
  };
};

// Format date to readable string
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return 'Unknown date';
  }
};

const MakeBookings: React.FC = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [jobType, setJobType] = useState('');
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [scheduleType, setScheduleType] = useState('scheduled');
  const [date, setDate] = useState('');
  const [flexibility, setFlexibility] = useState('exact');
  const [repeatFrequency, setRepeatFrequency] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const FORMSPREE_ENDPOINT = process.env.FORMSPREE_ENDPOINT || ''; // Replace with your actual token

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

  const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  useEffect(() => {
    if (location.state && location.state.selectedAsset) {
      setAsset(location.state.selectedAsset);
      const center = turf.centroid(turf.polygon(location.state.selectedAsset.coordinates)).geometry.coordinates;
      setViewState({
        longitude: center[0],
        latitude: center[1],
        zoom: 16
      });
    }
  }, [location.state]);

  // Fetch company details when component loads
  useEffect(() => {
    if (user && user.companyId) {
      fetchCompanyDetails(user.companyId);
    }
  }, [user]);

  // Fetch user details when component loads
  useEffect(() => {
    if (user && user.username) {
      fetchUserDetails(user.username);
    }
  }, [user]);

  useEffect(() => {
    // Check if the page has already been reloaded
    if (!sessionStorage.getItem('reloaded')) {
      sessionStorage.setItem('reloaded', 'true');
      window.location.reload();
    }
  }, []);

  // Function to fetch company details including email domain
  const fetchCompanyDetails = async (companyId: string) => {
    try {
      console.log("Attempting to fetch company details for CompanyId:", companyId);
      
      // Use scan instead of get to find company by companyId
      const params = {
        TableName: 'Companies',
        FilterExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      };
      
      const result = await dynamoDb.scan(params).promise();
      if (result.Items && result.Items.length > 0) {
        setCompanyDetails(result.Items[0]);
        console.log("Company details found:", result.Items[0]);
      } else {
        console.warn("No company found with CompanyId:", companyId);
        // Still create a basic company object with the ID to prevent errors
        setCompanyDetails({ 
          CompanyId: companyId, 
          CompanyName: 'Unknown Company' 
        });
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      // Create fallback company object
      setCompanyDetails({ 
        CompanyId: companyId, 
        CompanyName: 'Unknown Company' 
      });
    }
  };

  // Function to fetch user details including email domain
  const fetchUserDetails = async (username: string) => {
    try {
      console.log("Attempting to fetch user details for username:", username);
      
      // Use scan with the correct key structure based on the table schema
      const params = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      };
      
      console.log("User query params:", params);
      
      const result = await dynamoDb.scan(params).promise();
      if (result.Items && result.Items.length > 0) {
        const userData = result.Items[0];
        setUserDetails(userData);
        console.log("User details found:", userData);
        
        // Log the specific attributes using the correct case from the schema
        console.log("User email:", userData.Email);
        console.log("User phone:", userData.PhoneNumber || "Not found");
        console.log("User email domain:", userData.EmailDomain || "Not found");
      } else {
        console.warn("No user found with username:", username);
        
        // Try alternative capitalization
        const altParams = {
          TableName: 'Users',
          FilterExpression: 'Username = :username OR username = :username',
          ExpressionAttributeValues: {
            ':username': username
          }
        };
        
        console.log("Trying alternative query:", altParams);
        const altResult = await dynamoDb.scan(altParams).promise();
        
        if (altResult.Items && altResult.Items.length > 0) {
          const userData = altResult.Items[0];
          setUserDetails(userData);
          console.log("User details found with alternative query:", userData);
        } else {
          // Create a fallback user object with the correct attribute names
          setUserDetails({ 
            Username: username, 
            Email: `${username}@example.com`,
            EmailDomain: 'example.com',
            PhoneNumber: '',
            UserRole: 'User',
            CompanyId: user?.companyId || ''
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Create fallback user object with correct attribute names
      setUserDetails({ 
        Username: username, 
        Email: `${username}@example.com`,
        EmailDomain: 'example.com',
        PhoneNumber: '',
        UserRole: 'User',
        CompanyId: user?.companyId || ''
      });
    }
  };

  const handleJobTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJobType(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!user) {
      setError('You must be logged in to make a booking');
      setIsSubmitting(false);
      return;
    }

    console.log("Submit booking initiated for user:", user.username);
    console.log("Current user details:", userDetails);
    console.log("Current company details:", companyDetails);

    if (!jobType.trim() || !date.trim() || !asset) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    // Generate a unique BookingId
    const bookingId = `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Log the current user information before creating booking using correct case
    console.log("User email to add to booking:", userDetails?.Email || "Not available");
    console.log("User phone to add to booking:", userDetails?.PhoneNumber || "Not available");
    console.log("Email domain to add to booking:", userDetails?.EmailDomain || "Not available");
    console.log("Asset postcode to add to booking:", asset.postcode || "Not available");

    try {
      // Extract user contact information with correct attribute names
      const userEmail = userDetails?.Email || ''; 
      const userPhone = userDetails?.PhoneNumber || '';
      let emailDomain = userDetails?.EmailDomain || '';
      
      // If the EmailDomain is not available in userDetails, extract from email
      if (!emailDomain && userEmail) {
        const domainPart = userEmail.split('@')[1] || '';
        emailDomain = domainPart;
      }
      
      // Strip the domain to just the organization name (before any domain extension)
      let strippedDomain = '';
      if (emailDomain) {
        // Match only the first part of the domain (before any dot)
        const domainMatch = emailDomain.match(/^([^.]+)/);
        strippedDomain = domainMatch ? domainMatch[1] : '';
      }
      
      console.log("Original email domain:", emailDomain);
      console.log("Stripped email domain:", strippedDomain);
      
      const assetPostcode = asset.postcode || '';
      
      // Create the booking object with the correct user contact information
      const newBooking = {
        CompanyId: user.companyId, // Use CompanyId as the partition key
        BookingId: bookingId, // Use BookingId as the sort key
        assetId: asset.AssetId,
        assetName: asset.name,
        createdAt: new Date().toISOString(),
        flightDate: date,
        jobType,
        location: `${viewState.latitude}, ${viewState.longitude}`,
        status: 'pending',
        userName: user.username || 'Unknown User',
        // Add the postcode from the asset
        postcode: assetPostcode,
        // Add user contact information
        userEmail: userEmail, // Add the email from userDetails
        userPhone: userPhone, // Add the phone number from userDetails
        emailDomain: strippedDomain, // Use the stripped domain name
        // Ensure there are some minimal company details
        companyName: companyDetails?.CompanyName || 'Unknown Company'
      };

      console.log('Final booking object to be saved:', newBooking);

      // Save to DynamoDB
      const params = {
        TableName: 'Bookings',
        Item: newBooking,
      };

      setError(null);

      // Save to DynamoDB
      await dynamoDb.put(params).promise();
      console.log('Booking submitted successfully to DynamoDB with ID:', bookingId);
      
      // Prepare simplified email data - only include key information from the booking
      const emailData = {
        // Booking information
        bookingId: bookingId,
        jobType: jobType,
        flightDate: date,
        status: 'pending',
        
        // Asset information
        assetName: asset.name,
        assetId: asset.AssetId,
        assetType: asset.type,
        assetLocation: `${viewState.latitude}, ${viewState.longitude}`,
        assetPostcode: assetPostcode || 'Not specified',
        
        // User contact information
        userName: user.username,
        userEmail: userEmail,
        userPhone: userPhone,
        emailDomain: strippedDomain,
        
        // Company information
        companyId: user.companyId,
        
        // Submission timestamp
        submittedAt: new Date().toISOString()
      };
      
      // Send to Formspree
      console.log('Sending email data to Formspree:', emailData);
      const formspreeResponse = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      console.log('Formspree response status:', formspreeResponse.status);
      const responseText = await formspreeResponse.text();
      console.log('Formspree response:', responseText);
      
      if (!formspreeResponse.ok) {
        // If Formspree fails, still continue (the booking is already saved to DynamoDB)
        console.warn('Email notification failed, but booking was saved:', responseText);
      } else {
        console.log('Email notification sent successfully');
      }
      
      // After successful submission
      setBookingSuccess(true);
      
      // Navigate after a short delay to show success state
      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
    } catch (err) {
      console.error('Error submitting booking:', err);
      if (err instanceof Error) {
        setError('Failed to submit booking: ' + err.message);
      } else {
        setError('Failed to submit booking');
      }
      setIsSubmitting(false);
    }
  };

  const getJobTypes = () => {
    if (!asset) return [];
    return jobTypesByAssetType[asset.type as AssetType] || [];
  };

  if (bookingSuccess) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful!</h2>
            <p className="text-gray-600 mb-6">Your service has been scheduled successfully. You'll receive a confirmation soon.</p>
            <button 
              onClick={() => navigate('/my-bookings')}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <button
                  onClick={() => navigate(-1)}
                  className="mr-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold">Book a Drone Service</h1>
              </div>
              {asset && (
                <p className="text-blue-100 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {asset.name} • {getAssetTypeInfo(asset.type).title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {error && (
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
        )}
        
        {!asset ? (
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Asset Selected</h3>
            <p className="mt-1 text-gray-500 mb-6">Please select an asset first to book a service.</p>
            <button
              onClick={() => navigate('/assets')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Assets
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Booking Form */}
            <div className="space-y-6">
              {/* Progress Steps */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${jobType ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-2`}>
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200">
                    <div className={`h-full ${jobType && date ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: jobType ? '100%' : '0%' }}></div>
                  </div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mx-2`}>
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200">
                    <div className={`h-full ${date ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: date ? '100%' : '0%' }}></div>
                  </div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isSubmitting ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'} ml-2`}>
                    <span className="text-sm font-semibold">3</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Select Service</span>
                  <span>Choose Schedule</span>
                  <span>Confirm</span>
                </div>
              </div>
              
              {/* Asset Details Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                  <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{
                    backgroundColor: getAssetTypeInfo(asset.type).color,
                    color: 'white'
                  }}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAssetTypeInfo(asset.type).icon} />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-gray-900">Asset Information</h2>
                  </div>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Asset Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Asset Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getAssetTypeInfo(asset.type).title}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Area Size</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.area ? asset.area.toLocaleString() : '0'} m²</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Postcode</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.postcode || "Not specified"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Service Selection */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Select Service</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the type of service you need for this asset:
                  </p>
                  
                  <div className="space-y-3">
                    {getJobTypes().map((type, index) => (
                      <div 
                        key={index}
                        onClick={() => setJobType(type)}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200
                          ${jobType === type 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                      >
                        <input
                          type="radio"
                          id={`job-type-${index}`}
                          name="jobType"
                          value={type}
                          checked={jobType === type}
                          onChange={() => setJobType(type)}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={`job-type-${index}`} className="ml-3 flex-1 block text-sm font-medium text-gray-700">
                          {type}
                        </label>
                        {jobType === type && (
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Scheduling Options */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Schedule Service</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        onClick={() => setScheduleType('scheduled')}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          scheduleType === 'scheduled' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="scheduled"
                            name="scheduleType"
                            checked={scheduleType === 'scheduled'}
                            onChange={() => setScheduleType('scheduled')}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="scheduled" className="ml-2 block text-sm font-medium text-gray-700">
                            Specific Date
                          </label>
                        </div>
                      </div>
                      
                      <div 
                        onClick={() => setScheduleType('flexible')}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          scheduleType === 'flexible' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="flexible"
                            name="scheduleType"
                            checked={scheduleType === 'flexible'}
                            onChange={() => setScheduleType('flexible')}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="flexible" className="ml-2 block text-sm font-medium text-gray-700">
                            Flexible Date
                          </label>
                        </div>
                      </div>
                      
                      <div 
                        onClick={() => setScheduleType('repeat')}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          scheduleType === 'repeat' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="repeat"
                            name="scheduleType"
                            checked={scheduleType === 'repeat'}
                            onChange={() => setScheduleType('repeat')}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="repeat" className="ml-2 block text-sm font-medium text-gray-700">
                            Recurring
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {scheduleType === 'scheduled' && (
                        <>
                          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                            Select a specific date for the service:
                          </label>
                          <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </>
                      )}
                      
                      {scheduleType === 'flexible' && (
                        <>
                          <p className="text-sm text-gray-600 mb-3">
                            Select a preferred date with flexibility:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="flexible-date" className="block text-sm font-medium text-gray-700 mb-1">
                                Preferred Date
                              </label>
                              <input
                                type="date"
                                id="flexible-date"
                                value={date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="flexibility" className="block text-sm font-medium text-gray-700 mb-1">
                                Flexibility
                              </label>
                              <select
                                id="flexibility"
                                value={flexibility}
                                onChange={(e) => setFlexibility(e.target.value)}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="exact">Exact Date</option>
                                <option value="1-day">±1 Day</option>
                                <option value="3-days">±3 Days</option>
                                <option value="1-week">±1 Week</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {scheduleType === 'repeat' && (
                        <>
                          <p className="text-sm text-gray-600 mb-3">
                            Schedule a recurring service:
                          </p>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  id="start-date"
                                  value={startDate}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  id="end-date"
                                  value={endDate}
                                  min={startDate || new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label htmlFor="repeat-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                                Repeat Frequency
                              </label>
                              <select
                                id="repeat-frequency"
                                value={repeatFrequency}
                                onChange={(e) => setRepeatFrequency(e.target.value)}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !jobType || (scheduleType === 'scheduled' && !date) || (scheduleType === 'flexible' && !date) || (scheduleType === 'repeat' && (!startDate || !endDate))}
                      className={`w-full mt-4 inline-flex justify-center items-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isSubmitting || !jobType || (scheduleType === 'scheduled' && !date) || (scheduleType === 'flexible' && !date) || (scheduleType === 'repeat' && (!startDate || !endDate))
                          ? 'bg-blue-300 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>Book Service</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Map & Visualization */}
            <div className="space-y-6">
              {/* Map */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Service Location</h2>
                </div>
                <div className="h-[400px]">
                  <Map
                    {...viewState}
                    onMove={(evt: any) => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                    mapboxAccessToken="pk.eyJ1IjoiYWxleGh1dGNoaW5nczA0IiwiYSI6ImNtN2tnMHQ3aTAwOTkya3F0bTl4YWtpNnoifQ.hnlbKPcuZiTUdRzNvjrv2Q"
                    onLoad={() => setMapLoaded(true)}
                  >
                    {/* <NavigationControl position="top-right" /> */}
                    
                    {mapLoaded && asset && asset.coordinates && (
                      <Source
                        id="asset-polygon"
                        type="geojson"
                        data={{
                          type: 'Feature',
                          properties: {},
                          geometry: {
                            type: 'Polygon',
                            coordinates: asset.coordinates,
                          },
                        }}
                      >
                        <Layer
                          id="asset-polygon-fill"
                          type="fill"
                          paint={{
                            'fill-color': getAssetTypeInfo(asset.type).color,
                            'fill-opacity': 0.4,
                          }}
                        />
                        <Layer
                          id="asset-polygon-outline"
                          type="line"
                          paint={{
                            'line-color': getAssetTypeInfo(asset.type).strokeColor,
                            'line-width': 2,
                          }}
                        />
                      </Source>
                    )}
                  </Map>
                </div>
              </div>
              
              {/* Service Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Service Information</h2>
                </div>
                <div className="p-6">
                  {/* <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
                    <h3 className="text-md font-medium text-blue-900 mb-1 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      About Drone Services
                    </h3>
                    <p className="text-sm text-blue-700">
                      Our professional drone services are conducted by licensed drone pilots using enterprise-grade equipment. All services comply with local aviation regulations.
                    </p>
                  </div> */}
                  
                  {jobType && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Service:</h3>
                      <div className="bg-gray-100 rounded-lg p-3 flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{jobType}</p>
                          <p className="text-xs text-gray-500">For {getAssetTypeInfo(asset.type).title}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(date || startDate) && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Schedule Details:</h3>
                      <div className="bg-gray-100 rounded-lg p-3 flex items-center">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          {scheduleType === 'scheduled' && date && (
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(date).toLocaleDateString('en-GB', { 
                                weekday: 'long',
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                          
                          {scheduleType === 'flexible' && date && (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(date).toLocaleDateString('en-GB', { 
                                  weekday: 'long',
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                              <p className="text-xs text-gray-500">With {flexibility} flexibility</p>
                            </div>
                          )}
                          
                          {scheduleType === 'repeat' && startDate && endDate && (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {repeatFrequency.charAt(0).toUpperCase() + repeatFrequency.slice(1)} service
                              </p>
                              <p className="text-xs text-gray-500">
                                From {new Date(startDate).toLocaleDateString()} 
                                to {new Date(endDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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

export default MakeBookings;