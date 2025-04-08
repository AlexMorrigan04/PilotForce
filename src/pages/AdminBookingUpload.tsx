import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import ResourceUploader from '../components/admin/ResourceUploader';
import { FiArrowLeft, FiInfo, FiImage, FiMap, FiCheck, FiX } from 'react-icons/fi';
import * as adminService from '../services/adminService';

interface BookingDetails {
  id: string;
  userId: string;
  username: string;
  companyId: string;
  companyName: string;
  status: string;
  date: string;
  time: string;
  location: string;
  type: string;
  details: string;
  createdAt: string;
}

interface Resource {
  id: string;
  resourceUrl: string;
  resourceType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

const AdminBookingUpload: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { isAdmin } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    if (bookingId) {
      fetchBooking();
      fetchBookingResources();
    } else {
      setError('No booking ID provided');
    }
  }, [isAdmin, bookingId, navigate]);

  // Fetch booking details
  const fetchBooking = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      const response = await adminService.getBookingById(bookingId);
      setBooking(response.booking || null);
    } catch (err: any) {
      console.error(`Error fetching booking ${bookingId}:`, err);
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking resources
  const fetchBookingResources = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      const response = await adminService.getBookingResources(bookingId);
      setResources(response.resources || []);
    } catch (err: any) {
      console.error(`Error fetching resources for booking ${bookingId}:`, err);
      setError(err.message || 'Failed to load booking resources');
    } finally {
      setLoading(false);
    }
  };

  // Handle resource upload
  const handleUpload = async (bookingId: string, file: File, resourceType: string) => {
    try {
      await adminService.uploadBookingResource(bookingId, file, resourceType);
      setUploadSuccess(true);
      
      // Refresh the resources list
      fetchBookingResources();
      
      // If this is a confirmed booking and resources were uploaded, 
      // optionally update the status to completed
      if (booking?.status === 'confirmed') {
        const shouldUpdateStatus = window.confirm(
          'Would you like to mark this booking as completed now that resources have been uploaded?'
        );
        
        if (shouldUpdateStatus) {
          await adminService.updateBookingStatus(bookingId, 'completed');
          // Refresh booking details
          fetchBooking();
        }
      }
    } catch (err) {
      console.error('Error uploading resource:', err);
      throw err;
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId: string) => {
    if (!bookingId) return;
    
    if (window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteBookingResource(bookingId, resourceId);
        
        // Update local state
        setResources(resources.filter(resource => resource.id !== resourceId));
        alert('Resource deleted successfully');
      } catch (err: any) {
        console.error(`Error deleting resource:`, err);
        setError(err.message || 'Failed to delete resource');
      } finally {
        setLoading(false);
      }
    }
  };

  // Get appropriate icon based on resource type
  const getResourceIcon = (resourceType: string, fileName: string) => {
    if (resourceType === 'image' || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <FiImage className="h-5 w-5 text-blue-500" />;
    } else if (resourceType === 'geotiff' || fileName.match(/\.(tif|tiff)$/i)) {
      return <FiMap className="h-5 w-5 text-green-500" />;
    } else {
      return <FiMap className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            to={`/admin/bookings/details/${bookingId}`}
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            <FiArrowLeft className="mr-1" /> Back to Booking Details
          </Link>
        </div>
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Resources for Booking</h1>
          {booking && (
            <p className="text-gray-600">
              {booking.companyName} - {new Date(booking.date).toLocaleDateString()} {booking.time}
            </p>
          )}
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading && !booking ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading booking details...</span>
          </div>
        ) : booking ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Booking info card */}
            <div className="lg:col-span-4">
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Information</h2>
                
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-1">
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{booking.companyName}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm text-gray-500">User</p>
                      <p className="font-medium">{booking.username}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-1">
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{new Date(booking.date).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{booking.time}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{booking.location}</p>
                </div>
                
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{booking.type}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    booking.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : booking.status === 'confirmed' 
                        ? 'bg-blue-100 text-blue-800'
                        : booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                  }`}>
                    {booking.status}
                  </div>
                </div>
                
                {booking.status === 'confirmed' && (
                  <div className="p-4 bg-blue-50 rounded-md mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiInfo className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          This booking is confirmed. After uploading resources, you may mark it as completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Upload form */}
            <div className="lg:col-span-8">
              {bookingId && (
                <ResourceUploader 
                  bookingId={bookingId} 
                  onUpload={handleUpload} 
                />
              )}
              
              {/* Resources list */}
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Uploaded Resources</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {resources.length} resource{resources.length !== 1 ? 's' : ''} for this booking
                  </p>
                </div>
                
                {loading && resources.length === 0 ? (
                  <div className="p-6 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading resources...</span>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No resources have been uploaded for this booking yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {resources.map(resource => (
                      <li key={resource.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center">
                          {getResourceIcon(resource.resourceType, resource.fileName)}
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">{resource.fileName}</h3>
                            <div className="flex space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatFileSize(resource.fileSize)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(resource.uploadedAt).toLocaleDateString()}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                resource.resourceType === 'image' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {resource.resourceType}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => window.open(resource.resourceUrl, '_blank')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteResource(resource.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Booking not found or you don't have permission to view it
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminBookingUpload;
