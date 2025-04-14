import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiFile, FiImage, FiMap, FiLoader } from 'react-icons/fi';
import { downloadResource, saveBlob } from '../../utils/resourceDownloader';

interface ResourceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
}

const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  resourceId,
  resourceType = 'file',
  resourceName
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<{ blob: Blob; metadata: any } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchResource();
    }
  }, [isOpen, resourceId, bookingId]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(0);

      console.log(`Fetching resource: ${resourceId} for booking: ${bookingId}`);

      const result = await downloadResource(bookingId, resourceId, {
        onProgress: setDownloadProgress
      });

      setResource(result);
    } catch (err: any) {
      console.error('Error loading resource:', err);
      setError(err.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (resource) {
      const fileName = resource.metadata.fileName || resourceName || `resource-${resourceId}.bin`;
      saveBlob(resource.blob, fileName);
    }
  };

  const renderResource = () => {
    if (!resource) return null;

    const { blob, metadata } = resource;
    const contentType = metadata.contentType || 'application/octet-stream';

    // For images, display inline
    if (contentType.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(blob);
      return (
        <div className="flex justify-center">
          <img
            src={objectUrl}
            alt={metadata.fileName || 'Resource image'}
            className="max-h-[70vh] max-w-full"
            onLoad={() => URL.revokeObjectURL(objectUrl)}
          />
        </div>
      );
    }

    // For PDFs, embed them directly
    if (contentType === 'application/pdf') {
      const objectUrl = URL.createObjectURL(blob);
      return (
        <div className="h-[70vh] w-full">
          <embed
            src={objectUrl}
            type="application/pdf"
            className="w-full h-full"
          />
        </div>
      );
    }

    // For GeoTIFF or other specialized formats, show basic info
    if (contentType === 'image/tiff' || metadata.fileName?.endsWith('.tif') || metadata.fileName?.endsWith('.tiff')) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center">
          <FiMap className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">GeoTIFF Resource</h3>
          <p className="text-gray-500 mb-4">This is a GeoTIFF file that may contain geographical data.</p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <FiDownload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Download
          </button>
        </div>
      );
    }

    // For other file types
    return (
      <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center">
        <FiFile className="h-16 w-16 text-blue-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {metadata.fileName || resourceName || `File resource (${contentType})`}
        </h3>
        <p className="text-gray-500 mb-1">File type: {contentType}</p>
        <p className="text-gray-500 mb-4">Size: {formatFileSize(blob.size)}</p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          <FiDownload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Download
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="resource-viewer-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="resource-viewer-title">
                {resourceName || resource?.metadata.fileName || 'Resource Viewer'}
              </h3>

              <div className="mt-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="mb-4">
                      <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    {downloadProgress > 0 && (
                      <div className="w-64">
                        <div className="bg-gray-200 rounded-full h-2.5 mb-2">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${downloadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500">{downloadProgress}% downloaded</p>
                      </div>
                    )}
                    <p className="text-gray-500 mt-2">{resource?.metadata.isChunked ? 'Downloading and reassembling chunks...' : 'Loading resource...'}</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiX className="h-5 w-5 text-red-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  renderResource()
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ResourceViewerModal;
