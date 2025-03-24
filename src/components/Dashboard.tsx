"use client";
import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { StatCard } from "./StatCard";
import { Stat, Inspection } from "../types/types";
import { InspectionCard } from "./InspectionCard";
import { Link } from "react-router-dom";
import AWS from 'aws-sdk';
import { useAuth } from "../context/AuthContext";
import { 
  getAssetsForCompany, 
  getBookingsForCompany, 
  getCompanyUserIds, 
  getCompanyMediaCount 
} from "../utils/companyData";
import CompanyUsers from "./users/CompanyUsers";
import PendingUserRequests from "./users/PendingUserRequests";
import { FaUserClock } from "react-icons/fa";
import { fetchBookingsForUser } from '../services/companyData';
import { Booking } from '../types/bookingTypes';

interface UserInfo {
  sub: string;
  name: string;
  username: string;
  email: string;
  CompanyId: string;
  CreatedAt: string;
  EmailDomain: string;
  PhoneNumber: string;
  UserAccess: boolean;
  UserId: string;
  UserRole: string;
  [key: string]: any;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[]>([
    {
      count: "0",
      label: "Total Flights",
      icon: "https://cdn.builder.io/api/v1/image/assets/57d443971e034b5aa8182c7c5505dac4/2ebef65e9853561666e237ba514f4ddc6deae922724dfe2169a92af91cc99301",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      count: "0",
      label: "Assets",
      icon: "https://cdn.builder.io/api/v1/image/assets/57d443971e034b5aa8182c7c5505dac4/120ad79c899c00d01633295eb235c21adc053a67341313e8b6c8b1ad467ca0e6",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      count: "0",
      label: "Media Captured",
      icon: "https://cdn.builder.io/api/v1/image/assets/57d443971e034b5aa8182c7c5505dac4/50991cb61931548b1af151e39927e0f1946b6656771a4f36bd3c404708c6b945",
      bgColor: "bg-fuchsia-100",
      textColor: "text-fuchsia-700",
    },
  ]);

  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showPendingRequestsSection, setShowPendingRequestsSection] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [companyBookings, setCompanyBookings] = useState<Booking[]>([]);
  const [userDetails, setUserDetails] = useState<UserInfo | null>(null);

  // AWS configuration for DynamoDB access
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  // Retrieve user information from localStorage
  const token = localStorage.getItem('token');
  let userInfo: UserInfo | null = null;
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      userInfo = JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
    }
  }

  // Function to format booking data for display
  const formatBookingForDisplay = (booking: any): Inspection => {
    const placeholderImages = [
      "https://cdn.builder.io/api/v1/image/assets/57d443971e034b5aa8182c7c5505dac4/d2fd14c7fa965f424d83c5f7a3af610f9eacdc63af145030dfe063f9b4ff9523",
      "https://cdn.builder.io/api/v1/image/assets/57d443971e034b5aa8182c7c5505dac4/c60ca97bb1a17b01a2842eb7be997a27eba678b6b08932d96fc630e8d34d5b8f"
    ];

    const bookingId = booking.BookingId || booking.id || '';
    const imageIndex = bookingId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % placeholderImages.length;

    const displayAssetName = booking.assetName || "No asset name";
    const displayDate = booking.flightDate || 
      (booking.DateTime ? new Date(booking.DateTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : "Date not specified");

    const imagesCount = booking.images?.length || booking.Images?.length || undefined;
    let displayStatus = (booking.Status || booking.status || 'pending').toLowerCase();
    if (imagesCount && imagesCount > 0) {
      displayStatus = 'completed';
    } else if (displayStatus === 'in progress' || displayStatus === 'in_progress') {
      displayStatus = 'in-progress';
    }

    return {
      imageUrl: booking.imageUrl || placeholderImages[imageIndex],
      address: displayAssetName,
      date: displayDate,
      imagesCount: imagesCount,
      status: displayStatus as "completed" | "in progress" | "scheduled"
    };
  };

  const fetchUserInfo = async () => {
    if (!user || !user.id || !user.companyId) {
      console.log("User not authenticated or missing ID/CompanyId");
      return;
    }
  
    try {
      const userId = user.id;
      const companyId = user.companyId;
      const params = {
        TableName: 'Users',
        Key: {
          CompanyId: companyId,
          UserId: userId
        }
      };
  
      console.log("Fetching user info for user ID:", userId);
      const userInfoResult = await dynamoDb.get(params).promise();
      if (userInfoResult.Item) {
        console.log("User info:", userInfoResult.Item);
        setUserDetails(userInfoResult.Item as UserInfo);
  
        // Fetch and log the number of assets associated with the CompanyId
        const assetParams = {
          TableName: 'Assets',
          FilterExpression: 'CompanyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        };
  
        console.log("Fetching assets for company ID:", companyId);
        const assetResult = await dynamoDb.scan(assetParams).promise();
        const totalAssets = assetResult.Items?.length || 0;
        console.log(`Total assets for company ID ${companyId}:`, totalAssets);
  
        // Update the Assets stat card with the number of assets
        setStats(prevStats => prevStats.map(stat => 
          stat.label === "Assets" ? { ...stat, count: totalAssets.toString() } : stat
        ));
  
        // Fetch and log the number of bookings associated with the CompanyId
        const bookingParams = {
          TableName: 'Bookings',
          FilterExpression: 'CompanyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        };
  
        console.log("Fetching bookings for company ID:", companyId);
        const bookingResult = await dynamoDb.scan(bookingParams).promise();
        const totalBookings = bookingResult.Items?.length || 0;
        console.log(`Total bookings for company ID ${companyId}:`, totalBookings);
  
        // Update the Total Flights stat card with the number of bookings
        setStats(prevStats => prevStats.map(stat => 
          stat.label === "Total Flights" ? { ...stat, count: totalBookings.toString() } : stat
        ));
  
        // Fetch and log the number of images associated with the CompanyId
        const mediaParams = {
          TableName: 'ImageUploads',
          FilterExpression: 'CompanyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        };
  
        console.log("Media params:", mediaParams);
        console.log("Fetching media for company ID:", companyId);
        const mediaResult = await dynamoDb.scan(mediaParams).promise();
        console.log("Media result:", mediaResult);
        const totalMedia = mediaResult.Items?.length || 0;
        console.log(`Total media for company ID ${companyId}:`, totalMedia);
  
        // Update the Media Captured stat card with the number of images
        setStats(prevStats => prevStats.map(stat => 
          stat.label === "Media Captured" ? { ...stat, count: totalMedia.toString() } : stat
        ));
      } else {
        console.log("User not found in Users table");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !user.id || !user.companyId) {
        console.log("User not authenticated or missing ID/CompanyId");
        return;
      }
      try {
        const userId = user.id;
        const companyId = user.companyId;
        let totalInspections = 0;
        let totalAssets = 0;
        let totalMedia = 0;

        // Get all company's assets using the CompanyId
        try {
          const assetParams = {
            TableName: 'Assets',
            FilterExpression: 'CompanyId = :companyId',
            ExpressionAttributeValues: {
              ':companyId': companyId
            }
          };

          console.log("Asset params:", assetParams);
          console.log("Fetching assets for company ID:", companyId);
          const assetResult = await dynamoDb.scan(assetParams).promise();
          console.log("Asset result:", assetResult);
          totalAssets = assetResult.Items?.length || 0;
          console.log(`Found ${totalAssets} assets for company ID ${companyId}`);

          // Update the Assets stat card with the number of assets
          setStats(prevStats => prevStats.map(stat => 
            stat.label === "Assets" ? { ...stat, count: totalAssets.toString() } : stat
          ));
        } catch (assetError) {
          console.error("Error fetching assets:", assetError);
          totalAssets = 0;
        }

        // Get all company's bookings using the CompanyId
        try {
          const bookingParams = {
            TableName: 'Bookings',
            FilterExpression: 'CompanyId = :companyId',
            ExpressionAttributeValues: {
              ':companyId': companyId
            }
          };

          console.log("Booking params:", bookingParams);
          console.log("Fetching bookings for company ID:", companyId);
          const bookingResult = await dynamoDb.scan(bookingParams).promise();
          console.log("Booking result:", bookingResult);
          totalInspections = bookingResult.Items?.length || 0;
          console.log(`Found ${totalInspections} bookings for company ID ${companyId}`);

          // Update the Total Flights stat card with the number of bookings
          setStats(prevStats => prevStats.map(stat => 
            stat.label === "Total Flights" ? { ...stat, count: totalInspections.toString() } : stat
          ));
        } catch (bookingError) {
          console.error("Error fetching bookings:", bookingError);
          totalInspections = 0;
        }

        // Fetch recent bookings for the user
        const recentBookings = await fetchBookingsForUser(userId, companyId);
        if (recentBookings) {
          setRecentBookings(recentBookings as Booking[]);
          setCompanyBookings(recentBookings as Booking[]); // Add this line to set companyBookings
        }

        // Fetch and log the number of images associated with the CompanyId
        try {
          const mediaParams = {
            TableName: 'ImageUploads',
            FilterExpression: 'CompanyId = :companyId',
            ExpressionAttributeValues: {
              ':companyId': companyId
            }
          };

          console.log("Media params:", mediaParams);
          console.log("Fetching media for company ID:", companyId);
          const mediaResult = await dynamoDb.scan(mediaParams).promise();
          console.log("Media result:", mediaResult);
          totalMedia = mediaResult.Items?.length || 0;
          console.log(`Found ${totalMedia} media for company ID ${companyId}`);

          // Update the Media Captured stat card with the number of images
          setStats(prevStats => prevStats.map(stat => 
            stat.label === "Media Captured" ? { ...stat, count: totalMedia.toString() } : stat
          ));
        } catch (mediaError) {
          console.error("Error fetching media:", mediaError);
          totalMedia = 0;
        }

        // Update stats with fetched data
        setStats(prevStats => prevStats.map(stat => {
          if (stat.label === "Total Flights") {
            return { ...stat, count: totalInspections.toString() };
          } else if (stat.label === "Media Captured") {
            return { ...stat, count: totalMedia.toString() };
          } else {
            return stat;
          }
        }));
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  // Check if current user is an admin
  useEffect(() => {
    if (user?.role === 'AccountAdmin' || user?.role === 'Admin') {
      setIsAdmin(true);
    }
  }, [user]);

  // Handle pending requests count update
  const handlePendingRequestsCountChange = (count: number) => {
    setPendingRequestsCount(count);
    setShowPendingRequestsSection(count > 0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar userInfo={userInfo} />
      
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-blue-100">
                Welcome {userDetails?.Username ? `${userDetails.Username}` : 'to PilotForce'}! Here's what's happening with your account.
              </p>
            </div>
            {/* Action buttons */}
            <div className="flex space-x-3">
              <Link
                to="/my-bookings"
                className="inline-flex items-center px-4 py-2 border border-transparent bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                My Flights
              </Link>
              {/* <Link
                to="/assets"
                className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-transparent rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-sm transition duration-150"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book New Flight
              </Link> */}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {/* Admin notification for pending requests */}
        {isAdmin && showPendingRequestsSection && pendingRequestsCount > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="bg-yellow-100 rounded-md p-2">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-md font-medium text-yellow-800">
                  Pending User Requests
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    There {pendingRequestsCount === 1 ? 'is' : 'are'} <strong>{pendingRequestsCount}</strong> user{pendingRequestsCount === 1 ? '' : 's'} waiting for approval to join your company.
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setShowPendingRequestsSection(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Grid - Enhanced with more visual elements */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Flights</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats[0].count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Assets</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats[1].count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Media Captured</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats[2].count}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pending User Requests Section */}
        {isAdmin && showPendingRequestsSection && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pending User Requests</h2>
              <button 
                onClick={() => setShowPendingRequestsSection(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <PendingUserRequests 
                onRequestsCountChange={handlePendingRequestsCountChange} 
              />
            </div>
          </section>
        )}

        {/* User Information Section - Enhanced styling */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">User Information</h2>
            {userDetails && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                userDetails.UserRole === 'AccountAdmin' ? 'bg-purple-100 text-purple-800' : 
                userDetails.UserRole === 'Admin' ? 'bg-indigo-100 text-indigo-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {userDetails.UserRole}
              </span>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            {userDetails ? (
              <div className="divide-y divide-gray-200">
                {/* User header with avatar */}
                <div className="p-6 flex items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mr-4">
                    {userDetails.Username ? userDetails.Username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{userDetails.Username}</h3>
                    <p className="text-sm text-gray-500">{userDetails.Email}</p>
                  </div>
                </div>
                
                {/* User details in grid layout */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Information</h4>
                      <ul className="space-y-3">
                        <li className="flex items-center text-sm">
                          <div className="flex-shrink-0 bg-blue-50 p-2 rounded-md mr-3">
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Email</span>
                            <p className="text-gray-900">{userDetails.Email}</p>
                          </div>
                        </li>
                        <li className="flex items-center text-sm">
                          <div className="flex-shrink-0 bg-green-50 p-2 rounded-md mr-3">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Phone</span>
                            <p className="text-gray-900">{userDetails.PhoneNumber || 'Not provided'}</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h4>
                      <ul className="space-y-3">
                        <li className="flex items-center text-sm">
                          <div className="flex-shrink-0 bg-indigo-50 p-2 rounded-md mr-3">
                            <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Username</span>
                            <p className="text-gray-900">{userDetails.Username}</p>
                          </div>
                        </li>
                        <li className="flex items-center text-sm">
                          <div className="flex-shrink-0 bg-purple-50 p-2 rounded-md mr-3">
                            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"></path>
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 11-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" clipRule="evenodd"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Joined</span>
                            <p className="text-gray-900">{new Date(userDetails.CreatedAt).toLocaleDateString()}</p>
                          </div>
                        </li>
                        <li className="flex items-center text-sm">
                          <div className="flex-shrink-0 bg-yellow-50 p-2 rounded-md mr-3">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Status</span>
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                userDetails.UserAccess ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {userDetails.UserAccess ? 'Active' : 'Pending Approval'}
                              </span>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Company information with enhanced styling */}
                <div className="p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company Information</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {userDetails.EmailDomain}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-50 p-2 rounded-md mr-3">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd"></path>
                            <path d="M5 5a1 1 0 011-1h8a1 1 0 011 1v3H5V5z"></path>
                          </svg>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Company ID</span>
                          <p className="text-sm text-gray-900 font-medium">{userDetails.CompanyId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-50 p-2 rounded-md mr-3">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Email Domain</span>
                          <p className="text-sm text-gray-900 font-medium">{userDetails.EmailDomain}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center">
                <div className="animate-pulse flex space-x-4 w-full">
                  <div className="rounded-full bg-gray-200 h-16 w-16"></div>
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Company Users Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Company Users</h2>
            {/* {isAdmin && (
              <Link
                to="/manage-users"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Manage Users
              </Link>
            )} */}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <CompanyUsers />
          </div>
        </section>
        
        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link 
              to="/assets"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 rounded-md p-3 mr-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-md font-medium text-gray-900">Manage Assets</h3>
              </div>
              <p className="text-sm text-gray-600">View and manage your property assets</p>
            </Link>
            
            <Link 
              to="/my-bookings"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-green-100 rounded-md p-3 mr-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-md font-medium text-gray-900">Flight Bookings</h3>
              </div>
              <p className="text-sm text-gray-600">Track and manage your drone service bookings</p>
            </Link>
            
            {/* <Link 
              to="/profile"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 rounded-md p-3 mr-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-md font-medium text-gray-900">Profile Settings</h3>
              </div>
              <p className="text-sm text-gray-600">Update your account information and preferences</p>
            </Link> */}
          </div>
        </section>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

