import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import { 
  FiSearch, FiRefreshCw, FiDownload, FiUpload, 
  FiFolder, FiFile, FiImage, FiFilm, FiFileText 
} from 'react-icons/fi';
import * as adminService from '../services/adminService';
import { validateAmplifyConfig } from '../utils/apiUtils';

interface Resource {
  id: string;
  bookingId: string;
  folderName: string;
  createdAt: string;
  createdBy: string;
  fileCount: number;
  totalSize: number;
  url?: string;
  fileType?: string;
  s3Path?: string;
  type?: string;
}

interface Booking {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  customerName?: string;
  companyName?: string;
  location?: string;  // Add this property
  flightDate?: string;  // Add this property
  // Other optional fields that might be used
  assetName?: string;
  siteContact?: string;
  postcode?: string;
  serviceOptions?: string[];
  jobTypes?: string;
  userEmail?: string;
  userPhone?: string;
}

const AdminResources: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const navigate = useNavigate();
  
  // File Upload States
  const [file, setFile] = useState<File | null>(null);
  const [resourceType, setResourceType] = useState<string>('image');
  
  // View Mode - 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Verify Amplify configuration
  useEffect(() => {
    validateAmplifyConfig();
  }, []);

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    fetchBookings();
    fetchResources();
  }, [isAdmin, navigate]);

  // Fetch resources when selected booking changes
  useEffect(() => {
    if (selectedBookingId) {
      fetchResourcesForBooking(selectedBookingId);
    } else {
      fetchResources();
    }
  }, [selectedBookingId]);

  // Add polling for resources updates
  useEffect(() => {
    if (selectedBookingId) {
      // Initial fetch
      fetchResourcesForBooking(selectedBookingId);
      
      // Set up a polling interval (every 10 seconds) to check if resources appear
      const intervalId = setInterval(() => {
        console.log('[AdminResources] Polling for resources updates');
        fetchResourcesForBooking(selectedBookingId);
      }, 10000); // 10 seconds
      
      return () => {
        // Clean up the interval when component unmounts or selectedBookingId changes
        clearInterval(intervalId);
      };
    }
  }, [selectedBookingId]);

  // Fetch all bookings
  const fetchBookings = async () => {
    try {
      const response = await adminService.getAllBookings();
      if (!response || !response.bookings) {
        throw new Error('Invalid booking data received');
      }
      
      console.log('Raw bookings from API:', response.bookings);
      
      // Map the API response to Booking interface, accounting for different field names in DynamoDB
      // Add fallback ID generation to ensure we always have an ID
      const mappedBookings = response.bookings.map((booking: any, index: number) => {
        // Generate a unique ID if one doesn't exist
        const generatedId = booking.BookingId || booking.id || `booking-${Date.now()}-${index}`;
        
        return {
          id: generatedId, // Use generated ID to ensure we always have one
          title: booking.jobTypes || booking.title || `Flight at ${booking.location || 'Unknown Location'}`,
          status: booking.status || 'Pending',
          createdAt: booking.createdAt || new Date().toISOString(),
          customerName: booking.userName || booking.customerName || 'No Name',
          companyName: booking.companyName || 'No Company',
          location: booking.location || 'No Location',
          flightDate: booking.flightDate || booking.date || 'No Date',
          serviceOptions: booking.serviceOptions || [],
          assetName: booking.assetName || 'No Asset',
          siteContact: booking.siteContact || 'No Contact',
          postcode: booking.postcode || 'No Postcode'
        };
      });
      
      console.log('Mapped bookings for component:', mappedBookings);
      setBookings(mappedBookings);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings: ' + err.message);
    }
  };

  // Fetch all resources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllResources();
      if (!response || !response.resources) {
        throw new Error('Invalid resource data received');
      }
      
      console.log('Raw resources:', response.resources);
      
      // Map the API response to Resource interface
      const mappedResources = response.resources.map((resource: any) => ({
        id: resource.ResourceId || resource.id,
        bookingId: resource.BookingId || resource.bookingId,
        folderName: resource.FolderName || resource.folderName,
        createdAt: resource.CreatedAt || resource.createdAt,
        createdBy: resource.CreatedBy || resource.createdBy,
        fileCount: resource.FileCount || resource.fileCount || 0,
        totalSize: resource.TotalSize || resource.totalSize || 0,
        s3Path: resource.S3Path || resource.s3Path || '',
        type: resource.Type || resource.type || 'folder'
      }));
      
      setResources(mappedResources);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch resources for a specific booking
  const fetchResourcesForBooking = async (bookingId: string) => {
    setLoading(true);
    console.log('%c[AdminResources] Fetching resources for booking', 'background:#3498db;color:white;padding:4px;border-radius:4px;', bookingId);
    
    try {
      const response = await adminService.getBookingResources(bookingId);
      
      // Check if response exists (could be undefined if there was an error but we returned empty resources)
      if (!response) {
        console.warn(`[AdminResources] No response data for booking ${bookingId}, using empty array`);
        setResources([]);
        setError(null);
        return;
      }
      
      console.log('[AdminResources] Resources response:', response);
      
      // Handle different response formats
      let resourcesArray = [];
      if (Array.isArray(response)) {
        resourcesArray = response;
        console.log('[AdminResources] Response is an array:', resourcesArray);
      } else if (response.resources && Array.isArray(response.resources)) {
        resourcesArray = response.resources;
        console.log('[AdminResources] Found resources array in response:', resourcesArray);
      } else {
        console.warn('[AdminResources] Invalid resource data structure:', response);
        setResources([]);
        setError(null);
        return;
      }
      
      console.log('[AdminResources] Raw resources:', resourcesArray);
      
      // Map the API response to Resource interface, handling different field name formats
      const mappedResources = resourcesArray.map((resource: any) => {
        const mappedResource = {
          id: resource.ResourceId || resource.id || `resource-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          bookingId: resource.BookingId || resource.bookingId || bookingId,
          folderName: resource.FolderName || resource.folderName || 'Unnamed Folder',
          createdAt: resource.CreatedAt || resource.createdAt || new Date().toISOString(),
          createdBy: resource.CreatedBy || resource.createdBy || 'System',
          fileCount: resource.FileCount || resource.fileCount || 0,
          totalSize: resource.TotalSize || resource.totalSize || 0,
          s3Path: resource.S3Path || resource.s3Path || '',
          type: resource.Type || resource.type || 'folder'
        };
        
        console.log('[AdminResources] Mapped resource:', mappedResource);
        return mappedResource;
      });
      
      console.log('[AdminResources] All mapped resources:', mappedResources);
      setResources(mappedResources);
      setError(null);
    } catch (err: any) {
      console.error(`[AdminResources] Error fetching resources for booking ${bookingId}:`, err);
      // Set resources to empty array even on error to prevent UI from breaking
      setResources([]);
      // Show a more user-friendly error
      setError('Could not load resources. This may happen if the booking has no resources yet.');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      
      // Determine resource type from file
      const fileType = e.target.files[0].type;
      if (fileType.startsWith('image/')) {
        setResourceType('image');
      } else if (fileType.startsWith('video/')) {
        setResourceType('video');
      } else if (fileType.startsWith('application/pdf')) {
        setResourceType('document');
      } else {
        setResourceType('other');
      }
    }
  };

  // Replace file upload with folder creation functionality
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBookingId) {
      setError('Please select a booking for this folder');
      return;
    }
    
    if (!newFolderName.trim()) {
      setError('Please enter a folder name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('%c[AdminResources] Creating folder', 'background:#2ecc71;color:white;padding:4px;border-radius:4px;', {
        folderName: newFolderName,
        bookingId: selectedBookingId
      });
      
      const result = await adminService.createResourceFolder(selectedBookingId, newFolderName);
      console.log('[AdminResources] Folder creation response:', result);
      
      if (result && (result.success || result.folderId)) {
        setSuccess('Folder created successfully!');
        
        // Create a new folder object to add to the resources array
        const newFolder = {
          id: result.folderId || `folder-${Date.now()}`,
          bookingId: selectedBookingId,
          folderName: newFolderName,
          createdAt: new Date().toISOString(),
          createdBy: 'Current User',
          fileCount: 0,
          totalSize: 0,
          s3Path: result.s3Path || `booking_${selectedBookingId}/${result.folderId || 'temp'}/`,
          type: 'folder'
        };
        
        console.log('[AdminResources] Adding new folder to state:', newFolder);
        
        // Add the new folder to the resources array
        setResources(current => {
          const updatedResources = [...current, newFolder];
          console.log('[AdminResources] Updated resources array:', updatedResources);
          return updatedResources;
        });
        
        // Reset form and close modal
        setNewFolderName('');
        setCreateFolderModal(false);
        
        // Refresh resources after a short delay to ensure backend sync
        console.log('[AdminResources] Scheduling refresh of resources');
        setTimeout(() => {
          console.log('[AdminResources] Refreshing resources after folder creation');
          fetchResourcesForBooking(selectedBookingId);
        }, 1500);
      } else {
        throw new Error('Failed to create folder: No success response from server');
      }
    } catch (err: any) {
      console.error('[AdminResources] Error creating folder:', err);
      
      // More descriptive error message for debugging
      let errorMsg = 'Failed to create folder. ';
      
      if (err.message) {
        errorMsg += err.message;
      }
      
      if (err.response) {
        errorMsg += ` Server returned ${err.response.status}: ${JSON.stringify(err.response.data)}`;
      }
      
      setError(errorMsg);
      
      // Implement retry logic for network errors
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setTimeout(() => {
          setError('Connection error. Would you like to retry?');
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete a resource
  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Get the booking ID for this resource
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) {
        throw new Error('Resource not found');
      }
      
      await adminService.deleteBookingResource(resource.bookingId, resourceId);
      
      // Update the UI
      setResources(resources.filter(r => r.id !== resourceId));
      setSuccess('Resource deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      setError('Failed to delete resource: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // View a resource in detail
  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setShowViewModal(true);
  };

  // Download a resource
  const handleDownloadResource = async (resource: Resource) => {
    try {
      // Check if URL exists or if we need to get it
      if (resource.url) {
        window.open(resource.url, '_blank');
      } else {
        // Get download URL from service
        const downloadUrl = await adminService.getResourceDownloadUrl(resource.bookingId, resource.id);
        if (typeof downloadUrl === 'string') {
          window.open(downloadUrl, '_blank');
        } else {
          throw new Error('Invalid download URL returned');
        }
      }
    } catch (err: any) {
      console.error('Error downloading resource:', err);
      setError('Failed to download resource: ' + err.message);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icon for file type
  const getFileIcon = (fileType: string): JSX.Element => {
    if (fileType.startsWith('image/')) {
      return <FiImage className="h-8 w-8 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <FiFilm className="h-8 w-8 text-purple-500" />;
    } else if (fileType.startsWith('application/pdf')) {
      return <FiFileText className="h-8 w-8 text-red-500" />;
    }
    return <FiFile className="h-8 w-8 text-gray-500" />;
  };

  // Get color for file type
  const getFileTypeColor = (fileType: string): string => {
    if (fileType.startsWith('image/')) {
      return 'bg-blue-100 text-blue-800';
    } else if (fileType.startsWith('video/')) {
      return 'bg-purple-100 text-purple-800';
    } else if (fileType.startsWith('application/pdf')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Filter resources based on search term and resource type
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchTerm || 
      resource.folderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.bookingId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedResourceType || 
      (selectedResourceType === 'image' && resource.fileType?.startsWith('image/')) ||
      (selectedResourceType === 'video' && resource.fileType?.startsWith('video/')) ||
      (selectedResourceType === 'document' && resource.fileType?.startsWith('application/'));
    
    return matchesSearch && matchesType;
  });

  // Get booking title by ID with more detail
  const getBookingTitle = (bookingId: string): string => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return `Booking #${bookingId.substring(0, 8)}`;
    
    // Return a more descriptive title using location and date if available
    if (booking.location && booking.flightDate) {
      const date = new Date(booking.flightDate);
      const formattedDate = isNaN(date.getTime()) 
        ? booking.flightDate 
        : date.toLocaleDateString();
      return `${booking.location} - ${formattedDate}`;
    }
    
    return booking.title || `Booking #${bookingId.substring(0, 8)}`;
  };

  // Update file handling state variables
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [createFolderModal, setCreateFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // Modify the view to show folder cards instead of file cards
  const renderFoldersGrid = () => (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredResources.map(resource => (
          <div 
            key={resource.id} 
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
          >
            <div className="p-4">
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded mb-4">
                <FiFolder className="h-20 w-20 text-blue-400" />
              </div>
              <h3 className="font-medium text-gray-900 truncate">{resource.folderName}</h3>
              <p className="text-xs text-gray-500 mt-1 truncate">
                Booking: {getBookingTitle(resource.bookingId)}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {resource.fileCount} files
                </span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(resource.totalSize)}
                </span>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => navigate(`/admin/resources/${resource.id}`)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Open
              </button>
              <button
                onClick={() => handleDeleteResource(resource.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Update the list view to show folder information
  const renderFoldersList = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Folder
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Booking
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Files
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredResources.map(resource => (
            <tr key={resource.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                    <FiFolder className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{resource.folderName}</div>
                    <div className="text-xs text-gray-500">{resource.id.substring(0, 8)}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{getBookingTitle(resource.bookingId)}</div>
                <div className="text-xs text-gray-500">{resource.bookingId.substring(0, 8)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {resource.fileCount} files
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatFileSize(resource.totalSize)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(resource.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => navigate(`/admin/resources/${resource.id}`)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDeleteResource(resource.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Debug panel for resources
  const DebugResourcesPanel = () => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
        <h3 className="text-sm font-bold mb-2">Resources Debug Panel (Dev Only)</h3>
        <div className="overflow-x-auto">
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(resources, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resource Folders</h1>
            <p className="text-gray-600">Organize and manage resource folders for bookings</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => setCreateFolderModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none"
            >
              <FiFolder className="mr-2" />
              Create Folder
            </button>
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
          </div>
        </header>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-4 w-full">
              {/* Booking Selection */}
              <div className="w-full md:w-64">
                <label htmlFor="bookingSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Booking
                </label>
                <select
                  id="bookingSelect"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                >
                  <option value="">All Bookings</option>
                  {bookings.map(booking => (
                    <option key={booking.id} value={booking.id}>
                      {booking.title} ({booking.status})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Resource Type Filter */}
              <div className="w-full md:w-auto">
                <label htmlFor="resourceTypeSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Type
                </label>
                <select
                  id="resourceTypeSelect"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={selectedResourceType}
                  onChange={(e) => setSelectedResourceType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="document">Documents</option>
                </select>
              </div>
              
              {/* Search Box */}
              <div className="w-full md:w-auto flex-grow">
                <label htmlFor="searchInput" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    id="searchInput"
                    type="text"
                    placeholder="Search resources..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center mt-4 sm:mt-0">
              <span className="text-sm text-gray-600 mr-3">
                {filteredResources.length} resource(s)
              </span>
              <button
                onClick={selectedBookingId ? () => fetchResourcesForBooking(selectedBookingId) : fetchResources}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Resources Display */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="p-8 text-center">
              <FiFolder className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No resource folders</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedBookingId 
                  ? "No resource folders found for this booking." 
                  : "Get started by creating a resource folder for a booking."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setCreateFolderModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <FiFolder className="-ml-1 mr-2 h-5 w-5" />
                  Create Folder
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? renderFoldersGrid() : renderFoldersList()}
        </div>

        {/* Debug Panel */}
        {process.env.NODE_ENV === 'development' && <DebugResourcesPanel />}
      </main>

      {/* Create Folder Modal */}
      {createFolderModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Create Resource Folder
                    </h3>
                    
                    <form onSubmit={handleCreateFolder}>
                      {/* Booking Selection */}
                      <div className="mb-4">
                        <label htmlFor="bookingId" className="block text-sm font-medium text-gray-700 mb-1">
                          Booking *
                        </label>
                        <select
                          id="bookingId"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={selectedBookingId}
                          onChange={(e) => setSelectedBookingId(e.target.value)}
                          required
                        >
                          <option value="">Select a booking</option>
                          {bookings.map(booking => (
                            <option key={booking.id} value={booking.id}>
                              {booking.title} - {booking.assetName} ({booking.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Selected Asset Display */}
                      {selectedBookingId && (
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Selected Asset
                          </label>
                          <p className="text-sm">
                            {bookings.find(b => b.id === selectedBookingId)?.assetName || 'No asset information'}
                          </p>
                        </div>
                      )}
                      
                      {/* Folder Name */}
                      <div className="mb-4">
                        <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
                          Folder Name *
                        </label>
                        <input
                          type="text"
                          id="folderName"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Enter folder name"
                          required
                        />
                      </div>
                      
                      {/* Error Message */}
                      {error && (
                        <div className="mt-4 text-sm text-red-600">
                          {error}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCreateFolder}
                  disabled={loading || !newFolderName.trim() || !selectedBookingId}
                >
                  {loading ? 'Creating...' : 'Create Folder'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setCreateFolderModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResources;
