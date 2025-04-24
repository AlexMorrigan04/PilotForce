import React, { useState, useEffect } from 'react';

// Define the interface for the image props that will be passed to this component
interface ImageProps {
  url: string;
  name: string;
  type?: string;
  size?: number;
  uploadDate?: string;
  resourceId?: string;
  isGeoTiff?: boolean;
}

interface BookingImageGalleryProps {
  images: ImageProps[];
  isLoading?: boolean;
  onRefreshUrls?: (updatedUrls: {[key: string]: string}) => void;
}

export const BookingImageGallery: React.FC<BookingImageGalleryProps> = ({
  images,
  isLoading = false,
  onRefreshUrls
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageProps | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [errorStates, setErrorStates] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    // Reset states when images change
    setLoadingStates({});
    setErrorStates({});
    setSelectedImage(null);
    setImagePreviewOpen(false);
  }, [images]);

  const handleImageClick = (image: ImageProps) => {
    setSelectedImage(image);
    setImagePreviewOpen(true);
  };

  const handleImageError = (index: number) => {
    setErrorStates(prev => ({ ...prev, [index]: true }));
    
    // Try to refresh the URL if possible
    if (onRefreshUrls && images[index]) {
      
      // You could implement URL refresh logic here
      // For now just mark it as an error
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const closePreview = () => {
    setImagePreviewOpen(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileTypeIcon = (type?: string, name?: string) => {
    // Determine if this is an image file
    const isImage = type?.startsWith('image/') && !type?.includes('tiff');
    
    // Determine if this is a GeoTIFF file
    const isGeoTiff = type?.includes('tiff') || 
                      name?.toLowerCase().endsWith('.tif') || 
                      name?.toLowerCase().endsWith('.tiff');
    
    // Determine file type for icon
    if (isGeoTiff) {
      return (
        <svg className="w-5 h-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      );
    } else if (isImage) {
      return (
        <svg className="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (type?.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">No resources available</h3>
        <p className="mt-1 text-sm text-gray-500">No images or files have been uploaded for this booking yet.</p>
      </div>
    );
  }

  // Group resources by type for better organization
  const fileGroups = {
    images: images.filter(img => img.type?.startsWith('image/') && !img.type?.includes('tiff') && !img.isGeoTiff),
    geoTiffs: images.filter(img => img.type?.includes('tiff') || img.isGeoTiff || img.name?.toLowerCase().endsWith('.tif') || img.name?.toLowerCase().endsWith('.tiff')),
    documents: images.filter(img => !img.type?.startsWith('image/') && !img.isGeoTiff && !img.type?.includes('tiff')),
  };

  return (
    <div className="space-y-6">
      {/* Display each resource group */}
      {fileGroups.images.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Images ({fileGroups.images.length})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {fileGroups.images.map((image, index) => (
              <div 
                key={`image-${index}`} 
                className="relative overflow-hidden rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
                onClick={() => handleImageClick(image)}
              >
                <div className="bg-gray-100 aspect-w-16 aspect-h-9 flex items-center justify-center">
                  <img 
                    src={image.url} 
                    alt={image.name} 
                    className={`object-cover w-full h-full ${loadingStates[index] ? 'animate-pulse' : ''}`}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                  />
                  {errorStates[index] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-80">
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-gray-700 truncate">{image.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GeoTIFF Files Section */}
      {fileGroups.geoTiffs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            GeoTIFF Files ({fileGroups.geoTiffs.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fileGroups.geoTiffs.map((file, index) => (
              <div key={`geotiff-${index}`} className="border rounded-lg overflow-hidden bg-blue-50 shadow-sm flex flex-col">
                <div className="p-3 flex items-center border-b border-blue-100">
                  <svg className="w-8 h-8 text-blue-600 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                      {file.name.replace(/^resource_[^_]+_[^_]+_/, '')}
                    </h3>
                    <p className="text-xs text-gray-600">
                      GeoTIFF file
                      {file.uploadDate && ` • ${formatDate(file.uploadDate)}`}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-white flex items-center justify-between mt-auto">
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  <a
                    href={file.url}
                    download={file.name}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Documents Section */}
      {fileGroups.documents.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documents ({fileGroups.documents.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fileGroups.documents.map((file, index) => (
              <div key={`doc-${index}`} className="border rounded-lg overflow-hidden bg-gray-50 shadow-sm flex flex-col">
                <div className="p-3 flex items-center border-b border-gray-100">
                  {getFileTypeIcon(file.type, file.name)}
                  <div className="flex-1 ml-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {file.type?.split('/')[1]?.toUpperCase() || 'Document'}
                      {file.uploadDate && ` • ${formatDate(file.uploadDate)}`}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-white flex items-center justify-between mt-auto">
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  <a
                    href={file.url}
                    download={file.name}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded text-white bg-gray-600 hover:bg-gray-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && imagePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name} 
              className="mx-auto max-h-[80vh] max-w-full object-contain"
            />
            
            <div className="bg-black bg-opacity-50 text-white p-4 mt-2 rounded">
              <h4 className="font-medium">{selectedImage.name}</h4>
              <div className="flex justify-between text-sm mt-1">
                <span>{formatFileSize(selectedImage.size)}</span>
                <span>{formatDate(selectedImage.uploadDate)}</span>
              </div>
              <div className="mt-2 flex justify-center">
                <a
                  href={selectedImage.url}
                  download={selectedImage.name}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingImageGallery;
