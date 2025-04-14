import React, { useState, useEffect } from 'react';
import { FiX, FiImage, FiFile, FiMap, FiDownload, FiEye, FiLoader } from 'react-icons/fi';
import * as adminService from '../../services/adminService';
import { downloadResource, saveBlob } from '../../utils/resourceDownloader';

interface Resource {
  ResourceId?: string;
  FileName?: string;
  ResourceUrl?: string;
  ContentType?: string;
  Size?: number;
  IsImage?: boolean;
  CreatedAt?: string;
  S3Path?: string;
  isChunked?: boolean;
}

interface BookingResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
}

const BookingResourcesModal: React.FC<BookingResourcesModalProps> = ({
  isOpen,
  onClose,
  bookingId,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<Resource | null>(null);
  const [downloading, setDownloading] = useState<{[key: string]: boolean}>({});
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchResources();
    } else {
      // Reset when modal is closed
      setResources([]);
      setActiveImage(null);
    }
  }, [isOpen, bookingId]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      console.log(`Fetching resources for booking ${bookingId}`);
      
      const response = await adminService.getBookingResources(bookingId);
      console.log('Resources API response:', response);
      
      if (Array.isArray(response)) {
        setResources(response);
      } else if (response && Array.isArray(response.resources)) {
        setResources(response.resources);
      } else {
        console.warn('Unexpected resources response format:', response);
        setResources([]);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError(err.message || 'Failed to load resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (resource: Resource) => {
    if (resource.IsImage || (resource.ContentType && resource.ContentType.startsWith('image/'))) {
      return <FiImage className="h-5 w-5 text-blue-500" />;
    } 
    if (resource.FileName && resource.FileName.match(/\.(tif|tiff)$/i)) {
      return <FiMap className="h-5 w-5 text-green-500" />;
    }
    return <FiFile className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDownload = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const resourceId = resource.ResourceId;
    if (!resourceId) return;
    
    // If this resource is already marked as potentially chunked, or filename contains "part", 
    // use the chunked downloader
    const isLikelyChunked = resource.isChunked || 
                           (resource.FileName && resource.FileName.includes('_part')) ||
                           (resource.FileName && resource.FileName.includes('chunk'));
    
    // If we have a direct URL and resource is not chunked, just use direct download
    if (resource.ResourceUrl && !isLikelyChunked) {
      window.open(resource.ResourceUrl, '_blank');
      return;
    }
    
    try {
      setDownloading({...downloading, [resourceId]: true});
      setDownloadProgress({...downloadProgress, [resourceId]: 0});
      
      // Use the resource downloader utility
      const result = await downloadResource(bookingId, resourceId, {
        onProgress: (progress) => {
          setDownloadProgress(prev => ({...prev, [resourceId]: progress}));
        }
      });
      
      // Save the downloaded file
      saveBlob(result.blob, result.metadata.fileName);
      
    } catch (error) {
      console.error('Error downloading resource:', error);
      // If we have a direct URL as fallback, use it
      if (resource.ResourceUrl) {
        window.open(resource.ResourceUrl, '_blank');
      }
    } finally {
      setDownloading({...downloading, [resourceId]: false});
    }
  };

  // Categorize resources
  const images = resources.filter(r => 
    r.IsImage || (r.ContentType && r.ContentType.startsWith('image/'))
  );
  
  const geotiffFiles = resources.filter(r => 
    r.FileName && r.FileName.match(/\.(tif|tiff)$/i)
  );
  
  const otherFiles = resources.filter(r => 
    !(r.IsImage || (r.ContentType && r.ContentType.startsWith('image/'))) && 
    !(r.FileName && r.FileName.match(/\.(tif|tiff)$/i))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>
          
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  Booking Resources - ID: {bookingId}
                </h3>
                
                {loading ? (
                  <div className="mt-4 flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : error ? (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                ) : resources.length === 0 ? (
                  <div className="mt-4 text-center text-gray-500">
                    No resources found for this booking.
                  </div>
                ) : (
                  <div className="mt-4 max-h-[70vh] overflow-y-auto">
                    {/* Images */}
                    {images.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiImage className="mr-2 text-blue-500" />
                          Images ({images.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {images.map(image => (
                            <div 
                              key={image.ResourceId} 
                              className="border rounded overflow-hidden cursor-pointer hover:shadow-md relative"
                              onClick={() => setActiveImage(image)}
                            >
                              <div className="bg-gray-100 aspect-w-1 aspect-h-1">
                                <img
                                  src={image.ResourceUrl}
                                  alt={image.FileName || 'Image'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/150?text=Image+Error';
                                  }}
                                />
                              </div>
                              <div className="p-2 flex justify-between items-center">
                                <p className="text-xs text-gray-500 truncate flex-grow">
                                  {image.FileName}
                                </p>
                                <button
                                  onClick={(e) => handleDownload(image, e)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Download"
                                >
                                  {downloading[image.ResourceId || ''] ? (
                                    <div className="flex items-center">
                                      <FiLoader className="animate-spin" />
                                      <span className="ml-1 text-xs">{downloadProgress[image.ResourceId || ''] || 0}%</span>
                                    </div>
                                  ) : (
                                    <FiDownload />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* GeoTIFF Files */}
                    {geotiffFiles.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiMap className="mr-2 text-green-500" />
                          GeoTIFF Files ({geotiffFiles.length})
                        </h4>
                        <ul className="divide-y divide-gray-200">
                          {geotiffFiles.map(file => (
                            <li 
                              key={file.ResourceId} 
                              className="py-2 flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                <FiMap className="h-5 w-5 text-green-500" />
                                <span className="ml-2 text-sm text-gray-900 truncate">
                                  {file.FileName}
                                </span>
                                {file.isChunked && (
                                  <span className="ml-2 text-xs text-amber-600">
                                    (Chunked file)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => handleDownload(file, e)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Download"
                              >
                                {downloading[file.ResourceId || ''] ? (
                                  <div className="flex items-center">
                                    <FiLoader className="animate-spin" />
                                    <span className="ml-1 text-xs">{downloadProgress[file.ResourceId || ''] || 0}%</span>
                                  </div>
                                ) : (
                                  <FiDownload />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Other Files */}
                    {otherFiles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <FiFile className="mr-2 text-gray-500" />
                          Other Files ({otherFiles.length})
                        </h4>
                        <ul className="divide-y divide-gray-200">
                          {otherFiles.map(file => (
                            <li 
                              key={file.ResourceId} 
                              className="py-2 flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                {getFileIcon(file)}
                                <div className="ml-2">
                                  <span className="text-sm text-gray-900 truncate">
                                    {file.FileName}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.Size)}
                                    {file.isChunked && <span className="ml-2 text-amber-600">(Chunked file)</span>}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDownload(file, e)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Download"
                              >
                                {downloading[file.ResourceId || ''] ? (
                                  <div className="flex items-center">
                                    <FiLoader className="animate-spin" />
                                    <span className="ml-1 text-xs">{downloadProgress[file.ResourceId || ''] || 0}%</span>
                                  </div>
                                ) : (
                                  <FiDownload />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Image Viewer Modal */}
      {activeImage && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-90 transition-opacity" onClick={() => setActiveImage(null)}></div>
            
            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setActiveImage(null)}
                  className="text-white hover:text-gray-200 focus:outline-none"
                >
                  <FiX className="h-8 w-8" />
                </button>
              </div>
              
              <div className="flex justify-center items-center h-screen-3/4">
                <img
                  src={activeImage.ResourceUrl}
                  alt={activeImage.FileName || ''}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
              
              <div className="bg-black bg-opacity-50 py-2 px-4 fixed bottom-0 left-0 right-0 text-white">
                <p>{activeImage.FileName}</p>
                <button
                  onClick={(e) => handleDownload(activeImage, e)}
                  className="inline-flex items-center text-blue-300 hover:text-blue-100"
                >
                  {downloading[activeImage.ResourceId || ''] ? (
                    <div className="flex items-center">
                      <FiLoader className="animate-spin mr-1" />
                      <span>{downloadProgress[activeImage.ResourceId || ''] || 0}%</span>
                    </div>
                  ) : (
                    <>
                      <FiDownload className="mr-1" />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingResourcesModal;
