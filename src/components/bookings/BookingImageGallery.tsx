import React, { useState, useEffect, useRef } from 'react';
import { isValidImageUrl, handleImageError } from '../../utils/apiUtils'; // Import the utility functions

interface ImageProps {
  url: string;
  key?: string;
  name?: string;
  type?: string;
  uploadDate?: string;
  size?: number;
}

interface BookingImageGalleryProps {
  images: ImageProps[];
  isLoading: boolean;
}

export const BookingImageGallery: React.FC<BookingImageGalleryProps> = ({ images, isLoading }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [enlargedView, setEnlargedView] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Helper function to check valid image extensions
  const isValidImageExtension = (url: string): boolean => {
    if (!url) return false;
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
    return validExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  // Keep track of logged URLs to avoid repeat messages
  const loggedErrorUrls = useRef<Set<string>>(new Set());

  // Silent filter for problematic files like .DS_Store - no warnings
  const filteredImages = images.filter(image => {
    // Filter out GeoTIFF
    if (image.type === 'GeoTIFF') return false;
    
    // Basic URL validation
    if (!image.url) return false;
    
    // Filter out .DS_Store and other problematic files silently
    if (
      image.url.includes('.DS_Store') ||
      image.url.includes('Thumbs.db') ||
      !isValidImageExtension(image.url)
    ) {
      // Only log once per session per URL to avoid console flooding
      if (!loggedErrorUrls.current.has(image.url)) {
        // Debug only in development, not in production
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Filtered invalid image: ${image.url.substring(0, 50)}...`);
        }
        loggedErrorUrls.current.add(image.url);
      }
      return false;
    }
    
    return true;
  });

  // Format date to display nicely
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Format file size
  const formatSize = (size?: number): string => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Navigate to next image
  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === filteredImages.length - 1 ? 0 : prev + 1
    );
  };

  // Navigate to previous image
  const prevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? filteredImages.length - 1 : prev - 1
    );
  };

  // Toggle enlarged view
  const toggleEnlargedView = (e: React.MouseEvent) => {
    // Prevent this from triggering when clicking navigation arrows
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setEnlargedView(!enlargedView);
  };

  // Close enlarged view when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enlargedView) {
        setEnlargedView(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enlargedView]);

  // Scroll thumbnail into view when selected image changes
  useEffect(() => {
    if (thumbnailsRef.current) {
      const selectedThumb = thumbnailsRef.current.querySelector(`[data-index="${selectedImageIndex}"]`);
      if (selectedThumb) {
        selectedThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedImageIndex]);

  // Silent image error handler
  const handleSilentImageError = (url: string) => {
    // Only log once per URL to avoid console flooding
    if (!loggedErrorUrls.current.has(url)) {
      // In production, don't log at all
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Image load error: ${url.substring(0, 50)}...`);
      }
      loggedErrorUrls.current.add(url);
    }
  };

  // Improved preloading with silent error handling
  useEffect(() => {
    if (filteredImages.length > 0 && !isLoading) {
      const imageLoadStatus: {[key: string]: boolean} = {};
      
      filteredImages.forEach(image => {
        // Skip if URL already known to be problematic
        if (loggedErrorUrls.current.has(image.url)) {
          imageLoadStatus[image.url] = false;
          setLoadedImages(prev => ({...prev, [image.url]: false}));
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          imageLoadStatus[image.url] = true;
          setLoadedImages(prev => ({...prev, [image.url]: true}));
        };
        img.onerror = () => {
          imageLoadStatus[image.url] = false;
          setLoadedImages(prev => ({...prev, [image.url]: false}));
          handleSilentImageError(image.url);
        };
        img.src = image.url;
      });
    }
  }, [filteredImages, isLoading]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading images...</p>
      </div>
    );
  }

  if (filteredImages.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No images available for this booking.</p>
        <p className="text-xs text-gray-400 mt-1">Images will appear here once they are uploaded.</p>
      </div>
    );
  }

  // Enlarged view as a modal
  if (enlargedView) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={toggleEnlargedView}>
        <div className="relative w-full max-w-5xl max-h-full">
          {/* Close button */}
          <button 
            className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition"
            onClick={() => setEnlargedView(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative">
            <img
              src={filteredImages[selectedImageIndex]?.url}
              alt={filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
              className="max-h-[85vh] max-w-full mx-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Navigation Arrows - Bigger for enlarged view */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 m-2 rounded-full transition"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 m-2 rounded-full transition"
              aria-label="Next image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Caption for enlarged view */}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-4 text-center">
              <p className="text-white text-base md:text-lg font-medium">
                {filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
              </p>
              <p className="text-gray-300 text-sm mt-1">
                {selectedImageIndex + 1} of {filteredImages.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Improved main image rendering with safety checks
  const renderMainImage = () => {
    if (!filteredImages.length || selectedImageIndex >= filteredImages.length) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-gray-500">No valid images available</p>
        </div>
      );
    }
    
    const currentImage = filteredImages[selectedImageIndex];
    
    // Safety check for invalid URLs
    if (!currentImage.url || !isValidImageExtension(currentImage.url)) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-gray-500">Invalid image format</p>
        </div>
      );
    }
    
    return (
      <img
        src={currentImage.url}
        alt={currentImage.name || `Image ${selectedImageIndex + 1}`}
        className="max-h-full max-w-full object-contain"
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="%236b7280">Image failed to load</text></svg>';
          handleSilentImageError(currentImage.url);
        }}
      />
    );
  };

  // Improved image rendering in thumbnails
  const renderThumbnail = (image: ImageProps, index: number) => {
    // Provide a fallback for invalid images
    const fallbackSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75" viewBox="0 0 100 75"><rect width="100" height="75" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="%236b7280">Error</text></svg>';
    
    return (
      <div 
        key={index}
        data-index={index}
        onClick={() => setSelectedImageIndex(index)}
        className={`flex-shrink-0 cursor-pointer rounded-md overflow-hidden border-2 shadow-sm transition-all transform ${
          selectedImageIndex === index 
            ? 'border-blue-500 scale-105 shadow-md' 
            : 'border-transparent hover:border-blue-300'
        }`}
        style={{ width: '100px', height: '75px' }}
      >
        <img
          src={isValidImageExtension(image.url) ? image.url : fallbackSrc}
          alt={`Thumbnail ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = fallbackSrc;
            handleSilentImageError(image.url);
          }}
        />
      </div>
    );
  };

  // Thumbnails section - Fix the unbalanced div tags
  return (
    <div className="image-gallery">
      {/* Main Carousel - Increased height */}
      <div className="relative mb-4 rounded-lg overflow-hidden bg-black h-[500px]" ref={carouselRef}>
        <div 
          className="h-full flex items-center justify-center cursor-pointer"
          onClick={toggleEnlargedView}
        >
          {renderMainImage()}
          
          {/* Click to enlarge indicator */}
          {filteredImages.length > 0 && isValidImageExtension(filteredImages[selectedImageIndex]?.url) && (
            <div className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Click to enlarge
            </div>
          )}
        </div>
        
        {/* Navigation Arrows - Only show if multiple valid images */}
        {filteredImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition shadow-lg"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition shadow-lg"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Caption */}
        {filteredImages.length > 0 && isValidImageExtension(filteredImages[selectedImageIndex]?.url) && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm md:text-base font-medium">
              {filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {selectedImageIndex + 1} of {filteredImages.length}
            </p>
          </div>
        )}
      </div>
      
      {/* Thumbnails - Improved styling */}
      {filteredImages.length > 0 && (
        <div 
          className="flex space-x-2 overflow-x-auto py-3 px-1 mt-2 mb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 bg-gray-100 rounded-lg"
          ref={thumbnailsRef}
        >
          {filteredImages.map((image, index) => renderThumbnail(image, index))}
        </div>
      )}
      
      {/* Image Details */}
      {filteredImages.length > 0 && isValidImageExtension(filteredImages[selectedImageIndex]?.url) && (
        <div className="bg-gray-50 rounded-lg p-4 mt-2 border border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">File Type</p>
              <p className="font-medium">{filteredImages[selectedImageIndex]?.type || 'Image'}</p>
            </div>
            <div>
              <p className="text-gray-500">File Size</p>
              <p className="font-medium">{formatSize(filteredImages[selectedImageIndex]?.size)}</p>
            </div>
            {filteredImages[selectedImageIndex]?.uploadDate && (
              <div className="col-span-2">
                <p className="text-gray-500">Upload Date</p>
                <p className="font-medium">{formatDate(filteredImages[selectedImageIndex]?.uploadDate)}</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <a
              href={filteredImages[selectedImageIndex]?.url}
              download={filteredImages[selectedImageIndex]?.name}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <a
              href={filteredImages[selectedImageIndex]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Original
            </a>
            
            <button
              onClick={toggleEnlargedView}
              className="ml-auto bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Enlarge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add utility functions if not importing them
if (typeof isValidImageUrl === 'undefined') {
  const isValidImageUrl = (url: string): boolean => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
    const hasValidExtension = validExtensions.some(ext => 
      url.toLowerCase().endsWith(ext)
    );
    
    const invalidFiles = ['.DS_Store', 'Thumbs.db', '.json'];
    const hasInvalidFile = invalidFiles.some(file => 
      url.includes(file)
    );
    
    return hasValidExtension && !hasInvalidFile;
  };
}
