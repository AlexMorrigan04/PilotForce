import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { 
  FiArrowLeft, FiCalendar, FiClock, FiMapPin, FiUser, 
  FiPackage, FiEdit, FiTrash2, FiUpload, FiDownload, 
  FiCheckCircle, FiXCircle, FiImage, FiMap, FiFile 
} from 'react-icons/fi';
import ResourceUploadModal from '../components/admin/ResourceUploadModal';
import * as adminService from '../services/adminService';
import { Resource as ApiResource } from '../services/adminService';
import Map, { Source, Layer, Marker, MapRef, MapLayerMouseEvent } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

// Define a UI-specific Resource type that includes the properties you use
interface Resource extends ApiResource {
  resourceUrl: string;
  resourceType: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  lastModified: string;
  [key: string]: any;
}

interface BookingDetails {
  id: string;
  BookingId: string;
  userId: string;
  UserId: string;
  username: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  emailDomain?: string;
  companyId: string;
  CompanyId: string;
  companyName: string;
  status: string;
  date: string;
  time: string;
  location: string;
  type: string;
  details: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  flightPlan?: string;
  address?: string;
  postcode?: string;
  assetId?: string;
  assetName?: string;
  scheduling?: {
    scheduleType: string;
    timeSlot: string;
  };
  flightDate: string;
  jobTypes: string[] | { S: string }[];
  serviceOptions?: {
    [key: string]: {
      M?: {
        coverage?: {
          L?: { S: string }[];
        };
        detail?: {
          S: string;
        };
      };
    };
  };
  siteContact?: {
    id?: { S: string } | string;
    name?: { S: string } | string;
    phone?: { S: string } | string;
    email?: { S: string } | string;
    isAvailableOnsite?: { BOOL: boolean } | boolean;
  };
  asset?: {
    id?: string;
    name?: string;
    type: string;
    coordinates: [number, number][][];  // Array of arrays of [longitude, latitude] pairs
    centerPoint: [number, number];  // [longitude, latitude]
    area?: number;
  };
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: Record<string, any>;
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
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 16
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);
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
      loadResources();
    } else {
      setError('No booking ID provided');
    }
  }, [isAdmin, bookingId, navigate]);

  // Separate resources by type
  useEffect(() => {
    setImages(resources.filter(r => {
      const isImage = (r.resourceType === 'image') || 
                     (r.mimeType && r.mimeType.startsWith('image/'));
      return isImage;
    }));
    
    setGeotiffFiles(resources.filter(r => {
      const isGeoTiff = (r.resourceType === 'geotiff') || 
                       (r.fileName && r.fileName.match(/\.(tif|tiff)$/i));
      return isGeoTiff;
    }));
    
    setOtherFiles(resources.filter(r => {
      const isImage = (r.resourceType === 'image') || 
                     (r.mimeType && r.mimeType.startsWith('image/'));
      const isGeoTiff = (r.resourceType === 'geotiff') || 
                       (r.fileName && r.fileName.match(/\.(tif|tiff)$/i));
      return !isImage && !isGeoTiff;
    }));
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

  // Load booking resources
  const loadResources = async () => {
    try {
      if (!bookingId) {
        return;
      }
      
      setResourcesLoading(true);
      
      const response = await adminService.getBookingResources(bookingId || '');
      
      // Handle different response formats
      let resourcesList: Resource[] = [];
      
      if (Array.isArray(response)) {
        resourcesList = mapToUIResources(response);
      } else if (response && 'resources' in response) {
        resourcesList = mapToUIResources(response.resources);
      } else {
      }
      
      setResources(resourcesList);
    } catch (error) {
      setResourceError('Failed to load resources');
    } finally {
      setResourcesLoading(false);
    }
  };

  // Helper function to map API resources to UI resources
  const mapToUIResources = (apiResources: any[]): Resource[] => {
    return apiResources.map(res => ({
      ...res,
      id: res.id || res.ResourceId || res.resourceId,
      resourceUrl: res.resourceUrl || res.ResourceUrl || '',
      resourceType: res.resourceType || res.ResourceType || res.type || 'file',
      fileName: res.fileName || res.FileName || 'Unnamed file',
      fileSize: res.fileSize || res.Size || res.size || 0,
      uploadDate: res.uploadDate || res.UploadDate || res.createdAt || '',
      lastModified: res.lastModified || res.LastModified || res.updatedAt || '',
    }));
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
      loadResources();
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

  // Get asset type color
  const getAssetTypeColor = (assetType: string) => {
    switch(assetType?.toLowerCase()) {
      case 'buildings':
        return { color: '#3182ce', strokeColor: '#2c5282' };
      case 'construction':
        return { color: '#dd6b20', strokeColor: '#9c4221' };
      case 'area':
        return { color: '#38a169', strokeColor: '#276749' };
      case 'security':
        return { color: '#805ad5', strokeColor: '#553c9a' };
      case 'infrastructure':
        return { color: '#e53e3e', strokeColor: '#c53030' };
      default:
        return { color: '#3182ce', strokeColor: '#2c5282' };
    }
  };

  // Calculate bounds for the asset polygon
  const calculateAssetBounds = (coordinates: [number, number][]): [[number, number], [number, number]] | null => {
    if (!coordinates || coordinates.length === 0) return null;
    
    let minLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLng = coordinates[0][0];
    let maxLat = coordinates[0][1];
    
    coordinates.forEach((coord) => {
      if (coord[0] < minLng) minLng = coord[0];
      if (coord[1] < minLat) minLat = coord[1];
      if (coord[0] > maxLng) maxLng = coord[0];
      if (coord[1] > maxLat) maxLat = coord[1];
    });
    
    return [[minLng, minLat], [maxLng, maxLat]];
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
              {/* Status Update Buttons */}
              {booking.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus('scheduled')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                  disabled={loading}
                >
                  <FiCheckCircle className="mr-2 -ml-1" />
                  Mark as Scheduled
                </button>
              )}
              {booking.status === 'scheduled' && (
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled={loading}
                >
                  <FiCheckCircle className="mr-2 -ml-1" />
                  Mark as Completed
                </button>
              )}
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
            {/* Main Content - Left 2 Columns */}
            <div className="lg:col-span-2">
              {/* Primary Booking Information */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Booking Information</h2>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Basic Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Booking ID</dt>
                          <dd className="text-sm text-gray-900">{booking.BookingId}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Created At</dt>
                          <dd className="text-sm text-gray-900">{new Date(booking.createdAt).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Last Updated</dt>
                          <dd className="text-sm text-gray-900">{new Date(booking.updatedAt).toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Schedule Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Schedule Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Flight Date</dt>
                          <dd className="text-sm text-gray-900">{new Date(booking.flightDate).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Schedule Type</dt>
                          <dd className="text-sm text-gray-900">{booking.scheduling?.scheduleType || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Time Slot</dt>
                          <dd className="text-sm text-gray-900 capitalize">{booking.scheduling?.timeSlot || 'Not specified'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Service Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Service Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Job Types</dt>
                          <dd className="text-sm text-gray-900">
                            {Array.isArray(booking.jobTypes) 
                              ? booking.jobTypes.map(job => typeof job === 'string' ? job : job.S).join(', ')
                              : booking.jobTypes}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Service Options</dt>
                          <dd className="text-sm text-gray-900">
                            {Object.entries(booking.serviceOptions || {}).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <span className="font-medium">{key}:</span>
                                <ul className="list-disc list-inside ml-2">
                                  {value.M?.coverage?.L?.map((item: any, index: number) => (
                                    <li key={index}>{item.S}</li>
                                  ))}
                                  {value.M?.detail && <li>Detail: {value.M.detail.S}</li>}
                                </ul>
                              </div>
                            ))}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Location Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Location Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Address</dt>
                          <dd className="text-sm text-gray-900">{booking.address}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Postcode</dt>
                          <dd className="text-sm text-gray-900">{booking.postcode}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Location Coordinates</dt>
                          <dd className="text-sm text-gray-900">{booking.location}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Notes</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{booking.notes || 'No notes provided'}</p>
                  </div>

                  {/* Site Contact Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Site Contact</h3>
                    {booking.siteContact ? (
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-xs text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{typeof booking.siteContact.name === 'string' ? booking.siteContact.name : booking.siteContact.name?.S}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Contact ID</dt>
                          <dd className="text-sm text-gray-900">{typeof booking.siteContact.id === 'string' ? booking.siteContact.id : booking.siteContact.id?.S}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Phone</dt>
                          <dd className="text-sm text-gray-900">{typeof booking.siteContact.phone === 'string' ? booking.siteContact.phone : booking.siteContact.phone?.S}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">{typeof booking.siteContact.email === 'string' ? booking.siteContact.email : booking.siteContact.email?.S}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Available Onsite</dt>
                          <dd className="text-sm text-gray-900">
                            {typeof booking.siteContact.isAvailableOnsite === 'boolean' 
                              ? booking.siteContact.isAvailableOnsite 
                              : booking.siteContact.isAvailableOnsite?.BOOL ? 'Yes' : 'No'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-500">No site contact information provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Asset Information with Map */}
              {booking.asset && (
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Asset Information</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Asset Details</h3>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <dt className="text-xs text-gray-500">Asset ID</dt>
                            <dd className="text-sm text-gray-900">{booking.assetId}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Asset Name</dt>
                            <dd className="text-sm text-gray-900">{booking.assetName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Asset Type</dt>
                            <dd className="text-sm text-gray-900">{booking.asset.type}</dd>
                          </div>
                          {booking.asset.area && (
                            <div>
                              <dt className="text-xs text-gray-500">Area</dt>
                              <dd className="text-sm text-gray-900">{booking.asset.area.toFixed(2)} m²</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Map */}
                      <div className="h-[400px] relative rounded-lg overflow-hidden shadow-inner">
                        <Map
                          {...viewState}
                          onMove={evt => setViewState(evt.viewState)}
                          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                          mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
                          scrollZoom={true}
                          onLoad={(evt: MapLayerMouseEvent) => {
                            setMapLoaded(true);
                            
                            if (!booking?.asset?.coordinates || booking.asset.coordinates.length === 0) return;
                            
                            setTimeout(() => {
                              try {
                                const coordinates = booking.asset?.coordinates ?? [];
                                const bounds = calculateAssetBounds(coordinates[0]);
                                if (bounds && mapRef.current) {
                                  const map = mapRef.current.getMap();
                                  map.fitBounds(bounds, {
                                    padding: 80,
                                    maxZoom: 19,
                                    duration: 800
                                  });
                                }
                              } catch (e) {
                                setMapError('Error displaying asset on map');
                              }
                            }, 100);
                          }}
                          ref={mapRef}
                        >
                          {mapLoaded && booking?.asset?.coordinates && booking.asset.coordinates.length > 0 && (
                            <Source
                              id="asset-boundary"
                              type="geojson"
                              data={{
                                type: 'Feature',
                                geometry: {
                                  type: 'Polygon',
                                  coordinates: booking.asset.coordinates
                                },
                                properties: {}
                              } as GeoJSONFeature}
                            >
                              <Layer
                                id="asset-boundary-fill"
                                type="fill"
                                paint={{
                                  'fill-color': getAssetTypeColor(booking?.asset?.type || 'buildings').color,
                                  'fill-opacity': 0.3
                                }}
                              />
                              <Layer
                                id="asset-boundary-line"
                                type="line"
                                paint={{
                                  'line-color': getAssetTypeColor(booking?.asset?.type || 'buildings').strokeColor,
                                  'line-width': 2
                                }}
                              />
                            </Source>
                          )}
                          
                          {mapLoaded && booking?.asset?.centerPoint && (
                            <Marker 
                              longitude={booking.asset.centerPoint[0]} 
                              latitude={booking.asset.centerPoint[1]}
                              anchor="bottom"
                            >
                              <div className="w-8 h-8 rounded-full bg-white p-1 shadow-lg flex items-center justify-center">
                                <svg className="w-5 h-5" fill={getAssetTypeColor(booking?.asset?.type || 'buildings').color} viewBox="0 0 24 24">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                              </div>
                            </Marker>
                          )}
                        </Map>
                        {mapError && (
                          <div className="absolute bottom-0 left-0 right-0 bg-red-100 text-red-800 p-2 text-sm">
                            {mapError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Customer Information */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
                </div>
                <div className="p-6">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs text-gray-500">User ID</dt>
                      <dd className="text-sm text-gray-900">{booking.UserId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{booking.userName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{booking.userEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Phone</dt>
                      <dd className="text-sm text-gray-900">{booking.userPhone || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Email Domain</dt>
                      <dd className="text-sm text-gray-900">{booking.emailDomain}</dd>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <dt className="text-xs text-gray-500">Company ID</dt>
                      <dd className="text-sm text-gray-900">{booking.CompanyId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Company Name</dt>
                      <dd className="text-sm text-gray-900">{booking.companyName}</dd>
                    </div>
                  </dl>
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
