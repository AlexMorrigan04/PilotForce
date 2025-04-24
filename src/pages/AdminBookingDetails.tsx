import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import { 
  FiArrowLeft, FiCalendar, FiClock, FiMapPin, FiUser, 
  FiPackage, FiEdit, FiTrash2, FiUpload, FiDownload, 
  FiCheckCircle, FiXCircle, FiImage, FiMap, FiFile 
} from 'react-icons/fi';
import ResourceUploadModal from '../components/admin/ResourceUploadModal';
import * as adminService from '../services/adminService';

interface BookingDetails {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  status: string;
  date: string;
  time: string;
  location: string;
  type: string;
  details: string;
  createdAt: string;
  notes?: string;
  flightPlan?: string;
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

const AdminBookingDetails: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { isAdmin } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [images, setImages] = useState<Resource[]>([]);
  const [geotiffFiles, setGeotiffFiles] = useState<Resource[]>([]);
  const [otherFiles, setOtherFiles] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [resourcesUpdated, setResourcesUpdated] = useState<boolean>(false);
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false);
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
      fetchBookingDetails();
      fetchResources();
    } else {
      setError('No booking ID provided');
    }
  }, [isAdmin, bookingId, navigate]);

  // Separate resources by type
  useEffect(() => {
    setImages(resources.filter(r => r.resourceType === 'image' || r.mimeType.startsWith('image/')));
    setGeotiffFiles(resources.filter(r => r.resourceType === 'geotiff' || r.fileName.match(/\.(tif|tiff)$/i)));
    setOtherFiles(resources.filter(r => 
      !r.resourceType.includes('image') && 
      !r.mimeType.startsWith('image/') && 
      !r.resourceType.includes('geotiff') && 
      !r.fileName.match(/\.(tif|tiff)$/i)
    ));
  }, [resources]);

  // Fetch booking details
  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      // Make sure bookingId is not undefined
      if (!bookingId) {
        setError("Booking ID is missing");
        setLoading(false);
        return;
      }
      const response = await adminService.getBooking(bookingId);
      setBooking(response.booking || null);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading booking details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking resources
  const fetchResources = async () => {
    try {
      setResourcesLoading(true);
      
      const response = await adminService.getBookingResources(bookingId || '');
      
      
      // Handle case where response might be an object with a resources property
      // or might directly be an array of resources
      if (Array.isArray(response)) {
        setResources(response);
      } else if (response && Array.isArray(response.resources)) {
        setResources(response.resources);
      } else {
        console.warn('Unexpected resources response format:', response);
        setResources([]);
      }
    } catch (error) {
      setError('Failed to load resources');
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  // Handle booking status change
  const handleUpdateStatus = async (status: string) => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      await adminService.updateBookingStatus(bookingId, status);
      
      // Update local state
      if (booking) {
        setBooking({ ...booking, status });
      }
      
      alert(`Booking status updated to ${status}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update booking status');
    } finally {
      setLoading(false);
    }
  };

  // Handle booking deletion
  const handleDeleteBooking = async () => {
    if (!bookingId) return;
    
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone and will delete all resources associated with this booking.')) {
      try {
        setLoading(true);
        await adminService.deleteBooking(bookingId);
        alert('Booking deleted successfully');
        navigate('/admin/bookings');
      } catch (err: any) {
        setError(err.message || 'Failed to delete booking');
        setLoading(false);
      }
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId: string) => {
    if (!bookingId || !resourceId) return;
    
    if (window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      try {
        await adminService.deleteBookingResource(bookingId, resourceId);
        
        // Update local state by removing the deleted resource
        setResources(prevResources => prevResources.filter(r => r.id !== resourceId));
        
        alert('Resource deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete resource');
      }
    }
  };

  // Handle resource upload complete
  const handleUploadComplete = () => {
    // Set the success notification
    setResourcesUpdated(true);
    
    // Short delay before fetching resources to allow S3 consistency
    setTimeout(() => {
      // Refresh the resources
      fetchResources();
    }, 1000);
    
    // Clear the notification after a delay
    setTimeout(() => {
      setResourcesUpdated(false);
    }, 5000);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType.startsWith('image/')) return <FiImage className="h-5 w-5 text-blue-500" />;
    if (mimeType.startsWith('application/pdf')) return <FiFile className="h-5 w-5 text-red-500" />;
    if (fileName.match(/\.(tif|tiff)$/i)) return <FiMap className="h-5 w-5 text-green-500" />;
    return <FiFile className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            to="/admin/bookings"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            <FiArrowLeft className="mr-1" /> Back to Bookings
          </Link>
        </div>
        
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            {booking && (
              <p className="text-gray-600">
                ID: {bookingId} • Created {new Date(booking.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {booking && (
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link
                to={`/admin/bookings/edit/${bookingId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <FiEdit className="mr-2 -ml-1" />
                Edit Booking
              </Link>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <FiUpload className="mr-2 -ml-1" />
                Upload Data
              </button>
              <button
                onClick={handleDeleteBooking}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <FiTrash2 className="mr-2 -ml-1 text-red-500" />
                Delete
              </button>
            </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Info */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Booking Information</h2>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center">
                          <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                        </div>
                        <p className="mt-1 text-gray-900">{booking.username}</p>
                        <p className="text-gray-500 text-sm">{booking.userEmail}</p>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center">
                          <FiPackage className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-sm font-medium text-gray-500">Company</h3>
                        </div>
                        <p className="mt-1 text-gray-900">{booking.companyName}</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center">
                          <FiCalendar className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-sm font-medium text-gray-500">Date</h3>
                        </div>
                        <p className="mt-1 text-gray-900">{new Date(booking.date).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center">
                          <FiClock className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-sm font-medium text-gray-500">Time</h3>
                        </div>
                        <p className="mt-1 text-gray-900">{booking.time}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="mb-4">
                      <div className="flex items-center">
                        <FiMapPin className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-sm font-medium text-gray-500">Location</h3>
                      </div>
                      <p className="mt-1 text-gray-900">{booking.location}</p>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center">
                        <FiPackage className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-sm font-medium text-gray-500">Service Type</h3>
                      </div>
                      <p className="mt-1 text-gray-900">{booking.type}</p>
                    </div>
                    
                    {booking.details && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Details</h3>
                        <p className="text-gray-900 whitespace-pre-line">{booking.details}</p>
                      </div>
                    )}
                    
                    {booking.notes && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Admin Notes</h3>
                        <p className="text-gray-900 whitespace-pre-line">{booking.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Status buttons */}
                  {booking.status !== 'cancelled' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Update Status</h3>
                      <div className="flex flex-wrap gap-2">
                        {booking.status !== 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus('pending')}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          >
                            Mark as Pending
                          </button>
                        )}
                        
                        {booking.status !== 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus('confirmed')}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            <FiCheckCircle className="mr-1" />
                            Confirm Booking
                          </button>
                        )}
                        
                        {booking.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus('completed')}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            <FiCheckCircle className="mr-1" />
                            Mark as Completed
                          </button>
                        )}
                        
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this booking?')) {
                                handleUpdateStatus('cancelled');
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            <FiXCircle className="mr-1" />
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Resources Section */}
              <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Resources</h2>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    <FiUpload className="mr-1" />
                    Upload New
                  </button>
                </div>
                
                {resourcesUpdated && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">Resources uploaded successfully!</span>
                    <button
                      className="absolute top-0 bottom-0 right-0 px-4 py-3"
                      onClick={() => setResourcesUpdated(false)}
                    >
                      <span className="sr-only">Close</span>
                      <span className="h-6 w-6">×</span>
                    </button>
                  </div>
                )}
                
                {resourcesLoading ? (
                  <div className="p-6 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading resources...</span>
                    </div>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No resources have been uploaded for this booking yet.
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Images */}
                    {images.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiImage className="mr-2 text-blue-500" />
                          Images ({images.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {images.map(image => (
                            <a 
                              key={image.id} 
                              href={image.resourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block group"
                            >
                              <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                                {image.thumbnailUrl ? (
                                  <img 
                                    src={image.thumbnailUrl} 
                                    alt={image.fileName}
                                    className="w-full h-full object-cover group-hover:opacity-75"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FiImage className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 flex justify-between items-start">
                                <p className="text-xs text-gray-500 truncate flex-1">{image.fileName}</p>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleDeleteResource(image.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 ml-2"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* GeoTIFF Files */}
                    {geotiffFiles.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiMap className="mr-2 text-green-500" />
                          GeoTIFF Files ({geotiffFiles.length})
                        </h3>
                        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                          {geotiffFiles.map(file => (
                            <li key={file.id} className="py-3 flex justify-between items-center">
                              <div className="flex items-center">
                                <FiMap className="h-5 w-5 text-green-500" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                                  <div className="flex space-x-4 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {formatFileSize(file.fileSize)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(file.uploadedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <a
                                  href={file.resourceUrl}
                                  download
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
                                >
                                  <FiDownload className="mr-1" />
                                  Download
                                </a>
                                <button
                                  onClick={() => handleDeleteResource(file.id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                                >
                                  <FiTrash2 className="mr-1" />
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Other Files */}
                    {otherFiles.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiFile className="mr-2 text-gray-500" />
                          Other Files ({otherFiles.length})
                        </h3>
                        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                          {otherFiles.map(file => (
                            <li key={file.id} className="py-3 flex justify-between items-center">
                              <div className="flex items-center">
                                {getFileIcon(file.mimeType, file.fileName)}
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                                  <div className="flex space-x-4 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {formatFileSize(file.fileSize)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(file.uploadedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <a
                                  href={file.resourceUrl}
                                  download
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
                                >
                                  <FiDownload className="mr-1" />
                                  Download
                                </a>
                                <button
                                  onClick={() => handleDeleteResource(file.id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                                >
                                  <FiTrash2 className="mr-1" />
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Actions</h2>
                </div>
                <div className="p-6 space-y-4">
                  <Link
                    to={`/admin/bookings/edit/${bookingId}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    <FiEdit className="mr-2 -ml-1" />
                    Edit Booking
                  </Link>
                  
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    <FiUpload className="mr-2 -ml-1" />
                    Upload Data
                  </button>
                  
                  <button
                    onClick={handleDeleteBooking}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    <FiTrash2 className="mr-2 -ml-1 text-red-500" />
                    Delete Booking
                  </button>
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                    <p className="mt-1 text-gray-900">{booking.userId}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-gray-900">{booking.username}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1 text-gray-900">{booking.userEmail || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Company</h3>
                    <p className="mt-1 text-gray-900">{booking.companyName}</p>
                  </div>
                  
                  <Link
                    to={`/admin/users/details/${booking.userId}`}
                    className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Customer Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Booking not found or you don't have permission to view it
          </div>
        )}
      </main>

      {/* Resource Upload Modal */}
      <ResourceUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        bookingId={bookingId || ''}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default AdminBookingDetails;
