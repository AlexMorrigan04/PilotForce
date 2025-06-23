import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMaximize2, FiDownload, FiInfo, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Define the interface for the image props that will be passed to this component
export interface ImageProps {
  url: string;
  name: string;
  type?: string;
  size?: number;
  uploadDate?: string;
  resourceId?: string;
  isGeoTiff?: boolean;
  metadata?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    heading?: number;
    timestamp?: string;
    cameraModel?: string;
    droneModel?: string;
  };
}

interface BookingImageGalleryProps {
  images: ImageProps[];
  isLoading?: boolean;
  onRefreshUrls?: (updatedUrls: {[key: string]: string}) => void;
  layout?: 'horizontal' | 'grid';
  onImageClick?: (image: ImageProps) => void;
}

export const BookingImageGallery: React.FC<BookingImageGalleryProps> = ({
  images,
  isLoading = false,
  onRefreshUrls,
  layout = 'grid',
  onImageClick
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageProps | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [errorStates, setErrorStates] = useState<{[key: string]: boolean}>({});
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  useEffect(() => {
    // Reset states when images change
    setLoadingStates({});
    setErrorStates({});
    setSelectedImage(null);
    setImagePreviewOpen(false);
  }, [images]);

  const handleImageClick = (image: ImageProps, index: number) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
    setImagePreviewOpen(true);
    onImageClick?.(image);
  };

  const handleImageError = (index: number) => {
    setErrorStates(prev => ({ ...prev, [index]: true }));
    if (onRefreshUrls && images[index]) {
      // You could implement URL refresh logic here
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const closePreview = () => {
    setImagePreviewOpen(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentImageIndex + 1) % images.length
      : (currentImageIndex - 1 + images.length) % images.length;
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
    onImageClick?.(images[newIndex]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (imagePreviewOpen) {
      switch (e.key) {
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
        case 'Escape':
          closePreview();
          break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagePreviewOpen, currentImageIndex]);

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
        <svg className="w-5 h-5 text-green-500" xmlns="" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      );
    } else if (isImage) {
      return (
        <svg className="w-5 h-5 text-blue-500" xmlns="" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (type?.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" xmlns="" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg className="w-5 h-5 text-gray-500" xmlns="" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm text-gray-500">Loading images...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
        <div className="bg-gray-50 rounded-full p-4 mb-3">
          <FiInfo className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base font-medium text-gray-900">No images available</h3>
        <p className="text-sm text-gray-500">No images have been uploaded for this flight yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className={layout === 'horizontal' 
        ? 'flex gap-4 pb-4' 
        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4'
      }>
        {images.map((image, index) => (
          <motion.div 
            key={`image-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={`group relative ${
              layout === 'horizontal' 
                ? 'flex-none w-44 h-32' 
                : 'aspect-square'
            } rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200`}
            onClick={() => handleImageClick(image, index)}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-200 z-10"></div>
            <img 
              src={image.url} 
              alt={image.name} 
              className={`w-full h-full object-cover ${loadingStates[index] ? 'animate-pulse' : ''}`}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
            />
            {errorStates[index] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-20">
                <div className="text-center p-4">
                  <FiInfo className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Failed to load image</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-200 z-20">
              <p className="text-sm font-medium text-white truncate">{image.name}</p>
              {image.uploadDate && (
                <p className="text-xs text-gray-200 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {formatDate(image.uploadDate)}
                </p>
              )}
              {image.metadata && (
                <div className="flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {image.metadata.altitude && (
                    <span className="text-xs text-gray-200 mr-2">
                      {image.metadata.altitude.toFixed(0)}m
                    </span>
                  )}
                  {image.metadata.heading && (
                    <span className="text-xs text-gray-200">
                      {image.metadata.heading.toFixed(0)}°
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && imagePreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          >
            <div className="relative max-w-7xl w-full mx-auto">
              <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
                <button
                  onClick={() => window.open(selectedImage.url, '_blank')}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Open in new tab"
                >
                  <FiMaximize2 className="w-5 h-5" />
                </button>
                <a
                  href={selectedImage.url}
                  download={selectedImage.name}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  onClick={e => e.stopPropagation()}
                  title="Download image"
                >
                  <FiDownload className="w-5 h-5" />
                </a>
                <button
                  onClick={closePreview}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Close preview"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('prev');
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('next');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>

              {/* Main Image */}
              <div className="relative">
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.name} 
                  className="mx-auto max-h-[80vh] max-w-full object-contain rounded-lg"
                />
                
                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/40 to-transparent rounded-b-lg">
                  <h4 className="text-xl font-medium text-white mb-2">{selectedImage.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      {selectedImage.uploadDate && (
                        <p>Uploaded: {formatDate(selectedImage.uploadDate)}</p>
                      )}
                      {selectedImage.size && (
                        <p>Size: {formatFileSize(selectedImage.size)}</p>
                      )}
                    </div>
                    {selectedImage.metadata && (
                      <div>
                        {selectedImage.metadata.altitude && (
                          <p>Altitude: {selectedImage.metadata.altitude.toFixed(1)}m</p>
                        )}
                        {selectedImage.metadata.heading && (
                          <p>Heading: {selectedImage.metadata.heading.toFixed(1)}°</p>
                        )}
                        {selectedImage.metadata.cameraModel && (
                          <p>Camera: {selectedImage.metadata.cameraModel}</p>
                        )}
                        {selectedImage.metadata.droneModel && (
                          <p>Drone: {selectedImage.metadata.droneModel}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookingImageGallery;
