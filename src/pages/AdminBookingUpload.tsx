import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import { FiArrowLeft, FiUpload, FiFile, FiImage, FiX } from 'react-icons/fi';
import * as adminService from '../services/adminService';

interface Booking {
  BookingId: string;
  userName: string;
  userEmail: string;
  companyName: string;
  flightDate: string;
  location: string;
  status: string;
}

const AdminBookingUpload: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;

      try {
        setLoading(true);
        setError(null);

        const bookingData = await adminService.getBookingById(bookingId);
        setBooking(bookingData.booking || bookingData);

        const resourcesData = await adminService.getBookingResources(bookingId);
        setResources(resourcesData.resources || []);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch booking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !bookingId) return;

    const files = Array.from(e.target.files);
    setUploadingFiles(true);

    Promise.all(
      files.map(file =>
        adminService.uploadBookingResource(
          bookingId,
          file,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          }
        )
      )
    )
      .then(results => {
        const failedUploads = results.filter(r => !r.success && !r.resourceId);

        if (failedUploads.length > 0) {
          setError(`Failed to upload ${failedUploads.length} files`);
        } else {
          setSuccess(`Successfully uploaded ${files.length} files`);
          return adminService.getBookingResources(bookingId);
        }
      })
      .then(resourcesData => {
        if (resourcesData) {
          setResources(resourcesData.resources || resourcesData || []);
        }
      })
      .catch(err => {
        setError('Error uploading files: ' + (err.message || 'Unknown error'));
      })
      .finally(() => {
        setUploadingFiles(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        setTimeout(() => {
          setUploadProgress({});
        }, 3000);
      });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!bookingId || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const files = Array.from(e.dataTransfer.files);
    setUploadingFiles(true);

    Promise.all(
      files.map(file =>
        adminService.uploadBookingResource(
          bookingId,
          file,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          }
        )
      )
    )
      .then(results => {
        const failedUploads = results.filter(r => !r.success && !r.resourceId);

        if (failedUploads.length > 0) {
          setError(`Failed to upload ${failedUploads.length} files`);
        } else {
          setSuccess(`Successfully uploaded ${files.length} files`);
          return adminService.getBookingResources(bookingId);
        }
      })
      .then(resourcesData => {
        if (resourcesData) {
          setResources(resourcesData.resources || resourcesData || []);
        }
      })
      .catch(err => {
        setError('Error uploading files: ' + (err.message || 'Unknown error'));
      })
      .finally(() => {
        setUploadingFiles(false);

        setTimeout(() => {
          setUploadProgress({});
        }, 3000);
      });
  };

  const handleDeleteResource = (bookingId: string, resourceId: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      adminService.deleteBookingResource(bookingId, resourceId)
        .then(() => {
          setResources(current => current.filter(r =>
            (r.ResourceId || r.id) !== (resourceId)
          ));
          setSuccess('Resource deleted successfully');
        })
        .catch(err => {
          console.error('Error deleting resource:', err);
          setError('Failed to delete resource');
        });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking && !loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Booking Not Found</h2>
            <p className="text-gray-600 mb-4">
              The booking you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiArrowLeft className="mr-2" /> Back to Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
            >
              <FiArrowLeft className="mr-1" /> Back to Bookings
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Upload Resources</h1>
            <p className="text-gray-600">
              For booking: {booking?.userName} - {new Date(booking?.flightDate || '').toLocaleDateString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{success}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setSuccess(null)}
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{booking?.userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{booking?.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium">{booking?.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Flight Date</p>
                <p className="font-medium">
                  {new Date(booking?.flightDate || '').toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{booking?.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  booking?.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  booking?.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                  booking?.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {booking?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Upload Resources</h2>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
                accept="image/*,.tif,.tiff"
              />
              <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-700">Drag and drop files here, or click to select files</p>
              <p className="mt-1 text-sm text-gray-500">
                Supports: Images, GeoTIFF files, entire folders
              </p>
            </div>

            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Upload Progress</h3>
                <div className="space-y-2">
                  {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename} className="flex items-center">
                      <span className="text-xs text-gray-500 w-48 truncate">{filename}</span>
                      <div className="flex-grow ml-2">
                        <div className="bg-gray-200 h-2 rounded-full">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadingFiles && (
              <div className="text-center mt-4">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">Uploading files...</span>
              </div>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Uploaded Resources</h2>

            {resources.length === 0 ? (
              <p className="text-gray-500 italic">No resources uploaded yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {resources.map((resource: any) => {
                  const resourceId = resource.ResourceId || resource.id;
                  const fileName = resource.FileName || resource.fileName || 'Unnamed Resource';
                  const resourceUrl = resource.resourceUrl || '';
                  const thumbnailUrl = resource.thumbnailUrl || '';
                  const isImage = resource.mimeType?.startsWith('image/') ||
                    resource.resourceType === 'image';

                  return (
                    <div
                      key={resourceId}
                      className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-w-1 aspect-h-1 bg-gray-100 relative">
                        {isImage ? (
                          <a href={resourceUrl} target="_blank" rel="noopener noreferrer">
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={resourceUrl}
                                alt={fileName}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </a>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <FiFile className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteResource(bookingId!, resourceId)}
                          className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                          title="Delete"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500 truncate" title={fileName}>{fileName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingUpload;
